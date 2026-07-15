import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { parseDateTimeInZone } from '../common/time-zone';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { LeadOutreachService } from './lead-outreach.service';

@ApiTags('Leads')
@Controller('lead-outreach')
export class LeadOutreachController {
  constructor(
    private readonly outreachService: LeadOutreachService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
  ) {}

  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get outreach templates' })
  async getTemplates() {
    return this.outreachService.getTemplates();
  }

  @Get('schedule')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get outreach schedule' })
  async getSchedule(
    @Query('leadId') leadId?: number,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
  ) {
    return this.outreachService.getSchedule(leadId, kind, status);
  }

  @Patch('schedule/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pause, resume, or cancel scheduled outreach' })
  async updateScheduleStatus(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'paused' | 'cancelled',
  ) {
    return this.outreachService.updateScheduleStatus(Number(id), status);
  }

  @Patch('schedule-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pause, resume, or cancel scheduled outreach from request body' })
  async updateScheduleStatusFromBody(
    @Body('id') id: number,
    @Body('status') status: 'active' | 'paused' | 'cancelled',
  ) {
    return this.outreachService.updateScheduleStatus(Number(id), status);
  }

  @Patch('replies/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark inbound lead replies as read or unread' })
  async markRepliesRead(
    @Body('ids') ids: number[],
    @Body('isRead') isRead?: boolean,
  ) {
    return this.outreachService.markRead(ids, isRead !== false);
  }

  @Get('call-script')
  @ApiOperation({ summary: 'Get call script' })
  async getCallScript(
    @Query('historyEntryId') historyEntryId: number | undefined,
    @Query('provider') provider: string | undefined,
    @Query('message') message: string | undefined,
    @Query('title') title: string | undefined,
    @Res() res: any,
  ) {
    const xml = await this.outreachService.getCallScript(
      historyEntryId,
      provider,
      message,
      title,
    );
    if (!xml) throw new NotFoundException();
    return res.type('application/xml; charset=utf-8').send(xml);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send outreach' })
  async sendOutreach(@Body() dto: any) {
    return this.outreachService.sendOutreach(await this.normalizeSchedule(dto));
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send bulk outreach' })
  async sendBulkOutreach(@Body() dto: any) {
    return this.outreachService.sendBulkOutreach(await this.normalizeSchedule(dto));
  }

  private async normalizeSchedule(dto: any) {
    if (!dto?.scheduledAt) return dto;

    const timeZone = await this.schedulingSettingsService.getTimeZone();
    const scheduledAt = parseDateTimeInZone(dto.scheduledAt, timeZone);

    return {
      ...dto,
      scheduledAt: scheduledAt?.toISOString() ?? null,
    };
  }
}
