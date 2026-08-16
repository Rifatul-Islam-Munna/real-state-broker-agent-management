import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantResolutionService } from './tenant-resolution.service';

declare global {
  namespace Express {
    interface Request {
      tenant?: Awaited<ReturnType<TenantResolutionService['resolveAssignedSubdomain']>>;
    }
  }
}

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(
    private readonly resolver: TenantResolutionService,
    private readonly context: TenantContextService,
    private readonly databases: TenantDatabaseService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const explicitTenantHost = `${req.headers['x-tenant-host'] ?? ''}`.trim();
    // Server-to-server/control-plane calls reach Nest through the backend's own
    // Easypanel hostname. That hostname is infrastructure, not a tenant/custom domain.
    // Tenant-aware frontend requests explicitly forward X-Tenant-Host.
    if (!explicitTenantHost) return next();

    const hostname = this.resolver.normalizeHostname(explicitTenantHost);
    if (this.resolver.isMainDomain(hostname)) return next();

    const tenant = await this.resolver.resolveHostname(hostname);
    if (!tenant) return next();
    if (req.path.startsWith('/super-admin-management') || req.path.startsWith('/auth/super-admin')) {
      throw new ForbiddenException('Super Admin routes are not available on tenant domains');
    }
    const healthy = await this.databases.healthCheck(tenant.databaseName);
    if (!healthy) throw new ForbiddenException('Tenant database is unavailable');

    req.tenant = tenant;
    return this.context.run({ tenantId: tenant.id, databaseName: tenant.databaseName }, next);
  }
}
