import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan, PlanDashboardPermission } from './entities/subscription-plan.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { sanitizePlainText } from '../security/input-sanitizer';

@Injectable()
export class SaasAdminService {
  constructor(
    @InjectRepository(SubscriptionPlan) private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(SaasTenant) private readonly tenantRepo: Repository<SaasTenant>,
    @InjectRepository(SaasAdminAuditLog) private readonly auditRepo: Repository<SaasAdminAuditLog>,
  ) {}

  async listPlans() {
    return this.planRepo.find({ order: { createdAt: 'DESC' } });
  }

  async listActivePublicPlans() {
    return this.planRepo.find({
      where: { isActive: true },
      order: { price: 'ASC', createdAt: 'ASC' },
    });
  }

  async createPlan(dto: any, actorUserId?: number) {
    const plan = this.planRepo.create(this.normalizePlan(dto));
    const saved = await this.planRepo.save(plan);
    await this.audit('plan.create', 'plan', saved.id, actorUserId, `Created plan ${saved.name}`, { dashboardPermissions: saved.dashboardPermissions });
    return saved;
  }

  async updatePlan(id: number, dto: any, actorUserId?: number) {
    const plan = await this.getPlan(id);
    Object.assign(plan, this.normalizePlan(dto, plan));
    const saved = await this.planRepo.save(plan);
    await this.audit('plan.update', 'plan', saved.id, actorUserId, `Updated plan ${saved.name}`, { dashboardPermissions: saved.dashboardPermissions });
    return saved;
  }

  async setPlanActive(id: number, isActive: boolean, actorUserId?: number) {
    const plan = await this.getPlan(id);
    plan.isActive = isActive;
    const saved = await this.planRepo.save(plan);
    await this.audit(isActive ? 'plan.activate' : 'plan.deactivate', 'plan', id, actorUserId, `${isActive ? 'Activated' : 'Deactivated'} plan ${plan.name}`);
    return saved;
  }

  async deletePlan(id: number, actorUserId?: number) {
    const plan = await this.getPlan(id);
    const assigned = await this.tenantRepo.count({ where: { planId: id } });
    if (assigned > 0) throw new BadRequestException('Cannot delete a plan assigned to tenants');
    await this.planRepo.remove(plan);
    await this.audit('plan.delete', 'plan', id, actorUserId, `Deleted plan ${plan.name}`);
    return { message: 'Plan deleted successfully' };
  }

  async listTenants() {
    return this.tenantRepo.find({ relations: ['plan'], order: { createdAt: 'DESC' } });
  }

  async setTenantBlocked(id: number, isBlocked: boolean, actorUserId?: number) {
    const tenant = await this.getTenant(id);
    tenant.isBlocked = isBlocked;
    tenant.isActive = !isBlocked;
    const saved = await this.tenantRepo.save(tenant);
    await this.audit(isBlocked ? 'tenant.block' : 'tenant.unblock', 'tenant', id, actorUserId, `${isBlocked ? 'Blocked' : 'Unblocked'} tenant ${tenant.businessName}`);
    return this.tenantWithPlan(saved);
  }

  async extendTenantSubscription(id: number, days: number, actorUserId?: number) {
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new BadRequestException('Extension days must be between 1 and 3650');
    const tenant = await this.getTenant(id);
    const now = new Date();
    const base = tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt > now ? tenant.subscriptionExpiresAt : now;
    tenant.subscriptionExpiresAt = new Date(base.getTime() + days * 86400000);
    if (!tenant.subscriptionStartsAt) tenant.subscriptionStartsAt = now;
    const saved = await this.tenantRepo.save(tenant);
    await this.audit('tenant.subscription.extend', 'tenant', id, actorUserId, `Extended ${tenant.businessName} subscription by ${days} days`, { days, expiresAt: saved.subscriptionExpiresAt });
    return this.tenantWithPlan(saved);
  }

  async listAuditLogs() {
    return this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 250 });
  }

  private async getPlan(id: number) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  private async getTenant(id: number) {
    const tenant = await this.tenantRepo.findOne({ where: { id }, relations: ['plan'] });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private tenantWithPlan(tenant: SaasTenant) {
    return this.tenantRepo.findOne({ where: { id: tenant.id }, relations: ['plan'] });
  }

  private normalizePlan(dto: any, existing?: SubscriptionPlan): Pick<SubscriptionPlan, 'name' | 'description' | 'price' | 'billingDays' | 'dashboardPermissions' | 'isActive'> {
    const name = sanitizePlainText(dto.name ?? existing?.name ?? '', 'Plan name', 160, { required: true });
    const price = Number(dto.price ?? existing?.price ?? 0);
    const billingDays = Number(dto.billingDays ?? existing?.billingDays ?? 30);
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Plan price must be zero or greater');
    if (!Number.isInteger(billingDays) || billingDays < 1) throw new BadRequestException('Billing days must be at least 1');
    const allowed = Object.values(PlanDashboardPermission);
    const permissions: PlanDashboardPermission[] = Array.isArray(dto.dashboardPermissions)
      ? [...new Set<PlanDashboardPermission>(dto.dashboardPermissions.filter((value: unknown): value is PlanDashboardPermission => allowed.includes(value as PlanDashboardPermission)))]
      : existing?.dashboardPermissions ?? [];
    if (permissions.length < 1) throw new BadRequestException('Select at least one dashboard permission');
    return {
      name,
      description: sanitizePlainText(dto.description ?? existing?.description ?? '', 'Plan description', 2000),
      price: price.toFixed(2),
      billingDays,
      dashboardPermissions: permissions,
      isActive: dto.isActive ?? existing?.isActive ?? true,
    };
  }

  private async audit(action: string, entityType: string, entityId: number | null, actorUserId: number | undefined, summary: string, metadata: Record<string, unknown> | null = null) {
    await this.auditRepo.save(this.auditRepo.create({ action, entityType, entityId, actorUserId: actorUserId ?? null, summary, metadata }));
  }
}
