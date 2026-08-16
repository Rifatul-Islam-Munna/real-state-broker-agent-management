import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { TenantRoles } from '../security/tenant-roles.decorator';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { StripeCheckoutService } from './stripe-checkout.service';

@Controller('tenant-subscription')
@UseGuards(JwtAuthGuard, TenantRoleGuard)
@TenantRoles(TenantUserRole.Owner)
export class TenantSubscriptionController {
  constructor(
    private readonly subscriptions: TenantSubscriptionService,
    private readonly stripeCheckout: StripeCheckoutService,
  ) {}

  @Get()
  get(@Request() req: any) {
    return this.subscriptions.getForOwner(req.user.userId);
  }

  @Post('checkout-session')
  createCheckoutSession(@Body() dto: any, @Request() req: any) {
    return this.stripeCheckout.createRenewalSession(req.user.userId, dto.planId);
  }
}
