import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantPlanPermissions } from './tenant-plan-permissions.decorator';
import { TenantSmsInboxService } from './tenant-sms-inbox.service';

@Controller('tenant-sms-inbox')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantPlanPermissionGuard)
@TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
export class TenantSmsInboxController {
  constructor(private readonly sms: TenantSmsInboxService) {}

  @Get()
  list(
    @Req() req: any,
    @Query('id') id?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('direction') direction?: string,
  ) {
    return this.sms.list(req.tenant, {
      id: Number(id) || undefined,
      page: Number(page) || undefined,
      pageSize: Number(pageSize) || undefined,
      search,
      direction,
    });
  }

  @Post('send')
  send(
    @Req() req: any,
    @Body() body: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.sms.send(
      req.tenant,
      body,
      this.actor(req.user),
      idempotencyKey,
    );
  }

  @Post('sync')
  sync(@Req() req: any) {
    return this.sms.syncTenant(req.tenant, true);
  }

  @Get('sync-status')
  status(@Req() req: any) {
    return this.sms.getStatus(req.tenant);
  }

  private actor(user: any) {
    return `${user?.fullName || user?.email || 'Tenant workspace'}`.trim();
  }
}
