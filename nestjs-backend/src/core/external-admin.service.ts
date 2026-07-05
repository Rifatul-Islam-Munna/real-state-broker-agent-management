import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { CreatePublicAccessDto } from '../property-operations/dto/public-access.dto';
import { AccessCodeService } from './access-code.service';
import { ActivityLogService } from './activity-log.service';
import { ExternalRequestStoreService } from './external-request-store.service';
import { SettingsService } from './settings.service';

@Injectable()
export class ExternalAdminService {
  constructor(
    private readonly store: ExternalRequestStoreService,
    private readonly codes: AccessCodeService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityLogService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePublicAccessDto) {
    const preferences = await this.settings.get();
    const access = this.codes.issue();
    const expiresAt = new Date(Date.now() + (dto.expiryHours ?? preferences.defaultExpiryHours) * 3600000);
    const result = await this.store.create({
      propertyId: dto.propertyId,
      linkedRecordId: dto.recordId ? Number(dto.recordId) : null,
      moduleKey: dto.moduleKey,
      title: dto.title,
      instructions: dto.instructions,
      recipientLabel: dto.recipientLabel,
      recipientName: dto.recipientName,
      recipientEmail: dto.recipientEmail,
      recipientPhone: dto.recipientPhone,
      accessChecksum: access.checksum,
      formSchema: dto.formSchema,
      expiresAt,
      maxUses: dto.maxUses ?? preferences.defaultMaxUses,
      oneTime: dto.oneTime ?? preferences.defaultOneTime,
      allowFileUploads: dto.allowFileUploads ?? preferences.allowFileUploads,
    });
    const base = String(preferences.publicBaseUrl || this.config.get<string>('Frontend__BaseUrl') || this.config.get<string>('PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const publicUrl = `${base}/property-request/${access.code}`;
    await this.activity.add({ workspaceId: result.workspace.id, moduleKey: dto.moduleKey, action: 'external-access-created', entityType: 'ExternalRequest', entityId: String(result.item.id), summary: `${dto.title} link created.` });
    return {
      ...this.map(result.item, dto.propertyId, result.workspace.propertySnapshot),
      publicUrl,
      accessToken: access.code,
      qrDataUrl: await QRCode.toDataURL(publicUrl, { width: 360, margin: 2 }),
      submissionCount: 0,
    };
  }

  async list(propertyId?: number) {
    const items = await this.store.list(propertyId);
    return items.map(({ item, workspace, responseCount }) => ({
      ...this.map(item, workspace?.propertyId, workspace ?? {}),
      submissionCount: responseCount,
    }));
  }

  async revoke(id: string) {
    const item = await this.store.get(Number(id));
    if (!item) return;
    item.status = 'Revoked';
    item.payload = { ...item.payload, revokedAt: new Date().toISOString() };
    await this.store.repository().save(item);
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: String(item.payload.targetModuleKey ?? ''), action: 'external-access-revoked', entityType: 'ExternalRequest', entityId: id, summary: `${item.title} link revoked.` });
  }

  async responses(id: string) {
    const items = await this.store.responses(Number(id));
    return items.map((item) => ({ id: String(item.id), ...item.payload, submittedAt: item.createdAt }));
  }

  private map(item: any, propertyId?: number, workspace?: Record<string, unknown>) {
    return {
      id: String(item.id), propertyId, recordId: item.parentRecordId ? String(item.parentRecordId) : null,
      moduleKey: String(item.payload.targetModuleKey ?? ''), title: item.title, instructions: item.description,
      recipientLabel: item.contactLabel, recipientName: item.contactName, recipientEmail: item.contactEmail,
      recipientPhone: item.contactPhone, status: item.status, formSchemaJson: JSON.stringify(item.payload.formSchema ?? []),
      expiresAt: item.payload.expiresAt, maxUses: Number(item.payload.maxUses ?? 1), useCount: Number(item.payload.useCount ?? 0),
      oneTime: Boolean(item.payload.oneTime), allowFileUploads: Boolean(item.payload.allowFileUploads),
      createdAt: item.createdAt, lastAccessedAt: item.payload.lastAccessedAt ?? null, completedAt: item.payload.completedAt ?? null,
      propertyTitle: String((workspace as any).propertyTitle ?? (workspace as any).title ?? ''),
      propertyLocation: String((workspace as any).propertyLocation ?? (workspace as any).location ?? ''),
      publicUrl: null, accessToken: null,
    };
  }
}
