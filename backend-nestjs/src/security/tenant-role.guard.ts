import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_ROLES_KEY } from './tenant-roles.decorator';
import { TenantUserRole } from './tenant-user-role.enum';

@Injectable()
export class TenantRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<TenantUserRole[]>(TENANT_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user?.tenantRole || !required.includes(user.tenantRole)) {
      throw new ForbiddenException('Tenant role does not permit this action');
    }
    return true;
  }
}
