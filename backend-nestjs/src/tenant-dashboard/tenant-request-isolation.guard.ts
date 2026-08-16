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

    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.isBlocked || !tenant.isActive) {
      throw new ForbiddenException('This tenant workspace is not active.');
    }
    if (tenant.databaseStatus !== 'ready' || !tenant.databaseName) {
      throw new ServiceUnavailableException('The tenant database is not ready.');
    }

    const host = this.requestHost(request);
    if (!this.hostMatchesTenant(host, tenant)) {
      throw new ForbiddenException('The signed-in tenant does not match this subdomain.');
    }

    request.tenant = tenant;
    request.tenantDatabaseName = tenant.databaseName;
    return true;
  }

  private requestHost(request: any) {
    const raw =
      request.headers?.['x-tenant-host'] ??
      request.headers?.['x-forwarded-host'] ??
      request.headers?.host ??
      '';
    return `${Array.isArray(raw) ? raw[0] : raw}`
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, '');
  }

  private hostMatchesTenant(host: string, tenant: SaasTenant) {
    const subdomain = `${tenant.subdomain ?? ''}`.trim().toLowerCase();
    if (!host || !subdomain) return false;

    const tenantRecord = tenant as any;
    const customDomains = [
      tenantRecord.customDomain,
      tenantRecord.custom_domain,
      tenantRecord.domain,
    ]
      .map((value) => `${value ?? ''}`.trim().toLowerCase().replace(/:\d+$/, ''))
      .filter(Boolean);

    if (customDomains.includes(host)) return true;
    if (host === subdomain || host.startsWith(`${subdomain}.`)) return true;

    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && ['localhost', '127.0.0.1'].includes(host)) return true;

    return false;
  }
}
