import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import { emailSignatureContent } from '../common/email-signature';
import {
  isGmailReconnectRequired,
  refreshGmailAccessToken,
} from '../common/gmail-oauth';
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
      return { providerMessageId: job.provider_message_id, provider: job.provider };
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
    let config = tenant
      ? await this.settings.getRawSmtp(tenant)
      : await this.setting(databaseName, 'outreach_email_provider');
    if (!config) {
      throw new PermanentTenantDeliveryError('This tenant has no email provider configured.');
    }
    if (tenant && this.text(config.authType).toLowerCase() === 'gmail-oauth') {
      config = await this.ensureTenantGmailAccessToken(tenant, config);
    }

    const fromEmail = this.text(config.fromEmail, config.username ?? config.gmailEmail);
    if (!fromEmail) {
      throw new PermanentTenantDeliveryError('Tenant sender email is missing.');
    }

    const signature = emailSignatureContent(config);
    const bodyHtml = this.emailBodyHtml(job);
    const message = {
      from: config.fromName
        ? `"${this.text(config.fromName).replace(/"/g, '')}" <${fromEmail}>`
        : fromEmail,
      to: job.recipient_email,
      subject: job.title,
      text: job.body + (signature.text ? `\n\n${signature.text}` : ''),
      html: bodyHtml + (signature.html ? `<br><br><div data-email-signature="true">${signature.html}</div>` : ''),
      attachDataUrls: true,
      messageId: `<${job.idempotency_key}@${this.safeHost(databaseName)}.tenant>`,
      headers: {
        'X-Tenant-Database': databaseName,
        'X-Tenant-Idempotency-Key': job.idempotency_key,
      },
      attachments: this.attachments(job.media_urls ?? job.payload?.mediaUrls),
    };

    // Gmail OAuth already grants gmail.send. Use HTTPS rather than SMTP so
    // a closed SMTP/TLS socket cannot prevent delivery from connected Gmail.
    if (this.text(config.authType).toLowerCase() === 'gmail-oauth') {
      return this.sendViaGmailApi(config, message, job.recipient_email);
    }

    const transport = this.mailTransport(databaseName, config);
    const info = await transport.sendMail(message);
    return {
      providerMessageId: this.text(info?.messageId, job.idempotency_key),
      provider: 'SMTP',
      accepted: Array.isArray(info?.accepted) ? info.accepted : [],
      rejected: Array.isArray(info?.rejected) ? info.rejected : [],
    };
  }

  private async sendViaGmailApi(config: any, message: any, recipient: string) {
    const accessToken = this.text(config.gmailAccessToken);
    if (!accessToken) {
      throw new PermanentTenantDeliveryError(
        'Gmail access token is missing. Reconnect Gmail in Agency Settings.',
      );
    }

    // Nodemailer composes a standards-compliant MIME message, including UTF-8,
    // plain-text/HTML alternatives and any supported attachments, without
    // opening an SMTP network connection.
    const nodemailer = require('nodemailer');
    const composer = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
    });
    const compiled = await composer.sendMail(message);
    if (!Buffer.isBuffer(compiled.message)) {
      throw new Error('Failed to prepare Gmail message.');
    }

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: compiled.message.toString('base64url') }),
      },
    );
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = this.text(
        result?.error?.message ?? result?.message,
        'Google rejected the message.',
      ).slice(0, 240);
      const reason = `Gmail API send failed (HTTP ${response.status}): ${detail}`;
      if ([400, 401, 403, 404].includes(response.status)) {
        throw new PermanentTenantDeliveryError(reason);
      }
      throw new Error(reason);
    }
    if (!this.text(result?.id)) {
      throw new Error('Gmail API did not return a message ID.');
    }
    return {
      providerMessageId: result.id,
      provider: 'Gmail API',
      accepted: [recipient],
      rejected: [],
    };
  }

  private async ensureTenantGmailAccessToken(tenant: SaasTenant, config: any) {
    const expiresAt = config.gmailTokenExpiresAt
      ? new Date(config.gmailTokenExpiresAt).getTime()
      : 0;
    if (config.gmailAccessToken && expiresAt > Date.now() + 60_000) return config;
    const clientId = this.text(config.gmailClientId, process.env.GOOGLE_CLIENT_ID);
    const clientSecret = this.text(config.gmailClientSecret, process.env.GOOGLE_CLIENT_SECRET);
    const refreshToken = this.text(config.gmailRefreshToken);
    if (!clientId || !clientSecret || !refreshToken) {
      throw new PermanentTenantDeliveryError('Tenant Gmail OAuth configuration is incomplete.');
    }
    try {
      const refreshed = await refreshGmailAccessToken({ clientId, clientSecret, refreshToken });
      config.gmailAccessToken = refreshed.accessToken;
      config.gmailTokenExpiresAt = refreshed.accessTokenExpiresAt;
      config.gmailLastTokenRefreshAt = new Date().toISOString();
      config.gmailReconnectRequired = false;
      config.gmailLastAuthError = '';
      config.gmailAuthFailedAt = null;
      if (refreshed.refreshTokenExpiresAt) {
        config.gmailRefreshTokenExpiresAt = refreshed.refreshTokenExpiresAt;
      }
      await this.settings.saveRawSmtp(tenant, config);
      return config;
    } catch (error) {
      if (isGmailReconnectRequired(error)) {
        config.enableInboxSync = false;
        config.gmailAccessToken = '';
        config.gmailTokenExpiresAt = null;
        config.gmailReconnectRequired = true;
        config.gmailLastAuthError = error instanceof Error ? error.message.slice(0, 500) : 'Gmail authorization expired.';
        config.gmailAuthFailedAt = new Date().toISOString();
        await this.settings.saveRawSmtp(tenant, config);
        throw new PermanentTenantDeliveryError(config.gmailLastAuthError);
      }
      throw error;
    }
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
        }),
      )
      .digest('hex');
    const cached = this.mailTransports.get(databaseName);
    if (cached?.signature === signature) return cached.transport;
    if (cached && typeof cached.transport?.close === 'function') cached.transport.close();

    // Only password-based SMTP reaches this method. Gmail OAuth uses the
    // Gmail API above, even if the previous SMTP configuration is still cached.
    const nodemailer = require('nodemailer');
    const user = this.text(config.username, config.gmailEmail);
    const host = this.text(config.host);
    const password = this.text(config.password);
    if (!host || !user || !password) {
      throw new PermanentTenantDeliveryError(
        'Tenant SMTP host, username, and password are required.',
      );
    }
    const port = this.clamp(config.port, 587, 1, 65_535);
    const transportOptions = {
      host,
      port,
      secure: config.useSsl === true && port === 465,
      requireTLS: config.useSsl === true && port !== 465,
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
    if (provider === 'twilio') return { ...(await this.twilioMessage(config, job)), provider: 'Twilio' };
    if (provider === 'plivo') return { ...(await this.plivoMessage(config, job)), provider: 'Plivo' };
    if (provider === 'ringcentral') return { ...(await this.ringCentralMessage(config, job)), provider: 'RingCentral' };
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
    return { providerMessageId: this.text(result.sid, job.idempotency_key), provider: 'Twilio' };
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
        const fileName = decodeURIComponent(mediaUrl.split('/').pop()?.split('?')[0] || 'attachment');
        const blob = await mediaResponse.blob();
        form.append(
          'attachment',
          new Blob([blob], { type: mediaResponse.headers.get('content-type') || blob.type || 'application/octet-stream' }),
          fileName,
        );
      }
      const auth = await platform.auth().data();
      const multipartResponse = await fetch(
        `${this.text(config.baseUrl, 'https://platform.ringcentral.com').replace(/\/$/, '')}${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.text(auth?.access_token)}`,
            'Idempotency-Key': job.idempotency_key,
          },
          body: form,
        },
      );
      const responseText = await multipartResponse.text();
      let multipartPayload: any = {};
      try {
        multipartPayload = responseText ? JSON.parse(responseText) : {};
      } catch {
        multipartPayload = { message: responseText };
      }
      if (!multipartResponse.ok) {
        const providerError = this.text(
          multipartPayload?.message ?? multipartPayload?.error?.message,
          `RingCentral MMS request failed with status ${multipartResponse.status}.`,
        );
        if (multipartResponse.status >= 400 && multipartResponse.status < 500 && multipartResponse.status !== 408 && multipartResponse.status !== 429) {
          throw new PermanentTenantDeliveryError(providerError);
        }
        throw new Error(providerError);
      }
      response = { json: async () => multipartPayload };
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

  private emailBodyHtml(job: TenantOutreachJob) {
    const body = String(job.body ?? '');
    const addresses = new Set<string>();
    for (const value of [job.payload?.propertyTitle, job.payload?.propertyAddress]) {
      if (typeof value === 'string' && value.trim() && value.length <= 500) addresses.add(value.trim());
    }
    // Also cover imported address spellings that differ from the property record,
    // and queued reports created before address metadata was recorded.
    const streetAddress = /\b\d{1,6}[ \t]+(?:[a-z0-9.,'&#/-]+[ \t]+){0,10}(?:street|st|drive|dr|road|rd|avenue|ave|way|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|terrace|ter|trail|trl|parkway|pkwy)\b\.?/gi;
    for (const match of body.matchAll(streetAddress)) addresses.add(match[0]);
    let html = '';
    let offset = 0;
    if (addresses.size) {
      const pattern = [...addresses].sort((a, b) => b.length - a.length)
        .map((address) => address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      for (const match of body.matchAll(new RegExp(pattern, 'gi'))) {
        html += this.escapeHtml(body.slice(offset, match.index));
        // Invisible non-joiners break Gmail's address detector in the HTML
        // alternative only. Stored text, plain-text MIME, SMS, and subject stay exact.
        const characters = Array.from(match[0]);
        html += characters.map((character, index) => this.escapeHtml(character) +
          (/[a-z0-9]/i.test(character) && /[a-z0-9]/i.test(characters[index + 1] ?? '') ? '&#8204;' : '')).join('');
        offset = match.index + match[0].length;
      }
    }
    html += this.escapeHtml(body.slice(offset));
    return `<div style="white-space:pre-wrap;font-family:Arial,sans-serif">${html.replace(/\r\n|\r|\n/g, '<br>')}</div>`;
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
