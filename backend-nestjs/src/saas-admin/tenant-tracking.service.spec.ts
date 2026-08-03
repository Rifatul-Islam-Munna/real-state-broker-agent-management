import { TenantTrackingService } from './tenant-tracking.service';

function createService(options: { ownerUserId?: number; databaseName?: string; stored?: any } = {}) {
  const tenant = {
    id: 7,
    ownerUserId: options.ownerUserId ?? 42,
    businessName: 'Blue Realty',
    databaseName: options.databaseName ?? 'tenant_7_blue_realty',
    databaseStatus: 'ready',
  };
  const tenants: any = { findOne: jest.fn(async ({ where }: any) => where.ownerUserId === tenant.ownerUserId ? tenant : null) };
  const audits: any[] = [];
  const auditRepo: any = {
    create: jest.fn((value: any) => ({ ...value })),
    save: jest.fn(async (value: any) => { audits.push(value); return value; }),
  };
  let stored = options.stored ?? null;
  const client: any = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      if (sql.startsWith('SELECT value')) return { rows: stored ? [{ value: stored }] : [] };
      if (sql.startsWith('INSERT INTO tenant_setting')) {
        stored = JSON.parse(params![0]);
        return { rows: [] };
      }
      if (sql.startsWith('DELETE FROM tenant_setting')) {
        stored = null;
        return { rows: [] };
      }
      return { rows: [] };
    }),
  };
  const databases: any = {
    withTenantClient: jest.fn(async (databaseName: string, callback: any) => callback(client)),
  };
  return {
    service: new TenantTrackingService(tenants, auditRepo, databases),
    tenant,
    client,
    databases,
    audits,
    getStored: () => stored,
  };
}

describe('TenantTrackingService', () => {
  it('stores a validated GTM ID only in the owning tenant database', async () => {
    const state = createService();
    const result = await state.service.save(42, { containerId: 'gtm-abc1234', enabled: true });

    expect(result.gtm).toEqual({ containerId: 'GTM-ABC1234', enabled: true });
    expect(state.databases.withTenantClient).toHaveBeenCalledWith('tenant_7_blue_realty', expect.any(Function));
    expect(state.getStored()).toEqual({ containerId: 'GTM-ABC1234', enabled: true });
    expect(state.audits[0].action).toBe('tenant.gtm.save');
  });

  it('rejects arbitrary scripts, malformed IDs, and non-owner access', async () => {
    const state = createService();
    for (const value of ['<script>alert(1)</script>', 'G-ABC123', 'GTM-', 'GTM-ABC_123']) {
      await expect(state.service.save(42, { containerId: value, enabled: true })).rejects.toThrow('valid Google Tag Manager');
    }
    await expect(state.service.save(99, { containerId: 'GTM-ABC1234', enabled: true })).rejects.toThrow('tenant owner');
  });

  it('enables, disables, updates, and removes the same tenant setting', async () => {
    const state = createService({ stored: { containerId: 'GTM-OLD123', enabled: true } });

    await expect(state.service.setEnabled(42, false)).resolves.toMatchObject({ gtm: { containerId: 'GTM-OLD123', enabled: false } });
    await expect(state.service.save(42, { containerId: 'GTM-NEW456', enabled: true })).resolves.toMatchObject({ gtm: { containerId: 'GTM-NEW456', enabled: true } });
    await expect(state.service.remove(42)).resolves.toEqual({ message: 'GTM container removed successfully' });
    expect(state.getStored()).toBeNull();
    expect(state.audits.map((item) => item.action)).toEqual(expect.arrayContaining(['tenant.gtm.disable', 'tenant.gtm.save', 'tenant.gtm.remove']));
  });

  it('cannot enable tracking before a container exists', async () => {
    await expect(createService().service.setEnabled(42, true)).rejects.toThrow('Add a GTM container');
  });

  it('keeps different tenants isolated by selecting only the owner database', async () => {
    const first = createService({ ownerUserId: 42, databaseName: 'tenant_7_blue_realty' });
    const second = createService({ ownerUserId: 84, databaseName: 'tenant_8_red_realty' });

    await first.service.save(42, { containerId: 'GTM-BLUE123', enabled: true });
    await second.service.save(84, { containerId: 'GTM-RED1234', enabled: true });

    expect(first.getStored()).toEqual({ containerId: 'GTM-BLUE123', enabled: true });
    expect(second.getStored()).toEqual({ containerId: 'GTM-RED1234', enabled: true });
    expect(first.databases.withTenantClient).toHaveBeenCalledWith('tenant_7_blue_realty', expect.any(Function));
    expect(second.databases.withTenantClient).toHaveBeenCalledWith('tenant_8_red_realty', expect.any(Function));
  });
});
