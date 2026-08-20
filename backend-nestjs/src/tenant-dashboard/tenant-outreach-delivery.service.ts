import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';
import type { TenantOutreachJob } from './tenant-outreach.service';

export class PermanentTenantDeliveryError extends Error {
  readonly permanent = true;
}

@Injectable()
export class TenantOutreachDeliveryService implements OnModuleDestroy {
  private readonly mailTransports = new Map<
    string,
    { signature: string; transport: any }
  >();

  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly settings: TenantWorkspaceSettingsService,
  ) {}

  async deliver(
    databaseName: string,
    job: TenantOutreachJob,
    tenant?: SaasTenant,
  ) {
    if (job.provider_message_id) {
      return { providerMessageId: job.provider_message_id };
    }
    if (job.channel === 'Email') return this.sendEmail(databaseName, job, tenant);
    if (job.channel === 'SMS') return this.sendSms(databaseName, job, tenant);
    if (job.channel === 'Call') return this.makeCall(databaseName, job, tenant);
    throw new PermanentTenantDeliveryError(`Unsupported channel: ${job.channel}`);
  }

  async onModuleDestroy() {
    await Promise.allSettled(
      [...this.mailTransports.values()].map(async ({ transport }) => {
        if (typeof transport?.close === 'function') await transport.close();
      }),
    );
    this.mailTransports.clear();
  }

  private async sendEmail(
    databaseName: string,
    job: TenantOutreachJob,
    tenant?: SaasTenant,
  ) {
    if (!job.recipient_email) {
      throw new PermanentTenantDeliveryError('Recipient email is missing.');
    }
    const config = tenant
      ? await this.settings.getRawSmtp(tenant)
      : await this.setting(databaseName, 'outreach_email_provider');
    if (!config) {
      throw new PermanentTenantDeliveryError('This tenant has no email provider configured.');
    }

    const transport = this.mailTransport(databaseName, config);
    const fromEmail = this.text(config.fromEmail, config.username ?? config.gmailEmail);
    if (!fromEmail) {
      throw new PermanentTenantDeliveryError('Tenant sender email is missing.');
    }

    const info = await transport.sendMail({
      from: config.fromName
        ? `"${this.text(config.fromName).replace(/"/g, '')}" <${fromEmail}>`
        : fromEmail,
      to: job.recipient_email,
      subject: job.title,
      text: job.body,
      html: this.escapeHtml(job.body).replace(/\n/g, '<br>'),
      messageId: `<${job.idempotency_key}@${this.safeHost(databaseName)}.tenant>`,
      headers: {
        'X-Tenant-Database': databaseName,
        'X-Tenant-Idempotency-Key': job.idempotency_key,
      },
      attachments: this.attachments(job.media_urls ?? job.payload?.mediaUrls),
    });

    return {
      providerMessageId: this.text(info?.messageId, job.idempotency_key),
      accepted: Array.isArray(info?.accepted) ? info.accepted : [],
      rejected: Array.isArray(info?.rejected) ? info.rejected : [],
    };
  }

  private mailTransport(databaseName: string, config: any) {
    const signature = createHash('sha256')
      .update(
        JSON.stringify({
          authType: config.authType,
          host: config.host,
          port: config.port,
          secure: config.useSsl,
          username: config.username,
          password: config.password,
          gmailEmail: config.gmailEmail,
          gmailAccessToken: config.gmailAccessToken,
          gmailRefreshToken: config.gmailRefreshToken,
        }),
      )
      .digest('hex');
    const cached = this.mailTransports.get(databaseName);
    if (cached?.signature === signature) return cached.transport;
    if (cached && typeof cached.transport?.close === 'function') cached.transport.close();

    const nodemailer = require('nodemailer');
    const user = this.text(config.username, config.gmailEmail);
    const authType = this.text(config.authType).toLowerCase();
    let transportOptions: any;

    if (authType === 'gmail-oauth' || config.gmailRefreshToken) {
      const clientId = this.text(config.gmailClientId, process.env.GOOGLE_CLIENT_ID);
      const clientSecret = this.text(
        config.gmailClientSecret,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      if (!user || !clientId || !clientSecret || !config.gmailRefreshToken) {
        throw new PermanentTenantDeliveryError(
          'Tenant Gmail OAuth configuration is incomplete.',
        );
      }
      transportOptions = {
        service: 'gmail',
        pool: true,
        maxConnections: this.clamp(
          process.env.TENANT_SMTP_MAX_CONNECTIONS,
          2,
          1,
          5,
        ),
        maxMessages: this.clamp(process.env.TENANT_SMTP_MAX_MESSAGES, 100, 1, 1000),
        auth: {
          type: 'OAuth2',
          user,
          clientId,
          clientSecret,
          refreshToken: config.gmailRefreshToken,
          accessToken: config.gmailAccessToken || undefined,
          expires: config.gmailTokenExpiresAt
            ? new Date(config.gmailTokenExpiresAt).getTime()
            : undefined,
        },
      };
    } else {
      const host = this.text(config.host);
      const password = this.text(config.password);
      if (!host || !user || !password) {
        throw new PermanentTenantDeliveryError(
          'Tenant SMTP host, username, and password are required.',
        );
      }
      const port = this.clamp(config.port, 587, 1, 65_535);
      transportOptions = {
        host,
        port,
        secure: config.useSsl === true && port === 465,
        pool: true,
        maxConnections: this.clamp(
          process.env.TENANT_SMTP_MAX_CONNECTIONS,
          2,
          1,
          5,
        ),
        maxMessages: this.clamp(process.env.TENANT_SMTP_MAX_MESSAGES, 100, 1, 1000),
        connectionTimeout: this.clamp(
          process.env.TENANT_SMTP_CONNECTION_TIMEOUT_MS,
          10_000,
          1000,
          120_000,
        ),
        greetingTimeout: 10_000,
        socketTimeout: 60_000,
        auth: { user, pass: password },
      };
    }

    const transport = nodemailer.createTransport(transportOptions);
    this.mailTransports.set(databaseName, { signature, transport });
    return transport;
  }

  private async sendSms(
    databaseName: string,
    job: TenantOutreachJob,
    tenant?: SaasTenant,
  ) {
    if (!job.recipient_phone) {
      throw new PermanentTenantDeliveryError('Recipient phone number is missing.');
    }
    const config = tenant
      ? await this.settings.getRawCommunication(tenant)
      : await this.setting(databaseName, 'outreach_sms_provider');
    if (!config) {
      throw new PermanentTenantDeliveryError('This tenant has no SMS provider configured.');
    }
    const provider = this.text(config.providerName, 'Twilio').toLowerCase();
    if (provider === 'twilio') return this.twilioMessage(config, job);
    if (provider === 'plivo') return this.plivoMessage(config, job);
    if (provider === 'ringcentral') return this.ringCentralMessage(config, job);
    throw new PermanentTenantDeliveryError(
      `Tenant SMS provider ${config.providerName ?? provider} is not supported.`,
    );
  }

  private async makeCall(
    databaseName: string,
    job: TenantOutreachJob,
    tenant?: SaasTenant,
  ) {
    if (!job.recipient_phone) {
      throw new PermanentTenantDeliveryError('Recipient phone number is missing.');
    }
    const config = tenant
      ? await this.settings.getRawCommunication(tenant)
      : await this.setting(databaseName, 'outreach_sms_provider');
    const provider = this.text(config?.providerName, 'Twilio').toLowerCase();
    if (!config || provider !== 'twilio') {
      throw new PermanentTenantDeliveryError(
        'Tenant voice calls currently require a tenant Twilio configuration.',
      );
    }
    const accountId = this.text(config.accountId);
    const authToken = this.text(config.authToken);
    const from = this.text(config.fromNumber);
    if (!accountId || !authToken || !from) {
      throw new PermanentTenantDeliveryError('Tenant Twilio voice credentials are incomplete.');
    }
    const form = new URLSearchParams({
      To: job.recipient_phone,
      From: from,
      Twiml: `<Response><Say>${this.escapeXml(job.body)}</Say></Response>`,
    });
    const result = await this.providerRequest(
      `${this.text(config.baseUrl, 'https://api.twilio.com')}/2010-04-01/Accounts/${encodeURIComponent(accountId)}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountId}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': job.idempotency_key,
        },
        body: form,
      },
    );
    return { providerMessageId: this.text(result.sid, job.idempotency_key) };
  }

  private async twilioMessage(config: any, job: TenantOutreachJob) {
    const accountId = this.text(config.accountId);
    const authToken = this.text(config.authToken);
    const from = this.text(config.fromNumber);
    if (!accountId || !authToken || !from) {
      throw new PermanentTenantDeliveryError('Tenant Twilio credentials are incomplete.');
    }
    const form = new URLSearchParams({
      To: job.recipient_phone,
      From: from,
      Body: job.body,
    });
    for (const url of this.mediaUrls(job.media_urls ?? job.payload?.mediaUrls)) {
      form.append('MediaUrl', url);
    }
    const result = await this.providerRequest(
      `${this.text(config.baseUrl, 'https://api.twilio.com')}/2010-04-01/Accounts/${encodeURIComponent(accountId)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountId}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': job.idempotency_key,
        },
        body: form,
      },
    );
    return { providerMessageId: this.text(result.sid, job.idempotency_key) };
  }

  private async plivoMessage(config: any, job: TenantOutreachJob) {
    const accountId = this.text(config.accountId);
    const authToken = this.text(config.authToken);
    const from = this.text(config.fromNumber);
    if (!accountId || !authToken || !from) {
      throw new PermanentTenantDeliveryError('Tenant Plivo credentials are incomplete.');
    }
    const result = await this.providerRequest(
      `${this.text(config.baseUrl, 'https://api.plivo.com')}/v1/Account/${encodeURIComponent(accountId)}/Message/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountId}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': job.idempotency_key,
        },
        body: JSON.stringify({
          src: from,
          dst: job.recipient_phone,
          text: job.body,
          url: this.mediaUrls(job.media_urls ?? job.payload?.mediaUrls),
        }),
      },
    );
    const messageId = Array.isArray(result.message_uuid)
      ? result.message_uuid[0]
      : result.message_uuid;
    return { providerMessageId: this.text(messageId, job.idempotency_key) };
  }

  private async ringCentralMessage(config: any, job: TenantOutreachJob) {
    const platform = await this.ringCentralPlatform(config);
    const mediaUrls = this.mediaUrls(job.media_urls ?? job.payload?.mediaUrls);
    const endpoint = `/restapi/v1.0/account/~/extension/~/${mediaUrls.length ? 'mms' : 'sms'}`;
    let response: any;

    if (mediaUrls.length) {
      const form = new FormData();
      form.append('json', new Blob([JSON.stringify({
        from: { phoneNumber: this.text(config.fromNumber) },
        to: [{ phoneNumber: job.recipient_phone }],
        text: job.body,
      })], { type: 'application/json' }));
      for (const mediaUrl of mediaUrls) {
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) throw new Error(`Attachment fetch failed: ${mediaUrl}`);
        form.append(
          'attachment',
          await mediaResponse.blob(),
          mediaUrl.split('/').pop() || 'attachment',
        );
      }
      response = await platform.post(endpoint, form);
    } else {
      response = await platform.post(endpoint, {
        from: { phoneNumber: this.text(config.fromNumber) },
        to: [{ phoneNumber: job.recipient_phone }],
        text: job.body,
      });
    }

    const payload = await response.json();
    return { providerMessageId: this.text(payload?.id, job.idempotency_key) };
  }

  private async ringCentralPlatform(config: any) {
    const clientId = this.text(config.accountId);
    const clientSecret = this.text(config.clientSecret);
    const jwt = this.text(config.authToken);
    const from = this.text(config.fromNumber);
    if (!clientId || !clientSecret || !jwt || !from) {
      throw new PermanentTenantDeliveryError(
        'Tenant RingCentral client ID, client secret, JWT, and from number are required.',
      );
    }
    const RingCentralSdk =
      require('@ringcentral/sdk').SDK ?? require('@ringcentral/sdk');
    const sdk = new RingCentralSdk({
      server: this.text(config.baseUrl, 'https://platform.ringcentral.com').replace(/\/$/, ''),
      clientId,
      clientSecret,
    });
    const platform = sdk.platform();
    await platform.login({ jwt });
    return platform;
  }

  private async providerRequest(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text };
    }
    if (response.ok) return payload;

    const message = this.text(
      payload?.message ?? payload?.error?.message,
      `Provider request failed with status ${response.status}.`,
    );
    if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
      throw new PermanentTenantDeliveryError(message);
    }
    throw new Error(message);
  }

  private async setting(databaseName: string, key: string) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query('SELECT value FROM tenant_setting WHERE key = $1', [key]);
      const value = result.rows[0]?.value;
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return value;
    });
  }

  private attachments(value: any) {
    return this.mediaUrls(value).map((url, index) => ({
      filename: `attachment-${index + 1}`,
      path: url,
    }));
  }

  private mediaUrls(value: any) {
    const source = Array.isArray(value) ? value : [];
    return [...new Set(source
      .map((item) => this.text(item))
      .map((url) => url.match(/^\[.*?\]\((https?:\/\/[^)]+)\)$/)?.[1] ?? url)
      .map((url) => url.trim())
      .filter((url) => /^https:\/\//i.test(url)))].slice(0, 10);
  }

  private escapeHtml(value: string) {
    return `${value ?? ''}`
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private escapeXml(value: string) {
    return this.escapeHtml(value);
  }

  private safeHost(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9.-]/g, '-').slice(0, 120);
  }

  private clamp(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private text(value: any, fallback = '') {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }
}
