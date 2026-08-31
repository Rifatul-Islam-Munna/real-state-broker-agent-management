import { TenantDashboardService } from './tenant-dashboard.service';

function setup(databaseName = 'tenant_7_blue') {
  const tenant: any = {
    id: 7,
    businessName: 'Blue Realty',
    slug: 'blue-realty',
    subdomain: 'blue',
    databaseName,
    dashboardPermissions: ['property-management-dashboard'],
    isActive: true,
    isBlocked: false,
    subscriptionExpiresAt: new Date(Date.now() + 86400000),
    plan: { id: 2, name: 'Pro', billingDays: 30 },
  };
  const client: any = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_property ORDER BY updated_at DESC')) {
        return { rows: [{ id: 1, title: 'Blue Home', status: 'published' }] };
      }
      if (sql.includes('SELECT key, value')) {
        return {
          rows: [
            { key: 'branding', value: { tagline: 'Trusted' } },
            { key: 'public_homepage', value: { phone: '123' } },
          ],
        };
      }
      return { rows: [], rowCount: 0 };
    }),
  };
  const databases: any = {
    withTenantClient: jest.fn(async (name: string, callback: any) =>
      callback(client),
    ),
  };
  const tenants: any = {
    findOne: jest.fn(async () => null),
    save: jest.fn(async (value: any) => value),
  };
  const chatbot: any = {
    reindexProperty: jest.fn(async () => ({ propertyId: 1, indexed: 1 })),
  };
  return {
    service: new (TenantDashboardService as any)(databases, tenants, chatbot),
    tenant,
    client,
    databases,
    tenants,
    chatbot,
  };
}

describe('TenantDashboardService', () => {
  it('returns tenant context without exposing database credentials or database name', () => {
    const state = setup();
    const result: any = state.service.context(state.tenant);
    expect(result.tenant).toMatchObject({
      id: 7,
      businessName: 'Blue Realty',
      subdomain: 'blue',
    });
    expect(result.tenant).not.toHaveProperty('databaseName');
  });

  it('reads properties from only the resolved tenant database', async () => {
    const state = setup('tenant_7_blue');
    await expect(state.service.listProperties(state.tenant)).resolves.toEqual([
      { id: 1, title: 'Blue Home', status: 'published' },
    ]);
    expect(state.databases.withTenantClient).toHaveBeenCalledWith(
      'tenant_7_blue',
      expect.any(Function),
    );
  });

  it('automatically reindexes a newly saved property for chatbot knowledge', async () => {
    const state = setup();
    state.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO tenant_property')) {
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: { lockboxCode: '8472' },
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await state.service.createProperty(
      state.tenant,
      {
        title: 'Oak Home',
        status: 'published',
        payload: { lockboxCode: '8472' },
      },
      10,
    );

    expect(state.chatbot.reindexProperty).toHaveBeenCalledWith(state.tenant, 9);
  });
  it('rejects new lead links to inactive properties and rolls back', async () => {
    const state = setup();
    state.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, title, status FROM tenant_property')) {
        return {
          rows: [{ id: 1, title: 'Inactive Home', status: 'draft' }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(
      state.service.createLead(
        state.tenant,
        {
          fullName: 'Buyer One',
          email: 'buyer@example.com',
          phone: '01700000000',
          propertyIds: [1],
        },
        10,
      ),
    ).rejects.toThrow('Only published properties');
    expect(state.client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('merges matching contact details into one lead with multiple property links', async () => {
    const state = setup();
    state.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, title, status FROM tenant_property')) {
        return {
          rows: [{ id: 2, title: 'Second Home', status: 'published' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM tenant_lead') && sql.includes('regexp_replace')) {
        return { rows: [{ id: 5 }], rowCount: 1 };
      }
      if (sql.includes('WHERE l.id = $1')) {
        return {
          rows: [
            {
              id: 5,
              full_name: 'Buyer One',
              email: 'buyer@example.com',
              phone: '01700000000',
              status: 'new',
              properties: [
                { id: 2, title: 'Second Home', status: 'published' },
              ],
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    const lead = await state.service.createLead(
      state.tenant,
      {
        fullName: 'Buyer One',
        email: 'buyer@example.com',
        phone: '01700000000',
        propertyIds: [2],
      },
      10,
    );

    expect(lead.id).toBe(5);
    expect(state.client.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_lead_property'),
      [5, 2],
    );
    expect(
      state.client.query.mock.calls.some(([sql]: [string]) =>
        sql.includes('INSERT INTO tenant_lead(full_name'),
      ),
    ).toBe(false);
    expect(state.client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('updates business profile in the master tenant and its own tenant database', async () => {
    const state = setup();
    await state.service.updateProfile(state.tenant, {
      businessName: 'Blue Horizon',
      tagline: 'Local experts',
      phone: '123',
      email: 'team@example.com',
      address: 'Dhaka',
      headline: 'Find a home',
      description: 'Trusted service',
    });
    expect(state.tenants.save).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Blue Horizon' }),
    );
    expect(state.databases.withTenantClient).toHaveBeenCalledWith(
      'tenant_7_blue',
      expect.any(Function),
    );
    expect(state.client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('allows a unique subdomain and rejects reserved or cross-tenant names', async () => {
    const state = setup();
    await expect(
      state.service.updateSubdomain(state.tenant, 'blue-new'),
    ).resolves.toEqual({ subdomain: 'blue-new' });
    await expect(
      state.service.updateSubdomain(state.tenant, 'admin'),
    ).rejects.toThrow('reserved');
    state.tenants.findOne.mockResolvedValue({ id: 99, subdomain: 'taken' });
    await expect(
      state.service.updateSubdomain(state.tenant, 'taken'),
    ).rejects.toThrow('already exists');
  });
});
