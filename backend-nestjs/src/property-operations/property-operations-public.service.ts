import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  PropertyOperationsPublicAccess,
  PropertyOperationsRecord,
  PropertyOperationsSubmission,
} from './property-operations.entity';
import { PropertyOperationsService } from './property-operations.service';

@Injectable()
export class PropertyOperationsPublicService {
  constructor(
    @InjectRepository(PropertyOperationsPublicAccess)
    private readonly accessRepository: Repository<PropertyOperationsPublicAccess>,
    @InjectRepository(PropertyOperationsSubmission)
    private readonly submissionRepository: Repository<PropertyOperationsSubmission>,
    @InjectRepository(PropertyOperationsRecord)
    private readonly recordRepository: Repository<PropertyOperationsRecord>,
    private readonly operationsService: PropertyOperationsService,
  ) {}

  async list(propertyId?: number) {
    const workspace = propertyId ? await this.operationsService.workspaceByPropertyId(propertyId) : null;
    const accesses = await this.accessRepository.find({
      where: workspace ? { workspaceId: workspace.id } : {},
      order: { createdAt: 'DESC' },
    });
    const workspaces = await Promise.all(
      [...new Set(accesses.map((item) => item.workspaceId))].map((id) => this.operationsService.workspaceById(id)),
    );
    const submissions = accesses.length
      ? await this.submissionRepository.find({ where: { accessId: In(accesses.map((item) => item.id)) } })
      : [];
    return accesses.map((access) => this.accessDto(
      access,
      workspaces.find((workspaceItem) => workspaceItem.id === access.workspaceId),
      submissions.filter((submission) => submission.accessId === access.id).length,
    ));
  }

  async create(input: any) {
    const workspace = await this.operationsService.workspaceByPropertyId(Number(input?.propertyId));
    const settings = await this.operationsService.getSettings();
    const token = randomUUID().replace(/-/g, '');
    const expiresAt = input?.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + Number(input?.expiryHours ?? settings.defaultExpiryHours) * 60 * 60 * 1000);
    const recordId = input?.recordId ? Number(input.recordId) : null;
    const linkedRecord = recordId ? await this.recordRepository.findOne({ where: { id: recordId, workspaceId: workspace.id } }) : null;

    const access = await this.accessRepository.save(this.accessRepository.create({
      workspaceId: workspace.id,
      recordId: linkedRecord?.id ?? null,
      moduleKey: String(input?.moduleKey ?? linkedRecord?.moduleKey ?? 'public-portals'),
      tokenHash: this.hash(token),
      accessToken: token,
      title: String(input?.title ?? linkedRecord?.title ?? 'Property request'),
      instructions: String(input?.instructions ?? linkedRecord?.description ?? ''),
      recipientLabel: String(input?.recipientLabel ?? ''),
      recipientName: String(input?.recipientName ?? linkedRecord?.contactName ?? ''),
      recipientEmail: String(input?.recipientEmail ?? linkedRecord?.contactEmail ?? ''),
      recipientPhone: String(input?.recipientPhone ?? linkedRecord?.contactPhone ?? ''),
      status: 'Active',
      formSchema: Array.isArray(input?.formSchema) ? input.formSchema : [],
      expiresAt,
      maxUses: Math.max(1, Number(input?.maxUses ?? settings.defaultMaxUses)),
      useCount: 0,
      oneTime: input?.oneTime ?? settings.defaultOneTime,
      allowFileUploads: input?.allowFileUploads ?? settings.allowFileUploads,
      paymentAmount: input?.paymentAmount == null ? null : String(Number(input.paymentAmount)),
      paymentCurrency: String(input?.paymentCurrency ?? 'USD'),
      paymentVerified: false,
      paymentSessionId: null,
      paymentTokenHash: null,
      lastAccessedAt: null,
      completedAt: null,
    }));

