import { BadRequestException } from '@nestjs/common';
import { SaasAdminService } from './saas-admin.service';
import { PlanDashboardPermission } from './entities/subscription-plan.entity';

function repo<T extends { id?: number }>(seed: T[] = []) {
  const rows = [...seed];
  return {
    rows,
    find: jest.fn(async (options?: any) => options?.take ? rows.slice(0, options.take) : [...rows]),
    findOne: jest.fn(async ({ where }: any) => rows.find((r: any) => r.id === where.id) ?? null),
    create: jest.fn((value: any) => ({ ...value })),
    save: jest.fn(async (value: any) => {
      if (!value.id) value.id = rows.length ? Math.max(...rows.map((r: any) => r.id ?? 0)) + 1 : 1;
      const index = rows.findIndex((r: any) => r.id === value.id);
      if (index >= 0) rows[index] = value; else rows.push(value);
      return value;
    }),
    remove: jest.fn(async (value: any) => { const i = rows.indexOf(value); if (i >= 0) rows.splice(i, 1); return value; }),
    count: jest.fn(async ({ where }: any) => rows.filter((r: any) => r.planId === where.planId).length),
  };
}

describe('SaasAdminService management lifecycle', () => {
  it('supports unlimited plans, both permissions, CRUD/status, tenant controls, extension, and audit logs', async () => {
    const plans = repo<any>();
    const tenants = repo<any>([{ id: 1, businessName: 'Acme Realty', slug: 'acme-realty', planId: null, isActive: true, isBlocked: false, subscriptionStartsAt: null, subscriptionExpiresAt: null }]);
    const audits = repo<any>();
    const service = new SaasAdminService(plans as any, tenants as any, audits as any);

    for (let i = 1; i <= 25; i++) {
      await service.createPlan({ name: `Plan ${i}`, price: i, billingDays: 30, dashboardPermissions: [PlanDashboardPermission.NormalDashboard] }, 99);
    }
    expect(plans.rows).toHaveLength(25);

    const both = await service.createPlan({ name: 'Both', price: 99, billingDays: 30, dashboardPermissions: [PlanDashboardPermission.NormalDashboard, PlanDashboardPermission.PropertyManagementDashboard] }, 99);
    expect(both.dashboardPermissions).toEqual(expect.arrayContaining(Object.values(PlanDashboardPermission)));

    const updated = await service.updatePlan(both.id, { ...both, name: 'Both Updated' }, 99);
    expect(updated.name).toBe('Both Updated');
    expect((await service.setPlanActive(both.id, false, 99)).isActive).toBe(false);
    await service.setPlanActive(both.id, true, 99);
    await service.deletePlan(both.id, 99);
    expect(plans.rows.some((p: any) => p.id === both.id)).toBe(false);

    expect((await service.setTenantBlocked(1, true, 99))?.isBlocked).toBe(true);
    expect((await service.setTenantBlocked(1, false, 99))?.isBlocked).toBe(false);
    const extended = await service.extendTenantSubscription(1, 30, 99);
    expect(extended?.subscriptionExpiresAt).toBeInstanceOf(Date);
    expect((await service.listTenants())).toHaveLength(1);
    expect((await service.listAuditLogs()).length).toBeGreaterThanOrEqual(31);
  });

  it('requires at least one dashboard permission and prevents deleting assigned plans', async () => {
    const plans = repo<any>([{ id: 1, name: 'Assigned', description: '', price: '10.00', billingDays: 30, dashboardPermissions: [PlanDashboardPermission.NormalDashboard], isActive: true }]);
    const tenants = repo<any>([{ id: 1, planId: 1 }]);
    const audits = repo<any>();
    const service = new SaasAdminService(plans as any, tenants as any, audits as any);
    await expect(service.createPlan({ name: 'Invalid', dashboardPermissions: [] }, 1)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deletePlan(1, 1)).rejects.toThrow('Cannot delete a plan assigned to tenants');
  });
});
