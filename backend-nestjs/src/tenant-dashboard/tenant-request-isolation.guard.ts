import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';

@Injectable()
export class TenantRequestIsolationGuard implements CanActivate {
  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const tenantId = Number(request.user?.tenantId);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new ForbiddenException('A tenant account is required for this endpoint.');
    }

    const resolvedTenant = request.tenant;
    if (!resolvedTenant || Number(resolvedTenant.id) !== tenantId) {
      throw new ForbiddenException('The signed-in tenant does not match this subdomain.');
    }

    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.isBlocked || !tenant.isActive) {
      throw new ForbiddenException('This tenant workspace is not active.');
    }
    if (tenant.databaseStatus !== 'ready' || !tenant.databaseName) {
      throw new ServiceUnavailableException('The tenant database is not ready.');
    }
    if (`${resolvedTenant.databaseName ?? ''}` !== tenant.databaseName) {
      throw new ForbiddenException('The requested tenant database does not match this account.');
    }

    request.tenant = tenant;
    request.tenantDatabaseName = tenant.databaseName;
    return true;
  }

}
