import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry, leadHistoryDirectionDb, leadHistoryKindDb, leadHistoryStatusDb } from './entities/lead-history.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { SettingsService } from '../settings/settings.service';
import { SmsService } from '../sms/sms.service';
import { DocumentRepositoryItem, documentTypeDb } from '../documents/entities/document.entity';
import { Property } from '../properties/entities/property.entity';
import { PdfsService } from '../pdfs/pdfs.service';

type OutreachDocument = {
  title: string;
  fileName: string;
  fileUrl: string;
};

@Injectable()
export class LeadOutreachService {
  constructor(
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private historyRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(DealPipeline) private dealRepo: Repository<DealPipeline>,
    @InjectRepository(DocumentRepositoryItem) private documentRepo: Repository<DocumentRepositoryItem>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    private settingsService: SettingsService,
    private smsService: SmsService,
    @Optional() private pdfsService?: PdfsService,
  ) {}

  async getTemplates() {
    const settings = await this.settingsService.getAdminSettings();
    return settings.communicationTemplates ?? [];
  }

  async getSchedule(leadId?: number, kind?: string, status?: string) {
    const qb = this.historyRepo.createQueryBuilder('history')
      .leftJoinAndSelect('history.lead', 'lead')
      .where('history.kind IN (:...kinds)', { kinds: ['Email', 'Sms', 'Call', 'MailInbox'].map(leadHistoryKindDb) });
    if (leadId) qb.andWhere('history.lead_id = :leadId', { leadId });
    if (kind) qb.andWhere('history.kind = :kind', { kind: leadHistoryKindDb(kind) });
    if (status) qb.andWhere('history.status = :status', { status: leadHistoryStatusDb(status) });
    const rows = await qb.orderBy('CASE WHEN history.status = 1 THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('history.scheduledAt', 'ASC', 'NULLS LAST')
      .addOrderBy('history.createdAt', 'ASC')
      .addOrderBy('history.id', 'ASC')
      .getMany();
    return rows.map((entry) => this.mapSchedule(entry));
  }

  async getCallScript(historyEntryId?: number, provider?: string, message?: string, title?: string) {
    const body = message || (historyEntryId ? (await this.historyRepo.findOne({ where: { id: historyEntryId } }))?.body : '') || title || '';
    if (!body.trim()) return null;
    const safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    return (provider ?? '').toLowerCase() === 'plivo'
      ? `<Response><Speak>${safe}</Speak></Response>`
      : `<Response><Say>${safe}</Say></Response>`;
  }

  async updateScheduleStatus(id: number, status: 'active' | 'paused' | 'cancelled') {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('Schedule item id is required.');
    if (!['active', 'paused', 'cancelled'].includes(status)) throw new BadRequestException('Invalid schedule status.');

    const entry = await this.historyRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!entry) throw new NotFoundException('Schedule item was not found.');
    if (!['Email', 'Sms', 'Call'].includes(String(entry.kind))) throw new BadRequestException('Only lead outreach items can be controlled here.');

    if (status === 'active') {
      if (!entry.scheduledAt) throw new BadRequestException('Only scheduled outreach can be resumed.');
      entry.status = 'Scheduled';
      entry.direction = 'Scheduled';
      entry.occurredAt = null;
      entry.summary = this.scheduledSummary(entry.lead, entry.kind, entry.scheduledAt);
    } else {
      entry.status = 'Failed';
      entry.direction = 'System';
      entry.occurredAt = new Date();
      entry.summary = status === 'paused'
        ? 'Scheduled outreach paused from Lead Activity.'
        : 'Scheduled outreach canceled from Lead Activity.';
    }

    return this.mapSchedule(await this.historyRepo.save(entry));
  }

  async markRead(ids: number[], isRead = true) {
    const cleanIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (cleanIds.length === 0) throw new BadRequestException('Choose at least one reply.');

    await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({ isRead })
      .where('id IN (:...ids)', { ids: cleanIds })
      .andWhere('direction = :direction', { direction: leadHistoryDirectionDb('Incoming') })
      .execute();

    return { ids: cleanIds, isRead };
  }

