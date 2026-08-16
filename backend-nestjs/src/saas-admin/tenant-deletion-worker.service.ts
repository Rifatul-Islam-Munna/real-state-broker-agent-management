import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FileUploadService } from '../file-upload/file-upload.service';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { User } from '../users/entities/user.entity';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { SaasTenantDomain } from './entities/saas-tenant-domain.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { StripeCheckoutRecord } from './entities/stripe-checkout-record.entity';

@Injectable()
export class TenantDeletionWorkerService {
  private readonly logger = new Logger(TenantDeletionWorkerService.name);
  private running = false;

  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    private readonly dataSource: DataSource,
    private readonly tenantDatabases: TenantDatabaseService,
    private readonly files: FileUploadService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (this.running || process.env.TENANT_DELETION_WORKER_ENABLED === 'false') return;
    this.running = true;
    try {
      const candidate = await this.tenants.findOne({
        where: [
          { provisioningStatus: 'deleting' },
          { provisioningStatus: 'delete-failed' },
          { provisioningStatus: 'deleting-processing' },
        ],
        order: { updatedAt: 'ASC' },
      });
      if (!candidate) return;
      await this.processTenant(candidate.id);
    } finally {
      this.running = false;
    }
  }

  private async processTenant(tenantId: number) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    const lockKey = 1_900_000_000 + tenantId;
    try {
      const locked = await runner.query('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
      if (!locked[0]?.locked) return;
      const tenant = await this.tenants.findOne({ where: { id: tenantId } });
      if (!tenant || !['deleting', 'delete-failed', 'deleting-processing'].includes(tenant.provisioningStatus)) return;
      tenant.provisioningStatus = 'deleting-processing';
      tenant.isBlocked = true;
      tenant.isActive = false;
      await this.tenants.save(tenant);
      await this.cleanupTenant(tenant);
    } catch (error) {
      const tenant = await this.tenants.findOne({ where: { id: tenantId } }).catch(() => null);
      if (tenant) {
        tenant.provisioningStatus = 'delete-failed';
        tenant.isBlocked = true;
        tenant.isActive = false;
        await this.tenants.save(tenant).catch(() => undefined);
      }
      this.logger.error(`Tenant deletion failed for ${tenantId}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await runner.query('SELECT pg_advisory_unlock($1)', [lockKey]).catch(() => undefined);
      await runner.release();
    }
  }

  private async cleanupTenant(tenant: SaasTenant) {
    let deletedFiles = 0;
    if (tenant.databaseStatus !== 'deleted') {
      const legacyNames = tenant.databaseName
        ? await this.collectLegacyObjectNames(tenant.databaseName)
        : [];
      deletedFiles = (await this.files.deleteTenantFiles(tenant.id, legacyNames)).deleted;
      if (tenant.databaseName) await this.tenantDatabases.dropDatabase(tenant.databaseName);
      tenant.databaseStatus = 'deleted';
      await this.tenants.save(tenant);
    } else {
      deletedFiles = (await this.files.deleteTenantFiles(tenant.id)).deleted;
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.update(StripeCheckoutRecord, { tenantId: tenant.id }, { tenantId: null });
      await manager.delete(SaasTenantDomain, { tenantId: tenant.id });
      await manager.delete(User, { tenantId: tenant.id });
      await manager.delete(SaasTenant, tenant.id);
      await manager.save(SaasAdminAuditLog, manager.create(SaasAdminAuditLog, {
        action: 'tenant.delete.completed',
        entityType: 'tenant',
        entityId: tenant.id,
        actorUserId: null,
        summary: `Permanently deleted tenant ${tenant.businessName}`,
        metadata: {
          subdomain: tenant.subdomain,
          databaseName: tenant.databaseName,
          deletedFiles,
        },
      }));
    });
  }

  private async collectLegacyObjectNames(databaseName: string) {
    return this.tenantDatabases.withTenantClient(databaseName, async (client) => {
      const names = new Set<string>();
      const queries = [
        'SELECT value AS payload FROM tenant_setting',
        'SELECT payload FROM tenant_property',
        'SELECT payload FROM tenant_lead',
        'SELECT payload FROM tenant_legacy_resource',
        'SELECT payload FROM tenant_outreach_job',
      ];
      for (const sql of queries) {
        try {
          const result = await client.query(sql);
          for (const row of result.rows) this.collectReferences(row.payload, names);
        } catch {
          // Older tenant databases may not have every optional table yet.
        }
      }
      try {
        const media = await client.query('SELECT media_urls FROM tenant_outreach_job');
        for (const row of media.rows) this.collectReferences(row.media_urls, names);
      } catch {
        // Optional for older databases.
      }
      return [...names];
    });
  }

  private collectReferences(value: unknown, names: Set<string>, key = ''): void {
    if (typeof value === 'string') {
      if (/objectname$/i.test(key) && value.trim()) names.add(value.trim());
      const fromUrl = this.files.objectNameFromReference(value);
      if (fromUrl) names.add(fromUrl);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) this.collectReferences(item, names, key);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      this.collectReferences(childValue, names, childKey);
    }
  }
}
