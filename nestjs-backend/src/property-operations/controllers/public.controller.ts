import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateCheckoutDto, VerifyCheckoutDto } from '../dto/payment.dto';
import { SubmitPublicRequestDto } from '../dto/public-access.dto';
import { PaymentService } from '../services/payment.service';
import { PublicAccessService } from '../services/public-access.service';

@Controller('property-operations/public')
export class PublicController {
  constructor(
    private readonly publicAccess: PublicAccessService,
    private readonly payments: PaymentService,
  ) {}

  @Get(':token')
  getRequest(@Param('token') token: string) {
    return this.publicAccess.getPublic(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitPublicRequestDto) {
    return this.publicAccess.submit(token, dto);
  }

  @Post(':token/checkout')
  createCheckout(@Param('token') token: string, @Body() dto: CreateCheckoutDto) {
    return this.payments.createCheckout(token, dto);
  }

  @Post(':token/checkout/verify')
  verifyCheckout(@Param('token') token: string, @Body() dto: VerifyCheckoutDto) {
    return this.payments.verifyCheckout(token, dto);
  }
}
