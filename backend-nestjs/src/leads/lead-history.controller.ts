import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('lead-history')
export class LeadHistoryController {
  constructor(private readonly leadsService: LeadsService) {}

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
    return this.leadsService.createHistory(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update lead history entry' })
  async updateHistory(@Body() dto: any) {
    return dto;
  }
}
