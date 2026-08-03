import { BadRequestException } from '@nestjs/common';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { User } from '../users/entities/user.entity';

function makeManager(options: { businessExists?: boolean; emailExists?: boolean; slugExists?: string[]; subdomainExists?: string[]; failTenantSave?: boolean } = {}) {
  const users: any[] = [];
  const tenants: any[] = [];
  const audits: any[] = [];
  const slugExists = new Set(options.slugExists ?? []);
  const subdomainExists = new Set(options.subdomainExists ?? []);
  const manager: any = {
    findOne: jest.fn(async (entity: any, query: any) => {
      if (entity === SubscriptionPlan && query.where.id === 7 && query.where.isActive === true) {
        return { id: 7, name: 'Complete', billingDays: 30, dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'], isActive: true };
      }
      return null;
    }),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getExists: jest.fn(async () => !!options.businessExists),
    })),
    exists: jest.fn(async (entity: any, query: any) => {
      if (entity === User) return !!options.emailExists;
      if (entity === SaasTenant && query.where.slug) return slugExists.has(query.where.slug);
      if (entity === SaasTenant && query.where.subdomain) return subdomainExists.has(query.where.subdomain);
      return false;
    }),
    create: jest.fn((_entity: any, value: any) => ({ ...value })),
    delete: jest.fn(async () => ({ affected: 1 })),
    save: jest.fn(async (entity: any, value: any) => {
      if (entity === User) { const row = { ...value, id: 11 }; users.push(row); return row; }
      if (entity === SaasTenant) {
        if (options.failTenantSave) throw new Error('tenant save failed');
        const row = { ...value, id: 22 }; tenants.push(row); return row;
      }
      audits.push(value); return { ...value, id: 33 };
    }),
  };
  return { manager, users, tenants, audits };
}

function makeService(setup: ReturnType<typeof makeManager>, options: { failDatabaseProvision?: boolean } = {}) {
  const dataSource: any = {
    transaction: jest.fn(async (callback: any) => callback(setup.manager)),
  };
  const tenantDatabases: any = {
    databaseNameForTenant: jest.fn((tenantId: number, slug: string) => `tenant_${tenantId}_${slug.replace(/-/g, '_')}`),
    provisionDatabase: jest.fn(async () => {
      if (options.failDatabaseProvision) throw new Error('database provisioning failed');
      return { status: 'ready' };
    }),
    dropDatabase: jest.fn(async () => undefined),
  };
  return { service: new TenantProvisioningService(dataSource, tenantDatabases), dataSource, tenantDatabases };
}

const input = {
  businessName: 'Blue Horizon Realty',
  planId: 7,
  firstName: 'Asha',
  lastName: 'Rahman',
  email: 'asha@example.com',
  password: 'StrongPass123',
  requestedSubdomain: '',
  purchaseReference: 'PAY-2026-001',
};

describe('TenantProvisioningService', () => {
  it('atomically creates owner and tenant after successful purchase with plan dates and permissions', async () => {
    const setup = makeManager();
    const { service, dataSource } = makeService(setup);
    const result = await service.provisionAfterSuccessfulPurchase(input);

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    expect(result.tenant).toMatchObject({
      businessName: 'Blue Horizon Realty',
      slug: 'blue-horizon-realty',
      subdomain: 'blue-horizon-realty',
      planId: 7,
      dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'],
      provisioningStatus: 'ready',
      databaseStatus: 'ready',
      databaseName: 'tenant_22_blue_horizon_realty',
      ownerUserId: 11,
    });
    expect(result.tenant.subscriptionStartsAt).toBeInstanceOf(Date);
    expect(result.tenant.subscriptionExpiresAt.getTime() - result.tenant.subscriptionStartsAt.getTime()).toBe(30 * 86400000);
    expect(setup.users[0].agentRoutePermissions).toEqual(expect.arrayContaining(['dashboard', 'properties', 'deal-pipeline', 'lead', 'mail', 'settings']));
    expect(setup.audits[0].action).toBe('tenant.purchase.provision');
  });

  it('supports manual Super Admin tenant creation', async () => {
    const setup = makeManager();
    const { service } = makeService(setup);
    const result = await service.provisionManually({ ...input, purchaseReference: null }, 99);
    expect(result.tenant.businessName).toBe(input.businessName);
    expect(setup.audits[0]).toMatchObject({ action: 'tenant.manual.provision', actorUserId: 99 });
  });

  it('generates a unique slug and subdomain suffix when the base slug already exists', async () => {
    const setup = makeManager({ slugExists: ['blue-horizon-realty'], subdomainExists: ['blue-horizon-realty'] });
    const { service } = makeService(setup);
    const result = await service.provisionAfterSuccessfulPurchase(input);
    expect(result.tenant.slug).toBe('blue-horizon-realty-2');
    expect(result.tenant.subdomain).toBe('blue-horizon-realty-2');
  });

  it('rejects duplicate business names and emails', async () => {
    await expect(makeService(makeManager({ businessExists: true })).service.provisionAfterSuccessfulPurchase(input)).rejects.toThrow('Business name already exists');
    await expect(makeService(makeManager({ emailExists: true })).service.provisionAfterSuccessfulPurchase(input)).rejects.toThrow('Email already exists');
  });

  it('rejects reserved, invalid, or duplicate requested subdomains', async () => {
    await expect(makeService(makeManager()).service.provisionAfterSuccessfulPurchase({ ...input, requestedSubdomain: 'admin' })).rejects.toThrow('reserved');
    await expect(makeService(makeManager()).service.provisionAfterSuccessfulPurchase({ ...input, requestedSubdomain: 'Bad_Name' })).rejects.toThrow('only lowercase');
    await expect(makeService(makeManager({ subdomainExists: ['blue'] })).service.provisionAfterSuccessfulPurchase({ ...input, requestedSubdomain: 'blue' })).rejects.toThrow('already exists');
  });

  it('requires successful purchase evidence and uses a transaction so failed tenant saves do not return partial success', async () => {
    const noRef = makeService(makeManager()).service.provisionAfterSuccessfulPurchase({ ...input, purchaseReference: '' });
    await expect(noRef).rejects.toBeInstanceOf(BadRequestException);

    const setup = makeManager({ failTenantSave: true });
    const { service, dataSource } = makeService(setup);
    await expect(service.provisionAfterSuccessfulPurchase(input)).rejects.toThrow('tenant save failed');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('drops the tenant database and removes partial master records when database provisioning fails', async () => {
    const setup = makeManager();
    const { service, tenantDatabases } = makeService(setup, { failDatabaseProvision: true });
    await expect(service.provisionAfterSuccessfulPurchase(input)).rejects.toThrow('database provisioning failed');
    expect(tenantDatabases.dropDatabase).toHaveBeenCalledWith('tenant_22_blue_horizon_realty');
    expect(setup.manager.delete).toHaveBeenCalledWith(SaasTenant, 22);
    expect(setup.manager.delete).toHaveBeenCalledWith(User, 11);
  });
});


