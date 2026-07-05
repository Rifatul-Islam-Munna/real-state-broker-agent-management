import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { ActivityLogService } from '../../core/activity-log.service';
import { AnalyticsService } from '../../core/analytics.service';
import { AssistantService } from '../../core/assistant.service';
import { RecordService } from '../../core/record.service';
import { SettingsService } from '../../core/settings.service';
import { UpdateSettingsDto } from '../dto/settings.dto';
import { MODULE_CATALOG } from '../module-catalog';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class ManagementController {
  constructor(
    private readonly settings: SettingsService,
    private readonly analyticsService: AnalyticsService,
    private readonly assistantService: AssistantService,
    private readonly records: RecordService,
    private readonly activity: ActivityLogService,
  ) {}

  @Get('modules')
  modules() { return Object.entries(MODULE_CATALOG).map(([id, item]) => ({ id, label: item[0], category: item[1], recordTypes: item[2] })); }

  @Get('settings')
  getSettings() { return this.settings.get(); }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) { return this.settings.update(dto); }

  @Get('analytics')
  analytics(@Query('propertyId') propertyId?: string) { return this.analyticsService.get(propertyId ? Number(propertyId) : undefined); }

  @Get('ai/summary')
  assistant(@Query('propertyId') propertyId?: string) { return this.assistantService.summary(propertyId ? Number(propertyId) : undefined); }

  @Get('activity')
  activityLog(@Query('propertyId') propertyId?: string) { return this.activity.list(propertyId ? Number(propertyId) : undefined); }

  @Post('recurring-maintenance/run')
  generateRecurring(@Query('propertyId') propertyId?: string) { return this.records.generateRecurring(propertyId ? Number(propertyId) : undefined); }
}
