import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { SaasTenant } from './entities/saas-tenant.entity';

export type TenantGtmSetting = { containerId: string | null; enabled: boolean };

@Injectable()
export class TenantTrackingService {
  constructor(
    @InjectRepository(SaasTenant) private readonly tenants: Repository<SaasTenant>,
    @InjectRepository(SaasAdminAuditLog) private readonly audits: Repository<SaasAdminAuditLog>,
    private readonly databases: TenantDatabaseService,
  ) {}

  async getForOwner(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    const setting = await this.readSetting(tenant.databaseName!);
    return { tenant: { id: tenant.id, businessName: tenant.businessName }, gtm: setting };
  }

  async save(userId: number, dto: any) {
    const tenant = await this.requireOwnedTenant(userId);
    const containerId = `${dto.containerId ?? ''}`.trim().toUpperCase();
    if (!/^GTM-[A-Z0-9]{5,20}$/.test(containerId)) {
      throw new BadRequestException('Enter a valid Google Tag Manager container ID');
    }
    const enabled = dto.enabled !== false;
    const setting: TenantGtmSetting = { containerId, enabled };
    await this.writeSetting(tenant.databaseName!, setting);
    await this.audit(tenant.id, userId, 'tenant.gtm.save', `Saved GTM container ${containerId}`, { containerId, enabled });
    return { tenant: { id: tenant.id, businessName: tenant.businessName }, gtm: setting };
  }

  async setEnabled(userId: number, enabled: boolean) {
    const tenant = await this.requireOwnedTenant(userId);
    const current = await this.readSetting(tenant.databaseName!);
    if (!current.containerId) throw new BadRequestException('Add a GTM container before enabling tracking');
    const setting = { ...current, enabled };
    await this.writeSetting(tenant.databaseName!, setting);
    await this.audit(tenant.id, userId, enabled ? 'tenant.gtm.enable' : 'tenant.gtm.disable', `${enabled ? 'Enabled' : 'Disabled'} GTM tracking`, { containerId: current.containerId });
    return { gtm: setting };
  }

  async remove(userId: number) {
    const tenant = await this.requireOwnedTenant(userId);
    await this.databases.withTenantClient(tenant.databaseName!, async (client) => {
      await client.query("DELETE FROM tenant_setting WHERE key = 'google_tag_manager'");
    });
    await this.audit(tenant.id, userId, 'tenant.gtm.remove', 'Removed GTM container', {});
    return { message: 'GTM container removed successfully' };
  }

  private async requireOwnedTenant(userId: number) {
    const tenant = await this.tenants.findOne({ where: { ownerUserId: userId } });
    if (!tenant || !tenant.databaseName || tenant.databaseStatus !== 'ready') {
      throw new ForbiddenException('Only a tenant owner with a ready database can manage tracking');
    }
    return tenant;
  }

  private async readSetting(databaseName: string): Promise<TenantGtmSetting> {
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query("SELECT value FROM tenant_setting WHERE key = 'google_tag_manager'");
      const value = result.rows[0]?.value ?? {};
      return { containerId: typeof value.containerId === 'string' ? value.containerId : null, enabled: value.enabled === true };
    });
  }

  private async writeSetting(databaseName: string, setting: TenantGtmSetting) {
    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query(
        `INSERT INTO tenant_setting(key, value) VALUES ('google_tag_manager', $1::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(setting)],
      );
    });
  }

  private async audit(tenantId: number, actorUserId: number, action: string, summary: string, metadata: Record<string, unknown>) {
    await this.audits.save(this.audits.create({ action, entityType: 'tenant-tracking', entityId: tenantId, actorUserId, summary, metadata }));
  }
}
