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

function execution(user: any, tenant: any = readyTenant) {
  const request: any = { user, tenant };
  return { request, context: { switchToHttp: () => ({ getRequest: () => request }) } as any };
}

describe('AuthenticatedTenantGuard', () => {
  it('resolves the signed-in user tenant and verifies its exact database', async () => {
    const tenants: any = { findOne: jest.fn(async ({ where }: any) => where.id === 7 ? readyTenant : null) };
    const databases: any = { healthCheck: jest.fn(async () => true) };
    const context: any = { enter: jest.fn() };
    const guard = new AuthenticatedTenantGuard(tenants, context, databases);
    const request = execution({ userId: 42, tenantId: 7 });

    await expect(guard.canActivate(request.context)).resolves.toBe(true);
    expect(request.request.tenant).toBe(readyTenant);
    expect(databases.healthCheck).toHaveBeenCalledWith('tenant_7_blue');
  });

  it('rejects accounts without an explicit tenantId link', async () => {
    const tenants: any = { findOne: jest.fn() };
    const guard = new AuthenticatedTenantGuard(tenants, { enter: jest.fn() } as any, { healthCheck: jest.fn(async () => true) } as any);
    await expect(guard.canActivate(execution({ userId: 42, tenantId: null }).context)).rejects.toThrow('not linked to a tenant');
    expect(tenants.findOne).not.toHaveBeenCalled();
  });

  it('rejects blocked, expired, inactive, missing, and unavailable tenants with clear messages', async () => {
    const cases = [
      [{ ...readyTenant, isBlocked: true }, 'blocked'],
      [{ ...readyTenant, subscriptionExpiresAt: new Date(Date.now() - 1000) }, 'expired'],
      [{ ...readyTenant, isActive: false }, 'inactive'],
    ] as const;
    for (const [tenant, message] of cases) {
      const guard = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => tenant) } as any, { enter: jest.fn() } as any, { healthCheck: jest.fn(async () => true) } as any);
      await expect(guard.canActivate(execution({ userId: 42, tenantId: 7 }).context)).rejects.toThrow(message);
    }
    const missing = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => null) } as any, { enter: jest.fn() } as any, { healthCheck: jest.fn() } as any);
    await expect(missing.canActivate(execution({ userId: 42, tenantId: 7 }).context)).rejects.toThrow('not found');
    const noHost = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => readyTenant) } as any, { enter: jest.fn() } as any, { healthCheck: jest.fn(async () => true) } as any);
    await expect(noHost.canActivate(execution({ userId: 42, tenantId: 7 }, null).context)).rejects.toThrow('subdomain is required');
    const unavailable = new AuthenticatedTenantGuard({ findOne: jest.fn(async () => readyTenant) } as any, { enter: jest.fn() } as any, { healthCheck: jest.fn(async () => false) } as any);
    await expect(unavailable.canActivate(execution({ userId: 42, tenantId: 7 }).context)).rejects.toThrow('temporarily unavailable');
  });
});
