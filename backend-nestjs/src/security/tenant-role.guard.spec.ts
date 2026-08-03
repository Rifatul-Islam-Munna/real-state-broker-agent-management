import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantRoleGuard } from './tenant-role.guard';
import { TenantUserRole } from './tenant-user-role.enum';

describe('TenantRoleGuard', () => {
  function context(user: any) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }

  it('allows owners on owner routes and blocks staff', () => {
    const reflector = { getAllAndOverride: jest.fn(() => [TenantUserRole.Owner]) } as unknown as Reflector;
    const guard = new TenantRoleGuard(reflector);
    expect(guard.canActivate(context({ tenantRole: TenantUserRole.Owner }))).toBe(true);
    expect(() => guard.canActivate(context({ tenantRole: TenantUserRole.Staff }))).toThrow(ForbiddenException);
  });

  it('supports staff-accessible routes when explicitly configured', () => {
    const reflector = { getAllAndOverride: jest.fn(() => [TenantUserRole.Owner, TenantUserRole.Staff]) } as unknown as Reflector;
    const guard = new TenantRoleGuard(reflector);
    expect(guard.canActivate(context({ tenantRole: TenantUserRole.Staff }))).toBe(true);
  });
});
