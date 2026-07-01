import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry, leadHistoryKindDb, leadHistoryStatusDb } from './entities/lead-history.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { SettingsService } from '../settings/settings.service';
import { SmsService } from '../sms/sms.service';
import { DocumentRepositoryItem } from '../documents/entities/document.entity';

@Injectable()
export class LeadOutreachService {
  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(DealPipeline)
    private dealRepo: Repository<DealPipeline>,
    @InjectRepository(DocumentRepositoryItem)
    private documentRepo: Repository<DocumentRepositoryItem>,
    private settingsService: SettingsService,
    private smsService: SmsService,
  ) {}

  async getTemplates() {
    const settings = await this.settingsService.getAdminSettings();
    return settings.communicationTemplates ?? [];
  }

  async getSchedule(leadId?: number, kind?: string, status?: string) {
    const qb = this.historyRepo.createQueryBuilder('history')
      .leftJoinAndSelect('history.lead', 'lead')
      .where('history.kind IN (:...kinds)', { kinds: ['Email', 'Sms', 'Call'].map(leadHistoryKindDb) });

    if (leadId) qb.andWhere('history.lead_id = :leadId', { leadId });
    if (kind) qb.andWhere('history.kind = :kind', { kind: leadHistoryKindDb(kind) });
    if (status) qb.andWhere('history.status = :status', { status: leadHistoryStatusDb(status) });

    const rows = await qb
      .orderBy('CASE WHEN history.status = 1 THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('history.scheduledAt', 'ASC', 'NULLS LAST')
      .addOrderBy('history.createdAt', 'ASC')
      .addOrderBy('history.id', 'ASC')
      .getMany();

    return rows.map((entry) => this.mapSchedule(entry));
  }

  async getCallScript(historyEntryId?: number, provider?: string, message?: string, title?: string) {
    const body = message || (historyEntryId ? (await this.historyRepo.findOne({ where: { id: historyEntryId } }))?.body : '') || title || '';
    if (!body.trim()) {
      return null;
    }
    const safe = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return (provider ?? '').toLowerCase() === 'plivo'
      ? `<Response><Speak>${safe}</Speak></Response>`
      : `<Response><Say>${safe}</Say></Response>`;
  }

  async sendOutreach(dto: any) {
    if (!dto.leadId) throw new BadRequestException('Lead id is required.');
    if (!['Email', 'Sms', 'Call'].includes(dto.kind ?? 'Email')) {
      throw new BadRequestException('Only email, SMS, and call outreach are supported.');
    }
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
    const propertyDocuments = dto.attachPropertyDocuments !== false && !shouldSchedule && ['Email', 'Sms'].includes(kind)
      ? await this.findPropertyDocuments(lead.property)
      : [];
    const mediaUrls = [...this.stringList(dto.mediaUrls), ...propertyDocuments.map((doc) => doc.fileUrl)];
    if (kind === 'Sms' && lead.inBoard) {
      shouldSchedule = false;
      status = 'Failed';
      sendFailure = ' SMS auto-send canceled because lead is already on the board.';
    }
    if (!shouldSchedule && kind === 'Sms' && hasTarget) {
      const sms = status === 'Failed'
        ? { status }
        : await this.smsService.send({ leadId: lead.id, body: dto.message.trim(), mediaUrls, skipHistory: true }, dto.createdBy?.trim() || 'CRM');
      if (sms.status === 'Failed') {
        status = 'Failed';
        sendFailure ||= ' Provider send failed.';
      }
    }
    if (!shouldSchedule && kind === 'Email' && hasTarget) {
      await this.sendEmailViaSmtp(lead.email, dto.title, dto.message, propertyDocuments);
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
      body: this.bodyWithDocuments(dto.message.trim(), propertyDocuments),
      provider,
      createdBy: dto.createdBy?.trim() || 'CRM',
      scheduledAt: shouldSchedule ? scheduledAt : null,
      occurredAt: shouldSchedule ? null : now,
    });
    const saved = await this.historyRepo.save(entry);

    if (['Sent', 'Completed'].includes(status)) {
      lead.lastActivityAt = now;
      lead.updatedAt = now;
      if (lead.stage === 'New') {
        lead.stage = 'Contacted' as any;
        lead.inBoard = true;
      }
      await this.leadRepo.save(lead);
    }
    if (status === 'Sent' && ['Email', 'Sms'].includes(kind) && dto.templateId) {
      await this.queueFollowUpTemplates(lead, kind, dto.templateId, provider, dto.createdBy?.trim() || 'CRM', now);
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
    };
  }

  private providerName(kind: string) {
    return kind === 'Email' ? 'SMTP Mail' : kind === 'Sms' ? 'CRM SMS' : 'CRM Call';
  }

  private async findPropertyDocuments(propertyText: string) {
    const normalized = `${propertyText ?? ''}`.trim().toLowerCase();
    if (!normalized) return [];
    const docs = await this.documentRepo.find({ where: { documentType: 'Property' as any } });
    return docs.filter((doc) => {
      const title = `${doc.propertyTitle || doc.title || ''}`.trim().toLowerCase();
      return title && (normalized.includes(title) || title.includes(normalized));
    });
  }

  private async sendEmailViaSmtp(to: string, subject: string, message: string, docs: DocumentRepositoryItem[]) {
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

  private bodyWithDocuments(body: string, docs: DocumentRepositoryItem[]) {
    return [body, ...docs.map((doc) => `Attached document: ${doc.title} - ${doc.fileUrl}`)].filter(Boolean).join('\n');
  }

  private stringList(value: any) {
    return Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
  }

  private async queueFollowUpTemplates(lead: Lead, kind: string, templateId: string, provider: string, createdBy: string, now: Date) {
    if (kind === 'Sms' && lead.inBoard) return;
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
        title: kind === 'Email' ? this.resolveTemplateTokens(template.subject || template.name, lead) : template.name,
        summary: this.scheduledSummary(lead, kind, scheduledAt),
        body: this.resolveTemplateTokens(template.body || '', lead),
        provider,
        createdBy,
        scheduledAt,
        occurredAt: null,
      }));
    }
  }

  private sequenceRank(value: string) {
    return value === 'FollowUp1' ? 1 : value === 'FollowUp2' ? 2 : value === 'FollowUp3' ? 3 : 0;
  }

  private resolveTemplateTokens(text: string, lead: Lead) {
    return `${text ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Client')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our agent')
      .replaceAll('{{agency_name}}', 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the requested time')
      .replaceAll('{{closing_date}}', lead.timeline || 'the scheduled date');
  }

  private scheduledSummary(lead: Lead, kind: string, scheduledAt: Date) {
    const target = kind === 'Email' ? lead.email : lead.phone;
    const label = kind === 'Call' ? 'Call' : kind === 'Sms' ? 'SMS' : 'Email';
    return `${label} scheduled for ${scheduledAt.toISOString()} to ${target || 'the lead'}.`;
  }
}
