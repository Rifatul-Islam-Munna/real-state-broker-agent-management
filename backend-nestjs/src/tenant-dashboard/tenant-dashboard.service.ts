import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizePlainText } from '../security/input-sanitizer';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';

const RESERVED = new Set(['www','admin','super-admin','api','app','mail','support','billing','login','register','status','docs','blog','dev','test','staging','localhost']);

@Injectable()
export class TenantDashboardService {
  constructor(
    private readonly databases: TenantDatabaseService,
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
  ) {}

  context(tenant: SaasTenant) {
    const expired = !!tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt.getTime() <= Date.now();
    return {
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        dashboardPermissions: tenant.dashboardPermissions,
        subscriptionStartsAt: tenant.subscriptionStartsAt,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        subscriptionStatus: tenant.isBlocked ? 'blocked' : expired ? 'expired' : tenant.isActive ? 'active' : 'inactive',
        plan: tenant.plan ? { id: tenant.plan.id, name: tenant.plan.name, billingDays: tenant.plan.billingDays } : null,
      },
    };
  }

  async overview(tenant: SaasTenant) {
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      const properties = await client.query("SELECT COUNT(*)::int AS count FROM tenant_property");
      const published = await client.query("SELECT COUNT(*)::int AS count FROM tenant_property WHERE status = 'published'");
      const leads = await client.query("SELECT COUNT(*)::int AS count FROM tenant_lead");
      const recent = await client.query("SELECT id, action, summary, created_at FROM tenant_audit_log ORDER BY created_at DESC LIMIT 8");
      return { ...this.context(tenant), metrics: { properties: properties.rows[0]?.count ?? 0, publishedProperties: published.rows[0]?.count ?? 0, leads: leads.rows[0]?.count ?? 0 }, recentActivity: recent.rows };
    });
  }

  async profile(tenant: SaasTenant) {
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      const result = await client.query("SELECT key, value FROM tenant_setting WHERE key IN ('tenant_identity','branding','public_homepage')");
      const map = Object.fromEntries(result.rows.map((row: any) => [row.key, row.value]));
      return { businessName: tenant.businessName, subdomain: tenant.subdomain, identity: map.tenant_identity ?? {}, branding: map.branding ?? {}, homepage: map.public_homepage ?? {} };
    });
  }

  async updateProfile(tenant: SaasTenant, dto: any) {
    const businessName = sanitizePlainText(dto.businessName ?? tenant.businessName, 'Business name', 160, { required: true });
    const tagline = sanitizePlainText(dto.tagline, 'Tagline', 180);
    const phone = sanitizePlainText(dto.phone, 'Phone', 40);
    const email = sanitizePlainText(dto.email, 'Email', 160);
    const address = sanitizePlainText(dto.address, 'Address', 300);
    const headline = sanitizePlainText(dto.headline, 'Homepage headline', 240);
    const description = sanitizePlainText(dto.description, 'Homepage description', 1200);

    tenant.businessName = businessName;
    await this.tenants.save(tenant);
    await this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(`INSERT INTO tenant_setting(key,value) VALUES
          ('tenant_identity',$1::jsonb),('branding',$2::jsonb),('public_homepage',$3::jsonb)
          ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [
          JSON.stringify({ tenantId: tenant.id, businessName }),
          JSON.stringify({ tagline }),
          JSON.stringify({ phone, email, address, headline, description }),
        ]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    });
    return this.profile(tenant);
  }

  async updateSubdomain(tenant: SaasTenant, raw: unknown) {
    const subdomain = sanitizePlainText(raw, 'Subdomain', 63, { required: true }).toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) throw new BadRequestException('Subdomain must contain lowercase letters, numbers, and hyphens');
    if (RESERVED.has(subdomain)) throw new BadRequestException('This subdomain is reserved');
    const conflict = await this.tenants.findOne({ where: { subdomain } });
    if (conflict && conflict.id !== tenant.id) throw new BadRequestException('Subdomain already exists');
    tenant.subdomain = subdomain;
    await this.tenants.save(tenant);
    return { subdomain };
  }

  async listProperties(tenant: SaasTenant) {
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => (await client.query('SELECT id,title,status,payload,created_at,updated_at FROM tenant_property ORDER BY created_at DESC')).rows);
  }

  async createProperty(tenant: SaasTenant, dto: any, userId: number) {
    const title = sanitizePlainText(dto.title, 'Property title', 240, { required: true });
    const status = ['draft','published','archived'].includes(dto.status) ? dto.status : 'draft';
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      const result = await client.query('INSERT INTO tenant_property(title,status,payload) VALUES ($1,$2,$3::jsonb) RETURNING *', [title, status, JSON.stringify(dto.payload ?? {})]);
      await client.query('INSERT INTO tenant_audit_log(action,actor_master_user_id,summary,metadata) VALUES ($1,$2,$3,$4::jsonb)', ['property.create', userId, `Created property ${title}`, JSON.stringify({ propertyId: result.rows[0].id })]);
      return result.rows[0];
    });
  }

  async listLeads(tenant: SaasTenant) {
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => (await client.query('SELECT id,full_name,email,phone,status,payload,created_at,updated_at FROM tenant_lead ORDER BY created_at DESC')).rows);
  }

  async createLead(tenant: SaasTenant, dto: any, userId: number) {
    const fullName = sanitizePlainText(dto.fullName, 'Lead name', 200, { required: true });
    const email = sanitizePlainText(dto.email, 'Lead email', 160);
    const phone = sanitizePlainText(dto.phone, 'Lead phone', 80);
    return this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      const result = await client.query('INSERT INTO tenant_lead(full_name,email,phone,status,payload) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *', [fullName, email || null, phone || null, 'new', JSON.stringify(dto.payload ?? {})]);
      await client.query('INSERT INTO tenant_audit_log(action,actor_master_user_id,summary,metadata) VALUES ($1,$2,$3,$4::jsonb)', ['lead.create', userId, `Created lead ${fullName}`, JSON.stringify({ leadId: result.rows[0].id })]);
      return result.rows[0];
    });
  }
}
