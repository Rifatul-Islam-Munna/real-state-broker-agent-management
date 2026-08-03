import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantPlanPermissions } from './tenant-plan-permissions.decorator';

@Controller('tenant-dashboard')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantPlanPermissionGuard)
export class TenantDashboardController {
  constructor(private readonly dashboard: TenantDashboardService) {}
  @Get('context') context(@Request() req: any) { return this.dashboard.context(req.tenant); }
  @Get('overview') @TenantPlanPermissions('normal-dashboard','property-management-dashboard') overview(@Request() req: any) { return this.dashboard.overview(req.tenant); }
  @Get('profile') profile(@Request() req: any) { return this.dashboard.profile(req.tenant); }
  @Patch('profile') updateProfile(@Request() req: any, @Body() dto: any) { return this.dashboard.updateProfile(req.tenant, dto); }
  @Patch('subdomain') updateSubdomain(@Request() req: any, @Body('subdomain') subdomain: string) { return this.dashboard.updateSubdomain(req.tenant, subdomain); }
  @Get('properties') @TenantPlanPermissions('property-management-dashboard') properties(@Request() req: any) { return this.dashboard.listProperties(req.tenant); }
  @Post('properties') @TenantPlanPermissions('property-management-dashboard') createProperty(@Request() req: any, @Body() dto: any) { return this.dashboard.createProperty(req.tenant, dto, req.user.userId); }
  @Get('leads') @TenantPlanPermissions('property-management-dashboard') leads(@Request() req: any) { return this.dashboard.listLeads(req.tenant); }
  @Post('leads') @TenantPlanPermissions('property-management-dashboard') createLead(@Request() req: any, @Body() dto: any) { return this.dashboard.createLead(req.tenant, dto, req.user.userId); }
}
