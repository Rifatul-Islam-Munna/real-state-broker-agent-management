import { Body, Controller, Delete, Get, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantDomainService } from './tenant-domain.service';

@Controller('tenant-domain')
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@TenantRoles(TenantUserRole.Owner)
export class TenantDomainController {
  constructor(private readonly domains: TenantDomainService) {}

  @Get()
  get(@Request() req: any) {
    return this.domains.getForOwner(req.user.userId);
  }

  @Put()
  addOrReplace(@Body('hostname') hostname: string, @Request() req: any) {
    return this.domains.addOrReplace(req.user.userId, hostname);
  }

  @Post('verify')
  verify(@Request() req: any) {
    return this.domains.verify(req.user.userId);
  }

  @Delete()
  remove(@Request() req: any) {
    return this.domains.remove(req.user.userId);
  }
}
