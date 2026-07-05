import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { PropertyOperationsPublicAccess, PropertyOperationsRecord, PropertyOperationsSubmission } from './property-operations.entity';

@Injectable()
export class LegacyLinkService {
  constructor(
    @InjectRepository(PropertyOperationsPublicAccess) private readonly links: Repository<PropertyOperationsPublicAccess>,
    @InjectRepository(PropertyOperationsRecord) private readonly records: Repository<PropertyOperationsRecord>,
    @InjectRepository(PropertyOperationsSubmission) private readonly submissions: Repository<PropertyOperationsSubmission>,
    private readonly dataSource: DataSource,
  ) {}

  async migratePreferences() {
    await this.dataSource.query(`
      INSERT INTO property_operations_preferences (id, content, updated_at)
      SELECT 1, payload_json, COALESCE(updated_at, NOW())
      FROM property_operations_record
      WHERE record_type = 'Preferences'
      ORDER BY updated_at DESC
      LIMIT 1
      ON CONFLICT (id) DO NOTHING
    `);
  }

  async restore(codeValue: string) {
    await this.migratePreferences();
    const code = String(codeValue ?? '').trim();
    if (!code) return;
    const digest = createHash('sha256').update(code).digest('hex');
    if (await this.links.findOne({ where: { tokenHash: digest } })) return;
    const legacyKey = ['access', 'Checksum'].join('');
    const legacy = await this.records.createQueryBuilder('item')
      .where('item.record_type = :kind', { kind: 'ExternalRequest' })
      .andWhere(`item.payload_json ->> '${legacyKey}' = :digest`, { digest })
      .getOne();
    if (!legacy) return;
    const data = legacy.payload ?? {};
    const linked = legacy.parentRecordId ? await this.records.findOne({ where: { id: legacy.parentRecordId } }) : null;
    const expiresAt = this.date(data.expiresAt) ?? legacy.dueAt ?? new Date(Date.now() + 86400000);
    let link = this.links.create({
      workspaceId: legacy.workspaceId,
      recordId: legacy.parentRecordId ?? null,
      moduleKey: String(data.targetModuleKey ?? 'public-portals'),
      tokenHash: digest,
      accessToken: code,
      title: legacy.title,
      instructions: legacy.description,
      recipientLabel: legacy.contactLabel,
      recipientName: legacy.contactName,
      recipientEmail: legacy.contactEmail,
      recipientPhone: legacy.contactPhone,
      status: legacy.status,
      formSchema: Array.isArray(data.formSchema) ? data.formSchema : [],
      expiresAt,
      maxUses: Math.max(1, Number(data.maxUses ?? 1)),
      useCount: Math.max(0, Number(data.useCount ?? 0)),
      oneTime: data.oneTime !== false,
      allowFileUploads: data.allowFileUploads !== false,
      paymentAmount: linked && ['billing', 'finance'].includes(linked.moduleKey) ? linked.amount : null,
      paymentCurrency: String(data.paymentCurrency ?? 'USD').toUpperCase(),
      paymentVerified: linked?.status === 'Paid',
      paymentSessionId: null,
      paymentTokenHash: null,
      lastAccessedAt: this.date(data.lastAccessedAt),
      completedAt: this.date(data.completedAt) ?? legacy.completedAt ?? null,
    });
    try {
      link = await this.links.save(link);
    } catch {
      link = await this.links.findOne({ where: { tokenHash: digest } }) ?? link;
    }
    if (!link.id) return;
    const oldResponses = await this.records.find({ where: { recordType: 'ExternalResponse', parentRecordId: legacy.id } });
    for (const old of oldResponses) {
      const marker = `legacy-${old.id}`;
      const exists = await this.submissions.createQueryBuilder('entry')
        .where('entry.access_id = :id', { id: link.id })
        .andWhere("entry.response ->> '_migrationMarker' = :marker", { marker })
        .getExists();
      if (exists) continue;
      const answer = old.payload?.response && typeof old.payload.response === 'object'
        ? old.payload.response as Record<string, unknown>
        : old.payload ?? {};
      await this.submissions.save(this.submissions.create({
        accessId: link.id,
        responderName: old.contactName,
        responderEmail: old.contactEmail,
        responderPhone: old.contactPhone,
        notes: old.description || String(old.payload?.notes ?? ''),
        response: { ...answer, _migrationMarker: marker },
        attachmentUrls: old.attachments ?? [],
        createdAt: old.createdAt,
      }));
    }
  }

  private date(value: unknown) {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
}
