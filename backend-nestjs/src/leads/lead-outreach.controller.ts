import { Controller, Get, Post, Body, Query, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { LeadOutreachService } from './lead-outreach.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('lead-outreach')
export class LeadOutreachController {
  constructor(private readonly outreachService: LeadOutreachService) {}

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

  @Get('call-script')
  @ApiOperation({ summary: 'Get call script' })
  async getCallScript(
    @Query('historyEntryId') historyEntryId: number | undefined,
    @Query('provider') provider: string | undefined,
    @Query('message') message: string | undefined,
    @Query('title') title: string | undefined,
    @Res() res: any,
  ) {
    const xml = await this.outreachService.getCallScript(historyEntryId, provider, message, title);
    if (!xml) {
      throw new NotFoundException();
    }
    return res.type('application/xml; charset=utf-8').send(xml);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send outreach' })
  async sendOutreach(@Body() dto: any) {
    return this.outreachService.sendOutreach(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send bulk outreach' })
  async sendBulkOutreach(@Body() dto: any) {
    return this.outreachService.sendBulkOutreach(dto);
  }
}