  async sendOutreach(dto: any) {
    if (!dto.leadId) throw new BadRequestException('Lead id is required.');
    if (!['Email', 'Sms', 'Call'].includes(dto.kind ?? 'Email')) throw new BadRequestException('Only email, SMS, and call outreach are supported.');
    if (!dto.message?.trim()) throw new BadRequestException('Add a message before sending or scheduling outreach.');
    if ((dto.kind ?? 'Email') === 'Email' && !dto.title?.trim()) throw new BadRequestException('Email subject is required.');

    const lead = await this.leadRepo.findOne({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead was not found.');

    const now = new Date();
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    let shouldSchedule = !!scheduledAt && scheduledAt.getTime() > now.getTime() + 30_000;
    const kind = dto.kind ?? 'Email';
    const provider = kind === 'Sms' ? (await this.settingsService.getCommunicationConfig())?.providerName ?? this.providerName(kind) : this.providerName(kind);
    const hasTarget = kind === 'Email' ? !!lead.email : !!lead.phone;
    let status = shouldSchedule ? 'Scheduled' : hasTarget ? (kind === 'Call' ? 'Completed' : 'Sent') : 'Failed';
    let sendFailure = '';
    const attachmentMode = ['none', 'property', 'pdf', 'document'].includes(dto.attachmentMode)
      ? dto.attachmentMode
      : dto.attachPropertyDocuments !== false ? 'property' : 'none';
    const propertyDocuments = attachmentMode === 'property' && !shouldSchedule && ['Email', 'Sms'].includes(kind)
      ? await this.findPropertyDocuments(lead.property)
      : [];
    const source = `${dto.createdBy ?? ''}`;
    const trustedSmsSequence = source.startsWith('Realtor Showing #') || source.startsWith('Lead Intake:');
    if (kind === 'Sms' && lead.inBoard && !trustedSmsSequence) {
      shouldSchedule = false;
      status = 'Failed';
      sendFailure = ' SMS auto-send canceled because lead is already on the board.';
    }
    const generatedPdfDocuments = dto.pdfTemplateId && !shouldSchedule && status !== 'Failed' && ['Email', 'Sms'].includes(kind)
      ? await this.generatePdfDocument(dto.pdfTemplateId, lead, dto.createdBy)
      : [];
    const configuredDocuments = attachmentMode === 'document' && !shouldSchedule && status !== 'Failed' && ['Email', 'Sms'].includes(kind)
      ? await this.findConfiguredDocuments(lead, dto.attachmentDocumentType, dto.attachmentDocumentCategory)
      : [];
    const selectedDocuments = !shouldSchedule && status !== 'Failed' && ['Email', 'Sms'].includes(kind)
      ? await this.findMediaDocuments(dto.mediaUrls)
      : [];
    const allDocuments = [...propertyDocuments, ...configuredDocuments, ...generatedPdfDocuments, ...selectedDocuments]
      .filter((doc, index, documents) => documents.findIndex((item) => item.fileUrl === doc.fileUrl) === index);
    const mediaUrls = [...new Set([...this.stringList(dto.mediaUrls), ...allDocuments.map((doc) => doc.fileUrl)])];
    if (!shouldSchedule && kind === 'Sms' && hasTarget) {
      const sms = status === 'Failed'
        ? { status }
        : await this.smsService.send({
          leadId: lead.id,
          body: dto.message.trim(),
          mediaUrls,
          skipHistory: true,
          // Outreach records the final delivery result itself so manual and cron
          // sends produce one authoritative lead-history entry.
          throwOnFailure: false,
        }, dto.createdBy?.trim() || 'CRM');
      if (sms.status === 'Failed') {
        status = 'Failed';
        const providerError = 'error' in sms ? sms.error : null;
        sendFailure ||= ` ${providerError || 'Provider send failed.'}`;
      }
    }
    if (!shouldSchedule && kind === 'Email' && hasTarget) {
      await this.sendEmailViaSmtp(lead.email, dto.title, dto.message, allDocuments);
    }
    const summary = shouldSchedule
      ? this.scheduledSummary(lead, kind, scheduledAt!)
      : status === 'Failed' && sendFailure.trim()
        ? `${kind === 'Email' ? 'Email delivery failed' : kind === 'Sms' ? 'SMS delivery failed' : 'Call failed'} for ${lead.name}.${sendFailure}`
        : hasTarget
          ? `${kind === 'Email' ? 'Email sent to' : kind === 'Sms' ? 'SMS sent to' : 'Call triggered to'} ${kind === 'Email' ? lead.email : lead.phone} via ${provider}.${sendFailure}`
          : `${kind === 'Email' ? 'Email delivery failed because the lead does not have an email address.' : kind === 'Sms' ? 'SMS delivery failed because the lead does not have a phone number.' : 'Call could not be triggered because the lead does not have a phone number.'}`;

    const entry = this.historyRepo.create({
      leadId: lead.id,
      kind,
      direction: shouldSchedule ? 'Scheduled' : 'Outgoing',
      status,
      title: status === 'Failed' ? `${dto.title || `${kind} outreach`} failed` : (dto.title || `${kind} outreach`),
      summary,
      body: this.bodyWithDocuments(dto.message.trim(), allDocuments),
      provider,
      createdBy: dto.createdBy?.trim() || 'CRM',
      outreachConfig: shouldSchedule ? {
        attachPropertyDocuments: dto.attachPropertyDocuments !== false,
        attachmentDocumentCategory: dto.attachmentDocumentCategory,
        attachmentDocumentType: dto.attachmentDocumentType,
        attachmentMode,
        mediaUrls: this.stringList(dto.mediaUrls),
        pdfTemplateId: dto.pdfTemplateId,
        templateId: dto.templateId,
      } : {},
      scheduledAt: shouldSchedule ? scheduledAt : null,
      occurredAt: shouldSchedule ? null : now,
    });
    const saved = await this.historyRepo.save(entry);

    if (['Sent', 'Completed'].includes(status)) {
      lead.lastActivityAt = now;
      lead.updatedAt = now;
      const selectedTemplate = dto.templateId
        ? (await this.getTemplates()).find((item: any) => `${item.id}` === `${dto.templateId}`)
        : null;
      if (`${selectedTemplate?.sequenceType ?? ''}`.startsWith('FollowUp') && !['Deal', 'Canceled'].includes(String(lead.stage))) {
        lead.stage = 'FollowUp' as any;
        lead.inBoard = true;
      } else if (lead.stage === 'New') {
        lead.stage = 'Contacted' as any;
        lead.inBoard = true;
      }
      await this.leadRepo.save(lead);
    }
    if ((status === 'Sent' || status === 'Scheduled') && ['Email', 'Sms'].includes(kind) && dto.templateId) {
      await this.queueFollowUpTemplates(lead, kind, dto.templateId, provider, dto.createdBy?.trim() || 'CRM', shouldSchedule ? scheduledAt! : now);
    }
    if (status === 'Sent' && ['Email', 'Sms'].includes(kind) && !source.startsWith('Realtor Showing #')) {
      await this.cancelRealtorFollowUpsAfterManualMessage(lead.id, now);
    }
    return this.mapHistory(saved);
  }

  async sendBulkOutreach(dto: any) {
    const targets = await this.resolveAudience(dto);
    if (targets.length === 0) throw new BadRequestException('No matching leads were found for the selected audience.');
    const failures: string[] = [];
    let savedCount = 0;
    for (const lead of targets) {
      try {
        const result = await this.sendOutreach({ ...dto, leadId: lead.id });
        if (result.status === 'Failed') failures.push(`${lead.name}: ${result.summary}`);
        else savedCount++;
      } catch (error: any) {
        failures.push(`${lead.name}: ${error.message}`);
      }
    }
    return {
      audienceType: dto.audienceType ?? 'LeadStage',
      audienceLabel: dto.leadStage ?? dto.dealStage ?? '',
      matchedCount: targets.length,
      savedCount,
      skippedCount: 0,
      failedCount: failures.length,
      failures,
    };
  }

  private async resolveAudience(dto: any) {
    if ((dto.audienceType ?? 'LeadStage') === 'DealStage') {
      if (!dto.dealStage) throw new BadRequestException('Choose a deal stage before scheduling bulk outreach.');
      const deals = await this.dealRepo.find({ where: { stage: dto.dealStage }, relations: ['sourceLead'] });
      return deals.map((deal) => deal.sourceLead).filter(Boolean);
    }
    if (!dto.leadStage) throw new BadRequestException('Choose a lead stage before scheduling bulk outreach.');
    return this.leadRepo.find({ where: { stage: dto.leadStage } });
  }

  private mapHistory(entry: LeadHistoryEntry) {
    return {
      id: entry.id,
      leadId: entry.leadId,
      kind: entry.kind,
      direction: entry.direction,
      status: entry.status,
      title: entry.title,
      summary: entry.summary,
      body: entry.body,
      provider: entry.provider,
      createdBy: entry.createdBy,
      isRead: entry.isRead,
      scheduledAt: entry.scheduledAt ?? null,
      occurredAt: entry.occurredAt ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private mapSchedule(entry: LeadHistoryEntry) {
    return {
      ...this.mapHistory(entry),
      leadName: entry.lead?.name ?? '',
      leadEmail: entry.lead?.email ?? '',
      leadPhone: entry.lead?.phone ?? '',
      leadProperty: entry.lead?.property ?? '',
      leadPropertyId: entry.lead?.propertyId ?? null,
      leadStage: entry.lead?.stage ?? '',
      leadPriority: entry.lead?.priority ?? '',
    };
  }

  private providerName(kind: string) {
    return kind === 'Email' ? 'SMTP Mail' : kind === 'Sms' ? 'CRM SMS' : 'CRM Call';
  }

  private async findPropertyDocuments(propertyText: string) {
    const normalized = `${propertyText ?? ''}`.trim().toLowerCase();
    if (!normalized) return [];
    const [docs, properties] = await Promise.all([
      this.documentRepo.find({ where: { documentType: 'Property' as any } }),
      this.propertyRepo.find(),
    ]);
    const repositoryDocs = docs.filter((doc) => {
      const title = `${doc.propertyTitle || doc.title || ''}`.trim().toLowerCase();
      return title && (normalized.includes(title) || title.includes(normalized));
    });
    const embeddedDocs = properties
      .filter((property) => {
        const title = `${property.title ?? ''}`.trim().toLowerCase();
        return title && (normalized.includes(title) || title.includes(normalized));
      })
      .flatMap((property) => (property.propertyDocuments ?? []).map((doc) => ({
        title: doc.name,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
      })));
    return [...repositoryDocs, ...embeddedDocs];
  }

  private async findConfiguredDocuments(lead: Lead, documentType?: string, category?: string) {
    const qb = this.documentRepo.createQueryBuilder('doc');
    const cleanType = `${documentType ?? ''}`.trim();
    const cleanCategory = `${category ?? ''}`.trim();
    if (cleanType) qb.andWhere('doc.document_type = :documentType', { documentType: documentTypeDb(cleanType) });
    if (cleanCategory) qb.andWhere('LOWER(doc.category) = :category', { category: cleanCategory.toLowerCase() });
    if (cleanType === 'Property') {
      if (lead.propertyId) {
        qb.andWhere('doc.property_id = :propertyId', { propertyId: lead.propertyId });
      } else {
        const property = `${lead.property ?? ''}`.trim().toLowerCase();
        if (!property) return [];
        qb.andWhere('(LOWER(doc.property_title) = :property OR LOWER(doc.title) = :property)', { property });
      }
    } else if (!cleanType) {
      const propertyType = documentTypeDb('Property');
      if (lead.propertyId) {
        qb.andWhere('(doc.document_type <> :propertyType OR doc.property_id = :propertyId)', { propertyId: lead.propertyId, propertyType });
      } else {
        const property = `${lead.property ?? ''}`.trim().toLowerCase();
        qb.andWhere('(doc.document_type <> :propertyType OR LOWER(doc.property_title) = :property OR LOWER(doc.title) = :property)', { property, propertyType });
      }
    }
    const docs = await qb.orderBy('doc.updatedAt', 'DESC').take(25).getMany();
    return docs.map((doc) => ({ title: doc.title, fileName: doc.fileName, fileUrl: doc.fileUrl }));
  }

  private async findMediaDocuments(mediaUrls: unknown) {
    const urls = this.stringList(mediaUrls);
    if (urls.length === 0) return [];
    const docs = await this.documentRepo.createQueryBuilder('doc')
      .where('doc.file_url IN (:...urls)', { urls })
      .getMany();
    const byUrl = new Map(docs.map((doc) => [doc.fileUrl, doc]));
    return urls.map((url) => {
      const doc = byUrl.get(url);
      const fallbackName = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'attachment');
      return { title: doc?.title || fallbackName, fileName: doc?.fileName || fallbackName, fileUrl: url };
    });
  }

  private async sendEmailViaSmtp(to: string, subject: string, message: string, docs: OutreachDocument[]) {
    const config = await this.settingsService.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) return;
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port ?? 587,
      secure: !!config.useSsl && Number(config.port ?? 587) === 465,
      auth: { user: config.username, pass: config.password },
    });
    await transporter.sendMail({
      attachments: docs.map((doc) => ({ filename: doc.fileName || doc.title, path: doc.fileUrl })),
      from: config.fromName ? `"${config.fromName}" <${config.fromEmail || config.username}>` : (config.fromEmail || config.username),
      html: `${message}`.replace(/\n/g, '<br>'),
      subject,
      text: message,
      to,
    });
  }

