import { Body, Controller, Get, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationWorkspaceService } from './integration-workspace.service';
import { SchedulingSettingsService } from './scheduling-settings.service';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
    private readonly integrationWorkspaceService: IntegrationWorkspaceService,
  ) {}

  @Get('agency-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch editable agency settings for admin' })
  async getAgencySettings() {
    return this.settingsService.getAdminSettings();
  }

  @Patch('agency-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update editable agency settings' })
  async updateAgencySettings(@Body() dto: any) {
    const scheduling = await this.schedulingSettingsService.getSettings();
    const updated = await this.settingsService.updateSettings(dto);
    await this.schedulingSettingsService.updateSettings(scheduling);
    return updated;
  }

  @Get('public/agency-settings')
  @ApiOperation({ summary: 'Fetch public agency branding and contact settings' })
  async getPublicAgencySettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get('settings/integrations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch write-only integration status for admin settings' })
  async getIntegrationSettings() {
    return this.settingsService.getIntegrationStatus();
  }

  @Patch('settings/integrations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Write or clear integration settings' })
  async updateIntegrationSettings(@Body() dto: any) {
    return this.settingsService.updateIntegration(dto);
  }

  @Get('settings/integrations/workspace')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get sanitized integration workspace status' })
  async getWorkspace() {
    return this.integrationWorkspaceService.getStatus();
  }

  @Patch('settings/integrations/workspace')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update integration workspace safely' })
  async updateWorkspace(@Body() dto: any) {
    return this.integrationWorkspaceService.update(dto);
  }

  @Post('settings/integrations/gmail/connect-url')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Gmail OAuth connect URL' })
  async getGmailConnectUrl(@Body() dto: any) {
    return this.settingsService.getGmailConnectUrl(dto);
  }

  @Get('settings/integrations/gmail/callback')
  @ApiOperation({ summary: 'Complete Gmail OAuth connection' })
  async completeGmailConnect(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const redirectUrl = await this.settingsService.completeGmailConnect(code, state);
    return res.redirect(redirectUrl);
  }

  @Get('settings/scheduling')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get agency timezone and scheduling preferences' })
  async getSchedulingSettings() {
    return this.schedulingSettingsService.getSettings();
  }

  @Patch('settings/scheduling')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update agency timezone and scheduling preferences' })
  async updateSchedulingSettings(@Body() dto: any) {
    return this.schedulingSettingsService.updateSettings(dto);
  }
}
