import { TenantDashboardService } from './tenant-dashboard.service';

function setup(databaseName = 'tenant_7_blue') {
  const tenant: any = { id: 7, businessName: 'Blue Realty', slug: 'blue-realty', subdomain: 'blue', databaseName, dashboardPermissions: ['property-management-dashboard'], isActive: true, isBlocked: false, subscriptionExpiresAt: new Date(Date.now() + 86400000), plan: { id: 2, name: 'Pro', billingDays: 30 } };
  const client: any = {
    query: jest.fn(async (sql: string) => {
      if (sql.startsWith('SELECT id,title')) return { rows: [{ id: 1, title: 'Blue Home', status: 'published' }] };
      if (sql.startsWith('SELECT key,value') || sql.startsWith('SELECT key, value')) return { rows: [{ key: 'branding', value: { tagline: 'Trusted' } }, { key: 'public_homepage', value: { phone: '123' } }] };
      return { rows: [] };
    }),
  };
  const databases: any = { withTenantClient: jest.fn(async (name: string, callback: any) => callback(client)) };
  const tenants: any = { findOne: jest.fn(async () => null), save: jest.fn(async (value: any) => value) };
  return { service: new TenantDashboardService(databases, tenants), tenant, client, databases, tenants };
}

describe('TenantDashboardService', () => {
  it('returns tenant context without exposing database credentials or database name', () => {
    const state = setup();
    const result: any = state.service.context(state.tenant);
    expect(result.tenant).toMatchObject({ id: 7, businessName: 'Blue Realty', subdomain: 'blue' });
    expect(result.tenant).not.toHaveProperty('databaseName');
  });

  it('reads properties from only the resolved tenant database', async () => {
    const state = setup('tenant_7_blue');
    await expect(state.service.listProperties(state.tenant)).resolves.toEqual([{ id: 1, title: 'Blue Home', status: 'published' }]);
    expect(state.databases.withTenantClient).toHaveBeenCalledWith('tenant_7_blue', expect.any(Function));
  });

  it('updates business profile in the master tenant and its own tenant database', async () => {
    const state = setup();
    await state.service.updateProfile(state.tenant, { businessName: 'Blue Horizon', tagline: 'Local experts', phone: '123', email: 'team@example.com', address: 'Dhaka', headline: 'Find a home', description: 'Trusted service' });
    expect(state.tenants.save).toHaveBeenCalledWith(expect.objectContaining({ businessName: 'Blue Horizon' }));
    expect(state.databases.withTenantClient).toHaveBeenCalledWith('tenant_7_blue', expect.any(Function));
    expect(state.client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('allows a unique subdomain and rejects reserved or cross-tenant names', async () => {
    const state = setup();
    await expect(state.service.updateSubdomain(state.tenant, 'blue-new')).resolves.toEqual({ subdomain: 'blue-new' });
    await expect(state.service.updateSubdomain(state.tenant, 'admin')).rejects.toThrow('reserved');
    state.tenants.findOne.mockResolvedValue({ id: 99, subdomain: 'taken' });
    await expect(state.service.updateSubdomain(state.tenant, 'taken')).rejects.toThrow('already exists');
  });
});
