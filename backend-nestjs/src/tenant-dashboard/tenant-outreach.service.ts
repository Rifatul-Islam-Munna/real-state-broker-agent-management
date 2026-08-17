import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { parseDateTimeInZone } from '../common/time-zone';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import {
  PermanentTenantDeliveryError,
  TenantOutreachDeliveryService,
} from './tenant-outreach-delivery.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

export type TenantOutreachStatus =
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'retrying'
  | 'failed'
  | 'dead_letter';

export type TenantOutreachJob = {
  id: number;
  idempotency_key: string;
  lead_id: number | null;
  source_type: string;
  source_id: string;
  channel: 'Email' | 'SMS' | 'Call';
  direction: 'Incoming' | 'Outgoing' | 'Scheduled' | 'System';
  status: TenantOutreachStatus | 'received' | 'paused' | 'cancelled';
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  title: string;
  body: string;
  media_urls: string[];
  provider: string;
  provider_message_id: string;
  created_by: string;
  scheduled_at: Date;
  next_attempt_at: Date;
  attempt_count: number;
  max_attempts: number;
  locked_at: Date | null;
  locked_by: string | null;
  last_error: string;
  is_read: boolean;
  payload: Record<string, any>;
  occurred_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TenantEnqueueInput = {
  leadId?: number | null;
  sourceType?: string;
  sourceId?: string | number | null;
  channels: Array<'Email' | 'SMS' | 'Call'>;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  body: string;
  mediaUrls?: string[];
  createdBy?: string;
  scheduledAt?: Date | string | null;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
};

const SETTINGS = {
  agency: 'agency_settings',
  email: 'outreach_email_provider',
  homepage: 'homepage_settings',
  marketing: 'marketing_settings',
  scheduling: 'outreach_scheduling',
  sms: 'outreach_sms_provider',
} as const;

@Injectable()
export class TenantOutreachService {
  constructor(
    private readonly databases: TenantDatabaseService,
    @Optional() private readonly workspaceSettings?: TenantWorkspaceSettingsService,
    @Optional() private readonly deliveryService?: TenantOutreachDeliveryService,
  ) {}

  async getAgencySettings(tenant: SaasTenant) {
    return this.databases.withTenantClient(this.databaseName(tenant), (client) =>
      this.agencySettings(client),
    );
  }

  async updateAgencySettings(tenant: SaasTenant, input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await this.agencySettings(client);
      const value = {
        ...current,
        ...(this.object(input) ?? {}),
        communicationTemplates: Array.isArray(input?.communicationTemplates)
          ? input.communicationTemplates.map((item: any) => this.normalizeTemplate(item))
          : current.communicationTemplates,
      };
      await this.writeSetting(client, SETTINGS.agency, value);
      return { ...value, updatedAt: new Date().toISOString() };
    });
  }

  async getTemplates(tenant: SaasTenant) {
    const settings = await this.getAgencySettings(tenant);
    return settings.communicationTemplates;
  }

  async getIntegrationWorkspace(tenant: SaasTenant) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const [email, sms] = await Promise.all([
        this.readSetting(client, SETTINGS.email, null),
        this.readSetting(client, SETTINGS.sms, null),
      ]);
      return {
        hasCommunicationConfig: Boolean(sms),
        communicationUpdatedAt: sms?.updatedAt ?? null,
        communicationProviderName: sms?.providerName ?? null,
        communicationSmsSyncEnabled: sms?.enableSmsSync === true,
        communicationSmsSyncIntervalMinutes: sms?.enableSmsSync
          ? Number(sms.syncIntervalMinutes ?? 5)
          : null,
        hasAiProviderConfig: false,
        aiProviderUpdatedAt: null,
        aiProviderName: null,
        hasSmtpConfig: Boolean(email),
        smtpUpdatedAt: email?.updatedAt ?? null,
        smtpProviderName: email?.providerName ?? null,
        mailboxSyncEnabled: email?.enableInboxSync === true,
        mailboxSyncIntervalMinutes: email?.enableInboxSync
          ? Number(email.syncIntervalMinutes ?? 5)
          : null,
        updatedAt: email?.updatedAt ?? sms?.updatedAt ?? null,
        smtp: email ? this.redactSecrets(email) : null,
        communication: sms ? this.redactSecrets(sms) : null,
      };
    });
  }

  async updateIntegrationWorkspace(tenant: SaasTenant, input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      if (input?.clearSmtp === true) {
        await this.deleteSetting(client, SETTINGS.email);
      } else if (input?.smtp) {
        const previous = await this.readSetting(client, SETTINGS.email, {});
        await this.writeSetting(client, SETTINGS.email, {
          ...previous,
          ...this.object(input.smtp),
          password: this.keepSecret(input.smtp.password, previous.password),
          gmailRefreshToken: this.keepSecret(
            input.smtp.gmailRefreshToken,
            previous.gmailRefreshToken,
          ),
          gmailAccessToken: this.keepSecret(
            input.smtp.gmailAccessToken,
            previous.gmailAccessToken,
          ),
          updatedAt: new Date().toISOString(),
        });
      }

      if (input?.clearCommunication === true || input?.clearTwilio === true) {
        await this.deleteSetting(client, SETTINGS.sms);
      } else if (input?.communication || input?.twilio) {
        const source = input.communication ?? input.twilio;
        const previous = await this.readSetting(client, SETTINGS.sms, {});
        await this.writeSetting(client, SETTINGS.sms, {
          ...previous,
          ...this.object(source),
          authToken: this.keepSecret(source.authToken, previous.authToken),
          updatedAt: new Date().toISOString(),
        });
      }

      const [email, sms] = await Promise.all([
        this.readSetting(client, SETTINGS.email, null),
        this.readSetting(client, SETTINGS.sms, null),
      ]);
      return {
        hasCommunicationConfig: Boolean(sms),
        communicationUpdatedAt: sms?.updatedAt ?? null,
        communicationProviderName: sms?.providerName ?? null,
        communicationSmsSyncEnabled: sms?.enableSmsSync === true,
        communicationSmsSyncIntervalMinutes: sms?.enableSmsSync
          ? Number(sms.syncIntervalMinutes ?? 5)
          : null,
        hasAiProviderConfig: false,
        aiProviderUpdatedAt: null,
        aiProviderName: null,
        hasSmtpConfig: Boolean(email),
        smtpUpdatedAt: email?.updatedAt ?? null,
        smtpProviderName: email?.providerName ?? null,
        mailboxSyncEnabled: email?.enableInboxSync === true,
        mailboxSyncIntervalMinutes: email?.enableInboxSync
          ? Number(email.syncIntervalMinutes ?? 5)
          : null,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async getSchedulingSettings(tenant: SaasTenant) {
    return this.databases.withTenantClient(this.databaseName(tenant), (client) =>
      this.schedulingSettings(client),
    );
  }

  async updateSchedulingSettings(tenant: SaasTenant, input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await this.schedulingSettings(client);
      const value = {
        timeZone: this.text(input?.timeZone, current.timeZone),
        morningOutreachHour: this.clampInt(
          input?.morningOutreachHour,
          current.morningOutreachHour,
          0,
          23,
        ),
        maxAttempts: this.clampInt(input?.maxAttempts, current.maxAttempts, 1, 20),
        retryBaseSeconds: this.clampInt(
          input?.retryBaseSeconds,
          current.retryBaseSeconds,
          15,
          86_400,
        ),
        updatedAt: new Date().toISOString(),
      };
      await this.writeSetting(client, SETTINGS.scheduling, value);
      return value;
    });
  }

  getHomepageSettings(tenant: SaasTenant) {
    return this.getJsonSetting(tenant, SETTINGS.homepage, {});
  }

  updateHomepageSettings(tenant: SaasTenant, input: any) {
    return this.updateJsonSetting(tenant, SETTINGS.homepage, input);
  }

  getMarketingSettings(tenant: SaasTenant) {
    return this.getJsonSetting(tenant, SETTINGS.marketing, {});
  }

  updateMarketingSettings(tenant: SaasTenant, input: any) {
    return this.updateJsonSetting(tenant, SETTINGS.marketing, input);
  }

  async enqueue(tenant: SaasTenant, input: TenantEnqueueInput) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      (client) => this.enqueueWithClient(client, input),
    );
  }

  async enqueueWithClient(client: PoolClient, input: TenantEnqueueInput) {
    const channels = [...new Set(input.channels.map((item) => this.channel(item)))];
    if (!channels.length) throw new BadRequestException('At least one delivery channel is required.');
    const scheduling = await this.schedulingSettings(client);
    const scheduledAt = this.dateOrNow(input.scheduledAt);
    const baseKey = this.text(input.idempotencyKey, this.hash(JSON.stringify({
      leadId: input.leadId ?? null,
      sourceType: input.sourceType ?? 'lead-outreach',
      sourceId: input.sourceId ?? '',
      scheduledAt: scheduledAt.toISOString(),
      title: input.title,
      body: input.body,
      createdBy: input.createdBy ?? 'Tenant workspace',
    })));
    const rows: TenantOutreachJob[] = [];
    for (const channel of channels) {
      const recipientMissing = channel === 'Email'
        ? !this.text(input.recipientEmail)
        : !this.text(input.recipientPhone);
      const providerSetting = await this.readSetting(
        client,
        channel === 'Email' ? SETTINGS.email : SETTINGS.sms,
        {},
      );
      const provider = this.text(
        providerSetting?.providerName,
        channel === 'Email' ? 'SMTP' : 'Twilio',
      );
      const key = channels.length === 1 ? baseKey : `${baseKey}:${channel.toLowerCase()}`;
      const status: TenantOutreachStatus = recipientMissing ? 'failed' : 'scheduled';
      const lastError = recipientMissing
        ? channel === 'Email'
          ? 'Recipient email is missing.'
          : 'Recipient phone number is missing.'
        : '';
      const inserted = await client.query<TenantOutreachJob>(
        `INSERT INTO tenant_outreach_job(
          idempotency_key, lead_id, source_type, source_id, channel,
          direction, status, recipient_name, recipient_email,
          recipient_phone, title, body, media_urls, provider, created_by,
          scheduled_at, next_attempt_at, max_attempts, last_error,
          payload, completed_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          'Scheduled', $6, $7, $8,
          $9, $10, $11, $12::jsonb, $13, $14,
          $15, $15, $16, $17,
          $18::jsonb, $19
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING *`,
        [
          key.slice(0, 200),
          Number(input.leadId) > 0 ? Number(input.leadId) : null,
          this.text(input.sourceType, 'lead-outreach').slice(0, 80),
          this.text(input.sourceId).slice(0, 120),
          channel,
          status,
          this.text(input.recipientName).slice(0, 200),
          this.text(input.recipientEmail).toLowerCase().slice(0, 240),
          this.text(input.recipientPhone).slice(0, 80),
          this.text(input.title).slice(0, 500),
          this.text(input.body),
          JSON.stringify(this.stringList(input.mediaUrls).slice(0, 10)),
          provider.slice(0, 100),
          this.text(input.createdBy, 'Tenant workspace').slice(0, 200),
          scheduledAt,
          scheduling.maxAttempts,
          lastError,
          JSON.stringify(input.payload ?? {}),
          status === 'failed' ? new Date() : null,
        ],
      );
      let row = inserted.rows[0];
      if (!row) {
        const existing = await client.query<TenantOutreachJob>(
          'SELECT * FROM tenant_outreach_job WHERE idempotency_key = $1',
          [key.slice(0, 200)],
        );
        row = existing.rows[0];
      }
      if (row) rows.push(row);
    }
    return rows;
  }

  async queueOutreach(tenant: SaasTenant, input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const leadId = this.positiveId(input?.leadId, 'Lead id');
      const lead = await this.leadSnapshot(client, leadId);
      const channel = this.channel(input?.kind);
      const agency = await this.agencySettings(client);
      const template = input?.templateId
        ? agency.communicationTemplates.find(
            (item: any) => `${item.id}` === `${input.templateId}`,
          )
        : null;
      const title = this.resolveTemplateTokens(
        this.text(input?.title, template?.subject ?? ''),
        lead,
        agency,
      );
      const body = this.resolveTemplateTokens(
        this.text(input?.message ?? input?.body, template?.body ?? ''),
        lead,
        agency,
      );
      if (!body) throw new BadRequestException('A message is required.');
      if (channel === 'Email' && !title) {
        throw new BadRequestException('An email subject is required.');
      }
      const scheduling = await this.schedulingSettings(client);
      const scheduledAt = this.scheduleDate(input?.scheduledAt, scheduling.timeZone);
      const jobs = await this.enqueueWithClient(client, {
        leadId,
        sourceType: 'lead-outreach',
        sourceId: input?.templateId ?? '',
        channels: [channel],
        recipientName: this.text(lead.name ?? lead.fullName),
        recipientEmail: this.text(lead.email),
        recipientPhone: this.text(lead.phone),
        title: title || `${channel} outreach`,
        body,
        mediaUrls: this.stringList(input?.mediaUrls),
        createdBy: this.text(input?.createdBy, 'Tenant workspace'),
        scheduledAt,
        idempotencyKey: this.text(input?.idempotencyKey) || undefined,
        payload: { templateId: input?.templateId ?? null, lead },
      });
      return this.mapJob(jobs[0]);
    });
  }

  async queueBulkOutreach(tenant: SaasTenant, input: any) {
    const leadIds = await this.databases.withTenantClient(
      this.databaseName(tenant),
      (client) => this.resolveAudience(client, input),
    );
    if (leadIds.length === 0) {
      throw new BadRequestException('No matching tenant leads were found.');
    }

    const failures: string[] = [];
    let savedCount = 0;
    for (const leadId of leadIds) {
      try {
        const item = await this.queueOutreach(tenant, { ...input, leadId });
        if (item.status === 'Failed') failures.push(`${item.leadName}: ${item.summary}`);
        else savedCount += 1;
      } catch (error) {
        failures.push(
          `Lead #${leadId}: ${error instanceof Error ? error.message : 'Queue failed'}`,
        );
      }
    }

    return {
      audienceType: input?.audienceType ?? 'LeadStage',
      audienceLabel: input?.leadStage ?? input?.dealStage ?? '',
      matchedCount: leadIds.length,
      savedCount,
      skippedCount: 0,
      failedCount: failures.length,
      failures,
    };
  }

  async getSchedule(
    tenant: SaasTenant,
    filters: { leadId?: number; kind?: string; status?: string },
  ) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query<TenantOutreachJob>(
        'SELECT * FROM tenant_outreach_job ORDER BY created_at DESC LIMIT 2000',
      );
      const leadId = Number(filters.leadId);
      return result.rows
        .map((row) => this.mapJob(row))
        .filter((item) => !Number.isInteger(leadId) || item.leadId === leadId)
        .filter((item) => !filters.kind || item.kind === filters.kind)
        .filter((item) => this.matchesPublicStatus(item.status, filters.status));
    });
  }

  async updateScheduleStatus(
    tenant: SaasTenant,
    id: number,
    status: 'active' | 'paused' | 'cancelled',
  ) {
    const jobId = this.positiveId(id, 'Schedule item id');
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query<TenantOutreachJob>(
        'SELECT * FROM tenant_outreach_job WHERE id = $1',
        [jobId],
      );
      const job = current.rows[0];
      if (!job) throw new NotFoundException('Tenant schedule item was not found.');

      const nextStatus: TenantOutreachJob['status'] =
        status === 'active' ? 'scheduled' : status;
      const reason =
        status === 'active'
          ? 'Schedule resumed.'
          : status === 'paused'
            ? 'Schedule paused by a tenant user.'
            : 'Schedule cancelled by a tenant user.';
      const updated = await client.query<TenantOutreachJob>(
        `UPDATE tenant_outreach_job
         SET status = $2,
             next_attempt_at = CASE WHEN $2 = 'scheduled' THEN now() ELSE next_attempt_at END,
             locked_at = NULL,
             locked_by = NULL,
             last_error = CASE WHEN $2 IN ('paused', 'cancelled') THEN $3 ELSE '' END,
             completed_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE NULL END,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [jobId, nextStatus, reason],
      );
      return this.mapJob(updated.rows[0]);
    });
  }

  async retryJob(tenant: SaasTenant, id: number) {
    const jobId = this.positiveId(id, 'Job id');
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const updated = await client.query<TenantOutreachJob>(
        `UPDATE tenant_outreach_job
         SET status = 'retrying', next_attempt_at = now(), locked_at = NULL,
             locked_by = NULL, last_error = '', completed_at = NULL, updated_at = now()
         WHERE id = $1 AND status IN ('failed', 'dead_letter')
         RETURNING *`,
        [jobId],
      );
      if (!updated.rows[0]) {
        throw new BadRequestException('Only failed or dead-letter jobs can be retried.');
      }
      return this.mapJob(updated.rows[0]);
    });
  }

  async markRepliesRead(tenant: SaasTenant, ids: number[], isRead = true) {
    const cleanIds = [...new Set((Array.isArray(ids) ? ids : []).map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (cleanIds.length === 0) {
      throw new BadRequestException('Choose at least one tenant reply.');
    }
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query(
        `UPDATE tenant_outreach_job
         SET is_read = $2, updated_at = now()
         WHERE id = ANY($1::bigint[])
           AND (direction = 'Incoming' OR status = 'received')`,
        [cleanIds, isRead],
      );
      return { ids: cleanIds, isRead };
    });
  }

  async monitoring(tenant: SaasTenant) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const [counts, oldest, recentFailures] = await Promise.all([
        client.query<{ status: TenantOutreachStatus; count: number }>(
          `SELECT status, COUNT(*)::int AS count
           FROM tenant_outreach_job
           GROUP BY status`,
        ),
        client.query(
          `SELECT id, scheduled_at, next_attempt_at
           FROM tenant_outreach_job
           WHERE status IN ('scheduled', 'retrying')
           ORDER BY next_attempt_at ASC
           LIMIT 1`,
        ),
        client.query(
          `SELECT id, lead_id, channel, status, attempt_count, max_attempts,
                  last_error, updated_at
           FROM tenant_outreach_job
           WHERE status IN ('failed', 'dead_letter')
           ORDER BY updated_at DESC
           LIMIT 20`,
        ),
      ]);
      const byStatus: Record<TenantOutreachStatus, number> = {
        scheduled: 0,
        processing: 0,
        sent: 0,
        retrying: 0,
        failed: 0,
        dead_letter: 0,
      };
      for (const row of counts.rows) byStatus[row.status] = Number(row.count) || 0;
      return {
        databaseName: this.databaseName(tenant),
        statuses: byStatus,
        oldestDue: oldest.rows[0] ?? null,
        recentFailures: recentFailures.rows,
        checkedAt: new Date().toISOString(),
      };
    });
  }

  async recordInboundEmail(
    tenant: SaasTenant,
    input: {
      senderEmail: string;
      senderName?: string;
      subject?: string;
      body?: string;
      messageId?: string;
      provider?: string;
      receivedAt?: Date;
      payload?: Record<string, unknown>;
    },
  ) {
    return this.recordInbound(tenant, {
      channel: 'Email',
      sender: this.text(input.senderEmail).toLowerCase(),
      senderName: this.text(input.senderName),
      recipient: '',
      title: this.text(input.subject),
      body: this.text(input.body),
      messageId: this.text(input.messageId),
      provider: this.text(input.provider, 'Tenant mailbox'),
      receivedAt: input.receivedAt ?? new Date(),
      mediaUrls: [],
      payload: input.payload ?? {},
    });
  }

  async recordInboundSms(
    tenant: SaasTenant,
    input: {
      senderPhone: string;
      recipientPhone?: string;
      body?: string;
      messageId?: string;
      provider?: string;
      receivedAt?: Date;
      mediaUrls?: string[];
      payload?: Record<string, unknown>;
    },
  ) {
    return this.recordInbound(tenant, {
      channel: 'SMS',
      sender: this.text(input.senderPhone),
      senderName: '',
      recipient: this.text(input.recipientPhone),
      title: 'SMS reply',
      body: this.text(input.body),
      messageId: this.text(input.messageId),
      provider: this.text(input.provider, 'Tenant SMS provider'),
      receivedAt: input.receivedAt ?? new Date(),
      mediaUrls: this.stringList(input.mediaUrls),
      payload: input.payload ?? {},
    });
  }

  async recoverStaleClaims(tenant: SaasTenant) {
    const staleMinutes = this.clampInt(
      process.env.TENANT_OUTREACH_STALE_MINUTES,
      15,
      2,
      120,
    );
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `UPDATE tenant_outreach_job
         SET status = CASE
               WHEN attempt_count >= max_attempts THEN 'dead_letter'
               ELSE 'retrying'
             END,
             next_attempt_at = now(),
             locked_at = NULL,
             locked_by = NULL,
             last_error = CASE
               WHEN last_error = '' THEN 'Recovered after an abandoned worker claim.'
               ELSE last_error
             END,
             updated_at = now()
         WHERE status = 'processing'
           AND locked_at IS NOT NULL
           AND locked_at < now() - ($1 * interval '1 minute')`,
        [staleMinutes],
      );
      return result.rowCount ?? 0;
    });
  }

  async claimDueJobs(
    tenant: SaasTenant,
    workerId: string,
    requestedLimit?: number,
  ): Promise<TenantOutreachJob[]> {
    const limit = this.clampInt(
      requestedLimit,
      this.clampInt(process.env.TENANT_OUTREACH_BATCH_SIZE, 25, 1, 100),
      1,
      100,
    );
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query<TenantOutreachJob>(
          `WITH due AS (
             SELECT id
             FROM tenant_outreach_job
             WHERE status IN ('scheduled', 'retrying')
               AND scheduled_at <= now()
               AND next_attempt_at <= now()
             ORDER BY next_attempt_at, scheduled_at, id
             FOR UPDATE SKIP LOCKED
             LIMIT $1
           )
           UPDATE tenant_outreach_job j
           SET status = 'processing',
               attempt_count = j.attempt_count + 1,
               locked_at = now(),
               locked_by = $2,
               updated_at = now()
           FROM due
           WHERE j.id = due.id
           RETURNING j.*`,
          [limit, workerId],
        );
        await client.query('COMMIT');
        return result.rows.map((row) => ({
          ...row,
          leadId: row.lead_id,
          sourceType: row.source_type,
          sourceId: row.source_id,
          recipientName: row.recipient_name,
          recipientEmail: row.recipient_email,
          recipientPhone: row.recipient_phone,
          mediaUrls: row.media_urls,
          createdBy: row.created_by,
          scheduledAt: row.scheduled_at,
          attemptCount: row.attempt_count,
          maxAttempts: row.max_attempts,
          providerMessageId: row.provider_message_id,
        })) as TenantOutreachJob[];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async processClaimedJob(tenant: SaasTenant, job: TenantOutreachJob) {
    const normalized = this.normalizeClaimedJob(job as any);
    const databaseName = this.databaseName(tenant);
    const attemptId = await this.beginAttempt(databaseName, normalized);
    try {
      const result = await this.deliver(tenant, normalized);
      await this.finishAttemptSuccess(
        databaseName,
        normalized,
        attemptId,
        result.providerMessageId,
      );
      return { id: normalized.id, status: 'sent' as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error ?? 'Delivery failed'}`;
      const permanent = error instanceof PermanentTenantDeliveryError;
      const exhausted = normalized.attempt_count >= normalized.max_attempts;
      const status: TenantOutreachStatus = permanent
        ? 'failed'
        : exhausted
          ? 'dead_letter'
          : 'retrying';
      await this.finishFailure(tenant, normalized, attemptId, status, message);
      return { id: normalized.id, status, error: message };
    }
  }

  listLeads(tenant: SaasTenant, query: any) {
    return this.listEntity(tenant, 'lead', query);
  }

  createLead(tenant: SaasTenant, input: any) {
    return this.createEntity(tenant, 'lead', input);
  }

  updateLead(tenant: SaasTenant, input: any) {
    return this.updateEntity(tenant, 'lead', input);
  }

  deleteLead(tenant: SaasTenant, id: number) {
    return this.deleteEntity(tenant, 'lead', id);
  }

  listDeals(tenant: SaasTenant, query: any) {
    return this.listEntity(tenant, 'deal', query);
  }

  createDeal(tenant: SaasTenant, input: any) {
    return this.createEntity(tenant, 'deal', input);
  }

  updateDeal(tenant: SaasTenant, input: any) {
    return this.updateEntity(tenant, 'deal', input);
  }

  deleteDeal(tenant: SaasTenant, id: number) {
    return this.deleteEntity(tenant, 'deal', id);
  }

  private async getJsonSetting(tenant: SaasTenant, key: string, fallback: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), (client) =>
      this.readSetting(client, key, fallback),
    );
  }

  private async updateJsonSetting(tenant: SaasTenant, key: string, input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const value = this.object(input) ?? {};
      await this.writeSetting(client, key, value);
      return value;
    });
  }

  private async agencySettings(client: PoolClient) {
    const defaults = this.defaultAgencySettings();
    const current = await this.readSetting(client, SETTINGS.agency, defaults);
    return {
      ...defaults,
      ...(this.object(current) ?? {}),
      profile: { ...defaults.profile, ...(this.object(current?.profile) ?? {}) },
      communicationTemplates: Array.isArray(current?.communicationTemplates)
        ? current.communicationTemplates.map((item: any) => this.normalizeTemplate(item))
        : defaults.communicationTemplates,
    };
  }

  private async schedulingSettings(client: PoolClient) {
    const current = await this.readSetting(client, SETTINGS.scheduling, {});
    return {
      timeZone: this.text(current?.timeZone, 'UTC'),
      morningOutreachHour: this.clampInt(current?.morningOutreachHour, 9, 0, 23),
      maxAttempts: this.clampInt(current?.maxAttempts, 5, 1, 20),
      retryBaseSeconds: this.clampInt(current?.retryBaseSeconds, 60, 15, 86_400),
      updatedAt: current?.updatedAt ?? null,
    };
  }

  private async readSetting(client: PoolClient, key: string, fallback: any) {
    const result = await client.query(
      'SELECT value FROM tenant_setting WHERE key = $1',
      [key],
    );
    const value = result.rows[0]?.value;
    if (value == null) return fallback;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return value;
  }

  private writeSetting(client: PoolClient, key: string, value: any) {
    return client.query(
      `INSERT INTO tenant_setting(key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value ?? {})],
    );
  }

  private deleteSetting(client: PoolClient, key: string) {
    return client.query('DELETE FROM tenant_setting WHERE key = $1', [key]);
  }

  private async leadSnapshot(client: PoolClient, leadId: number) {
    const result = await client.query(
      'SELECT to_jsonb(lead) AS value FROM tenant_lead lead WHERE id = $1',
      [leadId],
    );
    if (!result.rows[0]?.value) throw new NotFoundException('Tenant lead was not found.');
    return this.camelize(result.rows[0].value);
  }

  private async resolveAudience(client: PoolClient, input: any) {
    const leads = await client.query('SELECT to_jsonb(lead) AS value FROM tenant_lead lead');
    const normalized = leads.rows.map((row) => this.camelize(row.value));
    if ((input?.audienceType ?? 'LeadStage') !== 'DealStage') {
      if (!input?.leadStage) throw new BadRequestException('Choose a tenant lead stage.');
      return normalized
        .filter((lead) => `${lead.stage ?? ''}` === `${input.leadStage}`)
        .map((lead) => Number(lead.id))
        .filter((id) => Number.isInteger(id) && id > 0);
    }

    if (!input?.dealStage) throw new BadRequestException('Choose a tenant deal stage.');
    const table = await this.resolveEntityTable(client, 'deal');
    const deals = await client.query(`SELECT to_jsonb(item) AS value FROM ${table} item`);
    const leadIds = deals.rows
      .map((row) => this.camelize(row.value))
      .filter((deal) => `${deal.stage ?? ''}` === `${input.dealStage}`)
      .map((deal) => Number(deal.sourceLeadId ?? deal.leadId))
      .filter((id) => Number.isInteger(id) && id > 0);
    return [...new Set(leadIds)];
  }

  private async recordInbound(
    tenant: SaasTenant,
    input: {
      channel: 'Email' | 'SMS';
      sender: string;
      senderName: string;
      recipient: string;
      title: string;
      body: string;
      messageId: string;
      provider: string;
      receivedAt: Date;
      mediaUrls: string[];
      payload: Record<string, unknown>;
    },
  ) {
    if (!input.sender) throw new BadRequestException('Inbound sender is required.');
    const databaseName = this.databaseName(tenant);
    return this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const lead = await this.findLeadForInbound(client, input.channel, input.sender);
        const providerMessageId = input.messageId || this.hash([
          input.provider,
          input.channel,
          input.sender,
          input.receivedAt.toISOString(),
          input.body,
        ].join('|'));
        const idempotencyKey = this.hash(
          `inbound|${input.channel}|${input.provider}|${providerMessageId}`,
        );
        const payload = {
          ...input.payload,
          lead,
          inboundSender: input.sender,
          inboundRecipient: input.recipient,
        };
        const result = await client.query<TenantOutreachJob>(
          `INSERT INTO tenant_outreach_job(
             idempotency_key, lead_id, source_type, source_id, channel,
             direction, status, recipient_name, recipient_email,
             recipient_phone, title, body, media_urls, provider,
             provider_message_id, created_by, scheduled_at, next_attempt_at,
             max_attempts, is_read, payload, occurred_at, completed_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             'Incoming', 'received', $6, $7,
             $8, $9, $10, $11::jsonb, $12,
             $13, $14, $15, $15,
             1, false, $16::jsonb, $15, $15
           )
           ON CONFLICT (idempotency_key) DO NOTHING
           RETURNING *`,
          [
            idempotencyKey,
            Number(lead?.id) > 0 ? Number(lead.id) : null,
            input.channel === 'Email' ? 'mail-inbox' : 'sms-inbox',
            providerMessageId.slice(0, 120),
            input.channel,
            this.text(lead?.full_name ?? lead?.fullName ?? input.senderName ?? input.sender).slice(0, 200),
            input.channel === 'Email' ? input.sender.toLowerCase().slice(0, 240) : '',
            input.channel === 'SMS' ? input.sender.slice(0, 80) : '',
            input.title.slice(0, 500),
            input.body,
            JSON.stringify(input.mediaUrls.slice(0, 10)),
            input.provider.slice(0, 100),
            providerMessageId.slice(0, 240),
            input.provider.slice(0, 200),
            input.receivedAt,
            JSON.stringify(payload),
          ],
        );
        let row = result.rows[0];
        if (!row) {
          const existing = await client.query<TenantOutreachJob>(
            'SELECT * FROM tenant_outreach_job WHERE idempotency_key = $1',
            [idempotencyKey],
          );
          row = existing.rows[0];
        }
        if (row) {
          const complete = await client.query<TenantOutreachJob>(
            'SELECT j.* FROM tenant_outreach_job j WHERE j.id = $1',
            [row.id],
          );
          row = complete.rows[0] ?? row;
        }
        if (row && Number(lead?.id) > 0) {
          await client.query(
            `UPDATE tenant_outreach_job
             SET status = 'cancelled',
                 last_error = 'Cancelled because this lead replied.',
                 completed_at = now(),
                 locked_at = NULL,
                 locked_by = NULL,
                 updated_at = now()
             WHERE lead_id = $1
               AND id <> $2
               AND direction <> 'Incoming'
               AND status IN ('scheduled', 'retrying')`,
            [Number(lead.id), row.id],
          );
          await client.query(
            `UPDATE tenant_lead
             SET payload = COALESCE(payload, '{}'::jsonb) ||
                 jsonb_build_object('followUpStatus', 'Completed'),
                 updated_at = now()
             WHERE id = $1`,
            [Number(lead.id)],
          );
        }
        await client.query('COMMIT');
        return this.mapJob(row);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  private async findLeadForInbound(
    client: PoolClient,
    channel: 'Email' | 'SMS',
    sender: string,
  ) {
    const result = channel === 'Email'
      ? await client.query(
          `SELECT id, full_name AS "fullName", email, phone, status, payload
           FROM tenant_lead WHERE LOWER(email) = LOWER($1)
           ORDER BY id DESC LIMIT 1`,
          [sender],
        )
      : await client.query(
          `SELECT id, full_name, email, phone, status, payload
           FROM tenant_lead
           WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') =
                 regexp_replace($1, '[^0-9]', '', 'g')
           ORDER BY id DESC LIMIT 1`,
          [sender],
        );
    return result.rows[0] ?? null;
  }

  private normalizeClaimedJob(job: any): TenantOutreachJob {
    return {
      ...job,
      lead_id: job.lead_id ?? job.leadId ?? null,
      source_type: job.source_type ?? job.sourceType ?? 'lead-outreach',
      source_id: `${job.source_id ?? job.sourceId ?? ''}`,
      recipient_name: job.recipient_name ?? job.recipientName ?? '',
      recipient_email: job.recipient_email ?? job.recipientEmail ?? '',
      recipient_phone: job.recipient_phone ?? job.recipientPhone ?? '',
      media_urls: Array.isArray(job.media_urls)
        ? job.media_urls
        : Array.isArray(job.mediaUrls)
          ? job.mediaUrls
          : [],
      created_by: job.created_by ?? job.createdBy ?? 'Tenant workspace',
      scheduled_at: job.scheduled_at ?? job.scheduledAt ?? new Date(),
      next_attempt_at: job.next_attempt_at ?? job.nextAttemptAt ?? new Date(),
      attempt_count: Number(job.attempt_count ?? job.attemptCount) || 0,
      max_attempts: Number(job.max_attempts ?? job.maxAttempts) || 5,
      provider_message_id: job.provider_message_id ?? job.providerMessageId ?? '',
      direction: job.direction ?? 'Scheduled',
      status: job.status ?? 'processing',
      idempotency_key: job.idempotency_key ?? job.idempotencyKey ?? `job-${job.id}`,
      title: job.title ?? job.subject ?? '',
      body: job.body ?? '',
      provider: job.provider ?? '',
      is_read: job.is_read === true,
      payload: this.object(job.payload) ?? {},
      occurred_at: job.occurred_at ?? job.occurredAt ?? null,
      completed_at: job.completed_at ?? job.completedAt ?? null,
      locked_at: job.locked_at ?? null,
      locked_by: job.locked_by ?? null,
      last_error: job.last_error ?? job.lastError ?? '',
      created_at: job.created_at ?? job.createdAt ?? new Date(),
      updated_at: job.updated_at ?? job.updatedAt ?? new Date(),
    };
  }

  private async deliver(tenant: SaasTenant, job: TenantOutreachJob) {
    if (!this.deliveryService) {
      throw new Error('Tenant outreach delivery service is unavailable.');
    }
    return this.deliveryService.deliver(this.databaseName(tenant), job, tenant);
  }

  private async finishFailure(
    tenant: SaasTenant,
    job: TenantOutreachJob,
    attemptId: number,
    status: TenantOutreachStatus,
    message: string,
  ) {
    return this.finishAttemptFailure(
      this.databaseName(tenant),
      job,
      attemptId,
      status,
      new Error(message),
    );
  }

  private async beginAttempt(databaseName: string, job: TenantOutreachJob) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        `INSERT INTO tenant_outreach_attempt(job_id, attempt_no, status, started_at)
         VALUES ($1, $2, 'processing', now())
         ON CONFLICT (job_id, attempt_no) DO UPDATE
         SET status = 'processing', started_at = now(), completed_at = NULL,
             error_message = '', provider_message_id = ''
         RETURNING id`,
        [job.id, job.attempt_count],
      );
      return Number(result.rows[0].id);
    });
  }

  private async finishAttemptSuccess(
    databaseName: string,
    job: TenantOutreachJob,
    attemptId: number,
    providerMessageId: string,
  ) {
    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(
          `UPDATE tenant_outreach_job
           SET status = 'sent', provider_message_id = $2,
               last_error = '', occurred_at = now(), completed_at = now(),
               locked_at = NULL, locked_by = NULL, updated_at = now()
           WHERE id = $1 AND status = 'processing'`,
          [job.id, providerMessageId],
        );
        await client.query(
          `UPDATE tenant_outreach_attempt
           SET status = 'sent', provider = $2, provider_message_id = $3,
               completed_at = now(), error_message = ''
           WHERE id = $1`,
          [attemptId, job.provider, providerMessageId],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  private async finishAttemptFailure(
    databaseName: string,
    job: TenantOutreachJob,
    attemptId: number,
    status: TenantOutreachStatus,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : `${error ?? 'Delivery failed'}`;
    const scheduling = await this.databases.withTenantClient(databaseName, (client) =>
      this.schedulingSettings(client),
    );
    const retrySeconds = this.retryDelaySeconds(
      scheduling.retryBaseSeconds,
      job.attempt_count,
      job.id,
    );
    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(
          `UPDATE tenant_outreach_job
           SET status = $2,
               next_attempt_at = CASE
                 WHEN $2 = 'retrying' THEN now() + ($3 * interval '1 second')
                 ELSE next_attempt_at
               END,
               last_error = $4,
               completed_at = CASE WHEN $2 IN ('failed', 'dead_letter') THEN now() ELSE NULL END,
               locked_at = NULL, locked_by = NULL, updated_at = now()
           WHERE id = $1 AND status = 'processing'`,
          [job.id, status, retrySeconds, message.slice(0, 4000)],
        );
        await client.query(
          `UPDATE tenant_outreach_attempt
           SET status = 'failed', error_message = $2, completed_at = now()
           WHERE id = $1`,
          [attemptId, message.slice(0, 4000)],
        );
        await client.query('COMMIT');
      } catch (transactionError) {
        await client.query('ROLLBACK');
        throw transactionError;
      }
    });
  }

  private retryDelaySeconds(base: number, attempt: number, jobId: number) {
    const exponent = Math.min(8, Math.max(0, attempt - 1));
    const jitter = (jobId * 17 + attempt * 13) % Math.max(1, base);
    return Math.min(86_400, base * 2 ** exponent + jitter);
  }

  private mapJob(row: TenantOutreachJob) {
    const payload = this.object(row.payload) ?? {};
    const lead = this.object(payload.lead) ?? {};
    const publicStatus = this.publicStatus(row.status);
    const incoming = row.direction === 'Incoming' || row.status === 'received';
    return {
      id: Number(row.id),
      leadId: Number(row.lead_id ?? lead.id ?? 0) || null,
      kind: row.channel === 'SMS' ? 'Sms' : row.channel,
      direction: incoming
        ? 'Incoming'
        : ['scheduled', 'processing', 'retrying'].includes(row.status)
          ? 'Scheduled'
          : 'Outgoing',
      status: publicStatus,
      rawStatus: row.status,
      title: row.title || `${row.channel} outreach`,
      summary: row.last_error
        ? row.last_error
        : incoming
          ? this.text(row.body).slice(0, 240)
          : row.status === 'sent'
            ? `${row.channel} accepted by ${row.provider || 'the provider'}.`
            : `${row.channel ?? 'Message'} is ${`${row.status ?? 'scheduled'}`.replace('_', ' ')}.`,
      body: row.body,
      provider: row.provider,
      providerMessageId: row.provider_message_id,
      createdBy: row.created_by || payload.createdBy || 'Tenant workspace',
      isRead: row.is_read === true,
      scheduledAt: incoming ? null : row.scheduled_at,
      occurredAt: row.occurred_at ?? row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attemptCount: Number(row.attempt_count) || 0,
      maxAttempts: Number(row.max_attempts) || 0,
      lastError: row.last_error,
      leadName: this.text(lead.full_name ?? lead.fullName ?? lead.name, row.recipient_name),
      leadEmail: this.text(lead.email, row.recipient_email),
      leadPhone: this.text(lead.phone, row.recipient_phone),
      leadProperty: this.text(lead.property ?? lead.propertyTitle),
      leadPropertyId: lead.propertyId ?? null,
      leadStage: this.text(lead.stage ?? lead.status),
      leadPriority: this.text(lead.priority),
    };
  }

  private publicStatus(status: TenantOutreachJob['status']) {
    if (status === 'received') return 'Received';
    if (status === 'sent') return 'Sent';
    if (status === 'paused') return 'Paused';
    if (status === 'failed' || status === 'dead_letter' || status === 'cancelled') return 'Failed';
    return 'Scheduled';
  }

  private matchesPublicStatus(actual: string, requested?: string) {
    if (!requested) return true;
    if (requested === 'Completed') return actual === 'Sent';
    return actual === requested;
  }

  private async listEntity(tenant: SaasTenant, entity: 'lead' | 'deal', query: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const table = await this.resolveEntityTable(client, entity);
      const result = await client.query(
        `SELECT to_jsonb(item) AS value FROM ${table} item ORDER BY item.id DESC LIMIT 5000`,
      );
      const search = this.text(query?.search ?? query?.q).toLowerCase();
      const stage = this.text(query?.stage);
      let items = result.rows.map((row) => this.camelize(row.value));
      if (stage) items = items.filter((item) => `${item.stage ?? ''}` === stage);
      if (search) {
        items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
      }
      const page = this.clampInt(query?.page, 1, 1, 100_000);
      const pageSize = this.clampInt(query?.pageSize, 20, 1, 500);
      const totalCount = items.length;
      return {
        items: items.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        totalCount,
      };
    });
  }

  private async createEntity(tenant: SaasTenant, entity: 'lead' | 'deal', input: any) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const table = await this.resolveEntityTable(client, entity);
      const columns = await this.tableColumns(client, table);
      const values = this.entityValues(input, columns, false);
      if (values.columns.length === 0) throw new BadRequestException('No supported fields were provided.');
      const params = values.columns.map((_, index) => `$${index + 1}`);
      const result = await client.query(
        `INSERT INTO ${table}(${values.columns.join(', ')})
         VALUES (${params.join(', ')})
         RETURNING to_jsonb(${table}) AS value`,
        values.values,
      );
      return this.camelize(result.rows[0].value);
    });
  }

  private async updateEntity(tenant: SaasTenant, entity: 'lead' | 'deal', input: any) {
    const id = this.positiveId(input?.id, `${entity} id`);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const table = await this.resolveEntityTable(client, entity);
      const columns = await this.tableColumns(client, table);
      const values = this.entityValues(input, columns, true);
      if (values.columns.length === 0) throw new BadRequestException('No supported fields were provided.');
      const sets = values.columns.map((column, index) => `${column} = $${index + 1}`);
      if (columns.has('updated_at')) sets.push('updated_at = now()');
      const result = await client.query(
        `UPDATE ${table} SET ${sets.join(', ')}
         WHERE id = $${values.values.length + 1}
         RETURNING to_jsonb(${table}) AS value`,
        [...values.values, id],
      );
      if (!result.rows[0]) throw new NotFoundException(`Tenant ${entity} was not found.`);
      return this.camelize(result.rows[0].value);
    });
  }

  private async deleteEntity(tenant: SaasTenant, entity: 'lead' | 'deal', idValue: number) {
    const id = this.positiveId(idValue, `${entity} id`);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const table = await this.resolveEntityTable(client, entity);
      const result = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
      if (!result.rows[0]) throw new NotFoundException(`Tenant ${entity} was not found.`);
      return { id };
    });
  }

  private async resolveEntityTable(client: PoolClient, entity: 'lead' | 'deal') {
    const candidates =
      entity === 'lead'
        ? ['tenant_lead']
        : ['tenant_deal', 'tenant_deal_pipeline', 'tenant_pipeline_deal'];
    for (const table of candidates) {
      const result = await client.query('SELECT to_regclass($1) AS name', [table]);
      if (result.rows[0]?.name) return table;
    }
    throw new NotFoundException(`The tenant ${entity} table is not available.`);
  }

  private async tableColumns(client: PoolClient, table: string) {
    const result = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1`,
      [table],
    );
    return new Set<string>(result.rows.map((row) => row.column_name));
  }

  private entityValues(input: any, columns: Set<string>, updating: boolean) {
    const source = this.object(input) ?? {};
    const mapped = Object.fromEntries(
      Object.entries(source).map(([key, value]) => [this.toSnake(key), value]),
    );
    if (columns.has('payload')) mapped.payload = source.payload ?? source;
    const excluded = new Set(['id', 'created_at', 'updated_at']);
    const selected = Object.entries(mapped).filter(
      ([key, value]) =>
        columns.has(key) &&
        !excluded.has(key) &&
        value !== undefined &&
        (!updating || key !== 'created_at'),
    );
    return {
      columns: selected.map(([key]) => key),
      values: selected.map(([, value]) => value),
    };
  }

  private normalizeTemplate(input: any) {
    return {
      id: this.text(input?.id, this.hash(JSON.stringify(input ?? {})).slice(0, 12)),
      name: this.text(input?.name, 'Tenant template'),
      subject: this.text(input?.subject),
      body: this.text(input?.body),
      channels: this.stringList(input?.channels).filter((item) =>
        ['Email', 'SMS'].includes(item),
      ),
      variableTokens: this.stringList(input?.variableTokens),
      sequenceType: ['Direct', 'FollowUp1', 'FollowUp2', 'FollowUp3'].includes(
        input?.sequenceType,
      )
        ? input.sequenceType
        : 'Direct',
      gapDays: this.clampInt(input?.gapDays, 0, 0, 365),
      isActive: input?.isActive !== false,
      audience: this.text(input?.audience, 'Lead'),
      attachmentMode: this.text(input?.attachmentMode, 'none'),
      attachmentDocumentType: this.text(input?.attachmentDocumentType),
      attachmentDocumentCategory: this.text(input?.attachmentDocumentCategory),
      attachPropertyDocuments: input?.attachPropertyDocuments === true,
      pdfTemplateId: this.text(input?.pdfTemplateId),
    };
  }

  private defaultAgencySettings() {
    return {
      profile: {
        agencyName: '',
        contactEmail: '',
        contactPhone: '',
        officeLocations: [],
        socialLinks: [],
      },
      leadAutomation: {
        enabled: true,
        channels: ['Email'],
        directTemplateId: 'new-lead-welcome',
        followUpEnabled: true,
      },
      firstMessageAutomation: {
        lead: true,
        leadShowing: true,
        realtorShowing: true,
        delayMinutes: 0,
      },
      communicationTemplates: [
        this.normalizeTemplate({
          id: 'new-lead-welcome',
          name: 'New Lead Welcome',
          subject: 'Thank you for contacting {{agency_name}}',
          body: 'Hello {{client_name}}, thank you for your interest in {{property_address}}. {{agent_name}} will contact you shortly.',
          channels: ['Email', 'SMS'],
          sequenceType: 'Direct',
          audience: 'Lead',
          isActive: true,
        }),
      ],
    };
  }

  private resolveTemplateTokens(text: string, lead: any, agency: any) {
    const replacements: Record<string, string> = {
      '{{client_name}}': this.text(lead?.name, 'Client'),
      '{{property_address}}': this.text(
        lead?.property ?? lead?.propertyTitle,
        'the property',
      ),
      '{{agent_name}}': this.text(lead?.agent ?? lead?.assignedAgentName, 'your agent'),
      '{{agency_name}}': this.text(agency?.profile?.agencyName, 'our agency'),
      '{{showing_time}}': this.text(lead?.timeline, 'the requested time'),
      '{{closing_date}}': this.text(lead?.timeline, 'the scheduled date'),
    };
    return Object.entries(replacements).reduce(
      (current, [token, value]) => current.replaceAll(token, value),
      this.text(text),
    );
  }

  private scheduleDate(value: any, timeZone: string) {
    if (!value) return new Date();
    const raw = `${value}`.trim();
    const zoned = /(?:Z|[+-]\d\d:\d\d)$/i.test(raw)
      ? new Date(raw)
      : parseDateTimeInZone(raw, timeZone);
    const date = zoned instanceof Date ? zoned : new Date(raw);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException('Scheduled time is invalid.');
    return date;
  }

  private idempotencyKey(
    provided: any,
    leadId: number,
    channel: string,
    scheduledAt: Date,
    subject: string,
    body: string,
    createdBy: string,
  ) {
    const explicit = this.text(provided);
    if (explicit) return explicit.slice(0, 160);
    return this.hash(
      [leadId, channel, scheduledAt.toISOString(), subject, body, createdBy].join('|'),
    );
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new BadRequestException('Tenant database is not ready.');
    return tenant.databaseName;
  }

  private positiveId(value: any, label: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException(`${label} is required.`);
    return id;
  }

  private channel(value: any): 'Email' | 'SMS' | 'Call' {
    const normalized = this.text(value, 'Email').toLowerCase();
    if (normalized === 'sms') return 'SMS';
    if (normalized === 'call') return 'Call';
    if (normalized === 'email') return 'Email';
    throw new BadRequestException('Only Email, SMS, and Call are supported.');
  }

  private dateOrNow(value: Date | string | null | undefined) {
    if (!value) return new Date();
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException('Scheduled time is invalid.');
    }
    return date;
  }

  private keepSecret(value: any, previous: any) {
    const normalized = this.text(value);
    if (!normalized || normalized === '********' || normalized === '••••••••') return previous ?? '';
    return normalized;
  }

  private redactSecrets(value: any) {
    const result = { ...(this.object(value) ?? {}) };
    for (const key of [
      'password',
      'authToken',
      'gmailAccessToken',
      'gmailRefreshToken',
      'clientSecret',
    ]) {
      if (result[key]) result[key] = '********';
    }
    return result;
  }

  private camelize(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.camelize(item));
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        this.camelize(item),
      ]),
    );
  }

  private toSnake(value: string) {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private object(value: any): Record<string, any> | null {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  }

  private stringList(value: any) {
    const source = Array.isArray(value) ? value : value == null ? [] : [value];
    return [...new Set(source.map((item) => this.text(item)).filter(Boolean))];
  }

  private clampInt(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private text(value: any, fallback = '') {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }
}
