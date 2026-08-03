import { Body, Controller, Delete, Get, Patch, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantTrackingService } from './tenant-tracking.service';

@Controller('tenant-tracking')
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@TenantRoles(TenantUserRole.Owner)
export class TenantTrackingController {
  constructor(private readonly tracking: TenantTrackingService) {}
  @Get() get(@Request() req: any) { return this.tracking.getForOwner(req.user.userId); }
  @Put() save(@Body() dto: any, @Request() req: any) { return this.tracking.save(req.user.userId, dto); }
  @Patch('status') setStatus(@Body('enabled') enabled: boolean, @Request() req: any) { return this.tracking.setEnabled(req.user.userId, Boolean(enabled)); }
  @Delete() remove(@Request() req: any) { return this.tracking.remove(req.user.userId); }
}
