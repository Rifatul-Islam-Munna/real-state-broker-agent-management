import { IsString, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @IsUrl({ require_tld: false })
  successUrl: string;

  @IsUrl({ require_tld: false })
  cancelUrl: string;
}

export class VerifyCheckoutDto {
  @IsString()
  sessionId: string;

  @IsString()
  paymentToken: string;
}
