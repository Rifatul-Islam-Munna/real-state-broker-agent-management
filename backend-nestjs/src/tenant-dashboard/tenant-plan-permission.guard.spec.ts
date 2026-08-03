import { Reflector } from '@nestjs/core';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';

function context(permissions: string[]) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ tenant: { dashboardPermissions: permissions } }) }),
  } as any;
}

describe('TenantPlanPermissionGuard', () => {
  it('allows a module included in the tenant plan and blocks missing modules', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['property-management-dashboard']) } as unknown as Reflector;
    const guard = new TenantPlanPermissionGuard(reflector);
    expect(guard.canActivate(context(['property-management-dashboard']))).toBe(true);
    expect(() => guard.canActivate(context(['normal-dashboard']))).toThrow('does not include');
  });

  it('allows either dashboard permission for shared overview routes', () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['normal-dashboard', 'property-management-dashboard']) } as unknown as Reflector;
    const guard = new TenantPlanPermissionGuard(reflector);
    expect(guard.canActivate(context(['normal-dashboard']))).toBe(true);
    expect(guard.canActivate(context(['property-management-dashboard']))).toBe(true);
  });
});
