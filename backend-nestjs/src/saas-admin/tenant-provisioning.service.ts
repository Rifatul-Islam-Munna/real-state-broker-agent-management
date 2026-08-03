import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { ReliabilityMonitorService } from '../security/reliability-monitor.service';
import { sanitizePlainText, validatePurchaseReference } from '../security/input-sanitizer';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'admin', 'super-admin', 'api', 'app', 'mail', 'email', 'ftp', 'cdn',
  'static', 'assets', 'support', 'help', 'billing', 'checkout', 'login', 'register',
  'signup', 'status', 'docs', 'blog', 'dev', 'test', 'staging', 'localhost',
]);

export type TenantProvisioningInput = {
  businessName: string;
  planId: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string | null;
  requestedSubdomain?: string | null;
  purchaseReference?: string | null;
};

@Injectable()
export class TenantProvisioningService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantDatabases: TenantDatabaseService,
    @Optional() private readonly monitor?: ReliabilityMonitorService,
  ) {}

  async provisionAfterSuccessfulPurchase(input: TenantProvisioningInput) {
    if (!input.purchaseReference?.trim()) throw new BadRequestException('A successful purchase reference is required');
    return this.provision(input, null, 'purchase');
  }

  async provisionManually(input: TenantProvisioningInput, actorUserId: number) {
    return this.provision(input, actorUserId, 'manual');
  }

  private async provision(input: TenantProvisioningInput, actorUserId: number | null, source: 'purchase' | 'manual') {
    const normalized = this.normalize(input);
    let createdTenantId: number | null = null;
    let createdOwnerId: number | null = null;
    let databaseName: string | null = null;

    try {
      const master = await this.dataSource.transaction(async (manager) => {
        await this.assertUnique(manager, normalized.businessName, normalized.email);
        const plan = await manager.findOne(SubscriptionPlan, { where: { id: normalized.planId, isActive: true } });
        if (!plan) throw new BadRequestException('Selected subscription plan is unavailable');

        const slug = await this.generateUniqueSlug(manager, normalized.businessName);
        const subdomain = await this.resolveSubdomain(manager, normalized.requestedSubdomain, slug);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + plan.billingDays * 86400000);

        const savedOwner = await manager.save(User, manager.create(User, {
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          email: normalized.email,
          phone: normalized.phone,
          passwordHash: await bcrypt.hash(normalized.password, 10),
          role: UserRole.Agent,
          tenantRole: TenantUserRole.Owner,
          isActive: true,
          agencyName: normalized.businessName,
          hasCustomAgentRoutePermissions: true,
          agentRoutePermissions: this.mapDashboardPermissions(plan.dashboardPermissions),
        }));

        const savedTenant = await manager.save(SaasTenant, manager.create(SaasTenant, {
          businessName: normalized.businessName,
          slug,
          subdomain,
          ownerUserId: savedOwner.id,
          planId: plan.id,
          dashboardPermissions: [...plan.dashboardPermissions],
          provisioningStatus: 'provisioning',
          databaseName: null,
          databaseStatus: 'provisioning',
          databaseProvisionedAt: null,
          isActive: false,
          isBlocked: false,
          subscriptionStartsAt: now,
          subscriptionExpiresAt: expiresAt,
        }));

        savedOwner.tenantId = savedTenant.id;
        await manager.save(User, savedOwner);

        return { plan, savedOwner, savedTenant, slug, subdomain };
      });

      createdTenantId = master.savedTenant.id;
      createdOwnerId = master.savedOwner.id;
      databaseName = this.tenantDatabases.databaseNameForTenant(master.savedTenant.id, master.slug);

      await this.tenantDatabases.provisionDatabase(databaseName, {
        tenantId: master.savedTenant.id,
        businessName: master.savedTenant.businessName,
        owner: {
          id: master.savedOwner.id,
          firstName: master.savedOwner.firstName,
          lastName: master.savedOwner.lastName,
          email: master.savedOwner.email,
          role: master.savedOwner.role,
        },
      });

      const finalized = await this.dataSource.transaction(async (manager) => {
        master.savedTenant.databaseName = databaseName;
        master.savedTenant.databaseStatus = 'ready';
        master.savedTenant.databaseProvisionedAt = new Date();
        master.savedTenant.provisioningStatus = 'ready';
        master.savedTenant.isActive = true;
        const savedTenant = await manager.save(SaasTenant, master.savedTenant);

        await manager.save(SaasAdminAuditLog, manager.create(SaasAdminAuditLog, {
          action: source === 'purchase' ? 'tenant.purchase.provision' : 'tenant.manual.provision',
          entityType: 'tenant',
          entityId: savedTenant.id,
          actorUserId,
          summary: `${source === 'purchase' ? 'Purchased and provisioned' : 'Manually provisioned'} tenant ${savedTenant.businessName}`,
          metadata: {
            planId: master.plan.id,
            slug: master.slug,
            subdomain: master.subdomain,
            databaseName,
            dashboardPermissions: master.plan.dashboardPermissions,
            purchaseReference: normalized.purchaseReference,
          },
        }));
        return savedTenant;
      });

      this.monitor?.record('tenant.provisioning.succeeded', { tenantId: finalized.id, databaseName, source });
      return {
        tenant: { ...finalized, plan: master.plan },
        owner: {
          id: master.savedOwner.id,
          firstName: master.savedOwner.firstName,
          lastName: master.savedOwner.lastName,
          email: master.savedOwner.email,
          role: master.savedOwner.role,
        },
      };
    } catch (error) {
      this.monitor?.failure('tenant.provisioning.failed', error, { tenantId: createdTenantId, databaseName, source });
      if (databaseName) await this.tenantDatabases.dropDatabase(databaseName).catch(() => undefined);
      if (createdTenantId || createdOwnerId) {
        await this.dataSource.transaction(async (manager) => {
          if (createdTenantId) await manager.delete(SaasTenant, createdTenantId);
          if (createdOwnerId) await manager.delete(User, createdOwnerId);
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  private normalize(input: TenantProvisioningInput) {
    const businessName = sanitizePlainText(input.businessName, 'Business name', 160, { required: true });
    const firstName = sanitizePlainText(input.firstName, 'Owner first name', 60, { required: true });
    const lastName = sanitizePlainText(input.lastName, 'Owner last name', 60, { required: true });
    const email = sanitizePlainText(input.email, 'Email', 150, { required: true }).toLowerCase();
    const password = `${input.password ?? ''}`;
    const phoneValue = sanitizePlainText(input.phone, 'Phone', 30);
    const phone = phoneValue || null;
    const planId = Number(input.planId);
    const requestedSubdomain = sanitizePlainText(input.requestedSubdomain, 'Subdomain', 63).toLowerCase() || null;
    const purchaseReference = input.purchaseReference ? validatePurchaseReference(input.purchaseReference) : null;

    if (businessName.length < 2 || businessName.length > 160) throw new BadRequestException('Business name must be between 2 and 160 characters');
    if (!firstName || !lastName) throw new BadRequestException('Owner first and last name are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    if (!Number.isInteger(planId) || planId < 1) throw new BadRequestException('Select a valid plan');
    return { businessName, firstName, lastName, email, password, phone, planId, requestedSubdomain, purchaseReference };
  }

  private async assertUnique(manager: EntityManager, businessName: string, email: string) {
    const businessExists = await manager.createQueryBuilder(SaasTenant, 'tenant').where('LOWER(tenant.businessName) = LOWER(:businessName)', { businessName }).getExists();
    if (businessExists) throw new BadRequestException('Business name already exists');
    if (await manager.exists(User, { where: { email } })) throw new BadRequestException('Email already exists');
  }

  private async generateUniqueSlug(manager: EntityManager, businessName: string) {
    const base = this.slugify(businessName);
    if (!base) throw new BadRequestException('Business name cannot generate a valid tenant slug');
    let candidate = base;
    let suffix = 2;
    while (await manager.exists(SaasTenant, { where: { slug: candidate } })) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  private async resolveSubdomain(manager: EntityManager, requested: string | null, fallbackSlug: string) {
    const candidate = requested || fallbackSlug;
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(candidate)) throw new BadRequestException('Subdomain must contain only lowercase letters, numbers, and single hyphens');
    if (RESERVED_SUBDOMAINS.has(candidate)) throw new BadRequestException('This subdomain is reserved');
    if (await manager.exists(SaasTenant, { where: { subdomain: candidate } })) throw new BadRequestException('Subdomain already exists');
    return candidate;
  }

  private slugify(value: string) {
    return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63).replace(/-+$/g, '');
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
