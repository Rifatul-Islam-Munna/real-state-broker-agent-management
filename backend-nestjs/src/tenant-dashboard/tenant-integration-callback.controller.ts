import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { TenantIntegrationOAuthService } from './tenant-integration-oauth.service';

@ApiExcludeController()
@Controller('public-tenant-integrations')
export class TenantIntegrationCallbackController {
  constructor(private readonly oauth: TenantIntegrationOAuthService) {}

  @Get('gmail/callback')
  async gmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: any,
  ) {
    const redirectUrl = await this.oauth.completeGmailConnect(code, state);
    return response.redirect(302, redirectUrl);
  }
}
