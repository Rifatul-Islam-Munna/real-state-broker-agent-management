import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

@Controller('tenant-workspace-public/integrations/gmail')
export class TenantGmailOauthController {
  constructor(
    private readonly settings: TenantWorkspaceSettingsService,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    const result = await this.settings.completeGmailConnect(code, state);
    const redirect = new URL(
      this.platformDomain.getTenantFrontendUrl(
        result.tenant.subdomain,
        result.returnTo,
      ),
    );
    redirect.searchParams.set('gmail', 'connected');
    redirect.searchParams.set('account', result.email);
    return response.redirect(redirect.toString());
  }
}
