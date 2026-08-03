import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasTenantDomain } from '../saas-admin/entities/saas-tenant-domain.entity';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';

export type ResolvedTenant = {
  id: number;
  businessName: string;
  slug: string;
  subdomain: string;
  databaseName: string;
  dashboardPermissions: string[];
  subscriptionExpiresAt: Date | null;
};

@Injectable()
export class TenantResolutionService {
  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    @InjectRepository(SaasTenantDomain) private readonly domains: Repository<SaasTenantDomain>,
  ) {}

  getPrimaryDomain() {
    return `${process.env.PRIMARY_DOMAIN ?? 'localhost'}`.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
  }

  normalizeHostname(value: string | undefined) {
    return `${value ?? ''}`.trim().toLowerCase().split(',')[0].trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\.$/, '');
  }

  extractSubdomain(hostname: string) {
    const host = this.normalizeHostname(hostname);
    const primary = this.getPrimaryDomain();
    if (!host || host === primary || host === `www.${primary}` || host === '127.0.0.1') return null;
    if (primary === 'localhost') {
      if (!host.endsWith('.localhost')) return null;
      const subdomain = host.slice(0, -'.localhost'.length);
      return subdomain && !subdomain.includes('.') ? subdomain : null;
    }
    if (!host.endsWith(`.${primary}`)) return null;
    const subdomain = host.slice(0, -(primary.length + 1));
    return subdomain && !subdomain.includes('.') ? subdomain : null;
  }

  isMainDomain(hostname: string) {
    const host = this.normalizeHostname(hostname);
    const primary = this.getPrimaryDomain();
    return host === primary || host === `www.${primary}` || host === '127.0.0.1';
  }

  async resolveAssignedSubdomain(hostname: string): Promise<ResolvedTenant | null> {
    const subdomain = this.extractSubdomain(hostname);
    if (!subdomain) return null;
    const tenant = await this.tenants.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Unknown tenant subdomain');
    return this.validateTenant(tenant);
  }

  async resolveHostname(hostname: string): Promise<ResolvedTenant | null> {
    if (this.isMainDomain(hostname)) return null;
    if (this.extractSubdomain(hostname)) return this.resolveAssignedSubdomain(hostname);

    const host = this.normalizeHostname(hostname);
    const domain = await this.domains.findOne({ where: { hostname: host, type: 'custom', status: 'verified' } });
    if (!domain) throw new NotFoundException('Unknown custom domain');
    const tenant = await this.tenants.findOne({ where: { id: domain.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.validateTenant(tenant);
  }

  private validateTenant(tenant: SaasTenant): ResolvedTenant {
    if (tenant.isBlocked) throw new ForbiddenException('Tenant is blocked');
    if (!tenant.isActive || tenant.provisioningStatus !== 'ready' || tenant.databaseStatus !== 'ready' || !tenant.databaseName) {
      throw new ForbiddenException('Tenant is inactive or unavailable');
    }
    if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Tenant subscription has expired');
    }
    return {
      id: tenant.id,
      businessName: tenant.businessName,
      slug: tenant.slug,
      subdomain: tenant.subdomain,
      databaseName: tenant.databaseName,
      dashboardPermissions: tenant.dashboardPermissions,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt,
    };
  }
}
