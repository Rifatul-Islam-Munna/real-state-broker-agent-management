import { Controller, Get, NotFoundException, Request } from '@nestjs/common';
import { TenantDatabaseService } from './tenant-database.service';

@Controller('tenant-public')
export class TenantPublicController {
  constructor(private readonly databases: TenantDatabaseService) {}

  @Get('site')
  async site(@Request() req: any) {
    if (!req.tenant?.databaseName) throw new NotFoundException('Tenant hostname is required');

    return this.databases.withTenantClient(req.tenant.databaseName, async (client) => {
      const identity = await client.query("SELECT value FROM tenant_setting WHERE key = 'tenant_identity'");
      const settings = await client.query("SELECT key, value FROM tenant_setting WHERE key IN ('branding', 'public_homepage', 'contact_form', 'google_tag_manager')");
      const properties = await client.query("SELECT id, title, status, payload FROM tenant_property WHERE status = 'published' ORDER BY created_at DESC LIMIT 24");

      const settingMap = Object.fromEntries(settings.rows.map((row: any) => [row.key, row.value]));
      return {
        tenant: {
          id: req.tenant.id,
          businessName: req.tenant.businessName,
          slug: req.tenant.slug,
          subdomain: req.tenant.subdomain,
          dashboardPermissions: req.tenant.dashboardPermissions,
          identity: identity.rows[0]?.value ?? null,
        },
        branding: settingMap.branding ?? {},
        homepage: settingMap.public_homepage ?? {},
        contactForm: settingMap.contact_form ?? { enabled: true },
        gtm: settingMap.google_tag_manager?.enabled === true && /^GTM-[A-Z0-9]{5,20}$/.test(settingMap.google_tag_manager?.containerId ?? '')
          ? { containerId: settingMap.google_tag_manager.containerId, enabled: true }
          : { containerId: null, enabled: false },
        listings: properties.rows,
      };
    });
  }
}
