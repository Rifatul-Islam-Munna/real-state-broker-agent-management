import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { UsersService } from '../users/users.service';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';

@Controller('tenant-staff')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantRoleGuard)
@TenantRoles(TenantUserRole.Owner)
export class TenantStaffController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.users.getTenantStaff(req.tenant.id, includeInactive === 'true');
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.users.createTenantStaff(req.tenant.id, body);
  }
  @Patch()
  update(@Req() req: any, @Body() body: any) {
    return this.users.updateTenantStaff(req.tenant.id, body);
  }

  @Patch('permissions')
  permissions(@Req() req: any, @Body() body: any) {
    return this.users.updateTenantStaffPermissions(req.tenant.id, body);
  }

  @Delete()
  @HttpCode(204)
  async remove(@Req() req: any, @Query('id') id: string) {
    await this.users.deleteTenantStaff(req.tenant.id, Number(id));
  }
}
