import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { UpdateSettingsDto } from '../dto/settings.dto';
import { MODULE_CATALOG } from '../module-catalog';
import { ActivityService } from '../services/activity.service';
import { InsightsService } from '../services/insights.service';
import { RecordService } from '../services/record.service';
import { SettingsService } from '../services/settings.service';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class ManagementController {
  constructor(
    private readonly settings: SettingsService,
    private readonly insights: InsightsService,
    private readonly records: RecordService,
    private readonly activity: ActivityService,
  ) {}

  @Get('modules')
  modules() {
    return Object.entries(MODULE_CATALOG).map(([id, item]) => ({ id, label: item[0], category: item[1], recordTypes: item[2] }));
  }

  @Get('settings')
  getSettings() {
    return this.settings.get();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  @Get('analytics')
  analytics(@Query('propertyId') propertyId?: string) {
    return this.insights.analytics(propertyId ? Number(propertyId) : undefined);
  }

  @Get('ai/summary')
  assistant(@Query('propertyId') propertyId?: string) {
    return this.insights.assistant(propertyId ? Number(propertyId) : undefined);
  }

  @Get('activity')
  activityLog(@Query('propertyId') propertyId?: string) {
    return this.activity.list(propertyId ? Number(propertyId) : undefined);
  }

  @Post('recurring-maintenance/run')
  generateRecurring(@Query('propertyId') propertyId?: string) {
    return this.records.generateRecurring(propertyId ? Number(propertyId) : undefined);
  }
}
