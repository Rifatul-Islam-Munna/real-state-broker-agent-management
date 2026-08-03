import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaasAdminService } from './saas-admin.service';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Controller('super-admin-management')
@UseGuards(JwtAuthGuard)
export class SaasAdminController {
  constructor(
    private readonly service: SaasAdminService,
    private readonly provisioning: TenantProvisioningService,
  ) {}

  @Get('plans') listPlans() { return this.service.listPlans(); }
  @Post('plans') createPlan(@Body() dto: any, @Request() req: any) { return this.service.createPlan(dto, req.user.userId); }
  @Patch('plans/:id') updatePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Request() req: any) { return this.service.updatePlan(id, dto, req.user.userId); }
  @Patch('plans/:id/status') setPlanStatus(@Param('id', ParseIntPipe) id: number, @Body('isActive') isActive: boolean, @Request() req: any) { return this.service.setPlanActive(id, Boolean(isActive), req.user.userId); }
  @Delete('plans/:id') deletePlan(@Param('id', ParseIntPipe) id: number, @Request() req: any) { return this.service.deletePlan(id, req.user.userId); }

  @Get('tenants') listTenants() { return this.service.listTenants(); }
  @Post('tenants') createTenant(@Body() dto: any, @Request() req: any) { return this.provisioning.provisionManually(dto, req.user.userId); }
  @Patch('tenants/:id/block') blockTenant(@Param('id', ParseIntPipe) id: number, @Body('isBlocked') isBlocked: boolean, @Request() req: any) { return this.service.setTenantBlocked(id, Boolean(isBlocked), req.user.userId); }
  @Patch('tenants/:id/extend') extendTenant(@Param('id', ParseIntPipe) id: number, @Body('days', ParseIntPipe) days: number, @Request() req: any) { return this.service.extendTenantSubscription(id, days, req.user.userId); }

  @Get('audit-logs') listAuditLogs() { return this.service.listAuditLogs(); }
}
