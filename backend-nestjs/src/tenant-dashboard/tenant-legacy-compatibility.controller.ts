import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantLegacyCompatibilityService } from './tenant-legacy-compatibility.service';

@Controller('tenant-legacy')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard)
export class TenantLegacyCompatibilityController {
  constructor(private readonly legacy: TenantLegacyCompatibilityService) {}

  @Get('dashboard/summary')
  dashboard(@Req() req: any) {
    return this.legacy.dashboardSummary(req.tenant);
  }

  @Get('properties')
  properties(@Req() req: any, @Query() query: any) {
    return this.legacy.listProperties(req.tenant, query);
  }

  @Post('properties')
  createProperty(@Req() req: any, @Body() body: any) {
    return this.legacy.createProperty(req.tenant, body, req.user.userId ?? req.user.id);
  }

  @Patch('properties')
  updateProperty(@Req() req: any, @Body() body: any) {
    return this.legacy.updateProperty(req.tenant, body);
  }

  @Delete('properties')
  deleteProperty(@Req() req: any, @Body() body: any) {
    return this.legacy.deleteProperty(req.tenant, body);
  }

  @Get('leads')
  leads(@Req() req: any, @Query() query: any) {
    return this.legacy.listLeads(req.tenant, query);
  }

  @Post('leads')
  createLead(@Req() req: any, @Body() body: any) {
    return this.legacy.createLead(req.tenant, body, req.user.userId ?? req.user.id);
  }

  @Patch('leads')
  updateLead(@Req() req: any, @Body() body: any) {
    return this.legacy.updateLead(req.tenant, body);
  }

  @Delete('leads')
  deleteLead(@Req() req: any, @Body() body: any) {
    return this.legacy.deleteLead(req.tenant, body);
  }

  @Get('showings')
  showings(@Req() req: any, @Query() query: any) {
    return this.legacy.listShowings(req.tenant, query);
  }

  @Get('documents/summary')
  documentSummary(@Req() req: any) {
    return this.legacy.documentSummary(req.tenant);
  }

  @Get('sync-status')
  syncStatus() {
    return this.legacy.syncStatus();
  }

  @Get('lead-collection-fields')
  leadCollectionFields() {
    return this.legacy.leadCollectionFields();
  }

  @Get('sequence-summary')
  sequenceSummary() {
    return this.legacy.sequenceSummary();
  }

  @Get('singleton/:resource')
  singleton(@Req() req: any, @Param('resource') resource: string) {
    return this.legacy.singletonGet(req.tenant, resource);
  }

  @Patch('singleton/:resource')
  saveSingleton(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.singletonSave(req.tenant, resource, body);
  }

  @Post('singleton/:resource')
  createSingleton(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.singletonSave(req.tenant, resource, body);
  }

  @Get('resource/:resource')
  genericList(@Req() req: any, @Param('resource') resource: string, @Query() query: any) {
    return this.legacy.genericList(req.tenant, resource, query);
  }

  @Post('resource/:resource')
  genericCreate(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.genericCreate(req.tenant, resource, body);
  }

  @Patch('resource/:resource')
  genericUpdate(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.genericUpdate(req.tenant, resource, body);
  }

  @Delete('resource/:resource')
  genericDelete(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.genericDelete(req.tenant, resource, body);
  }

  @Post('resource/:resource/import')
  genericImport(@Req() req: any, @Param('resource') resource: string, @Body() body: any) {
    return this.legacy.importGeneric(req.tenant, resource, body);
  }
}
