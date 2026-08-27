import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MailInboxItem, MailInboxStatus, mailInboxStatusDbValue } from './entities/mail.entity';
import { LeadsService } from '../leads/leads.service';
import { paginated, toInt } from '../common/api-contract';
import {
  isGmailReconnectRequired,
  refreshGmailAccessToken,
} from '../common/gmail-oauth';
import { SettingsService } from '../settings/settings.service';
import { Lead, LeadFollowUpStatus } from '../leads/entities/lead.entity';
import { LeadHistoryEntry, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { PdfsService } from '../pdfs/pdfs.service';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(MailInboxItem)
    private mailRepo: Repository<MailInboxItem>,
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    private leadsService: LeadsService,
    private settingsService: SettingsService,
    private pdfsService: PdfsService,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, status?: string, mailboxTag?: string, isRead?: string | boolean, isStarred?: string | boolean) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.mailRepo.createQueryBuilder('mail').leftJoinAndSelect('mail.lead', 'lead');
    if (search) {
      qb.andWhere('(mail.subject ILIKE :search OR mail.message ILIKE :search OR mail.email ILIKE :search OR mail.name ILIKE :search)', { search: `%${search}%` });
    }
    if (status) qb.andWhere('mail.status = :status', { status: mailInboxStatusDbValue(status) });
    if (mailboxTag) qb.andWhere('LOWER(mail.mailboxTag) = :mailboxTag', { mailboxTag: mailboxTag.trim().toLowerCase() });
    const readFilter = this.booleanFilter(isRead);
    const starredFilter = this.booleanFilter(isStarred);
    if (readFilter !== null) qb.andWhere('mail.isRead = :isRead', { isRead: readFilter });
    if (starredFilter !== null) qb.andWhere('mail.isStarred = :isStarred', { isStarred: starredFilter });
    const [items, total] = await qb
      .orderBy('mail.isRead', 'ASC')
      .addOrderBy('mail.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginated(items.map((item) => this.mapMail(item)), total, page, pageSize);
  }

  async findOne(id: number) {
    const item = await this.mailRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!item) throw new NotFoundException('Mail not found');
    return this.mapMail(item);
  }

  async create(dto: any) {
    const item = this.mailRepo.create({ ...this.toMailEntity(dto), status: MailInboxStatus.New, leadId: null } as DeepPartial<MailInboxItem>);
    return this.mapMail(await this.mailRepo.save(item));
  }

  async send(dto: any) {
    const to = `${dto.to ?? dto.email ?? ''}`.trim().toLowerCase();
    const subject = `${dto.subject ?? ''}`.trim();
    const message = `${dto.message ?? dto.body ?? ''}`.trim();
    const htmlBody = this.cleanOutgoingHtml(dto.htmlBody ?? dto.html ?? '');
    const plainBody = message || this.htmlToText(htmlBody);
    if (!to) throw new BadRequestException('Recipient email is required.');
    if (!subject) throw new BadRequestException('Subject is required.');
    const config = await this.settingsService.getSmtpConfig();
    if (config?.authType === 'gmail-oauth') {
      if (!config.gmailRefreshToken || !config.gmailEmail) throw new BadRequestException('Gmail is not connected.');
    } else if (!config?.host || !config?.username || !config?.password) {
      throw new BadRequestException('SMTP mail is not configured.');
    }
    const lead = await this.leadRepo.createQueryBuilder('lead')
      .where('LOWER(lead.email) = :email', { email: to })
      .getOne();
    const generatedPdfUrls = dto.pdfTemplateId
      ? await this.generatePdfUrls(dto.pdfTemplateId, lead)
      : [];
    const attachmentUrls = [...this.stringList(dto.attachmentUrls), ...generatedPdfUrls];
    if (!plainBody && !htmlBody && attachmentUrls.length === 0) throw new BadRequestException('Message or attachment is required.');
    if (config.authType === 'gmail-oauth') {
      const gmailText = this.messageBodyWithAttachments(plainBody, attachmentUrls);
      const gmailHtml = [
        htmlBody || this.textToHtml(plainBody),
        ...attachmentUrls.map((url) => `<p>Attachment: <a href="${this.escapeHtml(url)}">${this.escapeHtml(url)}</a></p>`),
      ].filter(Boolean).join('');
      await this.sendViaGmailApi(config, {
        to,
        subject,
        text: gmailText,
        html: gmailHtml,
      });
    } else {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port ?? 587,
        secure: !!config.useSsl && Number(config.port ?? 587) === 465,
        auth: { user: config.username, pass: config.password },
      });
      await transporter.sendMail({
        from: config.fromName ? `"${config.fromName}" <${config.fromEmail || config.username}>` : (config.fromEmail || config.username),
        to,
        subject,
        text: plainBody,
        html: htmlBody || this.textToHtml(plainBody),
        attachments: attachmentUrls.map((url) => ({ filename: url.split('/').pop() || 'attachment', path: url })),
      });
    }
    const item = this.mailRepo.create({
      email: to,
      kind: 'Direct',
      message: this.messageBodyWithAttachments(plainBody, attachmentUrls),
      htmlBody: htmlBody || this.textToHtml(plainBody),
      name: `${dto.name ?? to.split('@')[0]}`.trim(),
      status: MailInboxStatus.Replied,
      subject,
      leadId: lead?.id ?? null,
      extractionMethod: 'Outgoing',
      extractionConfidence: 1,
      aiFallbackUsed: false,
    } as DeepPartial<MailInboxItem>);
    const saved = await this.mailRepo.save(item);
    if (lead) await this.cancelRealtorFollowUpsAfterManualMessage(lead.id, saved.createdAt ?? new Date());
    return this.mapMail(saved);
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
        summary: 'Realtor follow-up canceled because a manual email was sent after the first message.',
      })
      .where('lead_id = :leadId', { leadId })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .andWhere("created_by LIKE 'Realtor Showing #% Follow-up'")
      .execute();
    await this.leadRepo.update(leadId, {
      followUpStatus: LeadFollowUpStatus.Completed,
      lastActivityAt: contactedAt,
      updatedAt: contactedAt,
    });
  }

  async update(id: number, dto: any) {
    const entity = await this.mailRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Mail not found');
    Object.assign(entity, this.toMailEntity(dto, true));
    return this.mapMail(await this.mailRepo.save(entity));
  }

  async convertToLead(id: number) {
    const mail = await this.findOne(id);
    const parsed = mail.extractedLead ?? {};
    const contactEmail = `${parsed.email ?? mail.email ?? ''}`.trim().toLowerCase();
    const contactName = `${parsed.name ?? mail.name ?? ''}`.trim();
    const contactPhone = `${parsed.phone ?? ''}`.trim();
    let lead = mail.leadId ? await this.leadsService.findOne(mail.leadId).catch(() => null) : null;
    if (!lead && contactEmail) lead = await this.leadsService.findByEmail(contactEmail);
    if (!lead) {
      const now = new Date();
      lead = await this.leadsService.create({
        name: contactName || contactEmail.split('@')[0] || 'Email Lead',
        email: contactEmail || mail.email.trim().toLowerCase(),
        phone: contactPhone || 'Not provided',
        source: `${parsed.rawFields?.source ?? (mail.kind === 'Newsletter' ? 'Mail Signup' : 'Mail Inbox')}`,
        summary: `${parsed.rawFields?.summary ?? mail.message}`,
        property: `${parsed.propertyTitle ?? parsed.rawFields?.property ?? ''}`,
        budget: `${parsed.budget ?? ''}`,
        timeline: `${parsed.timeline ?? ''}`,
        interest: `${parsed.interest ?? mail.subject}`,
        notes: [mail.message],
        stage: 'New',
        priority: mail.kind === 'Direct' ? 'Warm' : 'FollowUp',
        inBoard: false,
        nextActionDate: new Date(now.getTime() + 2 * 86_400_000),
        nextActionType: `${parsed.rawFields?.nextActionType ?? 'Review inbox lead'}`,
        followUpStatus: 'Open',
        lastActivityAt: now,
      }, 'CRM', false);
    }

    const entity = await this.mailRepo.findOne({ where: { id } });
    if (entity) {
      entity.leadId = lead.id;
      entity.status = MailInboxStatus.Converted;
      await this.mailRepo.save(entity);
    }
    return lead;
  }

  async delete(id: number) {
    const mail = await this.mailRepo.findOne({ where: { id } });
    if (mail) await this.mailRepo.remove(mail);
  }

  private mapMail(item: MailInboxItem) {
    return {
      id: item.id,
      email: item.email,
      name: item.name,
      subject: item.subject,
      message: item.message,
      htmlBody: item.htmlBody,
      kind: item.kind,
      status: item.status,
      mailboxTag: item.mailboxTag,
      leadId: item.leadId ?? null,
      extractedLead: item.extractedLead ?? {},
      extractionMethod: item.extractionMethod ?? '',
      extractionConfidence: Number(item.extractionConfidence ?? 0),
      leadCollectionTemplateId: item.leadCollectionTemplateId ?? null,
      leadCollectionTemplateName: item.leadCollectionTemplateName ?? '',
      aiFallbackUsed: item.aiFallbackUsed === true,
      isRead: item.isRead === true,
      isStarred: item.isStarred === true,
      extractionDetails: item.extractionDetails ?? {},
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toMailEntity(dto: any, partial = false) {
    const entity: Record<string, any> = {};
    const set = (key: string, value: any) => {
      if (!partial || Object.prototype.hasOwnProperty.call(dto, key)) entity[key] = value;
    };
    set('email', `${dto.email ?? dto.fromAddress ?? ''}`.trim().toLowerCase());
    set('name', `${dto.name ?? dto.fromName ?? ''}`.trim());
    set('subject', `${dto.subject ?? ''}`.trim());
    set('message', dto.message ?? dto.body ?? '');
    set('htmlBody', dto.htmlBody ?? dto.html ?? '');
    set('extractedLead', dto.extractedLead ?? {});
    set('extractionMethod', `${dto.extractionMethod ?? ''}`);
    set('extractionConfidence', Number(dto.extractionConfidence ?? 0));
    set('leadCollectionTemplateId', dto.leadCollectionTemplateId ?? null);
    set('leadCollectionTemplateName', `${dto.leadCollectionTemplateName ?? ''}`);
    set('aiFallbackUsed', dto.aiFallbackUsed === true);
    set('isRead', dto.isRead === true);
    set('isStarred', dto.isStarred === true);
    set('extractionDetails', dto.extractionDetails ?? {});
    set('kind', dto.kind ?? 'Direct');
    set('status', dto.status ?? 'New');
    set('leadId', dto.leadId ?? null);
    set('mailboxTag', `${dto.mailboxTag ?? ''}`.trim());
    return entity;
  }

  private booleanFilter(value: string | boolean | undefined) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return null;
  }

  private stringList(value: any) {
    return Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
  }

  private messageBodyWithAttachments(message: string, attachmentUrls: string[]) {
    return [message, ...attachmentUrls.map((url) => `Attachment: ${url}`)].filter(Boolean).join('\n');
  }

  private async sendViaGmailApi(config: any, message: { to: string; subject: string; text: string; html: string }) {
    const accessToken = await this.getGmailAccessToken(config);
    const from = config.fromName
      ? `"${config.fromName}" <${config.fromEmail || config.gmailEmail}>`
      : (config.fromEmail || config.gmailEmail);
    const raw = [
      `From: ${from}`,
      `To: ${message.to}`,
      `Subject: ${this.encodeHeader(message.subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      message.html || this.textToHtml(message.text),
    ].join('\r\n');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: this.base64UrlEncode(raw) }),
    });
    if (!response.ok) throw new BadRequestException(`Gmail send failed: ${response.status}`);
  }

  private async getGmailAccessToken(config: any) {
    const expiresAt = config.gmailTokenExpiresAt ? new Date(config.gmailTokenExpiresAt).getTime() : 0;
    if (config.gmailAccessToken && expiresAt > Date.now() + 60_000) return config.gmailAccessToken;
    const clientId = `${process.env.GOOGLE_CLIENT_ID ?? ''}`.trim();
    const clientSecret = `${process.env.GOOGLE_CLIENT_SECRET ?? ''}`.trim();
    if (!clientId || !clientSecret || !config.gmailRefreshToken) throw new BadRequestException('Google OAuth credentials are missing.');
    try {
      const refreshed = await refreshGmailAccessToken({
        clientId,
        clientSecret,
        refreshToken: config.gmailRefreshToken,
      });
      config.gmailAccessToken = refreshed.accessToken;
      config.gmailTokenExpiresAt = refreshed.accessTokenExpiresAt;
      config.gmailLastTokenRefreshAt = new Date().toISOString();
      config.gmailReconnectRequired = false;
      config.gmailLastAuthError = '';
      config.gmailAuthFailedAt = null;
      if (refreshed.refreshTokenExpiresAt) {
        config.gmailRefreshTokenExpiresAt = refreshed.refreshTokenExpiresAt;
      }
      await this.settingsService.saveSmtpConfig({
        ...await this.settingsService.getSmtpConfig(),
        ...config,
      });
      return config.gmailAccessToken;
    } catch (error) {
      if (isGmailReconnectRequired(error)) {
        const existing = await this.settingsService.getSmtpConfig();
        await this.settingsService.saveSmtpConfig({
          ...(existing ?? {}),
          ...config,
          enableInboxSync: false,
          gmailAccessToken: '',
          gmailTokenExpiresAt: null,
          gmailReconnectRequired: true,
          gmailLastAuthError: error instanceof Error ? error.message.slice(0, 500) : 'Gmail authorization expired.',
          gmailAuthFailedAt: new Date().toISOString(),
        });
      }
      if (error instanceof Error) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private encodeHeader(value: string) {
    return /[^\x00-\x7F]/.test(value)
      ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
      : value;
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private cleanOutgoingHtml(value: any) {
    return `${value ?? ''}`
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .trim();
  }

  private htmlToText(value: string) {
    return `${value ?? ''}`
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|table|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  private textToHtml(value: string) {
    return this.escapeHtml(value).replace(/\n/g, '<br>');
  }

  private escapeHtml(value: string) {
    return `${value ?? ''}`
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async generatePdfUrls(templateId: number | string, lead: Lead | null) {
    const result = await this.pdfsService.generatePdf({
      allowMissing: true,
      generatedBy: 'Mail Inbox',
      leadId: lead?.id ?? null,
      propertyId: lead?.propertyId ?? null,
      templateId: Number(templateId),
    });
    return [result.downloadUrl];
  }
}