  private bodyWithDocuments(body: string, docs: OutreachDocument[]) {
    return [body, ...docs.map((doc) => `Attached document: ${doc.title} - ${doc.fileUrl}`)].filter(Boolean).join('\n');
  }

  private async generatePdfDocument(templateId: number | string, lead: Lead, generatedBy?: string): Promise<OutreachDocument[]> {
    if (!this.pdfsService) return [];
    const result = await this.pdfsService.generatePdf({
      allowMissing: true,
      generatedBy: `${generatedBy ?? 'CRM'}`.trim(),
      leadId: lead.id,
      propertyId: lead.propertyId ?? null,
      templateId: Number(templateId),
    });
    return [{
      title: result.generation.templateName || result.fileName,
      fileName: result.fileName,
      fileUrl: result.downloadUrl,
    }];
  }

  private stringList(value: any) {
    return Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
  }

  private async cancelRealtorFollowUpsAfterManualMessage(leadId: number, contactedAt: Date) {
    const initialMessageExists = await this.historyRepo.createQueryBuilder('history')
      .where('history.lead_id = :leadId', { leadId })
      .andWhere("history.created_by LIKE 'Realtor Showing #%'")
      .andWhere("history.created_by NOT LIKE '% Follow-up'")
      .andWhere('history.status IN (:...statuses)', { statuses: ['Sent', 'Completed'].map(leadHistoryStatusDb) })
      .getExists();
    if (!initialMessageExists) return;
    await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({
        occurredAt: contactedAt,
        status: 'Failed',
        summary: 'Realtor follow-up canceled because a manual message was sent after the first message.',
      })
      .where('lead_id = :leadId', { leadId })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .andWhere("created_by LIKE 'Realtor Showing #% Follow-up'")
      .execute();
    await this.leadRepo.update(leadId, {
      followUpStatus: 'Completed' as any,
      lastActivityAt: contactedAt,
      updatedAt: contactedAt,
    });
  }

