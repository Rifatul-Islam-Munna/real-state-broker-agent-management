import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantDashboardService } from './tenant-dashboard.service';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantStaffPermissionGuard } from './tenant-staff-permission.guard';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantPlanPermissions } from './tenant-plan-permissions.decorator';
import { TenantRealtorWorkflowService } from './tenant-realtor-workflow.service';

@Controller('tenant-dashboard')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantStaffPermissionGuard, TenantPlanPermissionGuard, TenantRoleGuard)
export class TenantDashboardController {
  constructor(
    private readonly dashboard: TenantDashboardService,
    private readonly workflows: TenantRealtorWorkflowService,
  ) {}

  @Get('context')
  context(@Req() req: any) {
    return this.dashboard.context(req.tenant);
  }

  @Get('overview')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  overview(@Req() req: any) {
    return this.dashboard.overview(req.tenant);
  }

  @Get('properties')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  properties(@Req() req: any) {
    return this.dashboard.listProperties(req.tenant);
  }

  @Post('properties')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  createProperty(@Req() req: any, @Body() body: any) {
    return this.dashboard.createProperty(req.tenant, body, req.user.id);
  }

  @Patch('properties/:id/status')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  updatePropertyStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.dashboard.updatePropertyStatus(
      req.tenant,
      Number(id),
      body?.status,
      req.user.id,
    );
  }

  @Get('leads')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  leads(@Req() req: any) {
    return this.dashboard.listLeads(req.tenant);
  }

  @Post('leads')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  createLead(@Req() req: any, @Body() body: any) {
    return this.dashboard.createLead(req.tenant, body, req.user.id);
  }

  @Patch('leads/:id/properties')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  updateLeadProperties(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.dashboard.updateLeadProperties(
      req.tenant,
      Number(id),
      body?.propertyIds,
      req.user.id,
    );
  }

  @Get('settings')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  settings(@Req() req: any) {
    return this.dashboard.getSettings(req.tenant);
  }

  @Patch('settings/profile')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  updateProfile(@Req() req: any, @Body() body: any) {
    return this.dashboard.updateProfile(req.tenant, body);
  }

  @Patch('settings/tracking')
  @TenantRoles(TenantUserRole.Owner)
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  updateTracking(@Req() req: any, @Body() body: any) {
    return this.dashboard.updateTracking(req.tenant, body);
  }

  @Patch('settings/subdomain')
  @TenantRoles(TenantUserRole.Owner)
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  updateSubdomain(@Req() req: any, @Body() body: any) {
    return this.dashboard.updateSubdomain(req.tenant, body?.subdomain);
  }

  @Get('owner-reports')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  ownerReports(@Req() req: any) {
    return this.workflows.listOwnerReports(req.tenant);
  }

  @Get('owner-reports/:id')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  ownerReport(@Req() req: any, @Param('id') id: string) {
    return this.workflows.ownerReport(req.tenant, Number(id));
  }

  @Post('owner-reports')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  sendOwnerReport(@Req() req: any, @Body() body: any) {
    return this.workflows.sendOwnerReport(req.tenant, body, req.user);
  }

  @Get('showing-form-templates')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  showingTemplates(@Req() req: any) {
    return this.workflows.listShowingTemplates(req.tenant);
  }

  @Post('showing-form-templates')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  createShowingTemplate(@Req() req: any, @Body() body: any) {
    return this.workflows.createShowingTemplate(req.tenant, body, req.user);
  }

  @Get('showing-requests')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  showingRequests(@Req() req: any) {
    return this.workflows.listShowingRequests(req.tenant);
  }

  @Get('showing-requests/:id')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  showingRequest(@Req() req: any, @Param('id') id: string) {
    return this.workflows.showingRequest(req.tenant, Number(id));
  }

  @Post('showing-requests')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  createShowingRequest(@Req() req: any, @Body() body: any) {
    return this.workflows.createShowingRequest(req.tenant, body, req.user);
  }

  @Patch('showing-requests/:id/approve')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  approveShowingRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workflows.approveShowingRequest(
      req.tenant,
      Number(id),
      body,
      req.user,
    );
  }

  @Patch('showing-requests/:id/reject')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  rejectShowingRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workflows.rejectShowingRequest(
      req.tenant,
      Number(id),
      body,
      req.user,
    );
  }

  @Get('showings')
  @TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
  showings(@Req() req: any) {
    return this.workflows.listShowings(req.tenant);
  }
}

