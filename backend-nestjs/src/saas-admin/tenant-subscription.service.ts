import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ReliabilityMonitorService } from '../security/reliability-monitor.service';
import { validatePurchaseReference } from '../security/input-sanitizer';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class TenantSubscriptionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantDatabases: TenantDatabaseService,
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    @InjectRepository(SubscriptionPlan) private readonly plans: Repository<SubscriptionPlan>,
    @Optional() private readonly monitor?: ReliabilityMonitorService,
  ) {}

  async getForOwner(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    return this.withPlan(tenant);
  }

  async renewOrRepurchase(userId: number, dto: any) {
    const purchaseReference = validatePurchaseReference(dto.purchaseReference);

    const tenant = await this.requireOwnedTenant(userId);
    if (!tenant.databaseName || tenant.databaseStatus !== 'ready' || tenant.provisioningStatus !== 'ready') {
      throw new ForbiddenException('Existing tenant database is not ready');
    }

    const planId = Number(dto.planId ?? tenant.planId);
    if (!Number.isInteger(planId) || planId < 1) throw new BadRequestException('Select a valid plan');
    const plan = await this.plans.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Selected subscription plan is unavailable');

    const oldPlanId = tenant.planId;
    const oldPermissions = [...(tenant.dashboardPermissions ?? [])];
    const oldExpiration = tenant.subscriptionExpiresAt;
    const wasExpired = !oldExpiration || oldExpiration.getTime() <= Date.now();
    const now = new Date();
    const base = oldExpiration && oldExpiration > now ? oldExpiration : now;
    const newExpiration = new Date(base.getTime() + plan.billingDays * 86400000);
    const newRoutePermissions = this.mapDashboardPermissions(plan.dashboardPermissions);

    const saved = await this.tenantDatabases.withTenantClient(tenant.databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(
          `INSERT INTO tenant_setting(key, value) VALUES
            ('subscription', $1::jsonb),
            ('feature_flags', $2::jsonb)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
          [
            JSON.stringify({ planId: plan.id, startsAt: tenant.subscriptionStartsAt ?? now, expiresAt: newExpiration, status: 'active' }),
            JSON.stringify({ dashboardPermissions: plan.dashboardPermissions, initialized: true }),
          ],
        );

        const savedTenant = await this.dataSource.transaction(async (manager) => {
          tenant.planId = plan.id;
          tenant.dashboardPermissions = [...plan.dashboardPermissions];
          tenant.subscriptionStartsAt = tenant.subscriptionStartsAt ?? now;
          tenant.subscriptionExpiresAt = newExpiration;
          tenant.isActive = true;
          tenant.isBlocked = false;
          const updatedTenant = await manager.save(SaasTenant, tenant);

          const owner = await manager.findOne(User, { where: { id: userId } });
          if (!owner) throw new NotFoundException('Tenant owner not found');
          owner.hasCustomAgentRoutePermissions = true;
          owner.agentRoutePermissions = newRoutePermissions;
          owner.isActive = true;
          await manager.save(User, owner);

          await manager.save(SaasAdminAuditLog, manager.create(SaasAdminAuditLog, {
            action: wasExpired ? 'tenant.subscription.repurchase' : 'tenant.subscription.renew',
            entityType: 'tenant',
            entityId: tenant.id,
            actorUserId: userId,
            summary: `${wasExpired ? 'Repurchased' : 'Renewed'} subscription for ${tenant.businessName}`,
            metadata: {
              purchaseReference,
              databaseName: tenant.databaseName,
              previousExpiration: oldExpiration,
              newExpiration,
              previousPlanId: oldPlanId,
              planId: plan.id,
            },
          }));

          if (oldPlanId !== plan.id || JSON.stringify(oldPermissions) !== JSON.stringify(plan.dashboardPermissions)) {
            await manager.save(SaasAdminAuditLog, manager.create(SaasAdminAuditLog, {
              action: 'tenant.plan.change',
              entityType: 'tenant',
              entityId: tenant.id,
              actorUserId: userId,
              summary: `Changed ${tenant.businessName} plan to ${plan.name}`,
              metadata: {
                previousPlanId: oldPlanId,
                planId: plan.id,
                previousPermissions: oldPermissions,
                dashboardPermissions: plan.dashboardPermissions,
              },
            }));
          }

          return updatedTenant;
        });

        await client.query('COMMIT');
        return savedTenant;
      } catch (error) {
        this.monitor?.failure('tenant.subscription.job.failed', error, { tenantId: tenant.id, planId, databaseName: tenant.databaseName });
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      }
    });

    this.monitor?.record('tenant.subscription.job.succeeded', { tenantId: tenant.id, planId, databaseName: tenant.databaseName, reactivated: wasExpired });
    return { tenant: { ...saved, plan }, renewed: true, reactivated: wasExpired };
  }

  private async requireOwnedTenant(userId: number) {
    const tenant = await this.tenants.findOne({ where: { ownerUserId: userId }, relations: ['plan'] });
    if (!tenant) throw new ForbiddenException('Only a tenant owner can manage subscriptions');
    return tenant;
  }

  private withPlan(tenant: SaasTenant) {
    const now = Date.now();
    const expired = !tenant.subscriptionExpiresAt || tenant.subscriptionExpiresAt.getTime() <= now;
    return {
      ...tenant,
      subscriptionStatus: tenant.isBlocked ? 'blocked' : expired ? 'expired' : tenant.isActive ? 'active' : 'inactive',
    };
  }

  private mapDashboardPermissions(permissions: string[]) {
    const routes = new Set<string>();
    if (permissions.includes('normal-dashboard')) routes.add('dashboard');
    if (permissions.includes('property-management-dashboard')) {
      routes.add('properties');
      routes.add('deal-pipeline');
      routes.add('lead');
      routes.add('mail');
      routes.add('settings');
    }
    return [...routes];
  }
}
