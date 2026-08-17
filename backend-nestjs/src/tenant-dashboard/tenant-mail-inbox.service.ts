import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantInboxSyncService } from './tenant-inbox-sync.service';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Injectable()
export class TenantMailInboxService {
  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly outreach: TenantOutreachService,
    private readonly inboxSync: TenantInboxSyncService,
    private readonly settings: TenantWorkspaceSettingsService,
  ) {}

  async list(
    tenant: SaasTenant,
    query: {
      id?: number;
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      mailboxTag?: string;
      isRead?: string;
      isStarred?: string;
    },
  ) {
    const page = this.int(query.page, 1, 1, 100_000);
    const pageSize = this.int(query.pageSize, 20, 1, 100);
    const smtpConfig: any = await this.settings.getRawSmtp(tenant);
    const configuredSyncTags = this.commaList(smtpConfig?.mailboxTag).map((tag) =>
      tag.toLowerCase(),
    );
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const values: unknown[] = [];
        const conditions = [`j.channel = 'Email'`];
        if (configuredSyncTags.length) {
          values.push(configuredSyncTags);
          conditions.push(`(
            j.direction <> 'Incoming'
            OR (j.provider NOT LIKE 'gmail:%' AND j.provider NOT LIKE 'imap:%')
            OR LOWER(COALESCE(j.payload->>'mailbox', '')) = ANY($${values.length}::text[])
          )`);
        }
        if (Number(query.id) > 0) {
          values.push(Number(query.id));
          conditions.push(`j.id = $${values.length}`);
        }
        const search = `${query.search ?? ''}`.trim();
        if (search) {
          values.push(`%${search}%`);
          conditions.push(`(
          j.recipient_name ILIKE $${values.length}
          OR j.recipient_email ILIKE $${values.length}
          OR j.title ILIKE $${values.length}
          OR j.body ILIKE $${values.length}
        )`);
        }
        if (query.status) {
          const statuses = this.internalStatuses(query.status);
          values.push(statuses);
          conditions.push(`j.status = ANY($${values.length}::text[])`);
        }
        if (query.mailboxTag) {
          values.push(`${query.mailboxTag}`.trim().toLowerCase());
          conditions.push(
            `LOWER(COALESCE(j.payload->>'mailbox', '')) = $${values.length}`,
          );
        }
        const read = this.boolean(query.isRead);
        if (read !== null) {
          values.push(read);
          conditions.push(`j.is_read = $${values.length}`);
        }
        const starred = this.boolean(query.isStarred);
        if (starred !== null) {
          values.push(starred);
          conditions.push(
            `COALESCE((j.payload->>'isStarred')::boolean, false) = $${values.length}`,
          );
        }
        const where = conditions.join(' AND ');
        if (Number(query.id) > 0) {
          const result = await client.query(
            `SELECT j.*, l.full_name AS lead_name
           FROM tenant_outreach_job j
           LEFT JOIN tenant_lead l ON l.id = j.lead_id
           WHERE ${where}`,
            values,
          );
          if (!result.rowCount)
            throw new NotFoundException('Tenant mail item was not found.');
          return this.mapMail(result.rows[0]);
        }
        const count = await client.query(
          `SELECT COUNT(*)::int AS total
         FROM tenant_outreach_job j WHERE ${where}`,
          values,
        );
        values.push(pageSize, (page - 1) * pageSize);
        const rows = await client.query(
          `SELECT j.*, l.full_name AS lead_name
         FROM tenant_outreach_job j
         LEFT JOIN tenant_lead l ON l.id = j.lead_id
         WHERE ${where}
         ORDER BY j.is_read ASC,
                  COALESCE(j.occurred_at, j.created_at) DESC,
                  j.id DESC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
          values,
        );
        const totalCount = Number(count.rows[0]?.total) || 0;
        const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
        return {
          items: rows.rows.map((row: any) => this.mapMail(row)),
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
    const email = `${dto?.to ?? dto?.email ?? ''}`.trim().toLowerCase();
    const subject = `${dto?.subject ?? ''}`.trim();
    const plain = `${dto?.message ?? dto?.body ?? ''}`.trim();
    const html = `${dto?.htmlBody ?? dto?.html ?? ''}`.trim();
    const body = plain || this.htmlToText(html);
    const attachmentUrls = this.stringList(dto?.attachmentUrls).slice(0, 10);
    if (!email) throw new BadRequestException('Recipient email is required.');
    if (!subject) throw new BadRequestException('Subject is required.');
    if (!body && !attachmentUrls.length) {
      throw new BadRequestException('Message or attachment is required.');
    }
    const lead = await this.findLeadByEmail(tenant, email);
    const jobs = await this.outreach.enqueue(tenant, {
      leadId: lead?.id ?? null,
      sourceType: 'mail-inbox',
      channels: ['Email'],
      recipientName: lead?.fullName || `${dto?.name ?? email.split('@')[0]}`,
      recipientEmail: email,
      title: subject,
      body,
      mediaUrls: attachmentUrls,
      createdBy: actor,
      scheduledAt: new Date(),
      idempotencyKey: idempotencyKey || randomUUID(),
      payload: { htmlBody: html },
    });
    return this.mapMail({ ...jobs[0], lead_name: lead?.fullName ?? '' });
  }
  async create(tenant: SaasTenant, dto: any) {
    return this.outreach.recordInboundEmail(tenant, {
      senderEmail: `${dto?.email ?? dto?.fromAddress ?? ''}`
        .trim()
        .toLowerCase(),
      senderName: `${dto?.name ?? dto?.fromName ?? ''}`.trim(),
      subject: `${dto?.subject ?? ''}`.trim(),
      body: `${dto?.message ?? dto?.body ?? ''}`,
      messageId: `${dto?.messageId ?? ''}`.trim() || undefined,
      provider: `${dto?.provider ?? 'Manual inbox'}`.trim(),
      receivedAt: dto?.createdAt ? new Date(dto.createdAt) : new Date(),
      payload: {
        mailbox: `${dto?.mailboxTag ?? ''}`.trim(),
        htmlBody: `${dto?.htmlBody ?? ''}`,
        isStarred: dto?.isStarred === true,
      },
    });
  }

  async update(tenant: SaasTenant, dto: any) {
    const id = Number(dto?.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Mail item id is required.');
    }
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const current = await client.query(
          `SELECT payload, provider, provider_message_id, direction, is_read
           FROM tenant_outreach_job
           WHERE id = $1 AND channel = 'Email'`,
          [id],
        );
        if (!current.rowCount)
          throw new NotFoundException('Tenant mail item was not found.');
        const payload =
          current.rows[0]?.payload &&
          typeof current.rows[0].payload === 'object'
            ? current.rows[0].payload
            : {};
        if (Object.prototype.hasOwnProperty.call(dto, 'isStarred')) {
          payload.isStarred = dto.isStarred === true;
        }
        if (dto?.status) payload.mailStatus = `${dto.status}`;
        const hasReadChange = Object.prototype.hasOwnProperty.call(dto, 'isRead');
        const nextRead = hasReadChange ? dto.isRead === true : null;
        if (
          hasReadChange &&
          current.rows[0].direction === 'Incoming' &&
          current.rows[0].is_read !== nextRead
        ) {
          await this.inboxSync.setProviderReadState(
            tenant,
            {
              provider: current.rows[0].provider,
              providerMessageId: current.rows[0].provider_message_id,
              payload,
            },
            nextRead === true,
          );
        }
        const result = await client.query(
          `UPDATE tenant_outreach_job
         SET is_read = COALESCE($2, is_read),
             payload = $3::jsonb,
             updated_at = now()
         WHERE id = $1 AND channel = 'Email'
         RETURNING *`,
          [
            id,
            Object.prototype.hasOwnProperty.call(dto, 'isRead')
              ? dto.isRead === true
              : null,
            JSON.stringify(payload),
          ],
        );
        return this.mapMail(result.rows[0]);
      },
    );
  }
  async delete(tenant: SaasTenant, id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Mail item id is required.');
    }
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `DELETE FROM tenant_outreach_job
           WHERE id = $1 AND channel = 'Email'
           RETURNING id`,
          [id],
        );
        if (!result.rowCount) {
          throw new NotFoundException('Tenant mail item was not found.');
        }
        return {
          id: Number(result.rows[0].id),
          deleted: true,
          providerMessageDeleted: false,
        };
      },
    );
  }

  async convertToLead(tenant: SaasTenant, mailInboxId: number) {
    if (!Number.isInteger(mailInboxId) || mailInboxId <= 0) {
      throw new BadRequestException('Mail item id is required.');
    }
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const mail = await client.query(
            `SELECT id, lead_id, recipient_name, recipient_email, body, title, payload
           FROM tenant_outreach_job
           WHERE id = $1 AND channel = 'Email'`,
            [mailInboxId],
          );
          if (!mail.rowCount)
            throw new NotFoundException('Tenant mail item was not found.');
          const item = mail.rows[0];
          let lead =
            Number(item.lead_id) > 0
              ? await client.query(
                  `SELECT id, full_name, email, phone, status, payload,
                      created_at, updated_at
               FROM tenant_lead WHERE id = $1`,
                  [Number(item.lead_id)],
                )
              : await client.query(
                  `SELECT id, full_name, email, phone, status, payload,
                      created_at, updated_at
               FROM tenant_lead WHERE LOWER(email) = LOWER($1) LIMIT 1`,
                  [item.recipient_email],
                );
          if (!lead.rowCount) {
            const name =
              `${item.recipient_name || item.recipient_email?.split('@')[0] || 'Email lead'}`.trim();
            lead = await client.query(
              `INSERT INTO tenant_lead(full_name, email, phone, status, payload)
             VALUES ($1, NULLIF($2, ''), NULL, 'new', $3::jsonb)
             RETURNING id, full_name, email, phone, status, payload,
                       created_at, updated_at`,
              [
                name,
                `${item.recipient_email ?? ''}`.trim().toLowerCase(),
                JSON.stringify({
                  source: 'Mail Inbox',
                  stage: 'New',
                  priority: 'Warm',
                  summary: item.body ?? '',
                  interest: item.title ?? '',
                  notes: [item.body ?? ''].filter(Boolean),
                  lastActivityAt: new Date().toISOString(),
                }),
              ],
            );
          }
          const leadRow = lead.rows[0];
          const payload =
            item.payload && typeof item.payload === 'object'
              ? item.payload
              : {};
          payload.mailStatus = 'Converted';
          await client.query(
            `UPDATE tenant_outreach_job
           SET lead_id = $2, payload = $3::jsonb, updated_at = now()
           WHERE id = $1`,
            [mailInboxId, Number(leadRow.id), JSON.stringify(payload)],
          );
          await client.query('COMMIT');
          return this.mapLead(leadRow);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }
  private mapMail(row: any) {
    const payload =
      row.payload && typeof row.payload === 'object' ? row.payload : {};
    const incoming = row.direction === 'Incoming' || row.status === 'received';
    const internalStatus = `${row.status ?? 'scheduled'}`.toLowerCase();
    const status =
      payload.mailStatus ||
      (incoming ? 'New' : internalStatus === 'sent' ? 'Replied' : 'New');
    return {
      id: Number(row.id),
      email: row.recipient_email ?? '',
      name: row.lead_name ?? row.recipient_name ?? '',
      subject: row.title ?? '',
      message: row.body ?? '',
      htmlBody: payload.htmlBody ?? '',
      kind: 'Direct',
      status,
      mailboxTag: payload.mailbox ?? '',
      leadId: Number(row.lead_id) || null,
      extractedLead: payload.extractedLead ?? {},
      extractionMethod: incoming ? 'Tenant mailbox sync' : 'Outgoing',
      extractionConfidence: Number(payload.extractionConfidence) || 0,
      leadCollectionTemplateId: payload.leadCollectionTemplateId ?? null,
      leadCollectionTemplateName: payload.leadCollectionTemplateName ?? '',
      aiFallbackUsed: payload.aiFallbackUsed === true,
      isRead: row.is_read === true,
      isStarred: payload.isStarred === true,
      extractionDetails: {
        ...(payload.extractionDetails ?? {}),
        queueStatus: internalStatus,
        provider: row.provider ?? '',
        providerMessageId: row.provider_message_id ?? '',
        attemptCount: Number(row.attempt_count) || 0,
        maxAttempts: Number(row.max_attempts) || 0,
        lastError: row.last_error ?? '',
      },
      occurredAt: row.occurred_at ?? row.occurredAt ?? row.created_at ?? row.createdAt,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  private mapLead(row: any) {
    const payload =
      row.payload && typeof row.payload === 'object' ? row.payload : {};
    return {
      ...payload,
      id: Number(row.id),
      name: row.full_name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      summary: payload.summary ?? '',
      property: payload.property ?? '',
      propertyId: payload.propertyId ?? null,
      budget: payload.budget ?? '',
      stage: payload.stage ?? this.titleCase(row.status || 'new'),
      priority: payload.priority ?? 'Warm',
      agent: payload.agent ?? '',
      agentId: payload.agentId ?? null,
      source: payload.source ?? 'Mail Inbox',
      interest: payload.interest ?? '',
      timeline: payload.timeline ?? '',
      inBoard: payload.inBoard === true,
      nextActionDate: payload.nextActionDate ?? null,
      nextActionType: payload.nextActionType ?? 'Review inbox lead',
      followUpStatus: payload.followUpStatus ?? 'Open',
      isFollowUpOverdue: false,
      notes: Array.isArray(payload.notes) ? payload.notes : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: payload.lastActivityAt ?? row.updated_at,
    };
  }
  private async findLeadByEmail(tenant: SaasTenant, email: string) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `SELECT id, full_name AS "fullName", email
         FROM tenant_lead WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email],
        );
        return result.rows[0] ?? null;
      },
    );
  }

  private internalStatuses(value: string) {
    const status = `${value ?? ''}`.trim().toLowerCase();
    if (status === 'new') return ['received'];
    if (status === 'replied') return ['sent'];
    if (status === 'converted') return ['received'];
    if (status === 'failed') return ['failed', 'dead_letter', 'cancelled'];
    return [status];
  }

  private boolean(value: unknown) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return null;
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

  private commaList(value: unknown) {
    if (Array.isArray(value)) return this.stringList(value);
    return [
      ...new Set(
        `${value ?? ''}`
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  private htmlToText(value: string) {
    return `${value ?? ''}`
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|table|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();
  }

  private titleCase(value: string) {
    return value ? value[0].toUpperCase() + value.slice(1) : value;
  }

  private int(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new Error('Tenant database is not ready.');
    return tenant.databaseName;
  }
}
