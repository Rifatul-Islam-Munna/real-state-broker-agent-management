import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { SettingsService } from '../settings/settings.service';
import { paginated, toInt } from '../common/api-contract';

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

  async send(dto: any, createdBy = 'CRM') {
    const config = await this.getConfig();
    if (!config?.supportsSms) throw new BadRequestException('SMS provider is not configured.');

    const lead = dto.leadId ? await this.leadRepo.findOne({ where: { id: Number(dto.leadId) } }) : null;
    const toNumber = `${dto.to ?? lead?.phone ?? ''}`.trim();
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
      fromNumber: config.fromNumber ?? '',
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
      const lead = await this.findLeadByPhone(fromNumber || toNumber);
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
    const lead = await this.findLeadByPhone(normalized.fromNumber);
    const saved = await this.saveMessage({ ...normalized, lead, rawPayload: payload });
    return this.mapMessage(saved);
  }

  private async saveMessage(input: any) {
    const entity = this.smsRepo.create({
      body: input.body ?? '',
      direction: input.direction ?? 'Incoming',
      fromNumber: input.fromNumber ?? '',
      leadId: input.lead?.id ?? null,
      leadName: input.lead?.name ?? '',
      mediaUrls: input.mediaUrls ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      provider: input.provider ?? 'Custom',
      providerMessageId: input.providerMessageId || `${input.provider ?? 'sms'}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      rawPayload: input.rawPayload ?? null,
      status: input.status ?? 'Received',
      toNumber: input.toNumber ?? '',
    });
    return this.smsRepo.save(entity);
  }

  private async findLeadByPhone(phone: string) {
    const normalized = this.onlyDigits(phone);
    if (!normalized) return null;
    return this.leadRepo.createQueryBuilder('lead').where("regexp_replace(lead.phone, '[^0-9]', '', 'g') = :phone", { phone: normalized }).getOne();
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
    const url = `${this.baseUrl(config, 'https://api.twilio.com')}/2010-04-01/Accounts/${config.accountId}/Messages.json`;
    const params = new URLSearchParams({ Body: body, From: config.fromNumber ?? '', To: to });
    mediaUrls.forEach((url) => params.append('MediaUrl', url));
    const res = await fetch(url, { body: params, headers: { Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `Twilio HTTP ${res.status}`);
    return json.sid ?? '';
  }

  private async sendPlivo(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const url = `${this.baseUrl(config, 'https://api.plivo.com')}/v1/Account/${config.accountId}/Message/`;
    const res = await fetch(url, { body: JSON.stringify({ dst: to, media_urls: mediaUrls, src: config.fromNumber, text: body }), headers: { Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`, 'Content-Type': 'application/json' }, method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? json.message ?? `Plivo HTTP ${res.status}`);
    return Array.isArray(json.message_uuid) ? json.message_uuid[0] : json.message_uuid ?? '';
  }

  private async sendRingCentral(config: CommunicationConfig, to: string, body: string, mediaUrls: string[]) {
    const url = `${this.baseUrl(config, 'https://platform.ringcentral.com')}/restapi/v1.0/account/~/extension/~/${mediaUrls.length ? 'mms' : 'sms'}`;
    if (mediaUrls.length) return this.sendRingCentralMms(config, url, to, body, mediaUrls);
    const res = await fetch(url, { body: JSON.stringify({ from: { phoneNumber: config.fromNumber }, text: body, to: [{ phoneNumber: to }] }), headers: { Authorization: `Bearer ${config.authToken}`, 'Content-Type': 'application/json' }, method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `RingCentral HTTP ${res.status}`);
    return `${json.id ?? ''}`;
  }

  private async sendRingCentralMms(config: CommunicationConfig, url: string, to: string, body: string, mediaUrls: string[]) {
    const form = new FormData();
    form.append('json', new Blob([JSON.stringify({ from: { phoneNumber: config.fromNumber }, text: body, to: [{ phoneNumber: to }] })], { type: 'application/json' }));
    for (const mediaUrl of mediaUrls) {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error(`Attachment fetch failed: ${mediaUrl}`);
      const blob = await response.blob();
      form.append('attachment', blob, mediaUrl.split('/').pop() || 'attachment');
    }
    const res = await fetch(url, { body: form, headers: { Authorization: `Bearer ${config.authToken}` }, method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `RingCentral HTTP ${res.status}`);
    return `${json.id ?? ''}`;
  }

  private async fetchRingCentralMessages(config: CommunicationConfig) {
    const url = new URL(`${this.baseUrl(config, 'https://platform.ringcentral.com')}/restapi/v1.0/account/~/extension/~/message-store`);
    url.searchParams.set('type', 'SMS');
    url.searchParams.set('perPage', `${config.maxMessagesPerSync ?? 25}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${config.authToken}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message ?? `RingCentral HTTP ${res.status}`);
    return Array.isArray(json.records) ? json.records : [];
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
