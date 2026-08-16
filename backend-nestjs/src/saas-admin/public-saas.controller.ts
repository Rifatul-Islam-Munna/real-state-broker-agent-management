import { Body, Controller, Get, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SaasAdminService } from './saas-admin.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';

@Controller('public-saas')
export class PublicSaasController {
  constructor(
    private readonly service: SaasAdminService,
    private readonly stripeCheckout: StripeCheckoutService,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  @Get('plans')
  listActivePlans() {
    return this.service.listActivePublicPlans();
  }

  @Get('platform-domain')
  getPlatformDomain() {
    return { primaryDomain: this.platformDomain.getPrimaryDomain() };
  }

  @Post('checkout-session')
  createCheckoutSession(@Body() dto: any) {
    return this.stripeCheckout.createPurchaseSession(dto);
  }

  @Post('stripe-webhook')
  @HttpCode(200)
  stripeWebhook(@Req() request: Request, @Headers('stripe-signature') signature?: string) {
    return this.stripeCheckout.handleWebhook(request.body as Buffer, signature);
  }

  @Post('checkout-confirm')
  @HttpCode(200)
  confirmCheckout(@Body() dto: any) {
    return this.stripeCheckout.confirm(dto.sessionId);
  }
}
