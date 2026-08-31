import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { sanitizePlainText } from '../security/input-sanitizer';
import { TenantChatbotService } from '../tenant-chatbot/tenant-chatbot.service';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'api',
  'app',
  'mail',
  'support',
  'help',
  'billing',
  'status',
  'static',
  'cdn',
  'dashboard',
  'super-admin',
]);

@Injectable()
export class TenantDashboardService {
  private readonly logger = new Logger(TenantDashboardService.name);

  constructor(
    private readonly databases: TenantDatabaseService,
    @InjectRepository(SaasTenant)
    private readonly tenantRepo: Repository<SaasTenant>,
    private readonly chatbot: TenantChatbotService,
  ) {}

  async leadHistory(tenant: SaasTenant, leadId: number) {
    if (!leadId) return [];
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const [jobs, legacy] = await Promise.all([
          client.query(
            `SELECT j.*, l.full_name AS lead_name
           FROM tenant_outreach_job j
           LEFT JOIN tenant_lead l ON l.id = j.lead_id
           WHERE j.lead_id = $1
           ORDER BY COALESCE(j.occurred_at, j.scheduled_at, j.created_at) DESC, j.id DESC`,
            [leadId],
          ),
          client.query(
            `SELECT id, payload, created_at, updated_at
           FROM tenant_legacy_resource
           WHERE resource = 'lead-history'
             AND payload->>'leadId' = $1
           ORDER BY created_at DESC`,
            [String(leadId)],
          ),
        ]);
        const entries = [
          ...legacy.rows.map((row: any) => ({
            ...(row.payload ?? {}),
            id: Number(row.id),
            leadId,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
          ...jobs.rows.map((row: any) => ({
            id: -Number(row.id),
            leadId,
            kind:
              row.channel === 'SMS'
                ? 'Sms'
                : row.channel === 'Email'
                  ? 'Email'
                  : 'System',
            direction:
              row.direction === 'Incoming' || row.status === 'received'
                ? 'Incoming'
                : 'Outgoing',
            status:
              row.status === 'sent'
                ? 'Sent'
                : row.status === 'received'
                  ? 'Received'
                  : row.status === 'failed'
                    ? 'Failed'
                    : 'Scheduled',
            title: row.title || `${row.channel ?? 'Message'} activity`,
            summary: row.last_error || row.body || row.title || 'Lead activity',
            body: row.body || '',
            provider: row.provider || row.channel || 'Workspace',
            createdBy: row.created_by || 'Workspace',
            scheduledAt: row.scheduled_at,
            occurredAt: row.occurred_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        ];
        return entries.sort(
          (left: any, right: any) =>
            Number(
              new Date(
                right.occurredAt ?? right.scheduledAt ?? right.createdAt,
              ),
            ) -
            Number(
              new Date(left.occurredAt ?? left.scheduledAt ?? left.createdAt),
            ),
        );
      },
    );
  }

  async propertyChats(tenant: SaasTenant, query: any) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `SELECT id, resource, payload, created_at, updated_at
         FROM tenant_legacy_resource
         WHERE resource IN ('contact-requests', 'property-chats')
         ORDER BY created_at DESC`,
        );
        const search = `${query?.search ?? ''}`.trim().toLowerCase();
        const status = `${query?.status ?? ''}`.trim().toLowerCase();
        const items = result.rows
          .map((row: any) => {
            const payload = row.payload ?? {};
            const rawStatus = `${payload.status ?? 'New'}`;
            const normalizedStatus =
              row.resource === 'contact-requests'
                ? rawStatus === 'Converted'
                  ? 'LeadCreated'
                  : rawStatus === 'Reviewing'
                    ? 'NeedsReview'
                    : 'New'
                : rawStatus;
            return {
              id: Number(row.id),
              propertyId: Number(payload.propertyId) || 0,
              propertyTitle: payload.propertyTitle ?? '',
              assignedAgent: payload.agentName ?? '',
              contactName: payload.name ?? payload.contactName ?? '',
              contactEmail: payload.email ?? payload.contactEmail ?? '',
              contactPhone: payload.phone ?? payload.contactPhone ?? '',
              budget: payload.budget ?? '',
              timeline: payload.timeline ?? '',
              interest: payload.interest ?? '',
              summary: payload.message ?? payload.summary ?? '',
              qualificationScore: Number(payload.qualificationScore) || 0,
              autoQualified: Boolean(payload.leadId),
              status: normalizedStatus,
              leadId: Number(payload.leadId) || null,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              messages: [
                {
                  id: Number(row.id),
                  senderRole: 'Visitor',
                  message: payload.message ?? payload.summary ?? '',
                  createdAt: row.created_at,
                },
              ],
            };
          })
          .filter(
            (item: any) => !status || item.status.toLowerCase() === status,
          )
          .filter(
            (item: any) =>
              !search || JSON.stringify(item).toLowerCase().includes(search),
          );
        const page = Math.max(1, Number(query?.page) || 1);
        const pageSize = Math.min(
          100,
          Math.max(1, Number(query?.pageSize) || 20),
        );
        return {
          items: items.slice((page - 1) * pageSize, page * pageSize),
          totalCount: items.length,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
          hasNextPage: page * pageSize < items.length,
          hasPreviousPage: page > 1,
        };
      },
    );
  }

