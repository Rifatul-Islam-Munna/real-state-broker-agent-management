import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantStaffPermissionGuard } from './tenant-staff-permission.guard';
import { TenantInboxSyncService } from './tenant-inbox-sync.service';
import { TenantMailInboxService } from './tenant-mail-inbox.service';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantPlanPermissions } from './tenant-plan-permissions.decorator';

@Controller('tenant-inbox')
@UseGuards(JwtAuthGuard, AuthenticatedTenantGuard, TenantStaffPermissionGuard, TenantPlanPermissionGuard)
@TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
export class TenantInboxController {
  constructor(
    private readonly inbox: TenantInboxSyncService,
    private readonly mail: TenantMailInboxService,
  ) {}

  @Get()
  list(
    @Req() req: any,
    @Query('id') id?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('mailboxTag') mailboxTag?: string,
    @Query('isRead') isRead?: string,
    @Query('isStarred') isStarred?: string,
  ) {
    return this.mail.list(req.tenant, {
      id: Number(id) || undefined,
      page: Number(page) || undefined,
      pageSize: Number(pageSize) || undefined,
      search,
      status,
      mailboxTag,
      isRead,
      isStarred,
    });
  }

  @Post('send')
  send(
    @Req() req: any,
    @Body() body: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.mail.send(
      req.tenant,
      body,
      this.actor(req.user),
      idempotencyKey,
    );
  }

  @Post('convert-to-lead')
  convertToLead(@Req() req: any, @Body() body: any) {
    return this.mail.convertToLead(req.tenant, Number(body?.mailInboxId));
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.mail.create(req.tenant, body);
  }

  @Patch()
  update(@Req() req: any, @Body() body: any) {
    return this.mail.update(req.tenant, body);
  }

  @Delete()
  delete(@Req() req: any, @Query('id') id?: string) {
    return this.mail.delete(req.tenant, Number(id));
  }

  @Get('sync-status')
  status(@Req() req: any) {
    return this.inbox.getStatus(req.tenant);
  }

  @Post('sync')
  sync(@Req() req: any) {
    return this.inbox.syncTenant(req.tenant, true);
  }

  @Post('sync-range')
  syncRange(@Req() req: any, @Body() body: any) {
    const first = new Date(body?.fromDate);
    const second = new Date(body?.toDate);
    if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) {
      throw new BadRequestException('Valid fromDate and toDate values are required.');
    }
    if (first.getTime() === second.getTime()) {
      throw new BadRequestException('The sync range must include more than one instant.');
    }
    const fromDate = first < second ? first : second;
    const toDate = first < second ? second : first;
    return this.inbox.syncTenantRange(req.tenant, fromDate, toDate);
  }

  private actor(user: any) {
    return `${user?.fullName || user?.email || 'Tenant workspace'}`.trim();
  }
}

