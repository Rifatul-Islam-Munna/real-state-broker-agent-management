import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';

const readyTenant = {
  id: 7,
  ownerUserId: 42,
  databaseName: 'tenant_7_blue',
  databaseStatus: 'ready',
  provisioningStatus: 'ready',
  isActive: true,
  isBlocked: false,
  subscriptionExpiresAt: new Date(Date.now() + 86400000),
};

function execution(user: any) {
  const request: any = { user };
  return { request, context: { switchToHttp: () => ({ getRequest: () => request }) } as any };
}

describe('AuthenticatedTenantGuard', () => {
  it('resolves the signed-in user tenant and verifies its exact database', async () => {
    const tenants: any = { findOne: jest.fn(async ({ where }: any) => where.id === 7 ? readyTenant : null) };
    const databases: any = { healthCheck: jest.fn(async () => true) };
    const context: any = { run: jest.fn((_value: any, callback: any) => callback()) };
    const guard = new AuthenticatedTenantGuard(tenants, context, databases);
    const request = execution({ userId: 42, tenantId: 7 });

    await expect(guard.canActivate(request.context)).resolves.toBe(true);
    expect(request.request.tenant).toBe(readyTenant);
    expect(databases.healthCheck).toHaveBeenCalledWith('tenant_7_blue');
  });

  it('falls back to ownerUserId for existing tenants created before tenantId linkage', async () => {
    const tenants: any = { findOne: jest.fn(async ({ where }: any) => where.ownerUserId === 42 ? readyTenant : null) };
    const guard = new AuthenticatedTenantGuard(tenants, { run: jest.fn((_v: any, cb: any) => cb()) } as any, { healthCheck: jest.fn(async () => true) } as any);
    await expect(guard.canActivate(execution({ userId: 42, tenantId: null }).context)).resolves.toBe(true);
  });

  it('rejects blocked, expired, inactive, missing, and unavailable tenants with clear messages', async () => {
    const cases = [
      [{ ...readyTenant, isBlocked: true }, 'blocked'],
      [{ ...readyTenant, subscriptionExpiresAt: new Date(Date.now() - 1000) }, 'expired'],
      [{ ...readyTenant, isActive: false }, 'inactive'],
    ] as const;
    for (const [tenant, message] of cases) {
      const guard = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => tenant) } as any, { run: jest.fn() } as any, { healthCheck: jest.fn(async () => true) } as any);
      await expect(guard.canActivate(execution({ userId: 42, tenantId: 7 }).context)).rejects.toThrow(message);
    }
    const missing = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => null) } as any, { run: jest.fn() } as any, { healthCheck: jest.fn() } as any);
    await expect(missing.canActivate(execution({ userId: 42 }).context)).rejects.toThrow('not found');
    const unavailable = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => readyTenant) } as any, { run: jest.fn() } as any, { healthCheck: jest.fn(async () => false) } as any);
    await expect(unavailable.canActivate(execution({ userId: 42 }).context)).rejects.toThrow('temporarily unavailable');
  });
});
