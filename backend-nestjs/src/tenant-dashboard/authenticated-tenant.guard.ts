import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantContextService } from '../tenant-database/tenant-context.service';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';

@Injectable()
export class AuthenticatedTenantGuard implements CanActivate {
  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    private readonly context: TenantContextService,
    private readonly databases: TenantDatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) throw new ForbiddenException('Authentication is required');

    let tenant: SaasTenant | null = null;
    if (user.tenantId) tenant = await this.tenants.findOne({ where: { id: user.tenantId }, relations: ['plan'] });
    if (!tenant) tenant = await this.tenants.findOne({ where: { ownerUserId: user.userId }, relations: ['plan'] });
    if (!tenant) throw new NotFoundException('Tenant account was not found');
    if (tenant.isBlocked) throw new ForbiddenException('Your tenant account is blocked. Contact support.');
    if (!tenant.isActive || tenant.provisioningStatus !== 'ready' || tenant.databaseStatus !== 'ready' || !tenant.databaseName) {
      throw new ForbiddenException('Your tenant account is inactive or still provisioning.');
    }
    if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Your subscription has expired. Renew it to continue.');
    }
    if (request.tenant && request.tenant.id !== tenant.id) {
      throw new ForbiddenException('Authenticated tenant does not match requested tenant domain.');
    }
    if (!(await this.databases.healthCheck(tenant.databaseName))) {
      throw new ForbiddenException('Your tenant database is temporarily unavailable.');
    }

    request.tenant = tenant;
    this.context.enter({ tenantId: tenant.id, databaseName: tenant.databaseName });
    return true;
  }
}
