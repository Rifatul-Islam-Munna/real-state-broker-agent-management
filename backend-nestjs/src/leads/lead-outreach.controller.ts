import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
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
  async getSchedule() {
    return this.outreachService.getSchedule();
  }

  @Get('call-script')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get call script' })
  async getCallScript() {
    return this.outreachService.getCallScript();
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
