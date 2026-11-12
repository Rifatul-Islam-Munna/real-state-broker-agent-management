import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PoolClient } from 'pg';
import { Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { sanitizePlainText } from '../security/input-sanitizer';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantOutreachService } from './tenant-outreach.service';

type ReportChannel = 'Email' | 'SMS';
export type ReportOwner = { name: string; email: string; phone: string };

type SavedReport = {
  id: number;
  propertyId: number | null;
  managedPropertyId: number | null;
  propertyTitle: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  owners: ReportOwner[];
  subject: string;
  body?: string;
  channels: ReportChannel[];
  deliveryResults: Array<Record<string, unknown>>;
  deliveryStatus: string;
  sentByName: string;
  sentAt: string;
};

function clean(value: unknown, maxLength: number): string {
  return sanitizePlainText(value, 'Owner report', maxLength);
}

function channelsFrom(value: unknown): ReportChannel[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const result = values.map((value) => String(value).toLowerCase());
  return [
    ...(result.includes('email') ? ['Email' as const] : []),
    ...(result.includes('sms') ? ['SMS' as const] : []),
  ];
}

export function normalizeOwnerRecipients(
  raw: unknown,
  channels: ReportChannel[],
): ReportOwner[] {
  if (!Array.isArray(raw) || !raw.length || raw.length > 5) {
    throw new BadRequestException('Choose between one and five owners.');
  }

  return raw.map((item, index) => {
    const value = item && typeof item === 'object' ? item : {};
    const entry = value as Record<string, unknown>;
    const name = clean(entry.name ?? entry.ownerName ?? '', 200);
    const email = clean(entry.email ?? entry.ownerEmail ?? '', 240).toLowerCase();
    const phone = clean(entry.phone ?? entry.ownerPhone ?? '', 80);
    const number = phone.replace(/\D/g, '');

    if (channels.includes('Email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Owner ${index + 1} needs a valid email address.`);
    }
    if (channels.includes('SMS') && (number.length < 7 || number.length > 15)) {
      throw new BadRequestException(`Owner ${index + 1} needs a valid phone number.`);
    }
    return { name, email, phone };
  });
}

function reportPropertyKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

@Injectable()
export class TenantOwnerReportService {
  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly outreach: TenantOutreachService,
    @InjectRepository(Property)
    private readonly masterProperties: Repository<Property>,
  ) {}

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) {
      throw new BadRequestException('Tenant database is not ready.');
    }
    return tenant.databaseName;
  }

  // Report property options include the actual properties created in /dashboard/properties.
  // Managed properties have a negative UI id so they never collide with tenant property IDs.
  async listReportProperties(tenant: SaasTenant) {
    const [legacy, managed] = await Promise.all([
      this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
        const result = await client.query(
          'SELECT id, title, status, payload, created_at, updated_at FROM tenant_property ORDER BY updated_at DESC',
        );
        return result.rows;
      }),
      this.masterProperties.createQueryBuilder('property')
        .leftJoin('property.agent', 'assignedAgent')
        .select([
          'property.id', 'property.title', 'property.exactLocation',
          'property.status', 'property.ownerName', 'property.ownerEmail',
          'property.ownerPhone', 'property.owners', 'property.createdAt',
          'property.updatedAt',
        ])
        .where('(property.tenantId = :tenantId OR (property.tenantId IS NULL AND assignedAgent.tenantId = :tenantId))', {
          tenantId: tenant.id,
        })
        .orderBy('property.updatedAt', 'DESC')
        .getMany(),
    ]);

    const managedRows = managed.map((property) => ({
      id: -property.id,
      managedPropertyId: property.id,
      title: property.exactLocation?.trim() || property.title,
      status: String(property.status),
      payload: {
        ownerName: property.ownerName,
        ownerEmail: property.ownerEmail,
        ownerPhone: property.ownerPhone,
        owners: this.propertyOwners(property),
      },
      created_at: property.createdAt,
      updated_at: property.updatedAt,
    }));

    const managedNames = new Set(
      managed.flatMap((property) =>
        [property.title, property.exactLocation].map(reportPropertyKey).filter(Boolean),
      ),
    );
    return [
      ...managedRows,
      ...legacy.filter((property) => !managedNames.has(reportPropertyKey(property.title))),
    ];
  }

  private propertyOwners(property: Pick<Property, 'ownerName' | 'ownerEmail' | 'ownerPhone' | 'owners'>): ReportOwner[] {
    const primary: ReportOwner = {
      name: property.ownerName ?? '',
      email: property.ownerEmail ?? '',
      phone: property.ownerPhone ?? '',
    };
    const additional = Array.isArray(property.owners)
      ? property.owners.slice(1, 5).map((item) => ({
          name: item.name ?? '',
          email: item.email ?? '',
          phone: item.phone ?? '',
        }))
      : [];
    return [primary, ...additional].filter((owner) => owner.name || owner.email || owner.phone);
  }

  async listOwnerReports(tenant: SaasTenant): Promise<SavedReport[]> {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `SELECT r.id, r.property_id AS "propertyId",
                r.managed_property_id AS "managedPropertyId",
                r.property_title AS "propertyTitle",
                r.owner_name AS "ownerName",
                r.owner_email AS "ownerEmail",
                r.owner_phone AS "ownerPhone",
                r.owners, r.subject, r.channels,
                r.delivery_results AS "deliveryResults",
                r.delivery_status AS "deliveryStatus",
                r.sent_by_name AS "sentByName", r.sent_at AS "sentAt"
         FROM tenant_owner_report r
         ORDER BY r.sent_at DESC, r.id DESC`,
      );
      return this.withLiveDeliveryResults(client, result.rows);
    });
  }

  async ownerReport(tenant: SaasTenant, reportId: number): Promise<SavedReport> {
    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      throw new NotFoundException('Owner report not found.');
    }
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `SELECT r.id, r.property_id AS "propertyId",
                r.managed_property_id AS "managedPropertyId",
                r.property_title AS "propertyTitle",
                r.owner_name AS "ownerName",
                r.owner_email AS "ownerEmail",
                r.owner_phone AS "ownerPhone",
                r.owners, r.subject, r.body, r.channels,
                r.delivery_results AS "deliveryResults",
                r.delivery_status AS "deliveryStatus",
                r.sent_by_name AS "sentByName", r.sent_at AS "sentAt"
         FROM tenant_owner_report r
         WHERE r.id = $1`,
        [reportId],
      );
      if (!result.rowCount) throw new NotFoundException('Owner report not found.');
      const [report] = await this.withLiveDeliveryResults(client, result.rows);
      return report;
    });
  }

  private async withLiveDeliveryResults(client: PoolClient, reports: SavedReport[]) {
    // pg returns BIGSERIAL report IDs as strings unless explicitly parsed.
    // Return numeric IDs to Next.js so client actions receive the correct type.
    const normalizedReports = reports.map((report) => ({
      ...report,
      id: Number(report.id),
    }));
    if (!normalizedReports.length) return normalizedReports;
    const result = await client.query(
      `SELECT id, source_id AS "sourceId", channel, status,
              recipient_name AS "ownerName",
              recipient_email AS "recipientEmail",
              recipient_phone AS "recipientPhone",
              last_error AS "lastError", provider_message_id AS "providerMessageId",
              provider
       FROM tenant_outreach_job
       WHERE source_type = 'owner-report' AND source_id = ANY($1::text[])
       ORDER BY id`,
      [reports.map((report) => String(report.id))],
    );
    const byReport = new Map<string, typeof result.rows>();
    for (const job of result.rows) {
      const key = String(job.sourceId);
      const list = byReport.get(key) ?? [];
      list.push(job);
      byReport.set(key, list);
    }

    return normalizedReports.map((report) => {
      const jobs = byReport.get(String(report.id)) ?? [];
      if (!jobs.length) return report;
      const allSent = jobs.every((job) => job.status === 'sent');
      const hasSent = jobs.some((job) => job.status === 'sent');
      const allFailed = jobs.every((job) =>
        ['failed', 'dead_letter', 'cancelled'].includes(job.status),
      );
      return {
        ...report,
        deliveryStatus: allSent
          ? 'sent'
          : allFailed ? 'failed' : hasSent ? 'partial' : 'scheduled',
        deliveryResults: jobs.map((job) => ({
          jobId: job.id,
          channel: job.channel,
          status: job.status,
          ownerName: job.ownerName,
          recipientEmail: job.recipientEmail,
          recipientPhone: job.recipientPhone,
          providerMessageId: job.providerMessageId,
          provider: job.provider,
          message: job.lastError ||
            (job.status === 'sent' ? 'Accepted by provider.' :
              job.status === 'retrying' ? 'Retry queued.' :
              job.status === 'processing' ? 'Processing delivery.' :
              'Queued in the tenant delivery database.'),
        })),
      };
    });
  }

  async deleteOwnerReport(tenant: SaasTenant, reportId: number, user: any) {
    if (!Number.isSafeInteger(reportId) || reportId <= 0) {
      throw new NotFoundException('Owner report not found.');
    }

    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query('BEGIN');
      try {
        const report = await client.query<{ property_title: string }>(
          'SELECT property_title FROM tenant_owner_report WHERE id = $1 FOR UPDATE',
          [reportId],
        );
        if (!report.rows[0]) {
          throw new NotFoundException('Owner report not found.');
        }

        // Lock the jobs as well as the report: a worker cannot claim one
        // between our processing-status check and cancellation.
        const jobs = await client.query<{ status: string }>(
          `SELECT status FROM tenant_outreach_job
           WHERE source_type = 'owner-report' AND source_id = $1
           ORDER BY id FOR UPDATE`,
          [String(reportId)],
        );
        if (jobs.rows.some((job) => job.status === 'processing')) {
          throw new ConflictException(
            'A report message is being delivered. Try deleting again when delivery finishes.',
          );
        }

        const cancelled = await client.query(
          `UPDATE tenant_outreach_job
           SET status = 'cancelled',
               last_error = 'Cancelled because the owner report was deleted.',
               completed_at = now(), locked_at = NULL, locked_by = NULL,
               updated_at = now()
           WHERE source_type = 'owner-report' AND source_id = $1
             AND status IN ('scheduled', 'retrying', 'paused')`,
          [String(reportId)],
        );
        await client.query('DELETE FROM tenant_owner_report WHERE id = $1', [reportId]);
        await client.query(
          `INSERT INTO tenant_audit_log(action, actor_master_user_id, summary, metadata)
           VALUES ('owner-report.deleted', $1, $2, $3::jsonb)`,
          [
            Number(user?.id ?? user?.sub) || null,
            `Owner report #${reportId} deleted`,
            JSON.stringify({
              reportId,
              propertyTitle: report.rows[0].property_title,
              cancelledMessages: cancelled.rowCount ?? 0,
            }),
          ],
        );
        await client.query('COMMIT');
        return { deleted: true, id: reportId, cancelledMessages: cancelled.rowCount ?? 0 };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async sendOwnerReport(tenant: SaasTenant, dto: any, user: any) {
    const channels = channelsFrom(dto?.channels);
    if (!channels.length) {
      throw new BadRequestException('Choose Email, SMS, or both.');
    }

    const managedPropertyId = Number(dto?.managedPropertyId);
    const isManaged = Number.isSafeInteger(managedPropertyId) && managedPropertyId > 0;
    let propertyId: number | null = null;
    let propertyTitle = '';
    let payload: Record<string, any> = {};

    if (isManaged) {
      const property = await this.masterProperties.createQueryBuilder('property')
        .leftJoin('property.agent', 'assignedAgent')
        .where('property.id = :managedPropertyId', { managedPropertyId })
        .andWhere('(property.tenantId = :tenantId OR (property.tenantId IS NULL AND assignedAgent.tenantId = :tenantId))', {
          tenantId: tenant.id,
        })
        .getOne();
      if (!property) throw new NotFoundException('Managed property was not found.');
      propertyTitle = property.exactLocation?.trim() || property.title;
      payload = {
        ownerName: property.ownerName,
        ownerEmail: property.ownerEmail,
        ownerPhone: property.ownerPhone,
        owners: this.propertyOwners(property),
      };
    } else {
      propertyId = Number(dto?.propertyId);
      if (!Number.isSafeInteger(propertyId) || propertyId <= 0) {
        throw new BadRequestException('Select a property.');
      }
      const property = await this.databases.withTenantClient(
        this.databaseName(tenant),
        async (client) => {
          const result = await client.query<{
            title: string;
            payload: Record<string, any>;
          }>(
            'SELECT title, payload FROM tenant_property WHERE id = $1',
            [propertyId],
          );
          return result.rows[0] ?? null;
        },
      );
      if (!property) throw new NotFoundException('Property was not found.');
      propertyTitle = property.title;
      payload = property.payload && typeof property.payload === 'object'
        ? property.payload : {};
    }

    const legacyOwner: ReportOwner = {
      name: clean(dto?.ownerName ?? payload.ownerName ?? payload.owner_name ?? '', 200),
      email: clean(dto?.ownerEmail ?? payload.ownerEmail ?? payload.owner_email ?? '', 240),
      phone: clean(dto?.ownerPhone ?? payload.ownerPhone ?? payload.owner_phone ?? '', 80),
    };
    const originalOwners = Array.isArray(dto?.owners)
      ? dto.owners
      : Array.isArray(payload.owners) && payload.owners.length
        ? payload.owners.map((item: ReportOwner, index: number) =>
            index === 0 ? legacyOwner : item)
        : [legacyOwner];
    const owners = normalizeOwnerRecipients(originalOwners, channels);
    const subject = clean(dto?.subject, 300);
    const body = clean(dto?.body, 20_000);
    if (!subject || !body) {
      throw new BadRequestException('Report subject and body are required.');
    }
    const sentByName = clean(user?.fullName ?? user?.email ?? 'Tenant user', 200);
    const sentById = Number(user?.id ?? user?.sub) || null;
    const primaryOwner = owners[0];

    const reportId = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const result = await client.query(
            `INSERT INTO tenant_owner_report (
              property_id, managed_property_id, property_title,
              owner_name, owner_email, owner_phone,
              subject, body, owners, channels,
              delivery_results, delivery_status, sent_by_master_user_id, sent_by_name
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9::jsonb, $10::jsonb,
              '[]'::jsonb, 'scheduled', $11, $12
            ) RETURNING id`,
            [
              propertyId, isManaged ? managedPropertyId : null, propertyTitle,
              primaryOwner.name, primaryOwner.email, primaryOwner.phone,
              subject, body, JSON.stringify(owners), JSON.stringify(channels),
              sentById, sentByName,
            ],
          );
          const id = Number(result.rows[0].id);
          const deliveryResults: Array<Record<string, unknown>> = [];
          const usedRecipients = new Set<string>();
          for (const [index, owner] of owners.entries()) {
            for (const channel of channels) {
              const key = channel === 'Email' ? owner.email.toLowerCase() : owner.phone.replace(/\D/g, '');
              const recipientKey = channel + ':' + key;
              if (usedRecipients.has(recipientKey)) continue;
              usedRecipients.add(recipientKey);
              const jobs = await this.outreach.enqueueWithClient(client, {
                sourceType: 'owner-report',
                sourceId: id,
                channels: [channel],
                recipientName: owner.name,
                recipientEmail: owner.email,
                recipientPhone: owner.phone,
                title: subject,
                body,
                createdBy: sentByName,
                scheduledAt: new Date(),
                idempotencyKey: `owner-report:${tenant.id}:${id}:${index}:${channel.toLowerCase()}`,
                payload: {
                  propertyId,
                  managedPropertyId: isManaged ? managedPropertyId : null,
                  propertyTitle,
                  ownerIndex: index,
                },
              });
              for (const job of jobs) {
                deliveryResults.push({
                  channel: job.channel, status: job.status,
                  message: job.last_error || 'Queued in the tenant delivery database.',
                  jobId: Number(job.id),
                  ownerName: owner.name,
                  recipientEmail: owner.email,
                  recipientPhone: owner.phone,
                });
              }
            }
          }

          await client.query(
            `UPDATE tenant_owner_report SET delivery_results = $2::jsonb WHERE id = $1`,
            [id, JSON.stringify(deliveryResults)],
          );
          await client.query(
            `INSERT INTO tenant_audit_log(action, actor_master_user_id, summary, metadata)
             VALUES ('owner-report.queued', $1, $2, $3::jsonb)`,
            [sentById, `Owner report for ${propertyTitle} queued for ${owners.length} owners`,
             JSON.stringify({ reportId: id, propertyId, managedPropertyId: isManaged ? managedPropertyId : null, channels, recipientCount: deliveryResults.length })],
          );
          await client.query('COMMIT');
          return id;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
    return this.ownerReport(tenant, reportId);
  }
}