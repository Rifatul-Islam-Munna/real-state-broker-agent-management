import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulingSettingsService } from './scheduling-settings.service';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
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
  @ApiOperation({ summary: 'Get integration workspace status' })
  async getWorkspace() {
    return this.settingsService.getWorkspaceStatus();
  }

  @Patch('settings/integrations/workspace')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update integration workspace' })
  async updateWorkspace(@Body() dto: any) {
    return this.settingsService.updateWorkspace(dto);
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
