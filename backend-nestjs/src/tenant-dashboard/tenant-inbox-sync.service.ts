import { Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { PoolClient } from 'pg';
import { Repository } from 'typeorm';
import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  deriveNameFromEmail,
  extractLeadBasicsFromEmail,
  isProviderSenderAddress,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
  prepareLeadCollectionSource,
  sanitizeLeadName,
} from '../mail/lead-collection-parser';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { normalizeLinkedPageConfig } from '../mail/linked-page-config';
import {
  enrichEmailWithLinkedPage,
  loadConfiguredLinkedPage,
} from '../mail/linked-page-loader';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

type InboxSyncStats = {
  imported: number;
  matched: number;
  created: number;
  skipped: number;
};

type InboxStoreResult = InboxSyncStats & {
  reason: string;
};

@Injectable()
export class TenantInboxSyncService {
  private readonly logger = new Logger(TenantInboxSyncService.name);
  private running = false;
  private cleanupRunning = false;
  private followUpRunning = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly settings: TenantWorkspaceSettingsService,
    @Optional() private readonly outreach?: TenantOutreachService,
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

  @Cron('25 * * * * *')
  async scheduleAllTenantFollowUps() {
    if (
      process.env.TENANT_LEAD_AUTOMATION_ENABLED === 'false' ||
      this.followUpRunning
    ) {
      return;
    }
    this.followUpRunning = true;
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
            await this.linkMissingLeadProperties(tenant);
            await this.autoSendWelcomeForLeads(tenant);
            await this.scheduleTenantFollowUps(tenant);
            await this.removeStalePostVisitFollowUps(tenant);
          } catch (error) {
            this.logger.error(
              `Tenant follow-up scheduling failed for ${tenant.databaseName}: ${this.message(error)}`,
            );
          }
        },
      );
    } finally {
      this.followUpRunning = false;
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
    // Manual "Sync now" uses the full 14-day window for a catch-up scan;
    // the scheduled cron run is incremental (last successful scan -> now).
    const fullWindow = force === true;
    const stats = authType === 'gmail-oauth' || config.gmailRefreshToken
      ? await this.syncGmail(databaseName, config, tenant, fullWindow)
      : await this.syncImap(databaseName, config, fullWindow);
    const deletedLocalMessages = await this.cleanupLocalInbox(
      databaseName,
      this.retentionDays(config.localInboxRetentionDays),
    );
    const junkRemoved = await this.removeInvalidAutoCreatedLeads(tenant);
    const recovered = await this.recoverSkippedInboundEmails(tenant, config);
    const propertyLinked = await this.linkMissingLeadProperties(tenant);
    const welcomeSent = await this.autoSendWelcomeForLeads(tenant);
    await this.scheduleTenantFollowUps(tenant);
    await this.removeStalePostVisitFollowUps(tenant);
    const namesFixed = await this.fixMissingLeadNames(tenant);
    const recoveredNote = recovered.converted
      ? `, ${recovered.converted} previously skipped ${recovered.converted === 1 ? 'email was' : 'emails were'} recovered.`
      : '';
    const propertyNote = propertyLinked.linked
      ? `, ${propertyLinked.linked} ${propertyLinked.linked === 1 ? 'lead was' : 'leads were'} linked to a matching property.`
      : '';
    const welcomeNote = welcomeSent.enqueued
      ? `, ${welcomeSent.enqueued} welcome ${welcomeSent.enqueued === 1 ? 'message was' : 'messages were'} auto-scheduled.`
      : '';
    const nameNote = namesFixed.fixed
      ? `, ${namesFixed.fixed} ${namesFixed.fixed === 1 ? 'lead name was' : 'lead names were'} corrected from the original email.`
      : '';
    return {
      ...(await this.getStatus(tenant)),
      imported: stats.imported,
      matched: stats.matched,
      created: stats.created,
      skipped: stats.skipped,
      deletedLocalMessages,
      recoveredLeadCount: recovered.converted,
      linkedPropertyCount: propertyLinked.linked,
      autoWelcomeScheduledCount: welcomeSent.enqueued,
      correctedLeadNameCount: namesFixed.fixed,
      removedInvalidLeadCount: junkRemoved.removed,
      message: `Mailbox sync completed: ${stats.imported} imported, ${stats.created} leads created, ${stats.matched} matched, ${stats.skipped} skipped.${recoveredNote}${propertyNote}${welcomeNote}${nameNote}`,
    };
  }

  async getStatus(tenant: SaasTenant) {
    const config: any = await this.settings.getRawSmtp(tenant);
    const authType = this.text(config?.authType).toLowerCase();
    const imap = this.imapConnectionConfig(config);
    const isConfigured = authType === 'gmail-oauth' || config?.gmailRefreshToken
      ? Boolean(config?.gmailRefreshToken)
      : Boolean(imap.host && imap.user && imap.pass);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `SELECT status, cursor, last_started_at, last_completed_at,
                last_succeeded_at, next_run_at, last_error,
                imported_count, matched_count, created_count, skipped_count
         FROM tenant_sync_state WHERE sync_key = 'mail-inbox'`,
      );
      const row = result.rows[0] ?? {};
      const lastStartedAt = row.last_started_at ? new Date(row.last_started_at).getTime() : 0;
      const processingIsFresh = row.status === 'processing'
        && lastStartedAt > Date.now() - 30 * 60_000;
      return {
        isConfigured,
        syncEnabled: config?.enableInboxSync === true,
        syncIntervalMinutes: Number(config?.syncIntervalMinutes) || 5,
        localInboxRetentionDays: this.retentionDays(config?.localInboxRetentionDays),
        status: row.status ?? 'scheduled',
        isRunning: processingIsFresh,
        lastStartedAt: row.last_started_at ?? null,
        lastCompletedAt: row.last_completed_at ?? null,
        lastSucceededAt: row.last_succeeded_at ?? null,
        nextRunAt: row.next_run_at ?? null,
        lastImportedCount: Number(row.imported_count) || 0,
        lastMatchedLeadCount: Number(row.matched_count) || 0,
        lastCreatedLeadCount: Number(row.created_count) || 0,
        lastSkippedCount: Number(row.skipped_count) || 0,
        lastError: row.last_error ?? null,
        statusMessage: row.status === 'processing' && !processingIsFresh
          ? 'Previous sync was interrupted. Click Sync now to retry.'
          : row.last_error
          ? `Sync error: ${row.last_error}`
          : row.last_completed_at
            ? `${Number(row.imported_count) || 0} imported · ${Number(row.created_count) || 0} leads created · ${Number(row.matched_count) || 0} matched · ${Number(row.skipped_count) || 0} skipped`
            : config?.enableInboxSync === true
              ? 'Ready to sync.'
              : 'Mailbox sync is disabled.',
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

    const { host, user, pass } = this.imapConnectionConfig(config);
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
    fullWindow = false,
  ) {
    const providerKey = `gmail:${this.text(config.gmailEmail, config.username)}`;
    const stats = this.emptyStats();
    const scanStartedAt = Date.now();
    await this.markStarted(databaseName, providerKey);
    try {
      const accessToken = await this.gmailAccessToken(databaseName, config, tenant);
      const maxMessages = this.clamp(config.maxMessagesPerSync, 100, 5, 500);
      const lastScan = fullWindow
        ? 0
        : await this.lastSuccessfulScan(databaseName);
      const selectedMessages = await this.gmailMessagesForConfiguredTags(
        accessToken,
        config.mailboxTag,
        maxMessages,
        lastScan,
      );
      let processingError: unknown = null;
      for (const selected of [...selectedMessages].reverse()) {
        try {
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
          const received = message.internalDate ? Number(message.internalDate) : 0;
          this.addStats(stats, await this.storeInbound(databaseName, {
            channel: 'email',
            providerKey,
            providerMessageId: id,
            sender,
            recipient,
            subject: headers.subject ?? '',
            body: bodies.text,
            receivedAt: received ? new Date(received) : new Date(),
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
          }));
        } catch (error) {
          // Finish remaining messages, then fail run so cursor cannot skip this one.
          processingError ??= error;
          stats.skipped += 1;
          this.logger.warn(`Mailbox message skipped ${JSON.stringify({
            databaseName,
            providerMessageId: this.text(selected.id),
            error: this.message(error),
          })}`);
        }
      }
      await this.markCompleted(
        databaseName,
        providerKey,
        selectedMessages[0]?.id ?? null,
        stats,
        this.clamp(config.syncIntervalMinutes, 5, 1, 720) || 5,
        processingError
          ? lastScan || scanStartedAt - 14 * 24 * 60 * 60_000
          : scanStartedAt - 60_000,
      ).catch((error) => {
        this.logger.warn(`Mailbox sync completion save failed ${JSON.stringify({
          databaseName,
          error: this.message(error),
        })}`);
      });
      this.logger.log(`Mailbox sync ${databaseName}: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      await this.markFailed(databaseName, providerKey, error);
      throw error;
    }
  }

  private async gmailMessagesForConfiguredTags(
    accessToken: string,
    configuredTags: unknown,
    pageSize: number,
    lastScan = 0,
  ) {
    const scanStartedAt = Date.now();
    const requestedTags = this.syncTags(configuredTags, 'gmail');
    if (!requestedTags.length) {
      return this.listGmailMessagesForLabel(
        accessToken,
        'INBOX',
        'gmail',
        pageSize,
        lastScan,
        scanStartedAt,
      );
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
      const messages = await this.listGmailMessagesForLabel(
        accessToken,
        labelId,
        labelName,
        pageSize,
        lastScan,
        scanStartedAt,
      );
      for (const message of messages) {
        if (!selected.has(message.id)) selected.set(message.id, message);
      }
    }
    return [...selected.values()];
  }

  private async listGmailMessagesForLabel(
    accessToken: string,
    labelId: string,
    mailboxTag: string,
    pageSize: number,
    lastScan = 0,
    scanStartedAt = Date.now(),
  ) {
    const ids: Array<{ id: string; mailboxTag: string }> = [];
    let pageToken = '';
    while (true) {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.append('labelIds', labelId);
      url.searchParams.set('maxResults', String(Math.min(100, pageSize)));
      url.searchParams.set(
        'q',
        `${lastScan > 0 ? `after:${Math.floor(lastScan / 1000)}` : 'newer_than:14d'} before:${Math.floor(scanStartedAt / 1000) + 1}`,
      );
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

  private async syncImap(databaseName: string, config: any, fullWindow = false) {
    const providerKey = `imap:${this.text(config.mailboxTag, config.imapUsername ?? config.username)}`;
    const stats = this.emptyStats();
    const scanStartedAt = Date.now();
    await this.markStarted(databaseName, providerKey);
    let connection: any;
    try {
      const { host, user, pass } = this.imapConnectionConfig(config);
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
        const lastScan = fullWindow
          ? 0
          : await this.lastSuccessfulScan(databaseName);
        const since = lastScan > 0
          ? new Date(lastScan)
          : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const syncTags = this.syncTags(config.mailboxTag, 'imap');
        const search: any = { since };
        if (syncTags.length) {
          search.or = syncTags.map((tag) => ({ keyword: tag }));
        }
        const uids: number[] = await connection.search(search, { uid: true });
        const maxMessages = this.clamp(config.maxMessagesPerSync, 100, 5, 500);
        const selected = uids;
        let processingError: unknown = null;
        for (let offset = 0; offset < selected.length; offset += maxMessages) {
          const batch = selected.slice(offset, offset + maxMessages);
          for await (const item of connection.fetch(batch.join(','), {
            uid: true,
            envelope: true,
            flags: true,
            internalDate: true,
            source: true,
          }, { uid: true })) {
            try {
              const parsed = await simpleParser(item.source);
              const sender = this.text(parsed.from?.value?.[0]?.address);
              const recipient = this.text(parsed.to?.value?.[0]?.address);
              const uidValidity = `${connection.mailbox?.uidValidity ?? '0'}`;
              const mailboxTag = this.matchImapTag(item.flags, syncTags) || 'imap';
              const received = item.internalDate ?? parsed.date ?? null;
              const receivedAt = received ? new Date(received) : new Date();
              this.addStats(stats, await this.storeInbound(databaseName, {
                channel: 'email',
                providerKey,
                providerMessageId: `${uidValidity}:${item.uid}`,
                sender,
                recipient,
                subject: this.text(parsed.subject),
                body: this.text(parsed.text, this.stripHtml(parsed.html)),
                receivedAt,
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
              }));
            } catch (error) {
              processingError ??= error;
              stats.skipped += 1;
              this.logger.warn(`Mailbox message skipped ${JSON.stringify({
                databaseName,
                providerMessageId: this.text(item.uid),
                error: this.message(error),
              })}`);
            }
          }
        }
        await this.markCompleted(
          databaseName,
          providerKey,
          selected.length ? `${selected[selected.length - 1]}` : null,
          stats,
          this.clamp(config.syncIntervalMinutes, 5, 1, 720) || 5,
          processingError
            ? lastScan || scanStartedAt - 14 * 24 * 60 * 60_000
            : scanStartedAt - 60_000,
        ).catch((error) => {
          this.logger.warn(`Mailbox sync completion save failed ${JSON.stringify({
            databaseName,
            error: this.message(error),
          })}`);
        });
        this.logger.log(`Mailbox sync ${databaseName}: ${JSON.stringify(stats)}`);
        return stats;
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
    const stats = this.emptyStats();
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
        try {
          this.addStats(stats, await this.storeInbound(databaseName, {
            channel: 'sms',
            providerKey,
            providerMessageId: this.text(message.sid),
            sender: this.text(message.from),
            recipient: this.text(message.to),
            subject: '',
            body: this.text(message.body),
            receivedAt: message.date_sent ? new Date(message.date_sent) : new Date(),
            payload: message,
          }));
        } catch (error) {
          stats.skipped += 1;
          this.logger.warn(`Mailbox message skipped ${JSON.stringify({
            databaseName,
            providerMessageId: this.text(message.sid),
            error: this.message(error),
          })}`);
        }
      }
      await this.markCompleted(
        databaseName,
        providerKey,
        messages[0]?.sid ?? null,
        stats,
        this.clamp(config.syncIntervalMinutes, 5, 1, 720) || 5,
      ).catch((error) => {
        this.logger.warn(`Mailbox sync completion save failed ${JSON.stringify({
          databaseName,
          error: this.message(error),
        })}`);
      });
      return stats;
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
  ): Promise<InboxStoreResult> {
    if (!input.providerMessageId || !input.sender) {
      return { ...this.emptyStats(), skipped: 1, reason: 'Missing provider message id or sender.' };
    }
    return this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const deleted = await client.query(
          `SELECT 1
           FROM tenant_mail_deletion_tombstone
           WHERE provider = $1 AND provider_message_id = $2
           LIMIT 1`,
          [input.providerKey, input.providerMessageId],
        );
        if (deleted.rowCount) {
          await client.query('COMMIT');
          const reason = 'Message was deleted locally; sync reimport blocked.';
          this.logger.log(`Mailbox message tombstoned ${JSON.stringify({
            databaseName,
            providerMessageId: input.providerMessageId,
          })}`);
          return { ...this.emptyStats(), skipped: 1, reason };
        }
        const key = createHash('sha256')
          .update(`${input.providerKey}|${input.providerMessageId}`)
          .digest('hex');
        const storedLead = await client.query(
          `SELECT to_jsonb(lead) AS value
           FROM tenant_outreach_job mail
           JOIN tenant_lead lead ON lead.id = mail.lead_id
           WHERE mail.idempotency_key = $1
           LIMIT 1`,
          [key],
        );
        let lead = storedLead.rows[0]?.value ?? null;
        let parserResult: any = null;
        let created = false;
        if (!lead && input.channel === 'email' && input.autoCreateLeads === true) {
          const parsed = await this.createOrMatchLeadFromTemplate(client, input);
          lead = parsed?.lead ?? null;
          parserResult = parsed?.result ?? null;
          created = parsed?.created === true;
          if (!lead) lead = await this.findLead(client, input.channel, input.sender);
        } else if (!lead && input.channel === 'email') {
          parserResult = this.parserFailure('Automatic lead creation is disabled.');
          lead = await this.findLead(client, input.channel, input.sender);
        } else if (!lead) {
          lead = await this.findLead(client, input.channel, input.sender);
        }
        const channel = input.channel === 'email' ? 'Email' : 'SMS';
        const payload = {
          ...(input.payload ?? {}),
          mailbox: this.text(input.mailboxTag),
          lead,
          leadCreationStatus: lead ? (created ? 'Created' : 'Matched') : 'Skipped',
          leadCreationSkipReason: lead ? '' : this.parserSkipReason(parserResult),
          ...(parserResult
            ? this.parserPayload(parserResult)
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
        const isReply = inserted.rows[0]?.was_inserted && lead?.id && !created
          ? await this.hasPriorSentOutreach(
              client,
              Number(lead.id),
              channel,
              input.receivedAt,
              input.sender,
            )
          : false;
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
                ...(isReply ? {
                  stage: ['Deal', 'Canceled'].includes(`${lead?.payload?.stage ?? ''}`)
                    ? lead.payload.stage
                    : 'Replied',
                  followUpStatus: 'Completed',
                  inBoard: true,
                } : {}),
              }),
            ],
          );
          if (isReply) {
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
        }
        await client.query('COMMIT');
        const imported = inserted.rows[0]?.was_inserted === true ? 1 : 0;
        const skipped = input.channel === 'email' && !lead ? 1 : 0;
        const reason = lead
          ? created
            ? `Lead created with parser ${parserResult?.templateName || parserResult?.templateId || 'unknown'}.`
            : 'Email matched an existing lead.'
          : this.parserSkipReason(parserResult);
        const outcome = {
          imported,
          matched: lead ? 1 : 0,
          created: created ? 1 : 0,
          skipped,
          reason,
        };
        if (skipped) {
          this.logger.warn(`Mailbox lead skipped ${JSON.stringify({
            databaseName,
            providerMessageId: input.providerMessageId,
            mailboxTag: input.mailboxTag ?? '',
            reason,
          })}`);
        } else if (input.channel === 'email') {
          this.logger.log(`Mailbox lead processed ${JSON.stringify({
            databaseName,
            providerMessageId: input.providerMessageId,
            leadId: Number(lead?.id) || null,
            created,
          })}`);
        }
        return outcome;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async convertStoredEmailWithTemplate(
    tenant: SaasTenant,
    mailInboxId: number,
  ) {
    const config: any = await this.settings.getRawSmtp(tenant);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const mail = await client.query(
            `SELECT id, lead_id, recipient_email, title, body, payload,
                    COALESCE(occurred_at, created_at) AS received_at
             FROM tenant_outreach_job
             WHERE id = $1 AND channel = 'Email' AND direction = 'Incoming'`,
            [mailInboxId],
          );
          if (!mail.rowCount) {
            await client.query('ROLLBACK');
            return null;
          }
          const item = mail.rows[0];
          if (Number(item.lead_id) > 0) {
            const existing = await client.query(
              `SELECT * FROM tenant_lead WHERE id = $1`,
              [Number(item.lead_id)],
            );
            await client.query('COMMIT');
            return existing.rows[0] ?? null;
          }
          const payload =
            item.payload && typeof item.payload === 'object'
              ? item.payload
              : {};
          const parsed = await this.createOrMatchLeadFromTemplate(client, {
            sender: this.text(item.recipient_email).toLowerCase(),
            subject: this.text(item.title),
            body: this.text(item.body),
            receivedAt: item.received_at
              ? new Date(item.received_at)
              : new Date(),
            mailboxTag: this.text(payload.mailbox),
            leadTemplateTags: this.stringList(config?.leadTemplateTags),
            payload,
          });
          const parserPayload = this.parserPayload(parsed?.result);
          const nextPayload = {
            ...payload,
            ...parserPayload,
            leadCreationStatus: parsed?.lead ? 'Matched' : 'Skipped',
            leadCreationSkipReason: parsed?.lead
              ? ''
              : this.parserSkipReason(parsed?.result),
            lastLeadRecoveryAttemptAt: new Date().toISOString(),
          };
          await client.query(
            `UPDATE tenant_outreach_job
             SET lead_id = COALESCE($2, lead_id),
                 recipient_name = COALESCE(NULLIF($3, ''), recipient_name),
                 payload = $4::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              mailInboxId,
              parsed?.lead?.id ?? null,
              this.text(parsed?.lead?.full_name, parsed?.lead?.fullName),
              JSON.stringify(nextPayload),
            ],
          );
          await client.query('COMMIT');
          return parsed?.lead ?? null;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  private async recoverSkippedInboundEmails(tenant: SaasTenant, config: any) {
    if (config?.autoCreateLeads === false) {
      return { scanned: 0, converted: 0 };
    }
    const databaseName = this.databaseName(tenant);
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `SELECT id
         FROM tenant_outreach_job
         WHERE channel = 'Email'
           AND direction = 'Incoming'
           AND source_type = 'mail-inbox'
           AND lead_id IS NULL
           AND COALESCE((payload->>'leadCreationStatus'), '') NOT IN ('Created', 'Matched')
           AND COALESCE((payload->>'lastLeadRecoveryAttemptAt')::timestamp, 'epoch')
               < now() - interval '6 hours'
         ORDER BY COALESCE(occurred_at, created_at) ASC, id ASC
         LIMIT 50`,
      );
      let converted = 0;
      for (const row of result.rows) {
        try {
          const lead = await this.convertStoredEmailWithTemplate(
            tenant,
            Number(row.id),
          );
          if (lead) converted += 1;
        } catch (error) {
          this.logger.warn(`Stored email recovery failed ${JSON.stringify({
            databaseName,
            mailInboxId: Number(row.id),
            error: this.message(error),
          })}`);
        }
      }
      if (result.rowCount) {
        this.logger.log(`Stored email recovery ${databaseName}: ${JSON.stringify({
          scanned: result.rowCount,
          converted,
        })}`);
      }
      return { scanned: result.rowCount ?? 0, converted };
    });
  }

  private async removeInvalidAutoCreatedLeads(tenant: SaasTenant) {
    const databaseName = this.databaseName(tenant);
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `WITH candidate AS MATERIALIZED (
           SELECT l.id
           FROM tenant_lead l
           WHERE lower(trim(COALESCE(l.full_name, ''))) = 'inbound lead'
             AND COALESCE(l.email, '') = ''
             AND COALESCE(l.payload->>'leadCollectionTemplateId', '') <> ''
             AND COALESCE(NULLIF(l.payload->>'leadCollectionConfidence', '')::numeric, 0) < 0.6
             AND (
               COALESCE(l.phone, '') = ''
               OR (
                 l.phone NOT LIKE '+%'
                 AND length(regexp_replace(l.phone, '[^0-9]', '', 'g')) NOT BETWEEN 10 AND 11
               )
             )
             AND NOT EXISTS (
               SELECT 1 FROM tenant_outreach_job outgoing
               WHERE outgoing.lead_id = l.id AND outgoing.direction <> 'Incoming'
             )
           ORDER BY l.id ASC
           LIMIT 100
         ), detached AS (
           UPDATE tenant_outreach_job mail
           SET lead_id = NULL,
               payload = COALESCE(mail.payload, '{}'::jsonb) || jsonb_build_object(
                 'leadCreationStatus', 'Skipped',
                 'leadCreationSkipReason', 'Removed invalid low-confidence automatic lead.'
               ),
               updated_at = now()
           FROM candidate
           WHERE mail.lead_id = candidate.id
           RETURNING mail.id
         )
         DELETE FROM tenant_lead lead
         USING candidate
         WHERE lead.id = candidate.id
         RETURNING lead.id`,
      );
      const removed = result.rowCount ?? 0;
      if (removed) {
        this.logger.warn(`Invalid automatic leads removed ${JSON.stringify({
          databaseName,
          removed,
        })}`);
      }
      return { removed };
    });
  }

  private async linkMissingLeadProperties(tenant: SaasTenant) {
    const databaseName = this.databaseName(tenant);
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `SELECT j.id, j.lead_id, j.title, j.body, j.payload->>'htmlBody' AS html_body,
                j.payload->>'extractedLead' AS extracted_lead
         FROM tenant_outreach_job j
         WHERE j.channel = 'Email'
           AND j.direction = 'Incoming'
           AND j.lead_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM tenant_lead_property lp WHERE lp.lead_id = j.lead_id
           )
         ORDER BY COALESCE(j.occurred_at, j.created_at) DESC, j.id DESC
         LIMIT 100`,
      );
      let linked = 0;
      for (const row of result.rows) {
        try {
          const extracted = this.jsonObject(row.extracted_lead);
          const match = await this.resolveLeadProperty(
            client,
            {
              textBody: this.text(row.body),
              htmlBody: this.text(row.html_body),
              subject: this.text(row.title),
            },
            this.text(extracted?.property),
          );
          if (!match || match.status !== 'published') continue;
          await client.query(
            `INSERT INTO tenant_lead_property(lead_id, property_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [Number(row.lead_id), match.id],
          );
          await client.query(
            `UPDATE tenant_lead
             SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              Number(row.lead_id),
              JSON.stringify({
                property: match.title,
                primaryPropertyId: match.id,
              }),
            ],
          );
          linked += 1;
        } catch (error) {
          this.logger.warn(`Lead property linking failed ${JSON.stringify({
            databaseName,
            mailInboxId: Number(row.id),
            error: this.message(error),
          })}`);
        }
      }
      if (result.rowCount) {
        this.logger.log(`Lead property linking ${databaseName}: ${JSON.stringify({
          scanned: result.rowCount,
          linked,
        })}`);
      }
      return { scanned: result.rowCount ?? 0, linked };
    });
  }

  /**
   * Auto-schedules the configured welcome Email/SMS for fresh inbound leads
   * (one inbound message, no outgoing yet, property linked). Idempotent via
   * the job idempotency key, so it is safe to run on every sync.
   */
  private async autoSendWelcomeForLeads(tenant: SaasTenant) {
    if (!this.outreach) {
      return { scanned: 0, enqueued: 0, skipped: 0 };
    }
    const databaseName = this.databaseName(tenant);
    const outreach = this.outreach;
    return this.databases.withTenantClient(databaseName, async (client) => {
      const agency: any = await this.settings.getAgencySettings(tenant);
      const automation = agency?.leadAutomation ?? {};
      if (automation.enabled !== true) {
        return { scanned: 0, enqueued: 0, skipped: 0 };
      }
      if (agency?.firstMessageAutomation?.lead === false) {
        return { scanned: 0, enqueued: 0, skipped: 0 };
      }
      const directTemplates = (agency?.communicationTemplates ?? []).filter(
        (item: any) =>
          item?.isActive !== false &&
          (item?.audience ?? 'Lead') === 'Lead' &&
          (item?.sequenceType ?? 'Direct') === 'Direct' &&
          Boolean(this.text(item?.body)),
      );
      const template =
        directTemplates.find(
          (item: any) => `${item.id}` === `${automation.directTemplateId}`,
        ) ?? directTemplates[0];
      if (!template) {
        return { scanned: 0, enqueued: 0, skipped: 0 };
      }
      const channels = this.stringList(automation.channels).filter(
        (channel) =>
          ['Email', 'SMS'].includes(channel) &&
          this.stringList(template.channels).includes(channel),
      );
      if (!channels.length) {
        return { scanned: 0, enqueued: 0, skipped: 0 };
      }
      const result = await client.query(
        `SELECT l.id, l.full_name, l.email, l.phone, l.payload,
                p.id AS property_id, p.title AS property_title, p.payload AS property_payload
         FROM tenant_lead l
         JOIN tenant_lead_property lp ON lp.lead_id = l.id
         JOIN tenant_property p ON p.id = lp.property_id
         WHERE (l.email IS NOT NULL OR l.phone IS NOT NULL)
           AND p.status = 'published'
           AND EXISTS (
             SELECT 1 FROM tenant_outreach_job inc
             WHERE inc.lead_id = l.id
               AND inc.direction = 'Incoming'
               AND inc.source_type = 'mail-inbox'
           )
           AND NOT EXISTS (
             SELECT 1 FROM tenant_outreach_job out
             WHERE out.lead_id = l.id AND out.direction <> 'Incoming'
           )
           AND NOT EXISTS (
             SELECT 1 FROM tenant_outreach_job out2
             WHERE out2.lead_id = l.id
               AND out2.created_by LIKE 'lead-auto-welcome:%'
           )
         ORDER BY l.created_at ASC, l.id ASC
         LIMIT 50`,
      );
      let enqueued = 0;
      let skipped = 0;
      for (const row of result.rows) {
        try {
          const lead = {
            name: this.text(row.full_name, 'Client'),
            email: this.text(row.email).toLowerCase(),
            phone: this.text(row.phone),
            property: this.text(row.property_title),
            showingTime: this.text(this.jsonObject(row.payload)?.showingTime ?? this.jsonObject(row.payload)?.showing_time),
            closingDate: this.text(this.jsonObject(row.payload)?.closingDate ?? this.jsonObject(row.payload)?.closing_date),
          };
          const propertyPayload = this.jsonObject(row.property_payload);
          const mediaUrls = await this.welcomeAttachmentUrls(
            client,
            template,
            propertyPayload,
            Number(row.property_id),
          );
          const delayMinutes = this.clamp(
            agency?.firstMessageAutomation?.leadDelayMinutes ??
              agency?.firstMessageAutomation?.delayMinutes,
            0,
            0,
            43_200,
          );
          const scheduledAt = new Date(Date.now() + delayMinutes * 60_000);
          for (const channel of channels) {
            const recipientMissing =
              channel === 'Email' ? !lead.email : !lead.phone;
            if (recipientMissing) {
              skipped += 1;
              continue;
            }
            const jobs = await outreach.enqueueWithClient(client, {
              leadId: Number(row.id),
              sourceType: 'lead-automation',
              sourceId: this.text(template.id),
              channels: [channel as 'Email' | 'SMS'],
              recipientName: lead.name,
              recipientEmail: lead.email,
              recipientPhone: lead.phone,
              title: this.renderWelcomeTemplate(
                this.text(template.subject, 'Welcome'),
                lead,
                agency,
              ),
              body: this.renderWelcomeTemplate(
                this.text(template.body, ''),
                lead,
                agency,
              ),
              mediaUrls,
              scheduledAt,
              createdBy: `lead-auto-welcome:${this.text(template.id)}:${channel.toLowerCase()}`,
              idempotencyKey: `lead-auto-welcome:${Number(row.id)}:${this.text(template.id)}:${channel.toLowerCase()}`,
              payload: {
                templateId: this.text(template.id),
                channel,
                automatic: true,
              },
            });
            if (jobs[0]?.status !== 'failed') enqueued += 1;
            else skipped += 1;
          }
        } catch (error) {
          skipped += 1;
          this.logger.warn(`Auto welcome scheduling failed ${JSON.stringify({
            databaseName,
            leadId: Number(row.id),
            error: this.message(error),
          })}`);
        }
      }
      if (result.rowCount) {
        this.logger.log(`Auto welcome scheduling ${databaseName}: ${JSON.stringify({
          scanned: result.rowCount,
          enqueued,
          skipped,
        })}`);
      }
      return { scanned: result.rowCount ?? 0, enqueued, skipped };
    });
  }

  /**
   * Re-derives display names for existing leads whose name is missing,
   * "Inbound lead", or the raw email/phone. Also drops provider addresses
   * (e.g. leads@email.realtor.com) that were stored as the lead email and
   * normalizes stored phones to E.164 with the tenant's default country.
   * Uses the stored email body first, then derives from a personal email
   * local part. Idempotent and capped.
   */
  private async fixMissingLeadNames(tenant: SaasTenant) {
    const databaseName = this.databaseName(tenant);
    return this.databases.withTenantClient(databaseName, async (client) => {
      const defaultPhoneCountry = await this.defaultPhoneCountryFromClient(client);
      const result = await client.query(
        `SELECT id, full_name, email, phone, payload
         FROM tenant_lead
         WHERE full_name IS NULL
            OR full_name = ''
            OR full_name = 'Inbound lead'
            OR (email IS NOT NULL AND LOWER(full_name) = LOWER(email))
            OR (phone IS NOT NULL AND full_name = phone)
         ORDER BY created_at ASC, id ASC
         LIMIT 100`,
      );
      let fixed = 0;
      for (const row of result.rows) {
        try {
          const payload = this.jsonObject(row.payload);
          const subject = this.text(payload?.latestEmailSubject);
          const body = this.text(payload?.latestEmailBody);
          const email = this.text(row.email).toLowerCase();
          const currentName = this.text(row.full_name);
          const currentPhone = this.text(row.phone);
          let name = '';
          let basicsEmail = '';
          if (body || subject) {
            const basics = extractLeadBasicsFromEmail({
              fromAddress: this.text(payload?.inboundReplyAddress),
              subject,
              htmlBody: this.text(payload?.htmlBody),
              textBody: body,
            });
            name = sanitizeLeadName(basics.name, subject);
            basicsEmail = basics.email;
          }
          if (!name) name = deriveNameFromEmail(email);
          name = name || 'Inbound lead';
          const correctedEmail =
            basicsEmail &&
            basicsEmail !== email &&
            isProviderSenderAddress(email)
              ? basicsEmail
              : '';
          const normalizedPhone = currentPhone
            ? normalizePhoneNumber(currentPhone, defaultPhoneCountry)
            : '';
          const correctedPhone =
            normalizedPhone &&
            normalizedPhone !== currentPhone
              ? normalizedPhone
              : '';
          if (
            name === currentName &&
            !correctedEmail &&
            !correctedPhone
          ) {
            continue;
          }
          await client.query(
            `UPDATE tenant_lead
             SET full_name = $2,
                 email = COALESCE(NULLIF($3, ''), email),
                 phone = COALESCE(NULLIF($4, ''), phone),
                 payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              Number(row.id),
              name,
              correctedEmail,
              correctedPhone,
              JSON.stringify({
                ...(name !== currentName
                  ? { name, nameSource: 'backfill' }
                  : {}),
                ...(correctedEmail
                  ? { email: correctedEmail, emailSource: 'backfill' }
                  : {}),
                ...(correctedPhone
                  ? { phone: correctedPhone, phoneSource: 'backfill' }
                  : {}),
              }),
            ],
          );
          fixed += 1;
        } catch (error) {
          this.logger.warn(`Lead detail correction failed ${JSON.stringify({
            databaseName,
            leadId: Number(row.id),
            error: this.message(error),
          })}`);
        }
      }
      if (result.rowCount) {
        this.logger.log(`Lead detail correction ${databaseName}: ${JSON.stringify({
          scanned: result.rowCount,
          fixed,
        })}`);
      }
      return { scanned: result.rowCount ?? 0, fixed };
    });
  }

  private async defaultPhoneCountryFromClient(client: PoolClient) {
    try {
      const row = await client.query(
        `SELECT value FROM tenant_setting WHERE key = 'agency_workspace_settings' LIMIT 1`,
      );
      const value = row.rows?.[0]?.value;
      return this.text(value?.profile?.defaultPhoneCountry) || 'US';
    } catch {
      return 'US';
    }
  }

  /**
   * Schedules the FollowUp1/2/3 templates after a welcome message has been
   * sent, at their configured gap days, when follow-ups are enabled. Queued
   * jobs wait until due and are auto-cancelled if the lead replies first.
   */
  private async scheduleTenantFollowUps(tenant: SaasTenant) {
    if (!this.outreach) {
      return { scanned: 0, enqueued: 0 };
    }
    const databaseName = this.databaseName(tenant);
    const outreach = this.outreach;
    return this.databases.withTenantClient(databaseName, async (client) => {
      const agency: any = await this.settings.getAgencySettings(tenant);
      const automation = agency?.leadAutomation ?? {};
      if (
        automation.enabled !== true ||
        automation.followUpEnabled === false
      ) {
        return { scanned: 0, enqueued: 0 };
      }
      const order: Record<string, number> = {
        FollowUp1: 0,
        FollowUp2: 1,
        FollowUp3: 2,
      };
      const followUpTemplates = (agency?.communicationTemplates ?? [])
        .filter(
          (item: any) =>
            item?.isActive !== false &&
            (item?.audience ?? 'Lead') === 'Lead' &&
            Boolean(this.text(item?.body)) &&
            Object.prototype.hasOwnProperty.call(order, item?.sequenceType),
        )
        .sort(
          (a: any, b: any) =>
            (order[a?.sequenceType] ?? 9) - (order[b?.sequenceType] ?? 9),
        );
      if (!followUpTemplates.length) {
        return { scanned: 0, enqueued: 0 };
      }
      const result = await client.query(
        `SELECT l.id, l.full_name, l.email, l.phone, l.payload,
                p.id AS property_id, p.title AS property_title, p.payload AS property_payload,
                w.sent_at
         FROM tenant_lead l
         JOIN (
           SELECT DISTINCT ON (lead_id) lead_id, completed_at AS sent_at
           FROM tenant_outreach_job
           WHERE created_by LIKE 'lead-auto-welcome:%'
             AND status = 'sent'
           ORDER BY lead_id, completed_at ASC
         ) w ON w.lead_id = l.id
         JOIN tenant_lead_property lp ON lp.lead_id = l.id
         JOIN tenant_property p ON p.id = lp.property_id
         WHERE p.status = 'published'
         ORDER BY l.id ASC
         LIMIT 100`,
      );
      let enqueued = 0;
      for (const row of result.rows) {
        try {
          const lead = {
            name: this.text(row.full_name, 'Client'),
            email: this.text(row.email).toLowerCase(),
            phone: this.text(row.phone),
            property: this.text(row.property_title),
            showingTime: this.text(this.jsonObject(row.payload)?.showingTime ?? this.jsonObject(row.payload)?.showing_time),
            closingDate: this.text(this.jsonObject(row.payload)?.closingDate ?? this.jsonObject(row.payload)?.closing_date),
          };
          const welcomeSentAt = row.sent_at ? new Date(row.sent_at).getTime() : Date.now();
          const propertyPayload = this.jsonObject(row.property_payload);
          let cumulativeDays = 0;
          for (const template of followUpTemplates) {
            cumulativeDays += Math.max(0, Number(template.gapDays) || 0);
            const dueAt = new Date(welcomeSentAt + cumulativeDays * 86_400_000);
            const channels = this.stringList(automation.channels).filter((channel) =>
              this.stringList(template.channels).includes(channel),
            );
            for (const channel of channels) {
              const createdBy = `lead-followup:${this.text(template.id)}:${channel.toLowerCase()}`;
              const existing = await client.query(
                `SELECT 1 FROM tenant_outreach_job
                 WHERE lead_id = $1 AND created_by = $2
                 LIMIT 1`,
                [Number(row.id), createdBy.slice(0, 200)],
              );
              if (existing.rowCount) continue;
              const recipientMissing =
                channel === 'Email' ? !lead.email : !lead.phone;
              if (recipientMissing) continue;
              const jobs = await outreach.enqueueWithClient(client, {
                leadId: Number(row.id),
                sourceType: 'lead-followup',
                sourceId: this.text(template.id),
                channels: [channel as 'Email' | 'SMS'],
                recipientName: lead.name,
                recipientEmail: lead.email,
                recipientPhone: lead.phone,
                title: this.renderWelcomeTemplate(
                  this.text(template.subject, 'Following up'),
                  lead,
                  agency,
                ),
                body: this.renderWelcomeTemplate(
                  this.text(template.body, ''),
                  lead,
                  agency,
                ),
                mediaUrls: await this.welcomeAttachmentUrls(
                  client,
                  template,
                  propertyPayload,
                  Number(row.property_id),
                ),
                scheduledAt: dueAt,
                createdBy,
                idempotencyKey: `lead-followup:${Number(row.id)}:${this.text(template.id)}:${channel.toLowerCase()}`,
                payload: {
                  templateId: this.text(template.id),
                  channel,
                  sequenceType: this.text(template.sequenceType),
                  automatic: true,
                },
              });
              if (jobs[0]?.status !== 'failed') enqueued += 1;
            }
          }
        } catch (error) {
          this.logger.warn(`Follow-up scheduling failed ${JSON.stringify({
            databaseName,
            leadId: Number(row.id),
            error: this.message(error),
          })}`);
        }
      }
      if (result.rowCount) {
        this.logger.log(`Follow-up scheduling ${databaseName}: ${JSON.stringify({
          scanned: result.rowCount,
          enqueued,
        })}`);
      }
      return { scanned: result.rowCount ?? 0, enqueued };
    });
  }

  private async removeStalePostVisitFollowUps(tenant: SaasTenant) {
    const days = this.clamp(process.env.TENANT_POST_VISIT_BOARD_DAYS, 2, 1, 30);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `UPDATE tenant_lead
           SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
             'inBoard', false,
             'followUpStatus', 'Completed',
             'boardRemovedAt', now()::text
           ),
           updated_at = now()
           WHERE COALESCE((payload->>'inBoard')::boolean, false) = true
             AND COALESCE(payload->>'stage', '') = 'FollowUp'
             AND NULLIF(payload->>'postVisitFollowUpSentAt', '')::timestamptz
                 <= now() - ($1::int * interval '1 day')
           RETURNING id`,
          [days],
        );
        return { removed: result.rowCount ?? 0 };
      },
    );
  }

  private async welcomeAttachmentUrls(
    client: PoolClient,
    template: any,
    propertyPayload: any,
    propertyId: number,
  ): Promise<string[]> {
    const mode = this.text(template?.attachmentMode);
    if (mode === 'property' || template?.attachPropertyDocuments === true) {
      const embeddedDocs = Array.isArray(propertyPayload?.propertyDocuments)
        ? propertyPayload.propertyDocuments
        : [];
      const embeddedUrls = embeddedDocs
        .map((doc: any) => this.text(doc?.fileUrl))
        .filter(Boolean)
        .slice(0, 5);
      if (embeddedUrls.length > 0) return embeddedUrls;
      const result = await client.query(
        `SELECT payload
         FROM tenant_legacy_resource
         WHERE resource = 'documents'
           AND LOWER(payload->>'documentType') IN ('property', 'lead')
           AND LOWER(payload->>'category') = 'lead'
           AND ($1 = 0 OR (payload->>'propertyId')::bigint = $1)
         ORDER BY updated_at DESC`,
        [propertyId || 0],
      );
      return result.rows
        .map((row: any) => this.jsonObject(row.payload))
        .map((document: any) => this.text(document?.fileUrl))
        .filter(Boolean)
        .slice(0, 5);
    }
    if (mode !== 'document') return [];

    const category = this.text(template?.attachmentDocumentCategory);
    const documentType = this.text(template?.attachmentDocumentType);
    const result = await client.query(
      `SELECT payload
       FROM tenant_legacy_resource
       WHERE resource = 'documents'
         AND ($1 = '' OR payload->>'category' = $1)
         AND ($2 = '' OR payload->>'documentType' = $2)
       ORDER BY updated_at DESC`,
      [category, documentType],
    );
    return result.rows
      .map((row: any) => this.jsonObject(row.payload))
      .filter((document: any) =>
        this.text(document.documentType) !== 'Property' ||
        Number(document.propertyId) === propertyId,
      )
      .map((document: any) => this.text(document.fileUrl))
      .filter(Boolean)
      .slice(0, 5);
  }

  private renderWelcomeTemplate(text: string, lead: any, agency: any) {
    const replacements: Record<string, string> = {
      '{{client_name}}': this.text(lead?.name, 'Client'),
      '{{property_address}}': this.text(lead?.property, 'the property'),
      '{{agent_name}}': this.text(
        agency?.profile?.agentName ?? agency?.profile?.contactName,
        'your agent',
      ),
      '{{agency_name}}': this.text(agency?.profile?.agencyName, 'our agency'),
      '{{showing_time}}': this.text(lead?.showingTime, 'the requested time'),
      '{{closing_date}}': this.text(lead?.closingDate, 'the scheduled date'),
    };
    return Object.entries(replacements).reduce(
      (current, [token, value]) => current.replaceAll(token, value),
      this.text(text),
    );
  }

  private jsonObject(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
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
    if (!savedTemplates.rowCount) {
      return {
        lead: null,
        created: false,
        result: this.parserFailure('No active lead parser is configured.'),
      };
    }

    const templates = savedTemplates.rows
      .map((row: any) => {
      const saved = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const rawMappings = Array.isArray(saved.mappings) ? saved.mappings : [];
      const sourceText = prepareLeadCollectionSource({
        htmlBody: this.text(saved.sourceHtml),
        textBody: this.text(saved.sourceText),
      });
      // Rebuild full mapping anchors (prefix/suffix/occurrence/selection) and
      // the body fingerprint from the saved sample exactly like the template
      // Test button does, so live sync matching/extraction matches what the
      // user sees when testing.
      const mappings = buildLeadCollectionMappings(sourceText, rawMappings);
      const bodyFingerprint = buildLeadCollectionFingerprint(sourceText, mappings);
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
    });

    const emailInput = {
      fromAddress: this.text(input.sender).toLowerCase(),
      subject: this.text(input.subject),
      htmlBody: this.text(input.payload?.htmlBody),
      textBody: this.text(input.body),
      mailboxTag: this.text(input.mailboxTag),
    };
    let result = parseLeadCollectionTemplates(templates, emailInput);
    let template = templates.find((item: any) => item.id === result.templateId);
    if (!template || !result.matched) {
      return { lead: null, created: false, result };
    } else {
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
    }
    if (
      !result.matched ||
      result.missingRequiredFields.length > 0 ||
      result.confidence < result.threshold
    ) {
      return { lead: null, created: false, result };
    }

    const values = result.values ?? {};
    const email = this.text(values.email).toLowerCase();
    let phone = this.text(values.phone);
    if (phone) {
      phone = normalizePhoneNumber(
        phone,
        await this.defaultPhoneCountryFromClient(client),
      );
      values.phone = phone;
    }
    let name = sanitizeLeadName(
      this.text(values.name),
      this.text(input.subject),
    );
    if (!name) {
      const basics = extractLeadBasicsFromEmail(emailInput);
      name = sanitizeLeadName(basics.name, this.text(input.subject));
      if (name) values.name = name;
    }
    if (!name) {
      const derived = deriveNameFromEmail(email);
      if (derived) {
        name = derived;
        values.name = derived;
      }
    }
    name = name || 'Inbound lead';
    // Never create a contact-less junk lead (e.g. a market-update newsletter
    // that matched a template but carries no name, email, or phone).
    if (name === 'Inbound lead' && !email && !phone) {
      return {
        lead: null,
        created: false,
        result: {
          ...result,
          missingRequiredFields: [
            ...new Set([...(result.missingRequiredFields ?? []), 'name', 'email', 'phone']),
          ],
        },
      };
    }
    const existing = await this.findLeadFromParsedValues(
      client,
      email,
      phone,
      input.sender,
    );
    const propertyMatch = await this.resolveLeadProperty(
      client,
      emailInput,
      this.text(values.property),
    );
    if (propertyMatch && propertyMatch.status && propertyMatch.status !== 'published') {
      return {
        lead: null,
        created: false,
        result: {
          ...result,
          diagnostics: [
            ...(Array.isArray(result.diagnostics) ? result.diagnostics : []),
            `Lead ignored because property ${propertyMatch.title} is inactive.`,
          ],
        },
      };
    }
    if (propertyMatch) values.property = propertyMatch.title;
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
      inBoard: existing?.payload?.inBoard === true,
      propertyListingStatus: propertyMatch ? 'Listed' : 'NotListed',
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
      const newLeadPayload = { ...leadPayload, inBoard: false };
      const inserted = await client.query(
        `INSERT INTO tenant_lead(full_name, email, phone, status, payload)
         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), 'new', $4::jsonb)
         RETURNING *`,
        [name || 'Inbound lead', email, phone, JSON.stringify(newLeadPayload)],
      );
      lead = inserted.rows[0];
    }

    const propertyId = propertyMatch?.id ?? null;
    if (propertyId && lead?.id) {
      await client.query(
        `INSERT INTO tenant_lead_property(lead_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [lead.id, propertyId],
      );
    }
    return { lead, created: !existing, result };
  }

  private parserPayload(parserResult: any) {
    return {
      extractedLead: parserResult.values ?? {},
      extractionConfidence: Number(parserResult.confidence) || 0,
      leadCollectionTemplateId: parserResult.templateId ?? null,
      leadCollectionTemplateName: parserResult.templateName ?? '',
      aiFallbackUsed: false,
      extractionDetails: {
        matched: parserResult.matched === true,
        matchScore: Number(parserResult.matchScore) || 0,
        threshold: Number(parserResult.threshold) || 0,
        missingRequiredFields: parserResult.missingRequiredFields ?? [],
        diagnostics: parserResult.diagnostics ?? [],
      },
      leadCollection: {
        templateId: parserResult.templateId,
        templateName: parserResult.templateName,
        confidence: parserResult.confidence,
        extractedFields: parserResult.extractedFields,
      },
    };
  }

  private parserFailure(reason: string) {
    return {
      matched: false,
      templateId: null,
      templateName: '',
      matchScore: 0,
      confidence: 0,
      threshold: 0.82,
      values: {},
      missingRequiredFields: [],
      extractedFields: [],
      diagnostics: [reason],
      scopeMatched: false,
    };
  }

  private parserSkipReason(result: any) {
    if (!result) return 'No parser result was produced.';
    if (!result.matched) {
      return this.text(result.diagnostics?.[0], 'No active parser matched this email.');
    }
    const missing = this.stringList(result.missingRequiredFields);
    if (missing.length) return `Missing required fields: ${missing.join(', ')}.`;
    if (Number(result.confidence) < Number(result.threshold)) {
      return `Parser confidence ${Math.round(Number(result.confidence) * 100)}% is below ${Math.round(Number(result.threshold) * 100)}%.`;
    }
    return this.text(result.diagnostics?.at?.(-1), 'Parser did not produce a usable lead.');
  }

  private emptyStats(): InboxSyncStats {
    return { imported: 0, matched: 0, created: 0, skipped: 0 };
  }

  private addStats(target: InboxSyncStats, value: InboxSyncStats) {
    target.imported += value.imported;
    target.matched += value.matched;
    target.created += value.created;
    target.skipped += value.skipped;
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
          OR ($1 = '' AND $2 = '' AND $3 <> '' AND lower(COALESCE(payload->>'inboundReplyAddress', '')) = lower($3))
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

  private async resolveLeadProperty(
    client: PoolClient,
    emailInput: { textBody: string; htmlBody: string; subject?: string },
    extractedProperty: string,
  ) {
    if (extractedProperty) {
      const id = await this.matchParsedProperty(client, extractedProperty);
      if (id) {
        const row = await client.query(
          'SELECT title, status FROM tenant_property WHERE id = $1',
          [id],
        );
        return {
          id,
          title: this.text(row.rows[0]?.title, extractedProperty),
          status: this.text(row.rows[0]?.status),
        };
      }
    }
    const match = await this.matchPropertyMentionedInEmail(client, emailInput);
    if (!match) return null;
    const row = await client.query(
      'SELECT status FROM tenant_property WHERE id = $1',
      [match.id],
    );
    return { ...match, status: this.text(row.rows[0]?.status) };
  }

  private async matchPropertyMentionedInEmail(
    client: PoolClient,
    input: { textBody: string; htmlBody: string; subject?: string },
  ) {
    const candidates: string[] = [];
    const textBody = this.normalizePropertyMatch(input.textBody);
    if (textBody) candidates.push(textBody);
    const subject = this.normalizePropertyMatch(input.subject);
    if (subject && !candidates.includes(subject)) candidates.push(subject);
    const htmlText = this.normalizePropertyMatch(this.stripHtml(input.htmlBody));
    if (htmlText && !candidates.includes(htmlText)) candidates.push(htmlText);
    if (!candidates.length) return null;

    const result = await client.query(
      `SELECT id, title, payload
       FROM tenant_property
       ORDER BY updated_at DESC, id DESC
       LIMIT 1000`,
    );
    if (!result.rowCount) return null;

    const matches: Array<{ id: number; title: string; score: number }> = [];
    for (const row of result.rows) {
      const payload =
        row?.payload && typeof row.payload === 'object' ? row.payload : {};
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
      let bestScore = 0;
      for (const field of fields) {
        bestScore = Math.max(bestScore, this.propertyMentionScore(field, candidates));
      }
      if (bestScore >= 0.85) {
        matches.push({ id: Number(row.id), title: `${row?.title ?? ''}`, score: bestScore });
      }
    }
    matches.sort((left, right) => right.score - left.score || right.id - left.id);
    const best = matches[0];
    return best ? { id: best.id, title: best.title } : null;
  }

  private propertyMentionScore(field: string, texts: string[]) {
    const numbers = field.match(/\b\d{3,6}\b/g) ?? [];
    const streetNumber = numbers[0] ?? '';
    const words = this.propertyMeaningfulWords(field);
    if (!words.length) return 0;
    let best = 0;
    for (const text of texts) {
      if (streetNumber && !text.includes(streetNumber)) continue;
      const present = words.filter((word) => text.includes(word)).length;
      let score = present / words.length;
      if (score >= 1) {
        const extraNumbers = numbers.slice(1);
        if (extraNumbers.length && extraNumbers.every((n) => text.includes(n))) {
          score += 0.05;
        }
      }
      best = Math.max(best, score);
    }
    return best;
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

  private async hasPriorSentOutreach(
    client: PoolClient,
    leadId: number,
    channel: 'Email' | 'SMS',
    receivedAt: Date,
    sender: string,
  ) {
    const result = await client.query(
      `SELECT 1
       FROM tenant_outreach_job
       WHERE lead_id = $1
         AND channel = $2
         AND direction <> 'Incoming'
         AND status = 'sent'
         AND COALESCE(occurred_at, completed_at, updated_at, created_at) <= $3
         AND (
           ($2 = 'Email' AND lower(COALESCE(recipient_email, '')) = lower($4))
           OR
           ($2 = 'SMS' AND regexp_replace(COALESCE(recipient_phone, ''), '[^0-9]', '', 'g') =
                           regexp_replace($4, '[^0-9]', '', 'g'))
         )
       LIMIT 1`,
      [leadId, channel, receivedAt, sender],
    );
    return Boolean(result.rowCount);
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
             last_error = '', locked_at = now(),
             imported_count = 0, matched_count = 0,
             created_count = 0, skipped_count = 0,
             updated_at = now()`,
        [JSON.stringify({ providerKey })],
      ),
    );
  }

  private async markCompleted(
    databaseName: string,
    providerKey: string,
    cursor: string | null,
    stats: InboxSyncStats,
    intervalMinutes = 5,
    scanWatermark: number | null = null,
  ) {
    const interval = this.clamp(intervalMinutes, 1, 720, 5);
    await this.databases.withTenantClient(databaseName, (client) =>
      client.query(
        `INSERT INTO tenant_sync_state(
           sync_key, status, cursor, last_completed_at, last_succeeded_at,
           next_run_at, locked_at, locked_by, last_error,
           imported_count, matched_count, created_count, skipped_count
         ) VALUES (
           'mail-inbox', 'sent', $1::jsonb, now(),
           CASE WHEN $7::numeric IS NULL THEN now()
             ELSE to_timestamp(($7::numeric) / 1000.0) END,
           now() + make_interval(mins => $6), NULL, NULL, '', $2, $3, $4, $5
         )
         ON CONFLICT (sync_key) DO UPDATE
         SET status = 'sent', cursor = EXCLUDED.cursor,
             last_completed_at = now(),
             last_succeeded_at = CASE WHEN $7::numeric IS NULL THEN now()
               ELSE to_timestamp(($7::numeric) / 1000.0) END,
             next_run_at = now() + make_interval(mins => $6),
             locked_at = NULL, locked_by = NULL, last_error = '',
             imported_count = EXCLUDED.imported_count,
             matched_count = EXCLUDED.matched_count,
             created_count = EXCLUDED.created_count,
             skipped_count = EXCLUDED.skipped_count,
             updated_at = now()`,
        [
          JSON.stringify({ providerKey, cursor }),
          stats.imported,
          stats.matched,
          stats.created,
          stats.skipped,
          interval,
          scanWatermark,
        ],
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

  /**
   * Returns the last successful scan time in ms (0 when the mailbox has never
   * synced). Used as the incremental watermark: each run only fetches messages
   * received after this point.
   */
  private async lastSuccessfulScan(databaseName: string) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `SELECT last_succeeded_at
         FROM tenant_sync_state WHERE sync_key = 'mail-inbox'`,
      );
      const value = result.rows?.[0]?.last_succeeded_at;
      return value ? new Date(value).getTime() : 0;
    });
  }

  private imapConnectionConfig(config: any) {
    const smtpHost = this.text(config?.host).toLowerCase();
    const provider = this.text(config?.providerName).toLowerCase();
    const inferredHost = smtpHost.includes('gmail') || provider.includes('gmail')
      ? 'imap.gmail.com'
      : smtpHost.includes('office365') || smtpHost.includes('outlook') || provider.includes('outlook')
        ? 'outlook.office365.com'
        : '';
    return {
      host: this.text(config?.imapHost, inferredHost),
      user: this.text(config?.imapUsername, config?.username),
      pass: this.text(config?.imapPassword, config?.password),
    };
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
