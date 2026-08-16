import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { Repository } from 'typeorm';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { SaasTenantDomain } from './entities/saas-tenant-domain.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';

@Injectable()
export class TenantDomainService {
  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    @InjectRepository(SaasTenantDomain) private readonly domains: Repository<SaasTenantDomain>,
    @InjectRepository(SaasAdminAuditLog) private readonly audits: Repository<SaasAdminAuditLog>,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  async getForOwner(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    const custom = await this.domains.findOne({ where: { tenantId: tenant.id, type: 'custom' } });
    return {
      tenant: { id: tenant.id, businessName: tenant.businessName, subdomain: tenant.subdomain },
      customDomain: custom,
      instructions: custom ? this.instructions(custom, tenant.subdomain) : null,
    };
  }

  async addOrReplace(userId: number, rawHostname: string) {
    const tenant = await this.requireOwnedTenant(userId);
    const hostname = this.normalizeHostname(rawHostname);
    this.validateHostname(hostname);

    const primary = this.primaryDomain();
    if (hostname === primary || hostname.endsWith(`.${primary}`)) {
      throw new BadRequestException('Use the assigned tenant subdomain for the primary SaaS domain');
    }

    const conflict = await this.domains.findOne({ where: { hostname } });
    if (conflict && conflict.tenantId !== tenant.id) throw new BadRequestException('Custom domain is already assigned to another tenant');

    const existing = await this.domains.findOne({ where: { tenantId: tenant.id, type: 'custom' } });
    const token = `estateblue-${randomBytes(24).toString('hex')}`;
    const domain = existing ?? this.domains.create({ tenantId: tenant.id, type: 'custom' });
    domain.hostname = hostname;
    domain.status = 'pending';
    domain.verificationToken = token;
    domain.verifiedAt = null;
    domain.lastCheckedAt = null;
    const saved = await this.domains.save(domain);
    await this.audit(tenant.id, userId, existing ? 'domain.replace' : 'domain.add', `${existing ? 'Replaced' : 'Added'} custom domain ${hostname}`, { hostname });
    return { customDomain: saved, instructions: this.instructions(saved, tenant.subdomain) };
  }

  async verify(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    const domain = await this.domains.findOne({ where: { tenantId: tenant.id, type: 'custom' } });
    if (!domain) throw new NotFoundException('Custom domain not found');
    if (!domain.verificationToken) throw new BadRequestException('Verification token is missing');

    domain.lastCheckedAt = new Date();
    const recordName = `_estateblue-verification.${domain.hostname}`;
    let records: string[][];
    try {
      records = await dns.resolveTxt(recordName);
    } catch {
      await this.domains.save(domain);
      throw new BadRequestException('DNS verification record was not found');
    }
    const values = records.map((parts) => parts.join(''));
    if (!values.includes(domain.verificationToken)) {
      await this.domains.save(domain);
      throw new BadRequestException('DNS verification token does not match');
    }

    domain.status = 'verified';
    domain.verifiedAt = new Date();
    const saved = await this.domains.save(domain);
    await this.audit(tenant.id, userId, 'domain.verify', `Verified custom domain ${domain.hostname}`, { hostname: domain.hostname });
    return { customDomain: saved, instructions: this.instructions(saved, tenant.subdomain) };
  }

  async remove(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    const domain = await this.domains.findOne({ where: { tenantId: tenant.id, type: 'custom' } });
    if (!domain) return { message: 'No custom domain configured' };
    await this.domains.remove(domain);
    await this.audit(tenant.id, userId, 'domain.remove', `Removed custom domain ${domain.hostname}`, { hostname: domain.hostname });
    return { message: 'Custom domain removed successfully' };
  }

  async resolveVerifiedHostname(rawHostname: string) {
    const hostname = this.normalizeHostname(rawHostname);
    const domain = await this.domains.findOne({ where: { hostname, type: 'custom', status: 'verified' } });
    if (!domain) return null;
    const tenant = await this.tenants.findOne({ where: { id: domain.tenantId } });
    if (!tenant || tenant.isBlocked || !tenant.isActive || tenant.provisioningStatus !== 'ready' || tenant.databaseStatus !== 'ready' || !tenant.databaseName) return null;
    if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt.getTime() <= Date.now()) return null;
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

  private async requireOwnedTenant(userId: number) {
    const tenant = await this.tenants.findOne({ where: { ownerUserId: userId } });
    if (!tenant) throw new ForbiddenException('Only a tenant owner can manage custom domains');
    return tenant;
  }

  private normalizeHostname(value: string) {
    return `${value ?? ''}`.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  }

  private validateHostname(hostname: string) {
    if (!hostname || hostname.length > 253 || hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) throw new BadRequestException('Enter a valid custom domain');
    const labels = hostname.split('.');
    if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new BadRequestException('Enter a valid custom domain');
    }
  }

  private instructions(domain: SaasTenantDomain, subdomain: string) {
    const primary = this.primaryDomain();
    return {
      verification: { type: 'TXT', name: `_estateblue-verification.${domain.hostname}`, value: domain.verificationToken },
      routing: { type: 'CNAME', name: domain.hostname, value: `${subdomain}.${primary}` },
      note: 'DNS changes can take time to propagate. Verify after both records are published.',
    };
  }

  private primaryDomain() {
    return this.platformDomain.getPrimaryDomain();
  }

  private async audit(tenantId: number, actorUserId: number, action: string, summary: string, metadata: Record<string, unknown>) {
    await this.audits.save(this.audits.create({ action, entityType: 'tenant-domain', entityId: tenantId, actorUserId, summary, metadata }));
  }
}