    return this.accessDto(access, workspace, 0);
  }

  async revoke(id: number) {
    const access = await this.accessRepository.findOne({ where: { id } });
    if (!access) throw new NotFoundException('Public request link was not found.');
    access.status = 'Revoked';
    await this.accessRepository.save(access);
    return { message: 'Public request link revoked.' };
  }

  async submissions(accessId: number) {
    return this.submissionRepository.find({ where: { accessId }, order: { createdAt: 'DESC' } });
  }

  async getRequest(token: string) {
    const access = await this.requireActiveAccess(token);
    access.lastAccessedAt = new Date();
    await this.accessRepository.save(access);
    const workspace = await this.operationsService.workspaceById(access.workspaceId);
    const settings = await this.operationsService.getSettings();
    const snapshot: any = workspace.propertySnapshot ?? {};
    const record = access.recordId ? await this.recordRepository.findOne({ where: { id: access.recordId } }) : null;

    return {
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      brandColor: settings.brandColor,
      welcomeMessage: settings.welcomeMessage,
      termsText: settings.termsText,
      requireName: settings.requireName,
      requireEmail: settings.requireEmail,
      requirePhone: settings.requirePhone,
      allowFileUploads: access.allowFileUploads,
      showPropertyAddress: settings.showPropertyAddress,
      propertyTitle: String(snapshot.title ?? `Property ${workspace.propertyId}`),
      propertyLocation: String(snapshot.location ?? ''),
      moduleKey: access.moduleKey,
      title: access.title,
      instructions: access.instructions,
      recipientLabel: access.recipientLabel,
      formSchemaJson: JSON.stringify(access.formSchema ?? []),
      expiresAt: access.expiresAt.toISOString(),
      remainingUses: Math.max(0, access.maxUses - access.useCount),
      paymentEnabled: Boolean(access.paymentAmount && Number(access.paymentAmount) > 0),
      paymentAmount: access.paymentAmount == null ? null : Number(access.paymentAmount),
      paymentCurrency: access.paymentCurrency,
      paymentVerified: access.paymentVerified,
      linkedRecordStatus: record?.status ?? null,
    };
  }

  async submit(token: string, input: any) {
    const access = await this.requireActiveAccess(token);
    const settings = await this.operationsService.getSettings();
    if (settings.requireName && !String(input?.responderName ?? '').trim()) {
      throw new BadRequestException('Your name is required.');
    }
    if (settings.requireEmail && !String(input?.responderEmail ?? '').trim()) {
      throw new BadRequestException('Your email is required.');
    }
    if (settings.requirePhone && !String(input?.responderPhone ?? '').trim()) {
      throw new BadRequestException('Your phone number is required.');
    }

    const submission = await this.submissionRepository.save(this.submissionRepository.create({
      accessId: access.id,
      responderName: String(input?.responderName ?? ''),
      responderEmail: String(input?.responderEmail ?? ''),
      responderPhone: String(input?.responderPhone ?? ''),
      notes: String(input?.notes ?? ''),
      response: input?.response && typeof input.response === 'object' ? input.response : {},
      attachmentUrls: Array.isArray(input?.attachmentUrls) ? input.attachmentUrls.map(String) : [],
    }));

    access.useCount += 1;
    access.lastAccessedAt = new Date();
    if (access.oneTime || access.useCount >= access.maxUses) {
      access.status = 'Completed';
      access.completedAt = new Date();
    }
    await this.accessRepository.save(access);

    if (access.recordId) {
      const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
      if (record) {
        record.status = settings.autoCloseRecordOnSubmit ? 'Completed' : 'Submitted';
        record.completedAt = settings.autoCloseRecordOnSubmit ? new Date() : null;
        record.payload = {
          ...(record.payload ?? {}),
          latestSubmissionId: submission.id,
          latestSubmissionAt: submission.createdAt.toISOString(),
        };
        await this.recordRepository.save(record);
      }
    }

    return {
      id: String(submission.id),
      status: access.status,
      submittedAt: submission.createdAt.toISOString(),
    };
  }

  async getStatus(token: string) {
    const access = await this.requireAccess(token);
    if (!access.recordId) throw new NotFoundException('This public request is not linked to a record.');
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record) throw new NotFoundException('The linked Property Operations record was not found.');
    const history = await this.submissionRepository.find({ where: { accessId: access.id }, order: { createdAt: 'ASC' } });
    return {
      id: String(record.id),
      moduleKey: record.moduleKey,
      recordType: record.recordType,
      title: record.title,
      description: record.description,
      status: record.status,
      priority: record.priority,
      assignedTo: record.assignedTo,
      dueAt: record.dueAt?.toISOString() ?? null,
      amount: record.amount == null ? null : Number(record.amount),
      attachments: record.attachments ?? [],
      history: history.map((item) => ({
        id: String(item.id),
        responderName: item.responderName,
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async updateStatus(token: string, input: any) {
    const access = await this.requireActiveAccess(token);
    if (!access.recordId) throw new NotFoundException('This public request is not linked to a record.');
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record) throw new NotFoundException('The linked Property Operations record was not found.');
    const allowed = ['Acknowledged', 'In progress', 'Waiting', 'Resolved', 'Completed'];
    if (input?.status && allowed.includes(String(input.status))) record.status = String(input.status);
    if (input?.notes) {
      record.payload = { ...(record.payload ?? {}), publicStatusNote: String(input.notes), publicStatusUpdatedAt: new Date().toISOString() };
    }
    if (['Resolved', 'Completed'].includes(record.status)) record.completedAt = new Date();
    await this.recordRepository.save(record);
    return this.getStatus(token);
  }

  async createCheckout(token: string) {
    const access = await this.requireActiveAccess(token);
    if (!access.paymentAmount || Number(access.paymentAmount) <= 0) {
      throw new BadRequestException('This request does not require a payment.');
    }
    throw new BadRequestException('Configure a payment provider in the existing integration settings before accepting payments.');
  }

  async verifyCheckout(token: string) {
    const access = await this.requireAccess(token);
    return { paid: access.paymentVerified, paymentStatus: access.paymentVerified ? 'Paid' : 'Pending' };
  }

  async assertUploadAllowed(token: string) {
    const access = await this.requireActiveAccess(token);
    if (!access.allowFileUploads) throw new BadRequestException('File uploads are disabled for this request.');
    return access;
  }

  private async requireActiveAccess(token: string) {
    const access = await this.requireAccess(token);
    if (access.status !== 'Active') throw new BadRequestException('This public request link is no longer active.');
    if (access.expiresAt.getTime() <= Date.now()) {
      access.status = 'Expired';
      await this.accessRepository.save(access);
      throw new BadRequestException('This public request link has expired.');
    }
    if (access.useCount >= access.maxUses) throw new BadRequestException('This public request link has reached its usage limit.');
    return access;
  }

  private async requireAccess(token: string) {
    const cleanToken = String(token ?? '').trim();
    if (!cleanToken) throw new NotFoundException('Public request link was not found.');
    const access = await this.accessRepository.findOne({ where: { tokenHash: this.hash(cleanToken) } });
    if (!access) throw new NotFoundException('Public request link was not found.');
    return access;
  }

  private accessDto(access: PropertyOperationsPublicAccess, workspace: any, submissionCount: number) {
    const snapshot: any = workspace?.propertySnapshot ?? {};
    const publicBaseUrl = String(process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return {
      id: String(access.id),
      propertyId: workspace?.propertyId ?? 0,
      recordId: access.recordId == null ? null : String(access.recordId),
      moduleKey: access.moduleKey,
      title: access.title,
      instructions: access.instructions,
      recipientLabel: access.recipientLabel,
      recipientName: access.recipientName,
      recipientEmail: access.recipientEmail,
      recipientPhone: access.recipientPhone,
      status: access.status,
      formSchemaJson: JSON.stringify(access.formSchema ?? []),
      expiresAt: access.expiresAt.toISOString(),
      maxUses: access.maxUses,
      useCount: access.useCount,
      oneTime: access.oneTime,
      allowFileUploads: access.allowFileUploads,
      createdAt: access.createdAt.toISOString(),
      lastAccessedAt: access.lastAccessedAt?.toISOString() ?? null,
      completedAt: access.completedAt?.toISOString() ?? null,
      propertyTitle: String(snapshot.title ?? `Property ${workspace?.propertyId ?? ''}`),
      propertyLocation: String(snapshot.location ?? ''),
      publicUrl: `${publicBaseUrl}/property-request/${access.accessToken}`,
      accessToken: access.accessToken,
      qrDataUrl: null,
      submissionCount,
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
