import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantRequestIsolationGuard } from './tenant-request-isolation.guard';

@ApiTags('Tenant Workspace')
@Controller('tenant-workspace')
@UseGuards(JwtAuthGuard, TenantRequestIsolationGuard)
export class TenantOutreachController {
  constructor(private readonly outreach: TenantOutreachService) {}

  @Get('lead-outreach/templates')
  @ApiOperation({ summary: 'List communication templates from this tenant database' })
  getTemplates(@Req() request: any) {
    return this.outreach.getTemplates(this.tenant(request));
  }

  @Get('lead-outreach/schedule')
  @ApiOperation({ summary: 'List isolated tenant outreach and inbound replies' })
  getSchedule(
    @Req() request: any,
    @Query('leadId') leadId?: number,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
  ) {
    return this.outreach.getSchedule(this.tenant(request), { leadId, kind, status });
  }

  @Post('lead-outreach')
  @ApiOperation({ summary: 'Queue outreach inside this tenant database' })
  queue(@Req() request: any, @Body() input: any) {
    return this.outreach.queueOutreach(this.tenant(request), input);
  }

  @Post('lead-outreach/bulk')
  @ApiOperation({ summary: 'Queue isolated tenant bulk outreach' })
  queueBulk(@Req() request: any, @Body() input: any) {
    return this.outreach.queueBulkOutreach(this.tenant(request), input);
  }

  @Patch('lead-outreach/schedule-status')
  @ApiOperation({ summary: 'Pause, resume, or cancel a tenant outreach job' })
  updateScheduleStatus(
    @Req() request: any,
    @Body('id') id: number,
    @Body('status') status: 'active' | 'paused' | 'cancelled',
  ) {
    return this.outreach.updateScheduleStatus(this.tenant(request), Number(id), status);
  }

  @Patch('lead-outreach/replies/read')
  @ApiOperation({ summary: 'Mark tenant inbound replies read or unread' })
  markRepliesRead(
    @Req() request: any,
    @Body('ids') ids: number[],
    @Body('isRead') isRead?: boolean,
  ) {
    return this.outreach.markRepliesRead(this.tenant(request), ids, isRead !== false);
  }

  @Get('lead-outreach/monitoring')
  @ApiOperation({ summary: 'Monitor tenant outreach queue states' })
  monitoring(@Req() request: any) {
    return this.outreach.monitoring(this.tenant(request));
  }

  @Post('lead-outreach/jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed tenant outreach job' })
  retryJob(@Req() request: any, @Param('id') id: string) {
    return this.outreach.retryJob(this.tenant(request), Number(id));
  }

  @Get('agency-settings')
  getAgencySettings(@Req() request: any) {
    return this.outreach.getAgencySettings(this.tenant(request));
  }

  @Patch('agency-settings')
  updateAgencySettings(@Req() request: any, @Body() input: any) {
    return this.outreach.updateAgencySettings(this.tenant(request), input);
  }

  @Get('settings/integrations/workspace')
  getIntegrationWorkspace(@Req() request: any) {
    return this.outreach.getIntegrationWorkspace(this.tenant(request));
  }

  @Patch('settings/integrations/workspace')
  updateIntegrationWorkspace(@Req() request: any, @Body() input: any) {
    return this.outreach.updateIntegrationWorkspace(this.tenant(request), input);
  }

  @Get('settings/integrations/health')
  async integrationHealth(@Req() request: any) {
    const status = await this.outreach.getIntegrationWorkspace(this.tenant(request));
    const services = {
      email: {
        configured: status.hasSmtpConfig,
        ok: status.hasSmtpConfig,
        message: status.hasSmtpConfig
          ? `Tenant email provider: ${status.smtpProviderName ?? 'configured'}`
          : 'No tenant email provider configured.',
      },
      sms: {
        configured: status.hasCommunicationConfig,
        ok: status.hasCommunicationConfig,
        message: status.hasCommunicationConfig
          ? `Tenant messaging provider: ${status.communicationProviderName ?? 'configured'}`
          : 'No tenant messaging provider configured.',
      },
    };
    return {
      checkedAt: new Date().toISOString(),
      overall:
        services.email.configured || services.sms.configured ? 'healthy' : 'not_configured',
      services,
    };
  }

  @Post('settings/integrations/health')
  integrationHealthPost(@Req() request: any) {
    return this.integrationHealth(request);
  }

  @Get('settings/scheduling')
  getScheduling(@Req() request: any) {
    return this.outreach.getSchedulingSettings(this.tenant(request));
  }

  @Patch('settings/scheduling')
  updateScheduling(@Req() request: any, @Body() input: any) {
    return this.outreach.updateSchedulingSettings(this.tenant(request), input);
  }

  @Get('homepage-settings')
  getHomepageSettings(@Req() request: any) {
    return this.outreach.getHomepageSettings(this.tenant(request));
  }

  @Patch('homepage-settings')
  updateHomepageSettings(@Req() request: any, @Body() input: any) {
    return this.outreach.updateHomepageSettings(this.tenant(request), input);
  }

  @Get('marketing-settings')
  getMarketingSettings(@Req() request: any) {
    return this.outreach.getMarketingSettings(this.tenant(request));
  }

  @Patch('marketing-settings')
  updateMarketingSettings(@Req() request: any, @Body() input: any) {
    return this.outreach.updateMarketingSettings(this.tenant(request), input);
  }

  @Get('leads')
  listLeads(@Req() request: any, @Query() query: any) {
    return this.outreach.listLeads(this.tenant(request), query);
  }

  @Post('leads')
  createLead(@Req() request: any, @Body() input: any) {
    return this.outreach.createLead(this.tenant(request), input);
  }

  @Patch('leads')
  updateLead(@Req() request: any, @Body() input: any) {
    return this.outreach.updateLead(this.tenant(request), input);
  }

  @Delete('leads')
  deleteLead(
    @Req() request: any,
    @Body('id') bodyId?: number,
    @Query('id') queryId?: number,
  ) {
    return this.outreach.deleteLead(this.tenant(request), Number(bodyId ?? queryId));
  }

  @Get('deals')
  listDeals(@Req() request: any, @Query() query: any) {
    return this.outreach.listDeals(this.tenant(request), query);
  }

  @Post('deals')
  createDeal(@Req() request: any, @Body() input: any) {
    return this.outreach.createDeal(this.tenant(request), input);
  }

  @Patch('deals')
  updateDeal(@Req() request: any, @Body() input: any) {
    return this.outreach.updateDeal(this.tenant(request), input);
  }

  @Delete('deals')
  deleteDeal(
    @Req() request: any,
    @Body('id') bodyId?: number,
    @Query('id') queryId?: number,
  ) {
    return this.outreach.deleteDeal(this.tenant(request), Number(bodyId ?? queryId));
  }

  private tenant(request: any) {
    return request.tenant as SaasTenant;
  }
}
