import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Injectable()
export class TenantSmsInboxService {
  private readonly logger = new Logger(TenantSmsInboxService.name);
  private readonly workerId = `${hostname()}:${process.pid}:sms:${randomUUID().slice(0, 8)}`;
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly settings: TenantWorkspaceSettingsService,
    private readonly outreach: TenantOutreachService,
  ) {}

  @Cron('* * * * *')
  async processFleet() {
    if (process.env.TENANT_SMS_SYNC_ENABLED === 'false' || this.running) return;
    this.running = true;
    try {
      const tenants = await this.eligibleTenants();
      await this.mapLimit(
        tenants,
        this.int(process.env.TENANT_SMS_TENANT_CONCURRENCY, 3, 1, 12),
        async (tenant) => {
          try {
            await this.syncTenant(tenant, false);
          } catch (error) {
            this.logger.warn(
              `Tenant ${tenant.id} SMS sync failed: ${this.errorMessage(error)}`,
            );
          }
        },
      );
    } finally {
      this.running = false;
    }
  }
  async list(
    tenant: SaasTenant,
    options: {
      id?: number;
      page?: number;
      pageSize?: number;
      search?: string;
      direction?: string;
    },
  ) {
    const page = this.int(options.page, 1, 1, 100_000);
    const pageSize = this.int(options.pageSize, 20, 1, 100);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const values: unknown[] = [];
        const conditions = [`j.channel = 'SMS'`];
        if (Number(options.id) > 0) {
          values.push(Number(options.id));
          conditions.push(`j.id = $${values.length}`);
        }
        if (options.direction === 'Incoming') {
          conditions.push(
            `(j.direction = 'Incoming' OR j.status = 'received')`,
          );
        } else if (options.direction === 'Outgoing') {
          conditions.push(
            `NOT (j.direction = 'Incoming' OR j.status = 'received')`,
          );
        }
        const search = `${options.search ?? ''}`.trim();
        if (search) {
          values.push(`%${search}%`);
          conditions.push(`(
          j.recipient_name ILIKE $${values.length}
          OR j.recipient_phone ILIKE $${values.length}
          OR j.body ILIKE $${values.length}
          OR j.provider ILIKE $${values.length}
        )`);
        }
        const where = conditions.join(' AND ');
        if (Number(options.id) > 0) {
          const result = await client.query(
            `SELECT j.*, l.full_name AS lead_name
           FROM tenant_outreach_job j
           LEFT JOIN tenant_lead l ON l.id = j.lead_id
           WHERE ${where}`,
            values,
          );
          if (!result.rowCount)
            throw new NotFoundException('Tenant SMS message was not found.');
          return this.mapMessage(result.rows[0]);
        }
        const count = await client.query(
          `SELECT COUNT(*)::int AS total
         FROM tenant_outreach_job j
         WHERE ${where}`,
          values,
        );
        values.push(pageSize, (page - 1) * pageSize);
        const rows = await client.query(
          `SELECT j.*, l.full_name AS lead_name
         FROM tenant_outreach_job j
         LEFT JOIN tenant_lead l ON l.id = j.lead_id
         WHERE ${where}
         ORDER BY COALESCE(j.occurred_at, j.created_at) DESC, j.id DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const totalCount = Number(count.rows[0]?.total) || 0;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        return {
          items: rows.rows.map((row: any) => this.mapMessage(row)),
          totalCount,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        };
      },
    );
  }

  async send(
    tenant: SaasTenant,
    dto: any,
    actor: string,
    idempotencyKey?: string,
  ) {
    const body = `${dto?.body ?? dto?.message ?? ''}`.trim();
    const mediaUrls = this.stringList(dto?.mediaUrls).slice(0, 10);
    if (!body && mediaUrls.length === 0) {
      throw new BadRequestException('Message body or attachment is required.');
    }
    const target = await this.resolveRecipient(tenant, dto);
    const jobs = await this.outreach.enqueue(tenant, {
      leadId: target.leadId,
      sourceType: 'sms-inbox',
      channels: ['SMS'],
      recipientName: target.leadName,
      recipientPhone: target.phone,
      title: 'SMS message',
      body,
      mediaUrls,
      createdBy: actor,
      scheduledAt: new Date(),
      idempotencyKey: idempotencyKey || randomUUID(),
    });
    return this.mapMessage({
      ...jobs[0],
      lead_name: target.leadName,
    });
  }
  async syncTenant(tenant: SaasTenant, force = true) {
    const config: any = await this.settings.getRawCommunication(tenant);
    if (!config?.enableSmsSync) {
      return {
        imported: 0,
        skipped: true,
        message: 'Tenant SMS sync is disabled.',
      };
    }
    const claim = await this.claim(tenant, config, force);
    if (!claim) {
      return {
        imported: 0,
        skipped: true,
        message: 'Tenant SMS sync is not due.',
      };
    }
    const startedAt = new Date();
    try {
      const result = await this.syncProvider(
        tenant,
        config,
        claim.cursor,
        startedAt,
      );
      await this.finishSuccess(tenant, config, result, startedAt);
      return { ...result, skipped: false };
    } catch (error) {
      await this.finishFailure(tenant, claim.cursor, error);
      throw error;
    }
  }

  async getStatus(tenant: SaasTenant) {
    const config: any = await this.settings.getRawCommunication(tenant);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `SELECT status, cursor, last_started_at, last_completed_at,
                last_succeeded_at, next_run_at, last_error,
                imported_count, matched_count, created_count, skipped_count
         FROM tenant_sync_state WHERE sync_key = 'sms-inbox'`,
        );
        const row = result.rows[0] ?? {};
        return {
          isConfigured: Boolean(
            config?.providerName && config?.accountId && config?.authToken,
          ),
          syncEnabled: config?.enableSmsSync === true,
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
      },
    );
  }
  private async claim(tenant: SaasTenant, config: any, force: boolean) {
    const staleMinutes = this.int(
      process.env.TENANT_SMS_STALE_MINUTES,
      20,
      2,
      180,
    );
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query(
          `INSERT INTO tenant_sync_state(sync_key, status, next_run_at)
         VALUES ('sms-inbox', 'scheduled', now())
         ON CONFLICT (sync_key) DO NOTHING`,
        );
        const result = await client.query(
          `UPDATE tenant_sync_state
         SET status = 'processing', last_started_at = now(),
             locked_at = now(), locked_by = $1, last_error = '',
             updated_at = now()
         WHERE sync_key = 'sms-inbox'
           AND ($2::boolean OR next_run_at <= now())
           AND (
             status <> 'processing' OR locked_at IS NULL
             OR locked_at < now() - ($3 * interval '1 minute')
           )
           AND ($2::boolean OR status <> 'dead_letter')
         RETURNING cursor`,
          [this.workerId, force, staleMinutes],
        );
        if (!result.rowCount) return null;
        return {
          cursor:
            result.rows[0]?.cursor && typeof result.rows[0].cursor === 'object'
              ? result.rows[0].cursor
              : {},
          intervalMinutes: this.int(config.syncIntervalMinutes, 5, 1, 120),
        };
      },
    );
  }

  private async syncProvider(
    tenant: SaasTenant,
    config: any,
    cursor: any,
    scanStartedAt: Date,
  ) {
    const provider = `${config.providerName ?? ''}`.trim().toLowerCase();
    const lastScan = cursor?.lastSuccessfulScanAt
      ? new Date(cursor.lastSuccessfulScanAt)
      : null;
    const since =
      lastScan && !Number.isNaN(lastScan.getTime())
        ? new Date(lastScan.getTime() - 10 * 60_000)
        : new Date(Date.now() - 24 * 60 * 60_000);
    const maxMessages = this.int(config.maxMessagesPerSync, 50, 5, 250);
    const records =
      provider === 'twilio'
        ? await this.fetchTwilio(config, since, maxMessages)
        : provider === 'plivo'
          ? await this.fetchPlivo(config, since, maxMessages)
          : provider === 'ringcentral'
            ? await this.fetchRingCentral(config, maxMessages)
            : (() => {
                throw new Error(
                  `Unsupported tenant SMS provider: ${config.providerName}.`,
                );
              })();
    const result = {
      imported: 0,
      matched: 0,
      created: 0,
      skipped: 0,
      cursor: {
        ...cursor,
        lastSuccessfulScanAt: scanStartedAt.toISOString(),
        retryCount: 0,
      },
    };
    for (const raw of records) {
      const message = this.normalizeProviderRecord(provider, raw);
      if (!message || message.direction !== 'Incoming') {
        result.skipped++;
        continue;
      }
      if (!message.providerMessageId || !message.fromNumber) {
        result.skipped++;
        continue;
      }
      const saved: any = await this.outreach.recordInboundSms(tenant, {
        senderPhone: message.fromNumber,
        recipientPhone: message.toNumber,
        body: message.body,
        messageId: message.providerMessageId,
        provider: message.provider,
        receivedAt: message.occurredAt,
        mediaUrls: message.mediaUrls,
        payload: raw && typeof raw === 'object' ? raw : { raw },
      });
      result.imported++;
      if (Number(saved?.leadId) > 0) result.matched++;
    }
    return result;
  }

  private async fetchTwilio(config: any, since: Date, limit: number) {
    const twilio = require('twilio');
    const client = twilio(config.accountId, config.authToken);
    return client.messages.list({
      dateSentAfter: since,
      limit,
    });
  }

  private async fetchPlivo(config: any, since: Date, limit: number) {
    const plivo = require('plivo');
    const client = new plivo.Client(config.accountId, config.authToken);
    const response = await client.messages.list({
      message_direction: 'inbound',
      message_time__gte: since.toISOString(),
      limit,
    });
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.objects)) return response.objects;
    return [];
  }
  private async fetchRingCentral(config: any, limit: number) {
    const RingCentralSdk =
      require('@ringcentral/sdk').SDK ?? require('@ringcentral/sdk');
    const sdk = new RingCentralSdk({
      server: `${config.baseUrl || 'https://platform.ringcentral.com'}`.replace(
        /\/$/,
        '',
      ),
    });
    const platform = sdk.platform();
    await platform.auth().setData({
      access_token: config.authToken,
      expires_in: 3600,
      expire_time: Date.now() + 3_600_000,
      token_type: 'bearer',
    });
    const response = await platform.get(
      '/restapi/v1.0/account/~/extension/~/message-store',
      { perPage: limit, type: 'SMS' },
    );
    const payload = await response.json();
    return Array.isArray(payload.records) ? payload.records : [];
  }

  private normalizeProviderRecord(provider: string, record: any) {
    if (provider === 'twilio') {
      return {
        provider: 'Twilio',
        providerMessageId: `${record.sid ?? ''}`,
        fromNumber: `${record.from ?? ''}`,
        toNumber: `${record.to ?? ''}`,
        body: `${record.body ?? ''}`,
        mediaUrls: [],
        direction: `${record.direction ?? ''}`
          .toLowerCase()
          .startsWith('inbound')
          ? 'Incoming'
          : 'Outgoing',
        occurredAt: record.dateSent ?? record.dateCreated ?? new Date(),
      };
    }
    if (provider === 'plivo') {
      return {
        provider: 'Plivo',
        providerMessageId: `${
          record.messageUuid ?? record.message_uuid ?? record.messageUUID ?? ''
        }`,
        fromNumber: `${record.fromNumber ?? record.from_number ?? record.from ?? ''}`,
        toNumber: `${record.toNumber ?? record.to_number ?? record.to ?? ''}`,
        body: `${record.message ?? record.text ?? ''}`,
        mediaUrls: this.stringList(record.mediaUrls ?? record.media_urls),
        direction:
          `${record.messageDirection ?? record.message_direction ?? ''}`
            .toLowerCase()
            .startsWith('in')
            ? 'Incoming'
            : 'Outgoing',
        occurredAt: new Date(
          record.messageTime ?? record.message_time ?? Date.now(),
        ),
      };
    }
    const fromNumber = `${record.from?.phoneNumber ?? ''}`;
    const toNumber = Array.isArray(record.to)
      ? `${record.to[0]?.phoneNumber ?? ''}`
      : '';
    return {
      provider: 'RingCentral',
      providerMessageId: `${record.id ?? ''}`,
      fromNumber,
      toNumber,
      body: `${record.subject ?? record.message ?? ''}`,
      mediaUrls: Array.isArray(record.attachments)
        ? record.attachments
            .map((item: any) => item.uri ?? item.contentUri)
            .filter(Boolean)
        : [],
      direction: record.direction === 'Outbound' ? 'Outgoing' : 'Incoming',
      occurredAt: record.creationTime
        ? new Date(record.creationTime)
        : new Date(),
    };
  }

  private async resolveRecipient(tenant: SaasTenant, dto: any) {
    const leadId = Number(dto?.leadId);
    if (Number.isInteger(leadId) && leadId > 0) {
      return this.databases.withTenantClient(
        this.databaseName(tenant),
        async (client) => {
          const result = await client.query(
            `SELECT id, full_name, COALESCE(phone, '') AS phone
           FROM tenant_lead WHERE id = $1`,
            [leadId],
          );
          if (!result.rowCount)
            throw new NotFoundException('Tenant lead was not found.');
          const country = await this.settings.getAgencyPhoneCountry(tenant);
          const phone = normalizePhoneNumber(result.rows[0].phone, country);
          if (!phone)
            throw new BadRequestException(
              'Lead phone number is missing or invalid.',
            );
          return {
            leadId,
            leadName: result.rows[0].full_name ?? '',
            phone,
          };
        },
      );
    }
    const country = await this.settings.getAgencyPhoneCountry(tenant);
    const phone = normalizePhoneNumber(dto?.to, country);
    if (!phone)
      throw new BadRequestException('Recipient phone number is required.');
    return { leadId: null, leadName: '', phone };
  }

  private async finishSuccess(
    tenant: SaasTenant,
    config: any,
    result: any,
    startedAt: Date,
  ) {
    const interval = this.int(config.syncIntervalMinutes, 5, 1, 120);
    await this.databases.withTenantClient(this.databaseName(tenant), (client) =>
      client.query(
        `UPDATE tenant_sync_state
         SET status = 'sent', cursor = $1::jsonb, last_started_at = $2,
             last_completed_at = now(), last_succeeded_at = now(),
             next_run_at = now() + ($3 * interval '1 minute'),
             locked_at = NULL, locked_by = NULL, last_error = '',
             imported_count = $4, matched_count = $5,
             created_count = $6, skipped_count = $7, updated_at = now()
         WHERE sync_key = 'sms-inbox'`,
        [
          JSON.stringify(result.cursor ?? {}),
          startedAt,
          interval,
          result.imported ?? 0,
          result.matched ?? 0,
          result.created ?? 0,
          result.skipped ?? 0,
        ],
      ),
    );
  }
  private async finishFailure(tenant: SaasTenant, cursor: any, error: unknown) {
    const retryCount = this.int(cursor?.retryCount, 0, 0, 100) + 1;
    const maxRetries = this.int(process.env.TENANT_SMS_MAX_RETRIES, 8, 1, 30);
    const status = retryCount >= maxRetries ? 'dead_letter' : 'retrying';
    const nextSeconds = Math.min(21_600, 60 * 2 ** Math.max(0, retryCount - 1));
    await this.databases.withTenantClient(this.databaseName(tenant), (client) =>
      client.query(
        `UPDATE tenant_sync_state
         SET status = $1,
             cursor = $2::jsonb,
             last_completed_at = now(),
             next_run_at = now() + ($3 * interval '1 second'),
             locked_at = NULL,
             locked_by = NULL,
             last_error = $4,
             updated_at = now()
         WHERE sync_key = 'sms-inbox'`,
        [
          status,
          JSON.stringify({ ...cursor, retryCount }),
          nextSeconds,
          this.errorMessage(error).slice(0, 4000),
        ],
      ),
    );
  }

  private mapMessage(row: any) {
    const incoming = row.direction === 'Incoming' || row.status === 'received';
    const internalStatus = `${row.status ?? 'scheduled'}`.toLowerCase();
    return {
      id: Number(row.id),
      provider: row.provider ?? '',
      providerMessageId: row.provider_message_id ?? '',
      leadId: Number(row.lead_id) || null,
      leadName: row.lead_name ?? row.recipient_name ?? '',
      fromNumber: incoming ? (row.recipient_phone ?? '') : '',
      toNumber: incoming ? '' : (row.recipient_phone ?? ''),
      body: row.body ?? '',
      mediaUrls: Array.isArray(row.media_urls) ? row.media_urls : [],
      direction: incoming ? 'Incoming' : 'Outgoing',
      status:
        internalStatus === 'received'
          ? 'Received'
          : internalStatus === 'sent'
            ? 'Sent'
            : ['failed', 'dead_letter', 'cancelled'].includes(internalStatus)
              ? 'Failed'
              : 'Scheduled',
      occurredAt: row.occurred_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      queueStatus: internalStatus,
      attemptCount: Number(row.attempt_count) || 0,
      maxAttempts: Number(row.max_attempts) || 0,
      lastError: row.last_error ?? '',
    };
  }
  private async eligibleTenants() {
    const tenants = await this.tenants.find({
      where: {
        isActive: true,
        isBlocked: false,
        databaseStatus: 'ready',
        provisioningStatus: 'ready',
      },
      order: { id: 'ASC' },
    });
    return tenants.filter(
      (tenant) =>
        Boolean(tenant.databaseName) &&
        (!tenant.subscriptionExpiresAt ||
          tenant.subscriptionExpiresAt.getTime() > Date.now()),
    );
  }

  private async mapLimit<T>(
    items: T[],
    concurrency: number,
    callback: (item: T) => Promise<void>,
  ) {
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(Math.max(1, concurrency), items.length) },
      async () => {
        while (cursor < items.length) {
          await callback(items[cursor++]);
        }
      },
    );
    await Promise.all(workers);
  }

  private stringList(value: unknown) {
    return Array.isArray(value)
      ? [
          ...new Set(
            value.map((item) => `${item ?? ''}`.trim()).filter(Boolean),
          ),
        ]
      : [];
  }

  private int(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error
      ? error.message
      : `${error ?? 'Unknown error'}`;
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new Error('Tenant database is not ready.');
    return tenant.databaseName;
  }
}
