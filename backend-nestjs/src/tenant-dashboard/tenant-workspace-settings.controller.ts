import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantPlanPermissions } from './tenant-plan-permissions.decorator';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Controller('tenant-workspace')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantPlanPermissionGuard)
@TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
export class TenantWorkspaceSettingsController {
  constructor(private readonly settings: TenantWorkspaceSettingsService) {}

  @Get('agency-settings')
  getAgencySettings(@Req() req: any) {
    return this.settings.getAgencySettings(req.tenant);
  }

  @Patch('agency-settings')
  updateAgencySettings(@Req() req: any, @Body() body: any) {
    return this.settings.updateAgencySettings(req.tenant, body);
  }

  @Get('scheduling')
  getScheduling(@Req() req: any) {
    return this.settings.getScheduling(req.tenant);
  }

  @Patch('scheduling')
  updateScheduling(@Req() req: any, @Body() body: any) {
    return this.settings.updateScheduling(req.tenant, body);
  }

  @Get('integrations/workspace')
  getIntegrations(@Req() req: any) {
    return this.settings.getIntegrations(req.tenant);
  }

  @Patch('integrations/workspace')
  updateIntegrations(@Req() req: any, @Body() body: any) {
    return this.settings.updateIntegrations(req.tenant, body);
  }

  @Post('integrations/health')
  integrationHealth(@Req() req: any) {
    return this.settings.integrationHealth(req.tenant);
  }

  @Post('integrations/gmail/connect-url')
  gmailConnectUrl(@Req() req: any, @Body() body: any) {
    return this.settings.getGmailConnectUrl(req.tenant, body);
  }

  @Get('pdf-templates')
  pdfTemplates(@Query('page') page = '1', @Query('pageSize') pageSize = '200') {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(200, Math.max(1, Number(pageSize) || 200));
    return {
      items: [],
      totalCount: 0,
      page: safePage,
      pageSize: safePageSize,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }
}
