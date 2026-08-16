import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantHostResolverService } from './tenant-host-resolver.service';
import { TenantOutreachService } from './tenant-outreach.service';

@ApiTags('Public Tenant Workspace')
@Controller('public-tenant-workspace')
export class TenantPublicWorkspaceController {
  constructor(
    private readonly tenantHosts: TenantHostResolverService,
    private readonly workspace: TenantOutreachService,
  ) {}

  @Get('homepage-settings')
  async homepageSettings(@Req() request: any) {
    const tenant = await this.tenantHosts.resolveRequest(request);
    return this.workspace.getHomepageSettings(tenant);
  }

  @Get('marketing-settings')
  async marketingSettings(@Req() request: any) {
    const tenant = await this.tenantHosts.resolveRequest(request);
    return this.workspace.getMarketingSettings(tenant);
  }

  @Get('agency-settings')
  async agencySettings(@Req() request: any) {
    const tenant = await this.tenantHosts.resolveRequest(request);
    const settings: any = await this.workspace.getAgencySettings(tenant);
    return {
      profile: settings.profile ?? {},
      updatedAt: settings.updatedAt ?? null,
    };
  }
}
