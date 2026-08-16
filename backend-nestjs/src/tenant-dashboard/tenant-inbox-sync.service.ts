import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { PoolClient } from 'pg';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Injectable()
export class TenantInboxSyncService {
  private readonly logger = new Logger(TenantInboxSyncService.name);
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly settings: TenantWorkspaceSettingsService,
  ) {}

  @Cron('20 * * * * *')
  async syncAllTenantInboxes() {
    if (process.env.TENANT_INBOX_SYNC_ENABLED === 'false' || this.running) return;
    this.running = true;
    try {
      const tenants = await this.tenantRepository.find({
        where: { databaseStatus: 'ready' } as any,
        order: { id: 'ASC' },
      });
      const ready = tenants.filter(
        (tenant) => tenant.databaseName && tenant.isActive && !tenant.isBlocked,
      );
      await this.withConcurrency(
        ready,
        this.clamp(process.env.TENANT_SYNC_TENANT_CONCURRENCY, 3, 1, 10),
        async (tenant) => {
          try {
            await this.syncTenant(tenant, false);
          } catch (error) {
            this.logger.error(
              `Tenant inbox sync failed for ${tenant.databaseName}: ${this.message(error)}`,
            );
          }
        },
      );
    } finally {
      this.running = false;
    }
  }

  async syncTenant(tenant: SaasTenant, force = true) {
    const databaseName = this.databaseName(tenant);
    const config: any = await this.settings.getRawSmtp(tenant);
    if (!config?.enableInboxSync) {
      return { imported: 0, skipped: true, message: 'Tenant inbox sync is disabled.' };
    }
    if (!force) {
      const due = await this.isDue(databaseName);
      if (!due) return { imported: 0, skipped: true, message: 'Tenant inbox sync is not due.' };
    }
    const authType = this.text(config.authType).toLowerCase();
    if (authType === 'gmail-oauth' || config.gmailRefreshToken) {
      await this.syncGmail(databaseName, config, tenant);
    } else {
      await this.syncImap(databaseName, config);
    }
    return { imported: 0, skipped: false, message: 'Tenant inbox sync completed.' };
  }

  async getStatus(tenant: SaasTenant) {
    const config: any = await this.settings.getRawSmtp(tenant);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `SELECT status, cursor, last_started_at, last_completed_at,
                last_succeeded_at, next_run_at, last_error,
                imported_count, matched_count, created_count, skipped_count
         FROM tenant_sync_state WHERE sync_key = 'mail-inbox'`,
      );
      const row = result.rows[0] ?? {};
      return {
        isConfigured: Boolean(config?.imapHost || config?.gmailRefreshToken),
        syncEnabled: config?.enableInboxSync === true,
        syncIntervalMinutes: Number(config?.syncIntervalMinutes) || 5,
        status: row.status ?? 'scheduled',
        isRunning: row.status === 'processing',
        lastStartedAt: row.last_started_at ?? null,
        lastCompletedAt: row.last_completed_at ?? null,
        lastSucceededAt: row.last_succeeded_at ?? null,
        nextRunAt: row.next_run_at ?? null,
        lastImportedCount: Number(row.imported_count) || 0,
        lastMatchedLeadCount: Number(row.matched_count) || 0,
        lastCreatedLeadCount: Number(row.created_count) || 0,
        lastSkippedCount: Number(row.skipped_count) || 0,
        lastError: row.last_error ?? null,
      };
    });
  }

  private async syncGmail(
    databaseName: string,
    config: any,
    tenant: SaasTenant,
  ) {
    const providerKey = `gmail:${this.text(config.gmailEmail, config.username)}`;
    await this.markStarted(databaseName, providerKey);
    try {
      const accessToken = await this.gmailAccessToken(databaseName, config, tenant);
      const maxMessages = this.clamp(config.maxMessagesPerSync, 100, 5, 500);
      const ids: string[] = [];
      let pageToken = '';
      while (ids.length < maxMessages) {
        const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
        url.searchParams.set('labelIds', 'INBOX');
        url.searchParams.set('maxResults', String(Math.min(100, maxMessages - ids.length)));
        url.searchParams.set('q', 'newer_than:14d');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const list = await this.jsonRequest(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        ids.push(...(Array.isArray(list.messages) ? list.messages.map((item: any) => item.id) : []));
        pageToken = this.text(list.nextPageToken);
        if (!pageToken) break;
      }

      for (const id of ids.slice(0, maxMessages).reverse()) {
        const message = await this.jsonRequest(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const headers = Object.fromEntries(
          (message.payload?.headers ?? []).map((item: any) => [
            this.text(item.name).toLowerCase(),
            this.text(item.value),
          ]),
        );
        const sender = this.extractAddress(headers.from);
        const recipient = this.extractAddress(headers.to);
        await this.storeInbound(databaseName, {
          channel: 'email',
          providerKey,
          providerMessageId: id,
          sender,
          recipient,
          subject: headers.subject ?? '',
          body: this.gmailBody(message.payload),
          receivedAt: message.internalDate
            ? new Date(Number(message.internalDate))
            : new Date(),
          payload: {
            gmailThreadId: message.threadId,
            gmailHistoryId: message.historyId,
            headers,
          },
        });
      }
      await this.markCompleted(databaseName, providerKey, ids[0] ?? null);
    } catch (error) {
      await this.markFailed(databaseName, providerKey, error);
      throw error;
    }
  }

  private async syncImap(databaseName: string, config: any) {
    const providerKey = `imap:${this.text(config.mailboxTag, config.imapUsername ?? config.username)}`;
    await this.markStarted(databaseName, providerKey);
    let connection: any;
    try {
      const host = this.text(config.imapHost);
      const user = this.text(config.imapUsername, config.username);
      const pass = this.text(config.imapPassword, config.password);
      if (!host || !user || !pass) throw new Error('Tenant IMAP configuration is incomplete.');
      const { ImapFlow } = require('imapflow');
      const { simpleParser } = require('mailparser');
      connection = new ImapFlow({
        host,
        port: this.clamp(config.imapPort, 993, 1, 65_535),
        secure: config.imapUseSsl !== false,
        auth: { user, pass },
        logger: false,
        connectionTimeout: 15_000,
        socketTimeout: 60_000,
      });
      await connection.connect();
      const lock = await connection.getMailboxLock(this.text(config.imapFolder, 'INBOX'));
      try {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const uids: number[] = await connection.search({ since }, { uid: true });
        const selected = uids.slice(-this.clamp(config.maxMessagesPerSync, 100, 5, 500));
        if (selected.length > 0) {
          for await (const item of connection.fetch(selected.join(','), {
            uid: true,
            envelope: true,
            internalDate: true,
            source: true,
          }, { uid: true })) {
            const parsed = await simpleParser(item.source);
            const sender = this.text(parsed.from?.value?.[0]?.address);
            const recipient = this.text(parsed.to?.value?.[0]?.address);
            const uidValidity = `${connection.mailbox?.uidValidity ?? '0'}`;
            await this.storeInbound(databaseName, {
              channel: 'email',
              providerKey,
              providerMessageId: `${uidValidity}:${item.uid}`,
              sender,
              recipient,
              subject: this.text(parsed.subject),
              body: this.text(parsed.text, this.stripHtml(parsed.html)),
              receivedAt: item.internalDate ?? parsed.date ?? new Date(),
              payload: {
                messageId: parsed.messageId,
                uid: item.uid,
                uidValidity,
              },
            });
          }
        }
        await this.markCompleted(
          databaseName,
          providerKey,
          selected.length ? `${selected[selected.length - 1]}` : null,
        );
      } finally {
        lock.release();
      }
    } catch (error) {
      await this.markFailed(databaseName, providerKey, error);
      throw error;
    } finally {
      if (connection) await connection.logout().catch(() => undefined);
    }
  }

  private async syncSms(databaseName: string, config: any) {
    const provider = this.text(config.providerName, 'Twilio').toLowerCase();
    const providerKey = `${provider}:${this.text(config.fromNumber)}`;
    await this.markStarted(databaseName, providerKey);
    try {
      if (provider !== 'twilio') {
        throw new Error(`Inbound sync is not configured for tenant provider ${provider}.`);
      }
      const accountId = this.text(config.accountId);
      const authToken = this.text(config.authToken);
      const fromNumber = this.text(config.fromNumber);
      if (!accountId || !authToken || !fromNumber) {
        throw new Error('Tenant Twilio sync credentials are incomplete.');
      }
      const url = new URL(
        `${this.text(config.baseUrl, 'https://api.twilio.com')}/2010-04-01/Accounts/${encodeURIComponent(accountId)}/Messages.json`,
      );
      url.searchParams.set('To', fromNumber);
      url.searchParams.set(
        'PageSize',
        String(this.clamp(config.maxMessagesPerSync, 100, 5, 1000)),
      );
      const result = await this.jsonRequest(url.toString(), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountId}:${authToken}`).toString('base64')}`,
        },
      });
      const messages = Array.isArray(result.messages) ? result.messages : [];
      for (const message of messages.reverse()) {
        if (!`${message.direction ?? ''}`.toLowerCase().includes('inbound')) continue;
        await this.storeInbound(databaseName, {
          channel: 'sms',
          providerKey,
          providerMessageId: this.text(message.sid),
          sender: this.text(message.from),
          recipient: this.text(message.to),
          subject: '',
          body: this.text(message.body),
          receivedAt: message.date_sent ? new Date(message.date_sent) : new Date(),
          payload: message,
        });
      }
      await this.markCompleted(databaseName, providerKey, messages[0]?.sid ?? null);
    } catch (error) {
      await this.markFailed(databaseName, providerKey, error);
      throw error;
    }
  }

  private async storeInbound(
    databaseName: string,
    input: {
      channel: 'email' | 'sms';
      providerKey: string;
      providerMessageId: string;
      sender: string;
      recipient: string;
      subject: string;
      body: string;
      receivedAt: Date;
      payload: any;
    },
  ) {
    if (!input.providerMessageId || !input.sender) return;
    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const lead = await this.findLead(client, input.channel, input.sender);
        const channel = input.channel === 'email' ? 'Email' : 'SMS';
        const key = createHash('sha256')
          .update(`${input.providerKey}|${input.providerMessageId}`)
          .digest('hex');
        const payload = { ...(input.payload ?? {}), lead };
        const inserted = await client.query(
          `INSERT INTO tenant_outreach_job(
             idempotency_key, lead_id, source_type, source_id, channel,
             direction, status, recipient_name, recipient_email,
             recipient_phone, title, body, provider, provider_message_id,
             created_by, scheduled_at, next_attempt_at, max_attempts,
             is_read, payload, occurred_at, completed_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             'Incoming', 'received', $6, $7,
             $8, $9, $10, $11, $12,
             $13, $14, $14, 1,
             false, $15::jsonb, $14, $14
           )
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING id`,
          [
            key,
            lead?.id ?? null,
            input.channel === 'email' ? 'mail-inbox' : 'sms-inbox',
            input.providerMessageId.slice(0, 120),
            channel,
            `${lead?.full_name ?? lead?.fullName ?? input.sender}`.slice(0, 200),
            input.channel === 'email' ? input.sender.toLowerCase().slice(0, 240) : '',
            input.channel === 'sms' ? input.sender.slice(0, 80) : '',
            input.subject.slice(0, 500),
            input.body,
            input.providerKey.slice(0, 100),
            input.providerMessageId.slice(0, 240),
            input.providerKey.slice(0, 200),
            input.receivedAt,
            JSON.stringify(payload),
          ],
        );
        if (inserted.rows[0] && lead?.id) {
          await client.query(
            `UPDATE tenant_outreach_job
             SET status = 'cancelled',
                 last_error = 'Cancelled because this lead replied.',
                 completed_at = now(), locked_at = NULL, locked_by = NULL,
                 updated_at = now()
             WHERE lead_id = $1
               AND id <> $2
               AND direction <> 'Incoming'
               AND status IN ('scheduled', 'retrying')`,
            [lead.id, inserted.rows[0].id],
          );
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  private async findLead(
    client: PoolClient,
    channel: 'email' | 'sms',
    sender: string,
  ) {
    const result =
      channel === 'email'
        ? await client.query(
            `SELECT to_jsonb(lead) AS value
             FROM tenant_lead lead
             WHERE lower(COALESCE(to_jsonb(lead)->>'email', '')) = lower($1)
             ORDER BY lead.id DESC LIMIT 1`,
            [sender],
          )
        : await client.query(
            `SELECT to_jsonb(lead) AS value
             FROM tenant_lead lead
             WHERE regexp_replace(COALESCE(to_jsonb(lead)->>'phone', ''), '[^0-9]', '', 'g') =
                   regexp_replace($1, '[^0-9]', '', 'g')
             ORDER BY lead.id DESC LIMIT 1`,
            [sender],
          );
    return result.rows[0]?.value ?? null;
  }

  private async gmailAccessToken(
    databaseName: string,
    config: any,
    tenant: SaasTenant,
  ) {
    const expiresAt = config.gmailTokenExpiresAt
      ? new Date(config.gmailTokenExpiresAt).getTime()
      : 0;
    if (config.gmailAccessToken && expiresAt > Date.now() + 60_000) {
      return config.gmailAccessToken;
    }
    const clientId = this.text(config.gmailClientId, process.env.GOOGLE_CLIENT_ID);
    const clientSecret = this.text(
      config.gmailClientSecret,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    const refreshToken = this.text(config.gmailRefreshToken);
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Tenant Gmail refresh configuration is incomplete.');
    }
    const response = await this.jsonRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const accessToken = this.text(response.access_token);
    if (!accessToken) throw new Error('Gmail did not return an access token.');
    config.gmailAccessToken = accessToken;
    config.gmailTokenExpiresAt = new Date(
      Date.now() + (Number(response.expires_in) || 3600) * 1000,
    ).toISOString();
    await this.settings.saveRawSmtp(tenant, config);
    return accessToken;
  }

  private async markStarted(databaseName: string, providerKey: string) {
    await this.databases.withTenantClient(databaseName, (client) =>
      client.query(
        `INSERT INTO tenant_sync_state(
           sync_key, status, cursor, last_started_at, next_run_at, last_error
         ) VALUES ('mail-inbox', 'processing', $1::jsonb, now(), now(), '')
         ON CONFLICT (sync_key) DO UPDATE
         SET status = 'processing', last_started_at = now(),
             last_error = '', locked_at = now(), updated_at = now()`,
        [JSON.stringify({ providerKey })],
      ),
    );
  }

  private async markCompleted(
    databaseName: string,
    providerKey: string,
    cursor: string | null,
  ) {
    await this.databases.withTenantClient(databaseName, (client) =>
      client.query(
        `INSERT INTO tenant_sync_state(
           sync_key, status, cursor, last_completed_at, last_succeeded_at,
           next_run_at, locked_at, locked_by, last_error
         ) VALUES (
           'mail-inbox', 'sent', $1::jsonb, now(), now(),
           now() + interval '5 minutes', NULL, NULL, ''
         )
         ON CONFLICT (sync_key) DO UPDATE
         SET status = 'sent', cursor = EXCLUDED.cursor,
             last_completed_at = now(), last_succeeded_at = now(),
             next_run_at = now() + interval '5 minutes',
             locked_at = NULL, locked_by = NULL, last_error = '',
             updated_at = now()`,
        [JSON.stringify({ providerKey, cursor })],
      ),
    );
  }

  private async markFailed(
    databaseName: string,
    providerKey: string,
    error: unknown,
  ) {
    await this.databases.withTenantClient(databaseName, (client) =>
      client.query(
        `INSERT INTO tenant_sync_state(
           sync_key, status, cursor, next_run_at, last_completed_at, last_error
         ) VALUES (
           'mail-inbox', 'retrying', $1::jsonb,
           now() + interval '1 minute', now(), $2
         )
         ON CONFLICT (sync_key) DO UPDATE
         SET status = 'retrying', cursor = EXCLUDED.cursor,
             next_run_at = now() + interval '1 minute',
             last_completed_at = now(), locked_at = NULL, locked_by = NULL,
             last_error = EXCLUDED.last_error, updated_at = now()`,
        [
          JSON.stringify({ providerKey }),
          this.message(error).slice(0, 4000),
        ],
      ),
    );
  }

  private async setting(client: PoolClient, key: string) {
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
  }

  private async jsonRequest(url: string, init: RequestInit = {}) {
    const response = await fetch(url, init);
    const text = await response.text();
    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { message: text };
    }
    if (response.ok) return payload;
    throw new Error(
      this.text(
        payload?.error?.message ?? payload?.message,
        `Provider request failed with status ${response.status}.`,
      ),
    );
  }

  private gmailBody(payload: any): string {
    if (!payload) return '';
    const mimeType = this.text(payload.mimeType).toLowerCase();
    const data = payload.body?.data;
    if (data && (mimeType === 'text/plain' || mimeType === 'text/html')) {
      const decoded = Buffer.from(`${data}`.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      return mimeType === 'text/html' ? this.stripHtml(decoded) : decoded;
    }
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    const plain = parts.find((part: any) => this.text(part.mimeType).toLowerCase() === 'text/plain');
    if (plain) return this.gmailBody(plain);
    const html = parts.find((part: any) => this.text(part.mimeType).toLowerCase() === 'text/html');
    if (html) return this.gmailBody(html);
    for (const part of parts) {
      const nested = this.gmailBody(part);
      if (nested) return nested;
    }
    return '';
  }

  private extractAddress(value: any) {
    const text = this.text(value);
    const match = text.match(/<([^>]+)>/);
    return this.text(match?.[1], text).toLowerCase();
  }

  private stripHtml(value: any) {
    return this.text(value)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async withConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ) {
    let index = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) await worker(items[index++]);
    });
    await Promise.all(runners);
  }

  private async isDue(databaseName: string) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      await client.query(
        `INSERT INTO tenant_sync_state(sync_key, status, next_run_at)
         VALUES ('mail-inbox', 'scheduled', now())
         ON CONFLICT (sync_key) DO NOTHING`,
      );
      const result = await client.query(
        `SELECT next_run_at <= now() AS due
         FROM tenant_sync_state WHERE sync_key = 'mail-inbox'`,
      );
      return result.rows[0]?.due !== false;
    });
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new Error('Tenant database is not ready.');
    return tenant.databaseName;
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : `${error ?? 'Unknown sync error'}`;
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
