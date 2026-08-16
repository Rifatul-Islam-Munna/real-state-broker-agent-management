import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { SaasTenant } from './entities/saas-tenant.entity';

@Injectable()
export class TenantAccountService {
  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  async context(user: { userId: number; tenantId?: number | null; tenantRole?: TenantUserRole | null }) {
    const tenantId = Number(user.tenantId);
    if (!Number.isInteger(tenantId) || tenantId < 1) {
      throw new ForbiddenException('This account is not linked to a tenant workspace.');
    }

    const tenant = await this.tenants.findOne({ where: { id: tenantId }, relations: ['plan'] });
    if (!tenant) throw new NotFoundException('Tenant workspace was not found.');
    if (user.tenantRole === TenantUserRole.Owner && tenant.ownerUserId !== user.userId) {
      throw new ForbiddenException('Tenant owner link is invalid.');
    }

    const expired = !tenant.subscriptionExpiresAt || tenant.subscriptionExpiresAt.getTime() <= Date.now();
    return {
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        isActive: tenant.isActive,
        isBlocked: tenant.isBlocked,
        provisioningStatus: tenant.provisioningStatus,
        databaseStatus: tenant.databaseStatus,
        dashboardPermissions: tenant.dashboardPermissions ?? [],
        subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        subscriptionStatus: tenant.isBlocked ? 'blocked' : expired ? 'expired' : tenant.isActive ? 'active' : 'inactive',
        plan: tenant.plan ? { id: tenant.plan.id, name: tenant.plan.name, price: tenant.plan.price, billingDays: tenant.plan.billingDays } : null,
      },
      tenantRole: user.tenantRole ?? null,
      mainPortalUrl: this.platformDomain.getMainFrontendUrl('/account'),
      workspaceUrl: this.platformDomain.getTenantFrontendUrl(tenant.subdomain, '/dashboard'),
      publicSiteUrl: this.platformDomain.getTenantFrontendUrl(tenant.subdomain, '/'),
    };
  }
}
