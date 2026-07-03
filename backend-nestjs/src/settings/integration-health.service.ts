import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { SettingsService } from './settings.service';

type CheckResult = {
  configured: boolean;
  ok: boolean;
  message: string;
};

@Injectable()
export class IntegrationHealthService {
  constructor(private readonly settings: SettingsService) {}

  async testAll() {
    const [mail, inbox, sms, ai] = await Promise.all([
      this.testMail(),
      this.testInbox(),
      this.testSms(),
      this.testAi(),
    ]);
    const configured = [mail, inbox, sms, ai].filter((item) => item.configured);
    return {
      checkedAt: new Date(),
      overall: configured.length === 0
        ? 'not_configured'
        : configured.every((item) => item.ok)
          ? 'healthy'
          : 'degraded',
      services: { mail, inbox, sms, ai },
    };
  }

  async testMail(): Promise<CheckResult> {
    const config = await this.settings.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) {
      return this.result(false, false, 'SMTP is not configured.');
    }
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port ?? 587,
        secure: !!config.useSsl && Number(config.port ?? 587) === 465,
        auth: { user: config.username, pass: config.password },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 12_000,
      });
      await transporter.verify();
      return this.result(true, true, 'SMTP authentication succeeded.');
    } catch (error: any) {
      return this.result(true, false, this.message(error, 'SMTP authentication failed.'));
    }
  }

  async testInbox(): Promise<CheckResult> {
    const config = await this.settings.getSmtpConfig();
    if (!config?.enableInboxSync) return this.result(false, false, 'Inbox sync is disabled.');
    if (!config.imapHost || !config.imapUsername || !config.imapPassword) {
      return this.result(true, false, 'IMAP credentials are incomplete.');
    }
    const client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort ?? 993,
      secure: config.imapUseSsl !== false,
      auth: { user: config.imapUsername, pass: config.imapPassword },
      logger: false,
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 12_000,
      tls: { rejectUnauthorized: !this.localHost(config.imapHost) },
    });
    try {
      await client.connect();
      await client.mailboxOpen(config.imapFolder || 'INBOX');
      await client.logout();
      return this.result(true, true, 'IMAP authentication and inbox access succeeded.');
    } catch (error: any) {
      try { client.close(); } catch {}
      return this.result(true, false, this.message(error, 'IMAP connection failed.'));
    }
  }

  async testSms(): Promise<CheckResult> {
    const config = await this.settings.getCommunicationConfig();
    if (!config?.providerName || !config?.accountId || !config?.authToken || !config?.fromNumber) {
      return this.result(false, false, 'SMS provider is not configured.');
    }
    const provider = `${config.providerName}`.toLowerCase();
    try {
      let response: Response;
      if (provider === 'twilio') {
        response = await this.request(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountId)}.json`, {
          Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`,
        });
      } else if (provider === 'plivo') {
        const base = `${config.baseUrl || 'https://api.plivo.com'}`.replace(/\/+$/, '');
        response = await this.request(`${base}/v1/Account/${encodeURIComponent(config.accountId)}/`, {
          Authorization: `Basic ${Buffer.from(`${config.accountId}:${config.authToken}`).toString('base64')}`,
        });
      } else if (provider === 'ringcentral') {
        const base = `${config.baseUrl || 'https://platform.ringcentral.com'}`.replace(/\/+$/, '');
        response = await this.request(`${base}/restapi/v1.0/account/~/extension/~`, {
          Authorization: `Bearer ${config.authToken}`,
        });
      } else {
        return this.result(true, false, 'Custom SMS providers cannot be verified automatically.');
      }
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
      return this.result(true, true, `${config.providerName} authentication succeeded.`);
    } catch (error: any) {
      return this.result(true, false, this.message(error, `${config.providerName} authentication failed.`));
    }
  }

  async testAi(): Promise<CheckResult> {
    const config = await this.settings.getAiProviderConfig();
    if (!config?.providerName || !config?.baseUrl || !config?.model) {
      return this.result(false, false, 'AI provider is not configured.');
    }
    const provider = `${config.providerName}`.toLowerCase();
    if (provider !== 'ollama' && !config.apiKey) return this.result(true, false, 'AI API key is missing.');
    try {
      const base = `${config.baseUrl}`.replace(/\/+$/, '');
      const response = provider === 'ollama'
        ? await this.request(`${base}/api/tags`)
        : await this.request(`${base}/models`, { Authorization: `Bearer ${config.apiKey}` });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
      return this.result(true, true, `${config.providerName} connection succeeded.`);
    } catch (error: any) {
      return this.result(true, false, this.message(error, `${config.providerName} connection failed.`));
    }
  }

  private async request(url: string, headers: Record<string, string> = {}) {
    return fetch(url, { headers, signal: AbortSignal.timeout(12_000) });
  }

  private result(configured: boolean, ok: boolean, message: string): CheckResult {
    return { configured, ok, message };
  }

  private message(error: any, fallback: string) {
    return `${error?.response?.data?.message ?? error?.message ?? fallback}`.slice(0, 300);
  }

  private localHost(host: string) {
    return ['localhost', '127.0.0.1', '::1'].includes(`${host}`.toLowerCase());
  }
}
