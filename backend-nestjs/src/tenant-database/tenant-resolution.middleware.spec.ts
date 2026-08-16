import { TenantResolutionMiddleware } from './tenant-resolution.middleware';

describe('TenantResolutionMiddleware', () => {
  it('binds the resolved tenant database to request context', async () => {
    const tenant = { id: 1, databaseName: 'tenant_1_blue', businessName: 'Blue' } as any;
    const resolver: any = {
      normalizeHostname: jest.fn(() => 'blue.example.com'),
      isMainDomain: jest.fn(() => false),
      resolveHostname: jest.fn(async () => tenant),
    };
    const context: any = { run: jest.fn((_ctx: any, callback: any) => callback()) };
    const databases: any = { healthCheck: jest.fn(async () => true) };
    const middleware = new TenantResolutionMiddleware(resolver, context, databases);
    const req: any = { headers: { 'x-tenant-host': 'blue.example.com' }, path: '/tenant-public/site' };
    const next = jest.fn();

    await middleware.use(req, {} as any, next);

    expect(req.tenant).toBe(tenant);
    expect(databases.healthCheck).toHaveBeenCalledWith('tenant_1_blue');
    expect(context.run).toHaveBeenCalledWith({ tenantId: 1, databaseName: 'tenant_1_blue' }, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves the main domain outside tenant context', async () => {
    const resolver: any = { normalizeHostname: jest.fn(() => 'example.com'), isMainDomain: jest.fn(() => true) };
    const context: any = { run: jest.fn() };
    const databases: any = { healthCheck: jest.fn() };
    const middleware = new TenantResolutionMiddleware(resolver, context, databases);
    const next = jest.fn();

    await middleware.use({ headers: { 'x-tenant-host': 'example.com' }, path: '/' } as any, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(context.run).not.toHaveBeenCalled();
  });

  it('rejects Super Admin routes and unhealthy tenant databases on tenant hosts', async () => {
    const tenant = { id: 1, databaseName: 'tenant_1_blue' } as any;
    const resolver: any = {
      normalizeHostname: jest.fn(() => 'blue.example.com'),
      isMainDomain: jest.fn(() => false),
      resolveHostname: jest.fn(async () => tenant),
    };
    const context: any = { run: jest.fn() };
    const databases: any = { healthCheck: jest.fn(async () => true) };
    const middleware = new TenantResolutionMiddleware(resolver, context, databases);

    await expect(middleware.use({ headers: { 'x-tenant-host': 'blue.example.com' }, path: '/super-admin-management/plans' } as any, {} as any, jest.fn())).rejects.toThrow('Super Admin routes');

    databases.healthCheck.mockResolvedValue(false);
    await expect(middleware.use({ headers: { 'x-tenant-host': 'blue.example.com' }, path: '/tenant-public/site' } as any, {} as any, jest.fn())).rejects.toThrow('database is unavailable');
  });
});
