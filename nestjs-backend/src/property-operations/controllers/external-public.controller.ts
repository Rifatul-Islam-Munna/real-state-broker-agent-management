import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExternalPublicService } from '../../core/external-public.service';
import { PaymentService } from '../../shared/payment.service';
import { CreateCheckoutDto, VerifyCheckoutDto } from '../dto/payment.dto';
import { SubmitPublicRequestDto } from '../dto/public-access.dto';

@Controller('property-operations/public')
export class ExternalPublicController {
  constructor(private readonly external: ExternalPublicService, private readonly payments: PaymentService) {}

  @Get(':token')
  getRequest(@Param('token') token: string) { return this.external.getRequest(token); }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitPublicRequestDto) { return this.external.submit(token, dto); }

  @Post(':token/checkout')
  createCheckout(@Param('token') token: string, @Body() dto: CreateCheckoutDto) {
    return this.payments.create(token, dto.successUrl, dto.cancelUrl);
  }

  @Post(':token/checkout/verify')
  verifyCheckout(@Param('token') token: string, @Body() dto: VerifyCheckoutDto) {
    return this.payments.verify(token, dto.sessionId || dto.paymentToken);
  }
}