  context(tenant: SaasTenant) {
    return {
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        dashboardPermissions: tenant.dashboardPermissions,
        subscriptionStatus: this.subscriptionStatus(tenant),
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        isActive: tenant.isActive,
        isBlocked: tenant.isBlocked,
        plan: tenant.plan
          ? {
              id: tenant.plan.id,
              name: tenant.plan.name,
              billingDays: tenant.plan.billingDays,
            }
          : null,
      },
    };
  }

  async overview(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const properties = await client.query(
          `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'published')::int AS published
         FROM tenant_property`,
        );
        const leads = await client.query(
          'SELECT COUNT(*)::int AS total FROM tenant_lead',
        );
        const reports = await client.query(
          'SELECT COUNT(*)::int AS total FROM tenant_owner_report',
        );
        const requests = await client.query(
          `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'submitted')::int AS pending
         FROM tenant_showing_request`,
        );
        const showings = await client.query(
          `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE showing_at >= now() AND status = 'scheduled')::int AS upcoming
         FROM tenant_showing`,
        );
        const activity = await client.query(
          'SELECT id, action, summary, created_at FROM tenant_audit_log ORDER BY created_at DESC LIMIT 10',
        );
        return {
          ...this.context(tenant),
          metrics: {
            properties: properties.rows[0]?.total ?? 0,
            publishedProperties: properties.rows[0]?.published ?? 0,
            leads: leads.rows[0]?.total ?? 0,
            ownerReports: reports.rows[0]?.total ?? 0,
            showingRequests: requests.rows[0]?.total ?? 0,
            pendingShowingRequests: requests.rows[0]?.pending ?? 0,
            showings: showings.rows[0]?.total ?? 0,
            upcomingShowings: showings.rows[0]?.upcoming ?? 0,
          },
          recentActivity: activity.rows,
        };
      },
    );
  }

  async listProperties(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          'SELECT id, title, status, payload, created_at, updated_at FROM tenant_property ORDER BY updated_at DESC',
        );
        return result.rows;
      },
    );
  }

  async createProperty(tenant: SaasTenant, dto: any, actorUserId: number) {
    const title = this.clean(dto.title, 240);
    const status = this.propertyStatus(dto.status);
    if (!title) throw new BadRequestException('Property title is required');
    const property = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const payload =
          dto?.payload &&
          typeof dto.payload === 'object' &&
          !Array.isArray(dto.payload)
            ? dto.payload
            : {};
        const result = await client.query(
          `INSERT INTO tenant_property(title, status, payload)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id, title, status, payload, created_at, updated_at`,
          [title, status, JSON.stringify(payload)],
        );
        await this.audit(
          client,
          'property.created',
          actorUserId,
          `Created property ${title}`,
          { propertyId: result.rows[0].id, status },
        );
        return result.rows[0];
      },
    );
    await this.reindexPropertyKnowledge(tenant, Number(property.id));
    return property;
  }

  async reindexPropertyKnowledge(tenant: SaasTenant, propertyId: number) {
    try {
      return await this.chatbot.reindexProperty(tenant, propertyId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Property ${propertyId} chatbot reindex failed: ${message}`,
      );
      return { propertyId, indexed: 0, failed: true };
    }
  }

  async updatePropertyStatus(
    tenant: SaasTenant,
    propertyId: number,
    statusInput: unknown,
    actorUserId: number,
  ) {
    const status = this.propertyStatus(statusInput);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `UPDATE tenant_property
         SET status = $2, updated_at = now()
         WHERE id = $1
         RETURNING id, title, status, payload, created_at, updated_at`,
          [propertyId, status],
        );
        if (!result.rowCount) throw new NotFoundException('Property not found');
        await this.audit(
          client,
          'property.status.updated',
          actorUserId,
          `${result.rows[0].title} marked ${status}`,
          { propertyId, status },
        );
        return result.rows[0];
      },
    );
  }

  async listLeads(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(this.leadSelectSql());
        return result.rows;
      },
    );
  }

  async createLead(tenant: SaasTenant, dto: any, actorUserId: number) {
    const fullName = this.clean(dto.fullName, 200);
    const email = this.clean(dto.email, 160).toLowerCase();
    const phone = this.clean(dto.phone, 80);
    const phoneDigits = phone.replace(/\D/g, '');
    const propertyIds = this.idList(dto.propertyIds);
    if (!fullName) throw new BadRequestException('Lead name is required');

    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          await this.assertPublishedProperties(client, propertyIds);
          const existing = await client.query(
            `SELECT id
           FROM tenant_lead
           WHERE ($1 <> '' AND LOWER(COALESCE(email, '')) = LOWER($1))
              OR ($2 <> '' AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $2)
           ORDER BY id
           LIMIT 1`,
            [email, phoneDigits],
          );

          let leadId: number;
          let action: string;
          if (existing.rowCount) {
            leadId = Number(existing.rows[0].id);
            await client.query(
              `UPDATE tenant_lead
             SET full_name = $2,
                 email = COALESCE(NULLIF($3, ''), email),
                 phone = COALESCE(NULLIF($4, ''), phone),
                 updated_at = now()
             WHERE id = $1`,
              [leadId, fullName, email, phone],
            );
            action = 'lead.properties.merged';
          } else {
            const inserted = await client.query(
              `INSERT INTO tenant_lead(full_name, email, phone, status, payload)
             VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), 'new', '{}'::jsonb)
             RETURNING id`,
              [fullName, email, phone],
            );
            leadId = Number(inserted.rows[0].id);
            action = 'lead.created';
          }

          for (const propertyId of propertyIds) {
            await client.query(
              `INSERT INTO tenant_lead_property(lead_id, property_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
              [leadId, propertyId],
            );
          }

          await this.audit(
            client,
            action,
            actorUserId,
            existing.rowCount
              ? `Updated the existing lead ${fullName} instead of creating a duplicate`
              : `Created lead ${fullName}`,
            { leadId, propertyIds },
          );
          const lead = await this.leadById(client, leadId);
          await client.query('COMMIT');
          return lead;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  async updateLeadProperties(
    tenant: SaasTenant,
    leadId: number,
    rawPropertyIds: unknown,
    actorUserId: number,
  ) {
    const propertyIds = this.idList(rawPropertyIds);
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const lead = await client.query(
            'SELECT id, full_name FROM tenant_lead WHERE id = $1',
            [leadId],
          );
          if (!lead.rowCount) throw new NotFoundException('Lead not found');
          await this.assertPublishedProperties(client, propertyIds);
          await client.query(
            'DELETE FROM tenant_lead_property WHERE lead_id = $1',
            [leadId],
          );
          for (const propertyId of propertyIds) {
            await client.query(
              'INSERT INTO tenant_lead_property(lead_id, property_id) VALUES ($1, $2)',
              [leadId, propertyId],
            );
          }
          await this.audit(
            client,
            'lead.properties.updated',
            actorUserId,
            `Updated property interests for ${lead.rows[0].full_name}`,
            { leadId, propertyIds },
          );
          const updated = await this.leadById(client, leadId);
          await client.query('COMMIT');
          return updated;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  async getSettings(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const settings = await client.query(
          `SELECT key, value
         FROM tenant_setting
         WHERE key IN ('tenant_identity', 'branding', 'public_homepage', 'contact_form', 'google_tag_manager')`,
        );
        const map = Object.fromEntries(
          settings.rows.map((row: any) => [row.key, row.value]),
        );
        return {
          identity: map.tenant_identity ?? {
            tenantId: tenant.id,
            businessName: tenant.businessName,
          },
          branding: map.branding ?? {},
          homepage: map.public_homepage ?? {},
          contactForm: map.contact_form ?? { enabled: true },
          gtm: map.google_tag_manager ?? { containerId: '', enabled: false },
          subdomain: tenant.subdomain,
        };
      },
    );
  }

  async updateProfile(tenant: SaasTenant, dto: any) {
    const businessName = this.clean(dto.businessName, 160);
    if (!businessName)
      throw new BadRequestException('Business name is required');
    const duplicate = await this.tenantRepo.findOne({
      where: { businessName, id: Not(tenant.id) },
    });
    if (duplicate)
      throw new BadRequestException('Business name already exists');

    const branding = {
      primaryColor: this.clean(dto.primaryColor, 20),
      logoUrl: this.clean(dto.logoUrl, 500),
      tagline: this.clean(dto.tagline, 240),
    };
    const homepage = {
      headline: this.clean(dto.headline, 240),
      description: this.clean(dto.description, 2000),
      phone: this.clean(dto.phone, 80),
      email: this.clean(dto.email, 160).toLowerCase(),
      address: this.clean(dto.address, 500),
    };
    const contactForm = { enabled: dto.contactFormEnabled !== false };

    await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const upsert = async (key: string, value: unknown) =>
            client.query(
              `INSERT INTO tenant_setting(key, value) VALUES ($1, $2::jsonb)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
              [key, JSON.stringify(value)],
            );
          await upsert('tenant_identity', {
            tenantId: tenant.id,
            businessName,
          });
          await upsert('branding', branding);
          await upsert('public_homepage', homepage);
          await upsert('contact_form', contactForm);
          await this.audit(
            client,
            'tenant.profile.updated',
            tenant.ownerUserId,
            'Updated tenant business profile',
            null,
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );

    tenant.businessName = businessName;
    await this.tenantRepo.save(tenant);
    return this.getSettings(tenant);
  }

  async updateTracking(tenant: SaasTenant, dto: any) {
    const enabled = Boolean(dto.enabled);
    const containerId = this.clean(dto.containerId, 32).toUpperCase();
    if (enabled && !/^GTM-[A-Z0-9]{5,20}$/.test(containerId)) {
      throw new BadRequestException(
        'Enter a valid Google Tag Manager container ID such as GTM-XXXXXXX',
      );
    }
    const value = { enabled, containerId: enabled ? containerId : '' };
    await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query(
          `INSERT INTO tenant_setting(key, value) VALUES ('google_tag_manager', $1::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [JSON.stringify(value)],
        );
        await this.audit(
          client,
          'tenant.gtm.updated',
          tenant.ownerUserId,
          enabled
            ? 'Enabled tenant Google Tag Manager'
            : 'Disabled tenant Google Tag Manager',
          { containerId: value.containerId },
        );
      },
    );
    return value;
  }

  async updateSubdomain(tenant: SaasTenant, requested: string) {
    const subdomain = this.normalizeSubdomain(requested);
    if (RESERVED_SUBDOMAINS.has(subdomain)) {
      throw new BadRequestException('This subdomain is reserved');
    }
    const duplicate = await this.tenantRepo.findOne({
      where: { subdomain, id: Not(tenant.id) },
    });
    if (duplicate) throw new BadRequestException('Subdomain already exists');
    tenant.subdomain = subdomain;
    await this.tenantRepo.save(tenant);
    return { subdomain };
  }

  private leadSelectSql(where = '') {
    return `
      SELECT l.id,
             l.full_name,
             l.email,
             l.phone,
             l.status,
             l.payload,
             l.created_at,
             l.updated_at,
             COALESCE(
               jsonb_agg(
                 jsonb_build_object(
                   'id', p.id,
                   'title', p.title,
                   'status', p.status
                 )
                 ORDER BY p.title
               ) FILTER (WHERE p.id IS NOT NULL),
               '[]'::jsonb
             ) AS properties
      FROM tenant_lead l
      LEFT JOIN tenant_lead_property lp ON lp.lead_id = l.id
      LEFT JOIN tenant_property p ON p.id = lp.property_id
      ${where}
      GROUP BY l.id, l.full_name, l.email, l.phone, l.status, l.payload, l.created_at, l.updated_at
      ORDER BY l.updated_at DESC`;
  }

  private async leadById(client: any, leadId: number) {
    const result = await client.query(this.leadSelectSql('WHERE l.id = $1'), [
      leadId,
    ]);
    if (!result.rowCount) throw new NotFoundException('Lead not found');
    return result.rows[0];
  }

  private async assertPublishedProperties(client: any, propertyIds: number[]) {
    if (!propertyIds.length) return [];
    const result = await client.query(
      'SELECT id, title, status FROM tenant_property WHERE id = ANY($1::bigint[])',
      [propertyIds],
    );
    const publishedIds = new Set(
      result.rows
        .filter((item: any) => item.status === 'published')
        .map((item: any) => Number(item.id)),
    );
    const invalid = propertyIds.filter((id) => !publishedIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        'Only published properties can collect or be linked to new leads.',
      );
    }
    return result.rows;
  }

  private propertyStatus(value: unknown) {
    const status = this.clean(value, 60).toLowerCase();
    return ['draft', 'published', 'archived'].includes(status)
      ? status
      : 'draft';
  }

  private idList(value: unknown) {
    const source = Array.isArray(value) ? value : value == null ? [] : [value];
    return [
      ...new Set(
        source.map(Number).filter((id) => Number.isInteger(id) && id > 0),
      ),
    ].slice(0, 100);
  }

  private normalizeSubdomain(value: string) {
    const clean = this.clean(value, 63)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(clean)) {
      throw new BadRequestException(
        'Subdomain must contain 3-63 lowercase letters, numbers, or hyphens',
      );
    }
    return clean;
  }

  private clean(value: unknown, maxLength: number, field = 'Value') {
    return sanitizePlainText(value, field, maxLength);
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) {
      throw new BadRequestException('Tenant database is not ready');
    }
    return tenant.databaseName;
  }

  private subscriptionStatus(tenant: SaasTenant) {
    if (tenant.isBlocked) return 'blocked';
    if (!tenant.isActive) return 'inactive';
    if (
      tenant.subscriptionExpiresAt &&
      tenant.subscriptionExpiresAt.getTime() <= Date.now()
    )
      return 'expired';
    return 'active';
  }
  private async audit(
    client: any,
    action: string,
    actorUserId: number | null,
    summary: string,
    metadata: unknown,
  ) {
    await client.query(
      `INSERT INTO tenant_audit_log(action, actor_master_user_id, summary, metadata)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        action,
        actorUserId || null,
        summary,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  }
}
