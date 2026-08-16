import { Body, Controller, Delete, Get, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantPropertyOperationsService } from './tenant-property-operations.service';

@Controller('tenant-property-operations')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard)
export class TenantPropertyOperationsController {
  constructor(private readonly operations: TenantPropertyOperationsService) {}

  @Get('modules') modules() { return this.operations.listModules(); }

  @Get('workspaces')
  workspaces(@Request() req: any) { return this.operations.listWorkspaces(req.tenant); }

  @Post('import')
  importProperties(@Request() req: any, @Body() body: any) {
    return this.operations.importProperties(req.tenant, body?.properties);
  }

  @Get('records')
  records(@Request() req: any, @Query('propertyId') propertyId: string, @Query('moduleKey') moduleKey?: string) {
    return this.operations.listRecords(req.tenant, Number(propertyId), moduleKey);
  }

  @Post('records/save')
  saveRecord(@Request() req: any, @Body() body: any) {
    return this.operations.saveRecord(req.tenant, body);
  }

  @Delete('records')
  deleteRecord(@Request() req: any, @Query('id') id: string) {
    return this.operations.deleteRecord(req.tenant, Number(id));
  }

  @Get('settings')
  settings(@Request() req: any) { return this.operations.getSettings(req.tenant); }

  @Patch('settings')
  updateSettings(@Request() req: any, @Body() body: any) {
    return this.operations.updateSettings(req.tenant, body);
  }

  @Get('analytics')
  analytics(@Request() req: any, @Query('propertyId') propertyId?: string) {
    return this.operations.getAnalytics(req.tenant, propertyId ? Number(propertyId) : undefined);
  }

  @Get('activity')
  activity(@Request() req: any, @Query('propertyId') propertyId?: string) {
    return this.operations.getActivity(req.tenant, propertyId ? Number(propertyId) : undefined);
  }
}
