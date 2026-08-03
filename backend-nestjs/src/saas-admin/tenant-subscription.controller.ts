import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantSubscriptionService } from './tenant-subscription.service';

@Controller('tenant-subscription')
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@TenantRoles(TenantUserRole.Owner)
export class TenantSubscriptionController {
  constructor(private readonly subscriptions: TenantSubscriptionService) {}

  @Get()
  get(@Request() req: any) {
    return this.subscriptions.getForOwner(req.user.userId);
  }

  @Post('renew')
  renew(@Body() dto: any, @Request() req: any) {
    return this.subscriptions.renewOrRepurchase(req.user.userId, dto);
  }
}
