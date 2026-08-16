import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantAccountService } from './tenant-account.service';

@Controller('tenant-account')
@UseGuards(JwtAuthGuard)
export class TenantAccountController {
  constructor(private readonly accounts: TenantAccountService) {}

  @Get('context')
  context(@Request() req: any) {
    return this.accounts.context(req.user);
  }
}
