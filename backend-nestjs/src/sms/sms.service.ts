import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { Lead, LeadFollowUpStatus, LeadStage } from '../leads/entities/lead.entity';
import { LeadHistoryEntry, leadHistoryKindDb, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { SettingsService } from '../settings/settings.service';
import { paginated, toInt } from '../common/api-contract';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { ShowingFeedbackService } from '../showing-feedback/showing-feedback.service';

type CommunicationConfig = {
  providerName?: string;
  accountId?: string;
  authToken?: string;
  fromNumber?: string;
  baseUrl?: string;
  supportsSms?: boolean;
  enableSmsSync?: boolean;
  syncIntervalMinutes?: number;
  maxMessagesPerSync?: number;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsMessage) private smsRepo: Repository<SmsMessage>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private historyRepo: Repository<LeadHistoryEntry>,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => ShowingFeedbackService))
    private showingFeedbackService: ShowingFeedbackService,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, direction?: string) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.smsRepo.createQueryBuilder('sms');
    if (search) {
      qb.andWhere('(sms.from_number ILIKE :search OR sms.to_number ILIKE :search OR sms.body ILIKE :search OR sms.lead_name ILIKE :search)', { search: `%${search}%` });
    }
    if (direction) qb.andWhere('sms.direction = :direction', { direction: direction === 'Outgoing' ? 1 : 0 });
    const [rows, total] = await qb.orderBy('sms.occurredAt', 'DESC', 'NULLS LAST').addOrderBy('sms.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(rows.map((item) => this.mapMessage(item)), total, page, pageSize);
  }

  async findOne(id: number) {
    const item = await this.smsRepo.findOne({ where: { id } });
    if (!item) throw new BadRequestException('SMS message was not found.');
    return this.mapMessage(item);
  }

  async send(dto: any, createdBy = 'CRM') {
    const config = await this.getConfig();
    if (!config?.supportsSms) throw new BadRequestException('SMS provider is not configured.');

    const lead = dto.leadId ? await this.leadRepo.findOne({ where: { id: Number(dto.leadId) } }) : null;
    const defaultPhoneCountry = await this.getDefaultPhoneCountry();
    const toNumber = normalizePhoneNumber(dto.to ?? lead?.phone, defaultPhoneCountry);
    config.fromNumber = normalizePhoneNumber(config.fromNumber, defaultPhoneCountry);
    const body = `${dto.body ?? dto.message ?? ''}`.trim();
    const mediaUrls = this.stringList(dto.mediaUrls).slice(0, 10);
    if (!toNumber) throw new BadRequestException('Recipient phone number is required.');
    if (!body && mediaUrls.length === 0) throw new BadRequestException('Message body or attachment is required.');

    let providerMessageId = '';
    let status = 'Sent';
    try {
      providerMessageId = await this.sendViaProvider(config, toNumber, body, mediaUrls);
    } catch (error: any) {
      status = 'Failed';
      this.logger.warn(`SMS send failed: ${error.message}`);
    }

    const saved = await this.saveMessage({
      body,
      direction: 'Outgoing',
      fromNumber: normalizePhoneNumber(config.fromNumber, defaultPhoneCountry),
      lead,
      mediaUrls,
      provider: config.providerName ?? 'Custom',
      providerMessageId: providerMessageId || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      rawPayload: { createdBy },
      status,
      toNumber,
    });

    if (lead && !dto.skipHistory) {
      await this.historyRepo.save(this.historyRepo.create({
        leadId: lead.id,
        kind: 'Sms',
        direction: 'Outgoing',
        status,
        title: status === 'Sent' ? 'SMS sent' : 'SMS failed',
        summary: `${status === 'Sent' ? 'SMS sent to' : 'SMS failed for'} ${toNumber} via ${config.providerName ?? 'SMS provider'}.`,
        body: this.messageBodyWithMedia(body, mediaUrls),
        provider: config.providerName ?? 'SMS',
        createdBy,
        occurredAt: new Date(),
      } as any));
    }

    return this.mapMessage(saved);
  }

  async syncProviderMessages() {
    const config = await this.getConfig();
    if (!config?.enableSmsSync || (config.providerName ?? '').toLowerCase() !== 'ringcentral') return { imported: 0 };
    const records = await this.fetchRingCentralMessages(config);
    let imported = 0;
    for (const record of records) {
      const existing = await this.smsRepo.findOne({ where: { provider: 'RingCentral', providerMessageId: `${record.id ?? ''}` } });
      if (existing) continue;
      const fromNumber = record.from?.phoneNumber ?? '';
      const toNumber = Array.isArray(record.to) ? record.to[0]?.phoneNumber ?? '' : '';
      const mediaUrls = Array.isArray(record.attachments) ? record.attachments.map((item) => item.uri ?? item.contentUri).filter(Boolean) : [];
      const lead = await this.findLeadByPhone(record.direction === 'Outbound' ? toNumber : fromNumber);
      await this.saveMessage({
        body: record.subject ?? record.message ?? '',
        direction: record.direction === 'Outbound' ? 'Outgoing' : 'Incoming',
        fromNumber,
        lead,
        mediaUrls,
        provider: 'RingCentral',
        providerMessageId: `${record.id ?? ''}`,
        rawPayload: record,
        status: record.direction === 'Outbound' ? 'Sent' : 'Received',
        toNumber,
        occurredAt: record.creationTime ? new Date(record.creationTime) : new Date(),
      });
      imported++;
    }
    return { imported };
  }

  async ingestWebhook(provider: string, payload: any, headers: Record<string, any> = {}) {
    if (provider === 'ringcentral' && headers['validation-token']) {
      return { validationToken: headers['validation-token'] };
    }
    const normalized = this.normalizeWebhook(provider, payload);
    const lead = await this.findLeadByPhone(normalized.direction === 'Outgoing' ? normalized.toNumber : normalized.fromNumber);
    const saved = await this.saveMessage({ ...normalized, lead, rawPayload: payload });
    return this.mapMessage(saved);
  }

  private async saveMessage(input: any) {
    const defaultPhoneCountry = await this.getDefaultPhoneCountry();
    const entity = this.smsRepo.create({
      body: input.body ?? '',
      direction: input.direction ?? 'Incoming',
      fromNumber: normalizePhoneNumber(input.fromNumber, defaultPhoneCountry),
      leadId: input.lead?.id ?? null,
      leadName: input.lead?.name ?? '',
      mediaUrls: input.mediaUrls ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      provider: input.provider ?? 'Custom',
      providerMessageId: input.providerMessageId || `${input.provider ?? 'sms'}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      rawPayload: input.rawPayload ?? null,
      status: input.status ?? 'Received',
      toNumber: normalizePhoneNumber(input.toNumber, defaultPhoneCountry),
    });
    const saved = await this.smsRepo.save(entity);
    if ((input.direction ?? 'Incoming') === 'Incoming' && input.lead?.id) {
      await this.historyRepo.save(this.historyRepo.create({
        leadId: input.lead.id,
        kind: 'Sms',
        direction: 'Incoming',
        status: 'Received',
        title: 'SMS reply received',
        summary: `SMS reply received from ${saved.fromNumber}. Pending automation was stopped.`,
        body: this.messageBodyWithMedia(saved.body, saved.mediaUrls ?? []),
        provider: input.provider ?? 'SMS',
        createdBy: saved.fromNumber,
        occurredAt: saved.occurredAt ?? new Date(),
      } as any));
      await this.cancelScheduledLeadAutomation(
        input.lead.id,
        saved.occurredAt ?? new Date(),
        ['Deal', 'Canceled'].includes(String(input.lead.stage)),
      );
      await this.showingFeedbackService.processInbound({
        channel: 'Sms',
        leadId: input.lead.id,
        message: saved.body,
        receivedAt: saved.occurredAt ?? saved.createdAt ?? new Date(),
        realtorContact: saved.fromNumber,
        sourceMessageId: saved.providerMessageId || `sms-${saved.id}`,
      });
    } else if (
      (input.direction ?? 'Incoming') === 'Outgoing'
      && input.lead?.id
      && !`${input.rawPayload?.createdBy ?? ''}`.startsWith('Realtor Showing #')
    ) {
      await this.cancelRealtorFollowUpsAfterManualMessage(input.lead.id, saved.occurredAt ?? new Date());
    }
    return saved;
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
      followUpStatus: LeadFollowUpStatus.Completed,
      lastActivityAt: contactedAt,
      updatedAt: contactedAt,
    });
  }

  private async cancelScheduledLeadAutomation(leadId: number, repliedAt: Date, preserveStage = false) {
    await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({
        occurredAt: repliedAt,
        status: 'Failed',
        summary: 'Automatic outreach canceled because lead replied by SMS.',
      })
      .where('lead_id = :leadId', { leadId })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .andWhere('kind IN (:...kinds)', { kinds: ['Email', 'Sms', 'Call'].map(leadHistoryKindDb) })
      .execute();
    await this.leadRepo.update(leadId, {
      followUpStatus: LeadFollowUpStatus.Completed,
      ...(preserveStage ? {} : { stage: LeadStage.Replied }),
      lastActivityAt: repliedAt,
      updatedAt: repliedAt,
    });
  }

  private async findLeadByPhone(phone: string) {
    const normalizedPhone = normalizePhoneNumber(phone, await this.getDefaultPhoneCountry());
    const normalized = this.onlyDigits(normalizedPhone);
    if (!normalized) return null;
    const exact = await this.leadRepo.createQueryBuilder('lead')
      .where("regexp_replace(lead.phone, '[^0-9]', '', 'g') = :phone", { phone: normalized })
      .getOne();
    if (exact || normalized.length < 10) return exact;
    return this.leadRepo.createQueryBuilder('lead')
      .where("RIGHT(regexp_replace(lead.phone, '[^0-9]', '', 'g'), 10) = :phone", { phone: normalized.slice(-10) })
      .getOne();
  }

  private async getDefaultPhoneCountry() {
    const settings = await this.settingsService.getAdminSettings();
    return settings.profile?.defaultPhoneCountry ?? 'US';
  }

  private normalizeWebhook(provider: string, payload: any) {
    const key = provider.toLowerCase();
    if (key === 'twilio') {
      const mediaUrls = Array.from({ length: Number(payload.NumMedia ?? 0) }, (_, index) => payload[`MediaUrl${index}`]).filter(Boolean);
      return { provider: 'Twilio', providerMessageId: payload.MessageSid ?? payload.SmsSid ?? '', fromNumber: payload.From ?? '', toNumber: payload.To ?? '', body: payload.Body ?? '', mediaUrls, direction: 'Incoming', status: 'Received' };
    }
    if (key === 'plivo') {
      const mediaUrls = Object.keys(payload).filter((key) => key.toLowerCase().startsWith('media')).map((key) => payload[key]).filter(Boolean);
      return { provider: 'Plivo', providerMessageId: payload.MessageUUID ?? payload.MessageUuid ?? payload.message_uuid ?? '', fromNumber: payload.From ?? payload.from ?? '', toNumber: payload.To ?? payload.to ?? '', body: payload.Text ?? payload.text ?? '', mediaUrls, direction: 'Incoming', status: 'Received' };
    }
    const body = payload.body ?? payload;
    const record = body.body?.changes?.[0]?.newValue ?? body;
    const mediaUrls = Array.isArray(record.attachments) ? record.attachments.map((item) => item.uri ?? item.contentUri).filter(Boolean) : [];
    return { provider: 'RingCentral', providerMessageId: `${record.id ?? body.uuid ?? ''}`, fromNumber: record.from?.phoneNumber ?? '', toNumber: Array.isArray(record.to) ? record.to[0]?.phoneNumber ?? '' : '', body: record.subject ?? record.message ?? '', mediaUrls, direction: record.direction === 'Outbound' ? 'Outgoing' : 'Incoming', status: record.direction === 'Outbound' ? 'Sent' : 'Received' };
  }

  private async sendViaProvider(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const provider = (config.providerName ?? '').toLowerCase();
    if (provider === 'twilio') return this.sendTwilio(config, to, body, mediaUrls);
    if (provider === 'plivo') return this.sendPlivo(config, to, body, mediaUrls);
    if (provider === 'ringcentral') return this.sendRingCentral(config, to, body, mediaUrls);
    throw new BadRequestException('Unsupported SMS provider.');
  }

  private async sendTwilio(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const twilio = require('twilio');
    const client = twilio(config.accountId, config.authToken);
    const message = await client.messages.create({
      body,
      from: config.fromNumber,
      mediaUrl: mediaUrls.length ? mediaUrls : undefined,
      to,
    });
    return message.sid ?? '';
  }

  private async sendPlivo(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const plivo = require('plivo');
    const client = new plivo.Client(config.accountId, config.authToken);
    const response = await client.messages.create(config.fromNumber, to, body, mediaUrls.length ? { media_urls: mediaUrls } : {});
    const uuid = response?.messageUuid ?? response?.message_uuid;
    return Array.isArray(uuid) ? uuid[0] : `${uuid ?? ''}`;
  }

  private async sendRingCentral(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const platform = await this.ringCentralPlatform(config);
    const endpoint = `/restapi/v1.0/account/~/extension/~/${mediaUrls.length ? 'mms' : 'sms'}`;
    const response = mediaUrls.length
      ? await this.sendRingCentralMms(platform, endpoint, to, body, mediaUrls, config.fromNumber ?? '')
      : await platform.post(endpoint, { from: { phoneNumber: config.fromNumber }, text: body, to: [{ phoneNumber: to }] });
    const json = await response.json();
    return `${json.id ?? ''}`;
  }

  private async sendRingCentralMms(platform: any, endpoint: string, to: string, body: string, mediaUrls: string[], fromNumber: string) {
    const form = new FormData();
    form.append('json', new Blob([JSON.stringify({ from: { phoneNumber: fromNumber }, text: body, to: [{ phoneNumber: to }] })], { type: 'application/json' }));
    for (const mediaUrl of mediaUrls) {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error(`Attachment fetch failed: ${mediaUrl}`);
      const blob = await response.blob();
      form.append('attachment', blob, mediaUrl.split('/').pop() || 'attachment');
    }
    const res = await platform.post(endpoint, form);
    const json = await res.json();
    return `${json.id ?? ''}`;
  }

  private async fetchRingCentralMessages(config: CommunicationConfig) {
    const platform = await this.ringCentralPlatform(config);
    const res = await platform.get('/restapi/v1.0/account/~/extension/~/message-store', {
      perPage: config.maxMessagesPerSync ?? 25,
      type: 'SMS',
    });
    const json = await res.json();
    return Array.isArray(json.records) ? json.records : [];
  }

  private async ringCentralPlatform(config: CommunicationConfig) {
    const RingCentralSdk = require('@ringcentral/sdk').SDK ?? require('@ringcentral/sdk');
    const sdk = new RingCentralSdk({ server: this.baseUrl(config, 'https://platform.ringcentral.com') });
    const platform = sdk.platform();
    await platform.auth().setData({
      access_token: config.authToken,
      expires_in: 3600,
      expire_time: Date.now() + 3600_000,
      token_type: 'bearer',
    });
    return platform;
  }

  private async getConfig(): Promise<CommunicationConfig | null> {
    return this.settingsService.getCommunicationConfig();
  }

  private baseUrl(config: CommunicationConfig, fallback: string) {
    return `${config.baseUrl || fallback}`.replace(/\/$/, '');
  }

  private onlyDigits(value: string) {
    return `${value ?? ''}`.replace(/\D/g, '');
  }

  private stringList(value: any) {
    return Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
  }

  private messageBodyWithMedia(body: string, mediaUrls: string[]) {
    return [body, ...mediaUrls.map((url) => `Attachment: ${url}`)].filter(Boolean).join('\n');
  }

  private mapMessage(item: SmsMessage) {
    return { id: item.id, provider: item.provider, providerMessageId: item.providerMessageId, leadId: item.leadId ?? null, leadName: item.leadName, fromNumber: item.fromNumber, toNumber: item.toNumber, body: item.body, mediaUrls: item.mediaUrls ?? [], direction: item.direction, status: item.status, occurredAt: item.occurredAt, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
}
