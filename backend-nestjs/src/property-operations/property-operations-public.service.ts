import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import {
  PropertyOperationsPublicAccess,
  PropertyOperationsRecord,
  PropertyOperationsSubmission,
} from './property-operations.entity';
import { PropertyOperationsIntegrationService } from './property-operations-integration.service';
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
    private readonly integrations: PropertyOperationsIntegrationService,
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
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    const expiryHours = Math.max(1, Number(input?.expiryHours ?? settings.defaultExpiryHours));
    const expiresAt = input?.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + expiryHours * 3_600_000);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Public request expiry must be in the future.');
    }
    const recordId = input?.recordId ? Number(input.recordId) : null;
    const linkedRecord = recordId
      ? await this.recordRepository.findOne({ where: { id: recordId, workspaceId: workspace.id } })
      : null;
    if (recordId && !linkedRecord) throw new NotFoundException('The linked Property Operations record was not found.');
    const linkedAmount = linkedRecord && ['billing', 'finance'].includes(linkedRecord.moduleKey)
      ? Number(linkedRecord.amount ?? 0)
      : 0;
    const paymentAmount = input?.paymentAmount == null ? linkedAmount : Number(input.paymentAmount);

    const access = await this.accessRepository.save(this.accessRepository.create({
      workspaceId: workspace.id,
      recordId: linkedRecord?.id ?? null,
      moduleKey: String(input?.moduleKey ?? linkedRecord?.moduleKey ?? 'public-portals'),
      tokenHash: this.hash(token),
      accessToken: token,
      title: String(input?.title ?? linkedRecord?.title ?? 'Property request'),
      instructions: String(input?.instructions ?? linkedRecord?.description ?? ''),
      recipientLabel: String(input?.recipientLabel ?? linkedRecord?.contactLabel ?? ''),
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
      paymentAmount: paymentAmount > 0 ? String(paymentAmount) : null,
      paymentCurrency: String(input?.paymentCurrency ?? settings.currency ?? 'USD').toUpperCase(),
      paymentVerified: linkedRecord?.status === 'Paid',
      paymentSessionId: null,
      paymentTokenHash: null,
      lastAccessedAt: null,
      completedAt: null,
    }));
    await this.operationsService.logActivity(
      'External access created',
      `${access.title} link created.`,
      workspace.id,
      linkedRecord?.id,
      { action: 'external-access-created', sourceModule: access.moduleKey, accessId: access.id },
    );
    return this.accessDto(access, workspace, 0);
  }

  async revoke(id: number) {
    const access = await this.accessRepository.findOne({ where: { id } });
    if (!access) throw new NotFoundException('Public request link was not found.');
    access.status = 'Revoked';
    access.completedAt = new Date();
    await this.accessRepository.save(access);
    await this.operationsService.logActivity(
      'External access revoked',
      `${access.title} link revoked.`,
      access.workspaceId,
      access.recordId ?? undefined,
      { action: 'external-access-revoked', sourceModule: access.moduleKey, accessId: access.id },
    );
    return { message: 'Public request link revoked.' };
  }

  async submissions(accessId: number) {
    const access = await this.accessRepository.findOne({ where: { id: accessId } });
    if (!access) throw new NotFoundException('Public request link was not found.');
    const items = await this.submissionRepository.find({ where: { accessId }, order: { createdAt: 'DESC' } });
    return items.map((item) => ({
      id: String(item.id),
      responderName: item.responderName,
      responderEmail: item.responderEmail,
      responderPhone: item.responderPhone,
      notes: item.notes,
      response: item.response,
      attachmentUrls: item.attachmentUrls,
      submittedAt: item.createdAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async getRequest(token: string) {
    const access = await this.requireReadableAccess(token);
    access.lastAccessedAt = new Date();
    await this.accessRepository.save(access);
    const workspace = await this.operationsService.workspaceById(access.workspaceId);
    const settings = await this.operationsService.getSettings();
    const snapshot: any = workspace.propertySnapshot ?? {};
    const record = access.recordId ? await this.recordRepository.findOne({ where: { id: access.recordId } }) : null;
    const paymentConfigured = await this.integrations.hasPaymentProvider();
    return {
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      brandColor: settings.brandColor,
      currency: settings.currency,
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
      requestStatus: access.status,
      linkedRecordId: record ? String(record.id) : null,
      paymentEnabled: paymentConfigured && Boolean(access.paymentAmount && Number(access.paymentAmount) > 0),
      paymentAmount: access.paymentAmount == null ? null : Number(access.paymentAmount),
      paymentCurrency: access.paymentCurrency || settings.currency,
      paymentVerified: access.paymentVerified || record?.status === 'Paid',
      linkedRecordStatus: record?.status ?? null,
    };
  }

  async submit(token: string, input: any) {
    const access = await this.requireActiveAccess(token);
    const settings = await this.operationsService.getSettings();
    if (settings.requireName && !String(input?.responderName ?? '').trim()) throw new BadRequestException('Your name is required.');
    if (settings.requireEmail && !String(input?.responderEmail ?? '').trim()) throw new BadRequestException('Your email is required.');
    if (settings.requirePhone && !String(input?.responderPhone ?? '').trim()) throw new BadRequestException('Your phone number is required.');
    const responsePayload = input?.response && typeof input.response === 'object' ? input.response : {};
    const attachmentUrls = Array.isArray(input?.attachmentUrls) ? input.attachmentUrls.map(String) : [];
    this.validateRequiredFields(access.formSchema, responsePayload, attachmentUrls);

    const submission = await this.submissionRepository.save(this.submissionRepository.create({
      accessId: access.id,
      responderName: String(input?.responderName ?? ''),
      responderEmail: String(input?.responderEmail ?? ''),
      responderPhone: String(input?.responderPhone ?? ''),
      notes: String(input?.notes ?? ''),
      response: responsePayload,
      attachmentUrls,
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
          latestSubmission: responsePayload,
        };
        await this.recordRepository.save(record);
      }
    }
    await this.operationsService.logActivity(
      'External response submitted',
      `Response submitted for ${access.title}.`,
      access.workspaceId,
      access.recordId ?? undefined,
      { action: 'external-response-submitted', sourceModule: access.moduleKey, accessId: access.id, submissionId: submission.id },
    );
    return { id: String(submission.id), status: access.status, submittedAt: submission.createdAt.toISOString() };
  }

  async getStatus(token: string) {
    const access = await this.requireReadableAccess(token);
    if (!access.recordId) throw new NotFoundException('This public request is not linked to a record.');
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record) throw new NotFoundException('The linked Property Operations record was not found.');
    const history = await this.submissionRepository.find({ where: { accessId: access.id }, order: { createdAt: 'ASC' } });
    return {
      id: String(record.id), moduleKey: record.moduleKey, recordType: record.recordType,
      title: record.title, description: record.description, status: record.status, priority: record.priority,
      assignedTo: record.assignedTo, dueAt: record.dueAt?.toISOString() ?? null,
      amount: record.amount == null ? null : Number(record.amount), attachments: record.attachments ?? [],
      history: history.map((item) => ({
        id: String(item.id), responderName: item.responderName, notes: item.notes,
        response: item.response, attachmentUrls: item.attachmentUrls, createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async updateStatus(token: string, input: any) {
    const access = await this.requireActiveAccess(token);
    if (!access.recordId) throw new NotFoundException('This public request is not linked to a record.');
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record) throw new NotFoundException('The linked Property Operations record was not found.');
    const allowed = ['Acknowledged', 'In progress', 'Waiting', 'Resolved', 'Completed'];
    if (input?.status && !allowed.includes(String(input.status))) throw new BadRequestException('Unsupported public status.');
    if (input?.status) record.status = String(input.status);
    if (input?.notes) record.payload = { ...(record.payload ?? {}), publicStatusNote: String(input.notes), publicStatusUpdatedAt: new Date().toISOString() };
    record.completedAt = ['Resolved', 'Completed'].includes(record.status) ? new Date() : null;
    await this.recordRepository.save(record);
    await this.operationsService.logActivity(
      'Public status updated',
      `${record.title} marked ${record.status}.`,
      access.workspaceId,
      record.id,
      { action: 'public-status-updated', sourceModule: record.moduleKey, status: record.status },
    );
    return this.getStatus(token);
  }

  async createCheckout(token: string, successUrl: string, cancelUrl: string) {
    const access = await this.requireActiveAccess(token);
    if (!access.recordId) throw new NotFoundException('No billing record is linked to this request.');
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record || !['billing', 'finance'].includes(record.moduleKey)) throw new BadRequestException('Only billing or finance records can be paid.');
    const amount = Number(access.paymentAmount ?? record.amount ?? 0);
    if (amount <= 0) throw new BadRequestException('A positive billing amount is required.');
    const checkout = await this.integrations.createCheckout({
      amount,
      currency: access.paymentCurrency || 'USD',
      title: record.title,
      reference: String(record.id),
      successUrl,
      cancelUrl,
    });
    access.paymentSessionId = checkout.sessionId;
    access.paymentTokenHash = this.hash(checkout.paymentToken);
    await this.accessRepository.save(access);
    await this.operationsService.logActivity(
      'Checkout created',
      `Checkout created for ${record.title}.`,
      access.workspaceId,
      record.id,
      { action: 'checkout-created', sourceModule: record.moduleKey, amount, currency: access.paymentCurrency },
    );
    return { checkoutUrl: checkout.checkoutUrl, sessionId: checkout.sessionId, paymentToken: checkout.paymentToken };
  }

  async verifyCheckout(token: string, sessionId: string, paymentToken: string) {
    const access = await this.requireReadableAccess(token);
    if (!access.recordId) throw new NotFoundException('No billing record is linked to this request.');
    if (access.paymentSessionId && sessionId && access.paymentSessionId !== sessionId) throw new BadRequestException('Payment session does not match this request.');
    if (access.paymentTokenHash && paymentToken && access.paymentTokenHash !== this.hash(paymentToken)) throw new BadRequestException('Payment token is invalid.');
    const reference = sessionId || access.paymentSessionId || String(access.recordId);
    const verification = await this.integrations.verifyCheckout(reference, paymentToken);
    const record = await this.recordRepository.findOne({ where: { id: access.recordId } });
    if (!record) throw new NotFoundException('The linked billing record was not found.');
    if (verification.paid) {
      access.paymentVerified = true;
      access.status = 'Completed';
      access.completedAt = new Date();
      record.status = 'Paid';
      record.completedAt = new Date();
      record.payload = { ...(record.payload ?? {}), paymentReference: reference, paymentStatus: 'Paid' };
      await Promise.all([this.accessRepository.save(access), this.recordRepository.save(record)]);
      await this.operationsService.logActivity(
        'Payment verified',
        `${record.title} marked paid.`,
        access.workspaceId,
        record.id,
        { action: 'payment-verified', sourceModule: record.moduleKey, reference },
      );
    }
    return verification;
  }

  async assertUploadAllowed(token: string) {
    const access = await this.requireActiveAccess(token);
    if (!access.allowFileUploads) throw new BadRequestException('File uploads are disabled for this request.');
    return access;
  }

  private async requireActiveAccess(token: string) {
    const access = await this.requireReadableAccess(token);
    if (access.status !== 'Active') throw new GoneException('This public request link is no longer active.');
    if (access.useCount >= access.maxUses) throw new GoneException('This public request link has reached its usage limit.');
    return access;
  }

  private async requireReadableAccess(token: string) {
    const access = await this.requireAccess(token);
    if (access.status === 'Revoked') throw new GoneException('This public request link was revoked.');
    if (access.status === 'Expired' || access.expiresAt.getTime() <= Date.now()) {
      if (access.status !== 'Expired') {
        access.status = 'Expired';
        await this.accessRepository.save(access);
      }
      throw new GoneException('This public request link has expired.');
    }
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
    const publicUrl = `${publicBaseUrl}/property-request/${access.accessToken}`;
    return {
      id: String(access.id), propertyId: workspace?.propertyId ?? 0,
      recordId: access.recordId == null ? null : String(access.recordId), moduleKey: access.moduleKey,
      title: access.title, instructions: access.instructions, recipientLabel: access.recipientLabel,
      recipientName: access.recipientName, recipientEmail: access.recipientEmail, recipientPhone: access.recipientPhone,
      status: access.status, formSchemaJson: JSON.stringify(access.formSchema ?? []),
      expiresAt: access.expiresAt.toISOString(), maxUses: access.maxUses, useCount: access.useCount,
      oneTime: access.oneTime, allowFileUploads: access.allowFileUploads,
      createdAt: access.createdAt.toISOString(), lastAccessedAt: access.lastAccessedAt?.toISOString() ?? null,
      completedAt: access.completedAt?.toISOString() ?? null,
      propertyTitle: String(snapshot.title ?? `Property ${workspace?.propertyId ?? ''}`),
      propertyLocation: String(snapshot.location ?? ''),
      publicUrl,
      accessToken: access.accessToken,
      qrDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=2&data=${encodeURIComponent(publicUrl)}`,
      submissionCount,
      paymentAmount: access.paymentAmount == null ? null : Number(access.paymentAmount),
      paymentCurrency: access.paymentCurrency,
      paymentVerified: access.paymentVerified,
    };
  }

  private validateRequiredFields(schema: unknown[], response: Record<string, unknown>, attachments: string[]) {
    for (const raw of Array.isArray(schema) ? schema : []) {
      const field = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      if (field.required !== true) continue;
      const key = String(field.key ?? '');
      const type = String(field.type ?? 'text');
      const value = response[key];
      const missing = type === 'file'
        ? !attachments.length && !value
        : type === 'checkbox'
          ? value !== true
          : value == null || String(value).trim() === '';
      if (missing) throw new BadRequestException(`${String(field.label ?? key || 'Required field')} is required.`);
    }
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
