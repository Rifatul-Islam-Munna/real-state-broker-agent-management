import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_PLAN_PERMISSIONS_KEY } from './tenant-plan-permissions.decorator';

@Injectable()
export class TenantPlanPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(TENANT_PLAN_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const tenant = context.switchToHttp().getRequest().tenant;
    const granted = new Set<string>(tenant?.dashboardPermissions ?? []);
    if (!required.some((permission) => granted.has(permission))) {
      throw new ForbiddenException('Your subscription plan does not include this dashboard module.');
    }
    return true;
  }
}