  private async queueFollowUpTemplates(lead: Lead, kind: string, templateId: string, provider: string, createdBy: string, now: Date) {
    const settings = await this.settingsService.getAdminSettings();
    const templates = settings.communicationTemplates ?? [];
    const source = templates.find((item: any) => item.id === templateId);
    if (!source || (source.sequenceType ?? 'Direct') !== 'Direct') return;
    const channel = kind === 'Sms' ? 'SMS' : 'Email';
    const followUps = templates
      .filter((item: any) => item.id !== templateId)
      .filter((item: any) => item.isActive !== false)
      .filter((item: any) => (item.channels ?? []).includes(channel))
      .filter((item: any) => ['FollowUp1', 'FollowUp2', 'FollowUp3'].includes(item.sequenceType))
      .sort((left: any, right: any) => this.sequenceRank(left.sequenceType) - this.sequenceRank(right.sequenceType));
    for (const template of followUps) {
      const gapDays = Math.max(0, Number(template.gapDays ?? 0) || 0);
      if (gapDays <= 0) continue;
      const scheduledAt = new Date(now);
      scheduledAt.setDate(scheduledAt.getDate() + gapDays);
      await this.historyRepo.save(this.historyRepo.create({
        leadId: lead.id,
        kind,
        direction: 'Scheduled',
        status: 'Scheduled',
        title: kind === 'Email' ? this.resolveTemplateTokens(template.subject || template.name, lead, settings.profile?.agencyName) : template.name,
        summary: this.scheduledSummary(lead, kind, scheduledAt),
        body: this.resolveTemplateTokens(template.body || '', lead, settings.profile?.agencyName),
        provider,
        createdBy,
        outreachConfig: {
          attachPropertyDocuments: template.attachPropertyDocuments !== false,
          attachmentDocumentCategory: template.attachmentDocumentCategory,
          attachmentDocumentType: template.attachmentDocumentType,
          attachmentMode: template.attachmentMode ?? (template.attachPropertyDocuments !== false ? 'property' : 'none'),
          pdfTemplateId: template.pdfTemplateId,
          templateId: template.id,
        },
        scheduledAt,
        occurredAt: null,
      }));
    }
  }

  private sequenceRank(value: string) {
    return value === 'FollowUp1' ? 1 : value === 'FollowUp2' ? 2 : value === 'FollowUp3' ? 3 : 0;
  }

  private resolveTemplateTokens(text: string, lead: Lead, agencyName?: string) {
    return `${text ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Client')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our agent')
      .replaceAll('{{agency_name}}', agencyName || 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the requested time')
      .replaceAll('{{closing_date}}', lead.timeline || 'the scheduled date');
  }

  private scheduledSummary(lead: Lead, kind: string, scheduledAt: Date) {
    const target = kind === 'Email' ? lead.email : lead.phone;
    const label = kind === 'Call' ? 'Call' : kind === 'Sms' ? 'SMS' : 'Email';
    return `${label} scheduled for ${scheduledAt.toISOString()} to ${target || 'the lead'}.`;
  }
}
