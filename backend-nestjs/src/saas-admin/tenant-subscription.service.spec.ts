import { TenantSubscriptionService } from './tenant-subscription.service';
import { SaasTenant } from './entities/saas-tenant.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';

function setup(options: { expired?: boolean; newPlan?: boolean } = {}) {
  const now = Date.now();
  const tenant: any = {
    id: 7,
    ownerUserId: 42,
    businessName: 'Blue Realty',
    databaseName: 'tenant_7_blue_realty',
    databaseStatus: 'ready',
    provisioningStatus: 'ready',
    planId: 1,
    dashboardPermissions: ['normal-dashboard'],
    subscriptionStartsAt: new Date(now - 20 * 86400000),
    subscriptionExpiresAt: new Date(now + (options.expired ? -2 : 10) * 86400000),
    isActive: !options.expired,
    isBlocked: false,
    plan: { id: 1, name: 'Basic' },
  };
  const selectedPlan: any = options.newPlan
    ? { id: 2, name: 'Complete', billingDays: 30, dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'], isActive: true }
    : { id: 1, name: 'Basic', billingDays: 30, dashboardPermissions: ['normal-dashboard'], isActive: true };
  const owner: any = { id: 42, isActive: true, agentRoutePermissions: ['dashboard'], hasCustomAgentRoutePermissions: true };
  const audits: any[] = [];
  const manager: any = {
    save: jest.fn(async (entity: any, value: any) => {
      if (entity === SaasAdminAuditLog) audits.push(value);
      return value;
    }),
    create: jest.fn((_entity: any, value: any) => ({ ...value })),
    findOne: jest.fn(async (entity: any) => entity === User ? owner : null),
  };
  const dataSource: any = { transaction: jest.fn(async (callback: any) => callback(manager)) };
  const client: any = { query: jest.fn(async () => ({ rows: [] })) };
  const tenantDatabases: any = {
    withTenantClient: jest.fn(async (databaseName: string, callback: any) => callback(client)),
    provisionDatabase: jest.fn(),
    createDatabase: jest.fn(),
    dropDatabase: jest.fn(),
  };
  const tenants: any = { findOne: jest.fn(async () => tenant) };
  const plans: any = { findOne: jest.fn(async () => selectedPlan) };
  const service = new TenantSubscriptionService(dataSource, tenantDatabases, tenants, plans);
  return { service, tenant, selectedPlan, owner, audits, manager, client, tenantDatabases };
}

describe('TenantSubscriptionService', () => {
  it('renews an active tenant from the existing expiration without creating a database', async () => {
    const state = setup();
    const oldDatabase = state.tenant.databaseName;
    const oldExpiry = state.tenant.subscriptionExpiresAt.getTime();

    const result = await state.service.renewOrRepurchase(42, { planId: 1, purchaseReference: 'PAY-RENEW-1' });

    expect(result.tenant.databaseName).toBe(oldDatabase);
    expect(result.tenant.subscriptionExpiresAt.getTime()).toBe(oldExpiry + 30 * 86400000);
    expect(result.reactivated).toBe(false);
    expect(state.tenantDatabases.withTenantClient).toHaveBeenCalledWith(oldDatabase, expect.any(Function));
    expect(state.tenantDatabases.provisionDatabase).not.toHaveBeenCalled();
    expect(state.tenantDatabases.createDatabase).not.toHaveBeenCalled();
    expect(state.tenantDatabases.dropDatabase).not.toHaveBeenCalled();
    expect(state.audits.some((entry) => entry.action === 'tenant.subscription.renew')).toBe(true);
  });

  it('reactivates an expired tenant from today and preserves the same database', async () => {
    const state = setup({ expired: true });
    const before = Date.now();
    const databaseName = state.tenant.databaseName;

    const result = await state.service.renewOrRepurchase(42, { planId: 1, purchaseReference: 'PAY-REPURCHASE-1' });

    expect(result.reactivated).toBe(true);
    expect(result.tenant.isActive).toBe(true);
    expect(result.tenant.isBlocked).toBe(false);
    expect(result.tenant.databaseName).toBe(databaseName);
    expect(result.tenant.subscriptionExpiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 86400000);
    expect(state.audits.some((entry) => entry.action === 'tenant.subscription.repurchase')).toBe(true);
  });

  it('updates plan permissions in the master owner and existing tenant database', async () => {
    const state = setup({ newPlan: true });
    await state.service.renewOrRepurchase(42, { planId: 2, purchaseReference: 'PAY-UPGRADE-1' });

    expect(state.tenant.planId).toBe(2);
    expect(state.tenant.dashboardPermissions).toEqual(['normal-dashboard', 'property-management-dashboard']);
    expect(state.owner.agentRoutePermissions).toEqual(expect.arrayContaining(['dashboard', 'properties', 'lead', 'settings']));
    expect(state.client.query.mock.calls.some(([sql]: [string]) => sql.includes("'feature_flags'"))).toBe(true);
    expect(state.audits.some((entry) => entry.action === 'tenant.plan.change')).toBe(true);
  });

  it('preserves tenant application data by only updating subscription settings', async () => {
    const state = setup({ newPlan: true });
    await state.service.renewOrRepurchase(42, { planId: 2, purchaseReference: 'PAY-DOWNGRADE-1' });

    const sql = state.client.query.mock.calls.map(([statement]: [string]) => statement).join('\n');
    expect(sql).toContain('tenant_setting');
    expect(sql).not.toMatch(/DROP TABLE|TRUNCATE|DELETE FROM tenant_property|DELETE FROM tenant_lead/i);
  });

  it('rolls back tenant settings when the master subscription transaction fails', async () => {
    const state = setup();
    state.manager.save.mockImplementation(async (entity: any, value: any) => {
      if (entity === SaasTenant) throw new Error('master update failed');
      return value;
    });

    await expect(state.service.renewOrRepurchase(42, { planId: 1, purchaseReference: 'PAY-ROLLBACK-1' })).rejects.toThrow('master update failed');
    expect(state.client.query).toHaveBeenCalledWith('BEGIN');
    expect(state.client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(state.client.query).not.toHaveBeenCalledWith('COMMIT');
  });

  it('rejects missing purchase evidence, missing owners, and unavailable plans', async () => {
    await expect(setup().service.renewOrRepurchase(42, { planId: 1, purchaseReference: '' })).rejects.toThrow('successful purchase reference');

    const missingOwner = setup();
    missingOwner.service = new TenantSubscriptionService(
      { transaction: jest.fn() } as any,
      missingOwner.tenantDatabases,
      { findOne: jest.fn(async () => null) } as any,
      { findOne: jest.fn() } as any,
    );
    await expect(missingOwner.service.getForOwner(500)).rejects.toThrow('tenant owner');

    const unavailable = setup();
    unavailable.service = new TenantSubscriptionService(
      { transaction: jest.fn() } as any,
      unavailable.tenantDatabases,
      { findOne: jest.fn(async () => unavailable.tenant) } as any,
      { findOne: jest.fn(async () => null) } as any,
    );
    await expect(unavailable.service.renewOrRepurchase(42, { planId: 99, purchaseReference: 'PAY-X' })).rejects.toThrow('unavailable');
  });
});
