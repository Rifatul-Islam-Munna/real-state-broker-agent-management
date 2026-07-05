import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { WorkspaceEntity, WorkspaceRow } from '../database/entities/workspace.entity';
import { SubmitPublicRequestDto } from '../property-operations/dto/public-access.dto';
import { AccessCodeService } from './access-code.service';
import { ActivityLogService } from './activity-log.service';
import { SettingsService } from './settings.service';

@Injectable()
export class ExternalPublicService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
    @InjectRepository(WorkspaceEntity) private workspaces: Repository<WorkspaceRow>,
    private codes: AccessCodeService,
    private settings: SettingsService,
    private activity: ActivityLogService,
  ) {}

  async getRequest(code: string) {
    const item = await this.active(code, true);
    const [preferences, workspace, linked] = await Promise.all([
      this.settings.get(),
      this.workspaces.findOneBy({ id: item.workspaceId }),
      item.parentRecordId ? this.records.findOneBy({ id: item.parentRecordId }) : null,
    ]);
    if (!workspace) throw new NotFoundException('Property request was not found.');
    item.payload = { ...item.payload, lastAccessedAt: new Date().toISOString() };
    await this.records.save(item);
    const property = workspace.propertySnapshot ?? {};
    const amount = linked?.amount == null ? null : Number(linked.amount);
    return {
      businessName: preferences.businessName,
      logoUrl: preferences.logoUrl,
      brandColor: preferences.brandColor,
      currency: preferences.currency,
      welcomeMessage: preferences.welcomeMessage,
      termsText: preferences.termsText,
      requireName: preferences.requireName,
      requireEmail: preferences.requireEmail,
      requirePhone: preferences.requirePhone,
      allowFileUploads: Boolean(item.payload.allowFileUploads),
      showPropertyAddress: preferences.showPropertyAddress,
      propertyTitle: String(property.title ?? ''),
      propertyLocation: String(property.location ?? ''),
      moduleKey: String(item.payload.targetModuleKey ?? ''),
      title: item.title,
      instructions: item.description,
      recipientLabel: item.contactLabel,
      formSchemaJson: JSON.stringify(item.payload.formSchema ?? []),
      expiresAt: item.payload.expiresAt,
      remainingUses: Math.max(0, Number(item.payload.maxUses ?? 1) - Number(item.payload.useCount ?? 0)),
      requestStatus: item.status,
      linkedRecordId: linked ? String(linked.id) : null,
      linkedRecordStatus: linked?.status ?? null,
      paymentAmount: amount,
      paymentCurrency: preferences.currency,
      paymentVerified: linked?.status === 'Paid',
    };
  }

  async submit(code: string, dto: SubmitPublicRequestDto) {
    const item = await this.active(code, false);
    const preferences = await this.settings.get();
    if (preferences.requireName && !dto.responderName?.trim()) throw new BadRequestException('Name is required.');
    if (preferences.requireEmail && !dto.responderEmail?.trim()) throw new BadRequestException('Email is required.');
    if (preferences.requirePhone && !dto.responderPhone?.trim()) throw new BadRequestException('Phone is required.');
    const response = await this.records.save(this.records.create({
      workspaceId: item.workspaceId,
      moduleKey: 'public-portals',
      recordType: 'ExternalResponse',
      title: `Response: ${item.title}`,
      description: dto.notes ?? '',
      status: 'Completed',
      priority: 'Normal',
      contactName: dto.responderName ?? '',
      contactEmail: dto.responderEmail ?? '',
      contactPhone: dto.responderPhone ?? '',
      contactLabel: 'External responder',
      amount: null,
      dueAt: null,
      attachments: dto.attachmentUrls ?? [],
      payload: { response: dto.response ?? {}, notes: dto.notes ?? '' },
      recurrence: null,
      parentRecordId: item.id,
      assignedTo: '',
      completedAt: new Date(),
    }));
    const uses = Number(item.payload.useCount ?? 0) + 1;
    const max = Number(item.payload.maxUses ?? 1);
    const completed = Boolean(item.payload.oneTime) || uses >= max;
    item.status = completed ? 'Completed' : item.status;
    item.payload = { ...item.payload, useCount: uses, completedAt: completed ? new Date().toISOString() : null };
    if (completed) item.completedAt = new Date();
    await this.records.save(item);
    if (preferences.autoCloseRecordOnSubmit && item.parentRecordId) {
      await this.records.update(item.parentRecordId, { status: 'Completed', completedAt: new Date() });
    }
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: String(item.payload.targetModuleKey ?? ''), action: 'external-response-submitted', entityType: 'ExternalResponse', entityId: String(response.id), actorType: 'External', summary: `Response submitted for ${item.title}.` });
    return { id: String(response.id), submittedAt: response.createdAt };
  }

  async find(code: string, allowCompleted = true) {
    return this.active(code, allowCompleted);
  }

  private async active(code: string, allowCompleted: boolean) {
    const checksum = this.codes.checksum(code);
    const item = await this.records.createQueryBuilder('record')
      .where("record.record_type = :type AND record.payload_json ->> 'accessChecksum' = :checksum", { type: 'ExternalRequest', checksum })
      .getOne();
    if (!item) throw new NotFoundException('This request link is invalid.');
    if (item.status === 'Revoked') throw new GoneException('This request link was revoked.');
    if (!item.dueAt || item.dueAt.getTime() <= Date.now()) throw new GoneException('This request link has expired.');
    if (!allowCompleted && item.status === 'Completed') throw new GoneException('This request has already been completed.');
    return item;
  }
}
