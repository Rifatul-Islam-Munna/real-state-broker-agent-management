import { BadRequestException, Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { parseDateTimeInZone } from '../common/time-zone';

@ApiTags('Leads')
@Controller('lead-history')
export class LeadHistoryController {
  constructor(private readonly leadsService: LeadsService, private readonly scheduling: SchedulingSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lead history' })
  async getHistory(@Query('leadId') leadId: number) {
    return this.leadsService.getHistory(leadId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create lead history entry' })
  async createHistory(@Body() dto: any) {
    if (!dto?.scheduledAt) return this.leadsService.createHistory(dto);
    const date = parseDateTimeInZone(dto.scheduledAt, await this.scheduling.getTimeZone());
    if (!date) throw new BadRequestException('Scheduled date and time are invalid.');
    return this.leadsService.createHistory({ ...dto, scheduledAt: date.toISOString() });
  }
}
