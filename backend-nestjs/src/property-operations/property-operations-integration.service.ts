import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import { PropertyOperationsRecord } from './property-operations.entity';

type PaymentConfig = Record<string, unknown>;

@Injectable()
export class PropertyOperationsIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(PropertyOperationsIntegrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensurePaymentColumns();
    } catch (error) {
      this.logger.warn(`Payment integration columns could not be prepared: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  async deliver(record: PropertyOperationsRecord, channel: string) {
    const mode = String(channel || 'email').toLowerCase();
    if (mode === 'email') await this.sendEmail(record);
    else if (mode === 'sms' || mode === 'whatsapp') await this.sendMessage(record, mode);
    else throw new BadRequestException('Delivery channel must be email, sms, or whatsapp.');
    return { channel: mode, deliveredAt: new Date().toISOString() };
  }

  async getPaymentStatus() {
    const config = await this.getPaymentConfig();
    return {
      configured: this.paymentConfigured(config),
      providerName: String(config?.providerName ?? ''),
      createUrl: String(config?.createUrl ?? config?.checkoutUrl ?? ''),
      verifyUrl: String(config?.verifyUrl ?? config?.statusUrl ?? ''),
      hasApiKey: Boolean(config?.apiKey),
      updatedAt: await this.paymentUpdatedAt(),
    };
  }

  async updatePaymentConfig(input: any) {
    await this.ensurePaymentColumns();
    if (input?.clearPayment) {
      await this.dataSource.query(
        'UPDATE agency_integration_settings SET payment_payload = NULL, payment_updated_at = NULL, updated_at = NOW() WHERE id = 1',
      );
      return this.getPaymentStatus();
    }

    const existing = await this.getPaymentConfig();
    const incoming = input?.payment ?? input ?? {};
    const next = {
      ...existing,
      ...incoming,
      apiKey: String(incoming?.apiKey ?? '').trim() || String(existing?.apiKey ?? ''),
      secretKey: String(incoming?.secretKey ?? '').trim() || String(existing?.secretKey ?? ''),
      token: String(incoming?.token ?? '').trim() || String(existing?.token ?? ''),
    };
    if (!this.paymentConfigured(next)) {
      throw new BadRequestException('Payment provider name, checkout URL, and verification URL are required.');
    }

    await this.dataSource.query(
      `INSERT INTO agency_integration_settings
        (id, payment_payload, payment_updated_at, created_at, updated_at)
       VALUES (1, $1, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         payment_payload = EXCLUDED.payment_payload,
         payment_updated_at = EXCLUDED.payment_updated_at,
         updated_at = NOW()`,
      [JSON.stringify(next)],
    );
    return this.getPaymentStatus();
  }

  async createCheckout(input: {
    amount: number;
    currency: string;
    title: string;
    reference: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const config = await this.getPaymentConfig();
    if (!this.paymentConfigured(config)) {
      throw new BadRequestException('Payment provider is not configured in the shared integration settings.');
    }
    const endpoint = String(config.createUrl ?? config.checkoutUrl ?? config.apiUrl ?? '');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.providerHeaders(config),
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        title: input.title,
        reference: input.reference,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      }),
    });
    const payload = await this.readJson(response);
    if (!response.ok) {
      throw new ServiceUnavailableException(String(payload.message ?? `Payment provider returned ${response.status}.`));
    }
    const checkoutUrl = String(payload.checkoutUrl ?? payload.url ?? payload.paymentUrl ?? '');
    const sessionId = String(payload.sessionId ?? payload.reference ?? payload.id ?? input.reference);
    const paymentToken = String(payload.paymentToken ?? payload.token ?? sessionId);
    if (!checkoutUrl) throw new ServiceUnavailableException('Payment provider did not return a checkout URL.');
    return { checkoutUrl, sessionId, paymentToken };
  }

  async verifyCheckout(reference: string, paymentToken?: string) {
    const config = await this.getPaymentConfig();
    if (!this.paymentConfigured(config)) {
      throw new BadRequestException('Payment provider is not configured in the shared integration settings.');
    }
    const endpoint = String(config.verifyUrl ?? config.statusUrl ?? '');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.providerHeaders(config),
      body: JSON.stringify({ reference, paymentToken }),
    });
    const payload = await this.readJson(response);
    if (!response.ok) {
      throw new ServiceUnavailableException(String(payload.message ?? `Payment provider returned ${response.status}.`));
    }
    const status = String(payload.status ?? payload.paymentStatus ?? '').toLowerCase();
    const paid = Boolean(payload.paid ?? payload.success ?? payload.verified) || ['paid', 'complete', 'completed', 'succeeded', 'success'].includes(status);
    return { paid, paymentStatus: paid ? 'Paid' : String(payload.status ?? payload.paymentStatus ?? 'Pending') };
  }

  async hasPaymentProvider() {
    return this.paymentConfigured(await this.getPaymentConfig());
  }

  private async sendEmail(record: PropertyOperationsRecord) {
    if (!record.contactEmail) throw new BadRequestException('A recipient email is required.');
    const config = await this.settingsService.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) {
      throw new BadRequestException('SMTP is not configured in the shared integration settings.');
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port ?? 587),
      secure: Boolean(config.useSsl) && Number(config.port ?? 587) === 465,
      auth: { user: config.username, pass: config.password },
    });
    await transporter.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${config.fromEmail || config.username}>`
        : (config.fromEmail || config.username),
      to: record.contactEmail,
      subject: record.title,
      text: record.description || record.title,
      attachments: (record.attachments ?? []).map((url) => ({
        filename: String(url).split('/').pop() || 'attachment',
        path: url,
      })),
    });
  }

  private async sendMessage(record: PropertyOperationsRecord, channel: string) {
    if (!record.contactPhone) throw new BadRequestException('A recipient phone number is required.');
    const config = await this.settingsService.getCommunicationConfig();
    if (!config?.supportsSms || !config?.accountId || !config?.authToken || !config?.fromNumber) {
      throw new BadRequestException('Communication provider is not configured in the shared integration settings.');
    }
    const provider = String(config.providerName ?? 'Twilio').toLowerCase();
    const body = record.description || record.title;
    if (provider === 'twilio') {
      const from = channel === 'whatsapp' ? `whatsapp:${config.fromNumber}` : config.fromNumber;
      const to = channel === 'whatsapp' ? `whatsapp:${record.contactPhone}` : record.contactPhone;
      const form = new URLSearchParams({ From: from, To: to, Body: body });
      const response = await fetch(
        `${String(config.baseUrl || 'https://api.twilio.com').replace(/\/$/, '')}/2010-04-01/Accounts/${config.accountId}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
        },
      );
      if (!response.ok) throw new ServiceUnavailableException(`Twilio returned ${response.status}.`);
      return;
    }
    if (provider === 'plivo') {
      const response = await fetch(
        `${String(config.baseUrl || 'https://api.plivo.com').replace(/\/$/, '')}/v1/Account/${config.accountId}/Message/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ src: config.fromNumber, dst: record.contactPhone, text: body, type: channel }),
        },
      );
      if (!response.ok) throw new ServiceUnavailableException(`Plivo returned ${response.status}.`);
      return;
    }
    if (!config.baseUrl) throw new BadRequestException('Custom communication provider URL is required.');
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, from: config.fromNumber, to: record.contactPhone, message: body }),
    });
    if (!response.ok) throw new ServiceUnavailableException(`Communication provider returned ${response.status}.`);
  }

  private async ensurePaymentColumns() {
    await this.dataSource.query('ALTER TABLE agency_integration_settings ADD COLUMN IF NOT EXISTS payment_payload text');
    await this.dataSource.query('ALTER TABLE agency_integration_settings ADD COLUMN IF NOT EXISTS payment_updated_at timestamptz');
  }

  private async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      await this.ensurePaymentColumns();
      const rows = await this.dataSource.query('SELECT payment_payload FROM agency_integration_settings WHERE id = 1 LIMIT 1');
      const raw = rows?.[0]?.payment_payload;
      if (!raw) return {};
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async paymentUpdatedAt() {
    try {
      const rows = await this.dataSource.query('SELECT payment_updated_at FROM agency_integration_settings WHERE id = 1 LIMIT 1');
      return rows?.[0]?.payment_updated_at ?? null;
    } catch {
      return null;
    }
  }

  private paymentConfigured(config: PaymentConfig) {
    return Boolean(
      config?.providerName
      && (config?.createUrl || config?.checkoutUrl || config?.apiUrl)
      && (config?.verifyUrl || config?.statusUrl),
    );
  }

  private providerHeaders(config: PaymentConfig) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = String(config.apiKey ?? config.secretKey ?? config.token ?? '');
    if (apiKey) headers.Authorization = String(config.authorizationHeader ?? `Bearer ${apiKey}`);
    const custom = config.headers;
    if (custom && typeof custom === 'object') {
      for (const [key, value] of Object.entries(custom as Record<string, unknown>)) headers[key] = String(value);
    }
    return headers;
  }

  private async readJson(response: Response): Promise<Record<string, any>> {
    try {
      return await response.json() as Record<string, any>;
    } catch {
      return {};
    }
  }
}
