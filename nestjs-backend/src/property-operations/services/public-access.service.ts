import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import * as QRCode from 'qrcode';
import { CreatePublicAccessDto, SubmitPublicRequestDto } from '../dto/public-access.dto';
import { isModuleKey } from '../module-catalog';
import { OperationsRecord, OperationsRecordDocument, OperationsWorkspace, OperationsWorkspaceDocument } from '../schemas/operations.schema';
import { PublicAccess, PublicAccessDocument, PublicSubmission, PublicSubmissionDocument } from '../schemas/public-access.schema';
import { ActivityService } from './activity.service';
import { SettingsService } from './settings.service';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class PublicAccessService {
  constructor(
    @InjectModel(PublicAccess.name) private readonly links: Model<PublicAccessDocument>,
    @InjectModel(PublicSubmission.name) private readonly submissions: Model<PublicSubmissionDocument>,
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    @InjectModel(OperationsWorkspace.name) private readonly workspaceModel: Model<OperationsWorkspaceDocument>,
    private readonly workspaces: WorkspaceService,
    private readonly settings: SettingsService,
    private readonly activity: ActivityService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePublicAccessDto) {
    if (!isModuleKey(dto.moduleKey)) throw new BadRequestException('Unsupported module.');
    const workspace = await this.workspaces.findByPropertyId(dto.propertyId);
    const settings = await this.settings.get();
    const token = randomBytes(32).toString('hex');
    const item = await this.links.create({
      workspaceId: workspace._id,
      recordId: dto.recordId ? new Types.ObjectId(dto.recordId) : null,
      moduleKey: dto.moduleKey,
      title: dto.title,
      instructions: dto.instructions ?? '',
      recipientLabel: dto.recipientLabel ?? 'External participant',
      recipientName: dto.recipientName ?? '',
      recipientEmail: dto.recipientEmail?.toLowerCase() ?? '',
      recipientPhone: dto.recipientPhone ?? '',
      tokenHash: this.hash(token),
      formSchema: dto.formSchema ?? [],
      expiresAt: new Date(Date.now() + (dto.expiryHours ?? settings.defaultExpiryHours) * 3600000),
      maxUses: dto.maxUses ?? settings.defaultMaxUses,
      oneTime: dto.oneTime ?? settings.defaultOneTime,
      allowFileUploads: dto.allowFileUploads ?? settings.allowFileUploads,
    });
    const baseUrl = (settings.publicBaseUrl || this.config.get<string>('PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const publicUrl = `${baseUrl}/property-request/${token}`;
    await this.activity.add({ workspaceId: workspace._id, moduleKey: dto.moduleKey, action: 'public-link-created', entityType: 'PublicAccess', entityId: String(item._id), summary: `${dto.title} link created for ${item.recipientLabel}.` });
    return { ...this.map(item.toObject(), workspace), publicUrl, accessToken: token, qrDataUrl: await QRCode.toDataURL(publicUrl, { width: 360, margin: 2 }) };
  }

  async list(propertyId?: number) {
    const workspaceIds = propertyId
      ? [(await this.workspaces.findByPropertyId(propertyId))._id]
      : (await this.workspaceModel.find().select('_id').lean()).map((item) => item._id);
    const [items, workspaceList] = await Promise.all([
      this.links.find({ workspaceId: { $in: workspaceIds } }).sort({ createdAt: -1 }).lean(),
      this.workspaceModel.find({ _id: { $in: workspaceIds } }).lean(),
    ]);
    const workspaceMap = new Map(workspaceList.map((item) => [String(item._id), item]));
    return Promise.all(items.map(async (item) => ({
      ...this.map(item, workspaceMap.get(String(item.workspaceId))),
      submissionCount: await this.submissions.countDocuments({ publicAccessId: item._id }),
    })));
  }

  async revoke(id: string) {
    const item = await this.links.findById(id);
    if (!item) return;
    item.status = 'Revoked';
    item.revokedAt = new Date();
    await item.save();
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'public-link-revoked', entityType: 'PublicAccess', entityId: id, summary: `${item.title} link revoked.` });
  }

  async listSubmissions(accessId: string) {
    return this.submissions.find({ publicAccessId: accessId }).sort({ submittedAt: -1 }).lean();
  }

  async getPublic(token: string) {
    const item = await this.findAccess(token, true);
    const [workspace, settings, linkedRecord] = await Promise.all([
      this.workspaceModel.findById(item.workspaceId).lean(),
      this.settings.get(),
      item.recordId ? this.records.findById(item.recordId).lean() : null,
    ]);
    if (!workspace) throw new NotFoundException('Property request was not found.');
    item.lastAccessedAt = new Date();
    await item.save();
    const stripeConfigured = Boolean(this.config.get<string>('STRIPE_SECRET_KEY'));
    const payableRecord = linkedRecord && ['billing', 'finance'].includes(linkedRecord.moduleKey) ? linkedRecord : null;
    return {
      businessName: settings.businessName, logoUrl: settings.logoUrl, brandColor: settings.brandColor,
      welcomeMessage: settings.welcomeMessage, termsText: settings.termsText,
      requireName: settings.requireName, requireEmail: settings.requireEmail, requirePhone: settings.requirePhone,
      allowFileUploads: item.allowFileUploads, showPropertyAddress: settings.showPropertyAddress,
      propertyTitle: workspace.property.title, propertyLocation: workspace.property.location,
      moduleKey: item.moduleKey, title: item.title, instructions: item.instructions,
      recipientLabel: item.recipientLabel, formSchema: item.formSchema,
      formSchemaJson: JSON.stringify(item.formSchema), expiresAt: item.expiresAt,
      remainingUses: Math.max(0, item.maxUses - item.useCount),
      requestStatus: item.status,
      linkedRecordId: linkedRecord ? String(linkedRecord._id) : null,
      linkedRecordStatus: linkedRecord?.status ?? null,
      paymentEnabled: Boolean(stripeConfigured && payableRecord?.amount && payableRecord.amount > 0 && payableRecord.status !== 'Paid'),
      paymentAmount: payableRecord?.amount ?? null,
      paymentCurrency: (this.config.get<string>('STRIPE_DEFAULT_CURRENCY') ?? 'usd').toUpperCase(),
      paymentVerified: payableRecord?.status === 'Paid',
      stripeCheckoutStatus: item.stripeCheckoutStatus || null,
    };
  }

  async submit(token: string, dto: SubmitPublicRequestDto) {
    const item = await this.findAccess(token);
    const settings = await this.settings.get();
    if (settings.requireName && !dto.responderName?.trim()) throw new BadRequestException('Name is required.');
    if (settings.requireEmail && !dto.responderEmail?.trim()) throw new BadRequestException('Email is required.');
    if (settings.requirePhone && !dto.responderPhone?.trim()) throw new BadRequestException('Phone is required.');
    const submission = await this.submissions.create({
      publicAccessId: item._id,
      responderName: dto.responderName ?? '', responderEmail: dto.responderEmail?.toLowerCase() ?? '',
      responderPhone: dto.responderPhone ?? '', notes: dto.notes ?? '',
      response: dto.response ?? {}, attachmentUrls: dto.attachmentUrls ?? [],
    });
    item.useCount += 1;
    item.lastAccessedAt = new Date();
    if (item.oneTime || item.useCount >= item.maxUses) {
      item.status = 'Completed';
      item.completedAt = new Date();
    }
    await item.save();
    if (settings.autoCloseRecordOnSubmit && item.recordId) {
      await this.records.findByIdAndUpdate(item.recordId, { status: 'Completed', completedAt: new Date() });
    }
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'anonymous-submission', entityType: 'PublicSubmission', entityId: String(submission._id), actorType: 'External', summary: `Response submitted for ${item.title}.`, metadata: dto.response });
    return { id: String(submission._id), ...submission.toObject() };
  }

  async deleteByWorkspace(workspaceId: Types.ObjectId) {
    const ids = await this.links.find({ workspaceId }).distinct('_id');
    await Promise.all([this.submissions.deleteMany({ publicAccessId: { $in: ids } }), this.links.deleteMany({ workspaceId })]);
  }

  private async findAccess(token: string, allowCompleted = false) {
    const item = await this.links.findOne({ tokenHash: this.hash(token) });
    if (!item) throw new NotFoundException('This request link is invalid.');
    if (item.status === 'Revoked') throw new GoneException('This request link was revoked.');
    if (item.expiresAt.getTime() <= Date.now()) {
      item.status = 'Expired';
      await item.save();
      throw new GoneException('This request link has expired.');
    }
    if (!allowCompleted && (item.status === 'Completed' || item.useCount >= item.maxUses)) throw new GoneException('This request has already been completed.');
    return item;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private map(item: any, workspace?: any) {
    return {
      id: String(item._id), propertyId: workspace?.propertyId, recordId: item.recordId ? String(item.recordId) : null,
      moduleKey: item.moduleKey, title: item.title, instructions: item.instructions,
      recipientLabel: item.recipientLabel, recipientName: item.recipientName,
      recipientEmail: item.recipientEmail, recipientPhone: item.recipientPhone,
      status: item.status, formSchema: item.formSchema, formSchemaJson: JSON.stringify(item.formSchema ?? []),
      expiresAt: item.expiresAt, maxUses: item.maxUses, useCount: item.useCount,
      oneTime: item.oneTime, allowFileUploads: item.allowFileUploads,
      propertyTitle: workspace?.property?.title ?? '', propertyLocation: workspace?.property?.location ?? '',
      createdAt: item.createdAt, lastAccessedAt: item.lastAccessedAt, completedAt: item.completedAt,
      publicUrl: null, accessToken: null,
    };
  }
}
