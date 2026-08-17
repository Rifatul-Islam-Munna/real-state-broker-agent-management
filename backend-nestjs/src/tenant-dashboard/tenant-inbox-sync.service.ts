import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { PoolClient } from 'pg';
import { Repository } from 'typeorm';
import {
  buildLeadCollectionFingerprint,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
  prepareLeadCollectionSource,
} from '../mail/lead-collection-parser';
import { normalizeLinkedPageConfig } from '../mail/linked-page-config';
import {
  enrichEmailWithLinkedPage,
  loadConfiguredLinkedPage,
} from '../mail/linked-page-loader';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Injectable()
export class TenantInboxSyncService {
  private readonly logger = new Logger(TenantInboxSyncService.name);
  private running = false;
  private cleanupRunning = false;

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

  @Cron('37 3 * * *')
  async cleanupAllTenantLocalInboxes() {
    if (this.cleanupRunning) return;
    this.cleanupRunning = true;
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
          const config: any = await this.settings.getRawSmtp(tenant);
          await this.cleanupLocalInbox(
            this.databaseName(tenant),
            this.retentionDays(config?.localInboxRetentionDays),
          );
        },
      );
    } finally {
      this.cleanupRunning = false;
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
    const deletedLocalMessages = await this.cleanupLocalInbox(
      databaseName,
      this.retentionDays(config.localInboxRetentionDays),
    );
    return {
      imported: 0,
      skipped: false,
      deletedLocalMessages,
      message: 'Tenant inbox sync completed.',
    };
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
        localInboxRetentionDays: this.retentionDays(config?.localInboxRetentionDays),
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

  async setProviderReadState(
    tenant: SaasTenant,
    message: { provider?: string; providerMessageId?: string; payload?: any },
    isRead: boolean,
  ) {
    const provider = this.text(message.provider).toLowerCase();
    if (!provider.startsWith('gmail:') && !provider.startsWith('imap:')) return false;

    const config: any = await this.settings.getRawSmtp(tenant);
    if (provider.startsWith('gmail:')) {
      const messageId = this.text(message.providerMessageId);
      if (!messageId) return false;
      const accessToken = await this.gmailAccessToken(this.databaseName(tenant), config, tenant);
      await this.jsonRequest(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(isRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] }),
        },
      );
      return true;
    }

    const host = this.text(config.imapHost);
    const user = this.text(config.imapUsername, config.username);
    const pass = this.text(config.imapPassword, config.password);
    const uid = Number(message.payload?.uid ?? `${message.providerMessageId ?? ''}`.split(':').pop());
    if (!host || !user || !pass || !Number.isInteger(uid) || uid <= 0) return false;
    const { ImapFlow } = require('imapflow');
    const connection = new ImapFlow({
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
      const expectedUidValidity = this.text(message.payload?.uidValidity);
      const actualUidValidity = `${connection.mailbox?.uidValidity ?? ''}`;
      if (expectedUidValidity && actualUidValidity && expectedUidValidity !== actualUidValidity) {
        throw new Error('IMAP mailbox changed; sync the inbox again before changing read state.');
      }
      if (isRead) await connection.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      else await connection.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
      return true;
    } finally {
      lock.release();
      await connection.logout().catch(() => undefined);
    }
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
      const selectedMessages = await this.gmailMessagesForConfiguredTags(
        accessToken,
        config.mailboxTag,
        maxMessages,
      );

      for (const selected of [...selectedMessages].reverse()) {
        const id = selected.id;
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
        const bodies = this.gmailBodies(message.payload);
        await this.storeInbound(databaseName, {
          channel: 'email',
          providerKey,
          providerMessageId: id,
          sender,
          recipient,
          subject: headers.subject ?? '',
          body: bodies.text,
          receivedAt: message.internalDate
            ? new Date(Number(message.internalDate))
            : new Date(),
          isRead: !((message.labelIds ?? []) as string[]).includes('UNREAD'),
          autoCreateLeads: config.autoCreateLeads !== false,
          mailboxTag: selected.mailboxTag,
          leadTemplateTags: this.stringList(config.leadTemplateTags),
          payload: {
            gmailThreadId: message.threadId,
            gmailHistoryId: message.historyId,
            headers,
            htmlBody: bodies.html,
          },
        });
      }
      await this.markCompleted(databaseName, providerKey, selectedMessages[0]?.id ?? null);
    } catch (error) {
      await this.markFailed(databaseName, providerKey, error);
      throw error;
    }
  }

  private async gmailMessagesForConfiguredTags(
    accessToken: string,
    configuredTags: unknown,
    maxMessages: number,
  ) {
    const requestedTags = this.syncTags(configuredTags, 'gmail');
    if (!requestedTags.length) {
      return this.listGmailMessagesForLabel(accessToken, 'INBOX', 'gmail', maxMessages);
    }

    const labelResponse = await this.jsonRequest(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const labels = Array.isArray(labelResponse.labels) ? labelResponse.labels : [];
    const resolved = requestedTags
      .map((tag) => labels.find((label: any) => {
        const name = this.text(label?.name).toLowerCase();
        const id = this.text(label?.id).toLowerCase();
        return name === tag.toLowerCase() || id === tag.toLowerCase();
      }))
      .filter(Boolean);
    if (!resolved.length) return [];

    const selected = new Map<string, { id: string; mailboxTag: string }>();
    for (const label of resolved) {
      const labelId = this.text(label.id);
      const labelName = this.text(label.name, labelId);
      const remaining = maxMessages - selected.size;
      if (remaining <= 0) break;
      const messages = await this.listGmailMessagesForLabel(
        accessToken,
        labelId,
        labelName,
        remaining,
      );
      for (const message of messages) {
        if (!selected.has(message.id)) selected.set(message.id, message);
        if (selected.size >= maxMessages) break;
      }
    }
    return [...selected.values()];
  }

  private async listGmailMessagesForLabel(
    accessToken: string,
    labelId: string,
    mailboxTag: string,
    maxMessages: number,
  ) {
    const ids: Array<{ id: string; mailboxTag: string }> = [];
    let pageToken = '';
    while (ids.length < maxMessages) {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.append('labelIds', 'INBOX');
      if (labelId !== 'INBOX') url.searchParams.append('labelIds', labelId);
      url.searchParams.set('maxResults', String(Math.min(100, maxMessages - ids.length)));
      url.searchParams.set('q', 'newer_than:14d');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const list = await this.jsonRequest(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      for (const item of Array.isArray(list.messages) ? list.messages : []) {
        const id = this.text(item?.id);
        if (id) ids.push({ id, mailboxTag });
      }
      pageToken = this.text(list.nextPageToken);
      if (!pageToken) break;
    }
    return ids;
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
        const syncTags = this.syncTags(config.mailboxTag, 'imap');
        const search: any = { since };
        if (syncTags.length) {
          search.or = syncTags.map((tag) => ({ keyword: tag }));
        }
        const uids: number[] = await connection.search(search, { uid: true });
        const selected = uids.slice(-this.clamp(config.maxMessagesPerSync, 100, 5, 500));
        if (selected.length > 0) {
          for await (const item of connection.fetch(selected.join(','), {
            uid: true,
            envelope: true,
            flags: true,
            internalDate: true,
            source: true,
          }, { uid: true })) {
            const parsed = await simpleParser(item.source);
            const sender = this.text(parsed.from?.value?.[0]?.address);
            const recipient = this.text(parsed.to?.value?.[0]?.address);
            const uidValidity = `${connection.mailbox?.uidValidity ?? '0'}`;
            const mailboxTag = this.matchImapTag(item.flags, syncTags) || 'imap';
            await this.storeInbound(databaseName, {
              channel: 'email',
              providerKey,
              providerMessageId: `${uidValidity}:${item.uid}`,
              sender,
              recipient,
              subject: this.text(parsed.subject),
              body: this.text(parsed.text, this.stripHtml(parsed.html)),
              receivedAt: item.internalDate ?? parsed.date ?? new Date(),
              isRead: Boolean(item.flags?.has?.('\\Seen')),
              autoCreateLeads: config.autoCreateLeads !== false,
              mailboxTag,
              leadTemplateTags: this.stringList(config.leadTemplateTags),
              payload: {
                messageId: parsed.messageId,
                uid: item.uid,
                uidValidity,
                htmlBody: this.text(parsed.html),
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
      isRead?: boolean;
      autoCreateLeads?: boolean;
      mailboxTag?: string;
      leadTemplateTags?: string[];
      payload: any;
    },
  ) {
    if (!input.providerMessageId || !input.sender) return;
    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        let lead = await this.findLead(client, input.channel, input.sender);
        let parserResult: any = null;
        if (!lead && input.channel === 'email' && input.autoCreateLeads === true) {
          const parsed = await this.createOrMatchLeadFromTemplate(client, input);
          lead = parsed?.lead ?? null;
          parserResult = parsed?.result ?? null;
        }
        const channel = input.channel === 'email' ? 'Email' : 'SMS';
        const key = createHash('sha256')
          .update(`${input.providerKey}|${input.providerMessageId}`)
          .digest('hex');
        const payload = {
          ...(input.payload ?? {}),
          mailbox: this.text(input.mailboxTag),
          lead,
          ...(parserResult
            ? {
                leadCollection: {
                  templateId: parserResult.templateId,
                  templateName: parserResult.templateName,
                  confidence: parserResult.confidence,
                  extractedFields: parserResult.extractedFields,
                },
              }
            : {}),
        };
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
             $15, $16::jsonb, $14, $14
           )
           ON CONFLICT (idempotency_key) DO UPDATE
           SET lead_id = COALESCE(tenant_outreach_job.lead_id, EXCLUDED.lead_id),
               recipient_name = CASE
                 WHEN tenant_outreach_job.lead_id IS NULL AND EXCLUDED.lead_id IS NOT NULL
                   THEN EXCLUDED.recipient_name
                 ELSE tenant_outreach_job.recipient_name
               END,
               body = EXCLUDED.body,
               title = EXCLUDED.title,
               payload = tenant_outreach_job.payload || EXCLUDED.payload,
               is_read = EXCLUDED.is_read,
               occurred_at = EXCLUDED.occurred_at,
               updated_at = now()
           RETURNING id, (xmax = 0) AS was_inserted`, 
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
            input.isRead === true,
            JSON.stringify(payload),
          ],
        );
        if (inserted.rows[0]?.was_inserted && lead?.id) {
          await client.query(
            `UPDATE tenant_lead
             SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              lead.id,
              JSON.stringify({
                latestEmailSubject: input.channel === 'email' ? input.subject : undefined,
                latestEmailBody: input.channel === 'email' ? input.body : undefined,
                latestEmailAt: input.channel === 'email' ? input.receivedAt.toISOString() : undefined,
                latestMailInboxId: input.channel === 'email' ? Number(inserted.rows[0].id) : undefined,
                lastActivityAt: input.receivedAt.toISOString(),
              }),
            ],
          );
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

  private async createOrMatchLeadFromTemplate(
    client: PoolClient,
    input: {
      sender: string;
      subject: string;
      body: string;
      receivedAt: Date;
      mailboxTag?: string;
      leadTemplateTags?: string[];
      payload: any;
    },
  ) {
    const savedTemplates = await client.query(
      `SELECT id, payload
       FROM tenant_legacy_resource
       WHERE resource = 'lead-collection-templates'
         AND COALESCE(payload->>'isActive', 'false') = 'true'
       ORDER BY updated_at DESC, id DESC`,
    );
    if (!savedTemplates.rowCount) return null;

    const allowedTemplateTags = this.stringList(input.leadTemplateTags).map((item) => item.toLowerCase());
    const templates = savedTemplates.rows
      .map((row: any) => {
      const saved = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const mappings = Array.isArray(saved.mappings) ? saved.mappings : [];
      const sourceText = prepareLeadCollectionSource({
        htmlBody: this.text(saved.sourceHtml),
        textBody: this.text(saved.sourceText),
      });
      const bodyFingerprint = Array.isArray(saved.bodyFingerprint) && saved.bodyFingerprint.length
        ? saved.bodyFingerprint
        : buildLeadCollectionFingerprint(sourceText, mappings);
      return {
        ...saved,
        id: Number(row.id),
        name: this.text(saved.name, `Lead parser ${row.id}`),
        senderPatterns: this.stringList(saved.senderPatterns),
        mailboxTags: this.stringList(saved.mailboxTags),
        subjectPattern: this.text(saved.subjectPattern),
        subjectMatchMode: this.text(saved.subjectMatchMode, 'Contains'),
        bodyFingerprint,
        mappings,
        requiredFields: this.stringList(saved.requiredFields),
        confidenceThreshold: Number(saved.confidenceThreshold) || 0.82,
      };
    })
      .filter((template: any) => {
        const tags = this.stringList(template.mailboxTags).map((item) => item.toLowerCase());
        if (allowedTemplateTags.length && !tags.some((tag) => allowedTemplateTags.includes(tag))) return false;
        const inboundTag = this.text(input.mailboxTag).toLowerCase();
        return !tags.length || !inboundTag || tags.includes(inboundTag);
      });
    if (!templates.length) return null;

    const emailInput = {
      fromAddress: this.text(input.sender).toLowerCase(),
      subject: this.text(input.subject),
      htmlBody: this.text(input.payload?.htmlBody),
      textBody: this.text(input.body),
      mailboxTag: this.text(input.mailboxTag),
    };
    let result = parseLeadCollectionTemplates(templates, emailInput);
    let template = templates.find((item: any) => item.id === result.templateId);
    if (!template || !result.matched) return null;

    const linkedConfig = normalizeLinkedPageConfig(template.linkedPageConfig);
    if (linkedConfig.enabled) {
      const linked = await loadConfiguredLinkedPage(emailInput, linkedConfig).catch(() => null);
      if (linked) {
        result = parseLeadCollectionTemplate(
          template,
          enrichEmailWithLinkedPage(emailInput, linked),
        );
      }
    }
    if (
      !result.matched ||
      result.confidence < result.threshold ||
      result.missingRequiredFields.length > 0
    ) {
      return { lead: null, result };
    }

    const values = result.values ?? {};
    const name = this.text(values.name, this.text(values.email, this.text(values.phone)));
    const email = this.text(values.email).toLowerCase();
    const phone = this.text(values.phone);
    if (!name && !email && !phone) return { lead: null, result };

    const existing = await this.findLeadFromParsedValues(
      client,
      email,
      phone,
      input.sender,
    );
    const leadPayload = {
      ...values,
      name: name || 'Inbound lead',
      stage: this.text(values.stage, 'New'),
      source: this.text(values.source, result.templateName || 'Inbound email'),
      priority: this.text(values.priority, 'Warm'),
      followUpStatus: this.text(values.followUpStatus, 'Open'),
      inboundReplyAddress: this.text(input.sender).toLowerCase(),
      leadCollectionTemplateId: result.templateId,
      leadCollectionTemplateName: result.templateName,
      leadCollectionConfidence: result.confidence,
      latestEmailSubject: input.subject,
      latestEmailBody: input.body,
      latestEmailAt: input.receivedAt.toISOString(),
      lastActivityAt: input.receivedAt.toISOString(),
    };

    let lead: any;
    if (existing) {
      const updated = await client.query(
        `UPDATE tenant_lead
         SET full_name = COALESCE(NULLIF($2, ''), full_name),
             email = COALESCE(NULLIF($3, ''), email),
             phone = COALESCE(NULLIF($4, ''), phone),
             payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [existing.id, name, email, phone, JSON.stringify(leadPayload)],
      );
      lead = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO tenant_lead(full_name, email, phone, status, payload)
         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), 'new', $4::jsonb)
         RETURNING *`,
        [name || 'Inbound lead', email, phone, JSON.stringify(leadPayload)],
      );
      lead = inserted.rows[0];
    }

    const propertyId = await this.matchParsedProperty(client, this.text(values.property));
    if (propertyId && lead?.id) {
      await client.query(
        `INSERT INTO tenant_lead_property(lead_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [lead.id, propertyId],
      );
    }
    return { lead, result };
  }

  private async findLeadFromParsedValues(
    client: PoolClient,
    email: string,
    phone: string,
    inboundReplyAddress: string,
  ) {
    const result = await client.query(
      `SELECT *
       FROM tenant_lead
       WHERE ($1 <> '' AND lower(COALESCE(email, '')) = lower($1))
          OR ($2 <> '' AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g'))
          OR ($3 <> '' AND lower(COALESCE(payload->>'inboundReplyAddress', '')) = lower($3))
       ORDER BY id DESC
       LIMIT 1`,
      [email, phone, this.text(inboundReplyAddress).toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  private async matchParsedProperty(client: PoolClient, propertyText: string) {
    const input = this.normalizePropertyMatch(propertyText);
    if (!input) return null;
    const result = await client.query(
      `SELECT id, title, payload
       FROM tenant_property
       ORDER BY updated_at DESC, id DESC
       LIMIT 1000`,
    );
    if (!result.rowCount) return null;

    const inputNumber = this.propertyNumberToken(input);
    const candidates = result.rows
      .map((row: any) => this.scoreParsedProperty(row, input, inputNumber))
      .filter((item: any) => item.score > 0)
      .sort((left: any, right: any) => right.score - left.score || right.id - left.id);
    if (!candidates.length) return null;

    const best = candidates[0];
    if (best.exact) return best.id;
    if (inputNumber) {
      const sameNumber = candidates.filter((item: any) => item.numberMatch);
      if (sameNumber.length === 1 && sameNumber[0].score >= 0.7) return sameNumber[0].id;
    }
    if (best.score < 0.72) return null;
    const second = candidates[1];
    if (second && best.score - second.score < 0.12) return null;
    return best.id;
  }

  private scoreParsedProperty(row: any, input: string, inputNumber: string) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const fields = [
      row?.title,
      payload.address,
      payload.propertyAddress,
      payload.streetAddress,
      payload.location,
      payload.exactLocation,
      payload.slug,
    ]
      .map((value) => this.normalizePropertyMatch(value))
      .filter(Boolean);
    let score = 0;
    let exact = false;
    let numberMatch = false;
    const inputWords = this.propertyMeaningfulWords(input);

    for (const field of fields) {
      if (field === input) {
        score = 1;
        exact = true;
        break;
      }
      if (field.length >= 4 && (field.includes(input) || input.includes(field))) {
        score = Math.max(score, 0.92);
      }
      const fieldNumbers: string[] = field.match(/\b\d{3,6}\b/g) ?? [];
      if (inputNumber && fieldNumbers.includes(inputNumber)) {
        numberMatch = true;
        score = Math.max(score, 0.7);
      }
      const fieldWords = this.propertyMeaningfulWords(field);
      const overlap = inputWords.filter((word) => fieldWords.includes(word)).length;
      if (overlap) {
        const ratio = overlap / Math.max(1, Math.min(inputWords.length, fieldWords.length));
        score = Math.max(score, numberMatch ? 0.78 + Math.min(0.18, ratio * 0.18) : ratio * 0.78);
      }
    }
    return { id: Number(row.id), score, exact, numberMatch };
  }

  private normalizePropertyMatch(value: unknown) {
    return this.text(value)
      .toLowerCase()
      .replace(/\b(north)\b/g, 'n')
      .replace(/\b(south)\b/g, 's')
      .replace(/\b(east)\b/g, 'e')
      .replace(/\b(west)\b/g, 'w')
      .replace(/\b(street)\b/g, 'st')
      .replace(/\b(road)\b/g, 'rd')
      .replace(/\b(avenue)\b/g, 'ave')
      .replace(/\b(boulevard)\b/g, 'blvd')
      .replace(/\b(drive)\b/g, 'dr')
      .replace(/\b(lane)\b/g, 'ln')
      .replace(/\b(court)\b/g, 'ct')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private propertyNumberToken(value: string) {
    return (value.match(/\b\d{3,6}\b/g) ?? [])[0] ?? '';
  }

  private propertyMeaningfulWords(value: string) {
    const ignored = new Set([
      'property', 'listing', 'rental', 'rent', 'sale', 'home', 'house',
      'apartment', 'apt', 'unit', 'sf', 'sqft', 'square', 'feet', 'for',
    ]);
    return [...new Set(value.split(' ').filter((word) => word.length >= 2 && !/^\d+$/.test(word) && !ignored.has(word)))];
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
                OR lower(COALESCE(lead.payload->>'inboundReplyAddress', '')) = lower($1)
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

  private gmailBodies(payload: any): { text: string; html: string } {
    const collected = { text: [] as string[], html: [] as string[] };
    const visit = (part: any) => {
      if (!part) return;
      const mimeType = this.text(part.mimeType).toLowerCase();
      const data = part.body?.data;
      if (data && (mimeType === 'text/plain' || mimeType === 'text/html')) {
        const decoded = Buffer.from(
          `${data}`.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        ).toString('utf8');
        if (mimeType === 'text/plain') collected.text.push(decoded);
        else collected.html.push(decoded);
      }
      for (const child of Array.isArray(part.parts) ? part.parts : []) visit(child);
    };
    visit(payload);
    const html = collected.html.join('\n').trim();
    const plain = collected.text.join('\n').trim();
    return {
      html,
      text: plain || this.stripHtml(html),
    };
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

  private async cleanupLocalInbox(databaseName: string, retentionDays: number) {
    if (retentionDays <= 0) return 0;
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `DELETE FROM tenant_outreach_job
         WHERE direction = 'Incoming'
           AND source_type = 'mail-inbox'
           AND occurred_at < now() - ($1::text || ' days')::interval
         RETURNING id`,
        [retentionDays],
      );
      return result.rowCount ?? 0;
    });
  }

  private syncTags(value: unknown, fallback: string) {
    const raw = this.stringList(value);
    if (!raw.length) return [];
    return [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
  }

  private matchImapTag(flags: any, requestedTags: string[]) {
    const values = flags instanceof Set ? [...flags] : Array.isArray(flags) ? flags : [];
    return requestedTags.find((tag) =>
      values.some((flag) => this.text(flag).toLowerCase() === tag.toLowerCase()),
    ) ?? '';
  }

  private retentionDays(value: unknown) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(3650, Math.max(7, parsed));
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : `${error ?? 'Unknown sync error'}`;
  }

  private clamp(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private stringList(value: any) {
    if (Array.isArray(value)) {
      return [...new Set(value.map((item) => this.text(item)).filter(Boolean))];
    }
    return this.text(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private text(value: any, fallback = '') {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }
}
