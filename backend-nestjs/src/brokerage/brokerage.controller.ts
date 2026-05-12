import { Controller, Get, Patch, Body, UseGuards, Delete, Post, Query } from '@nestjs/common';
import { BrokerageService } from './brokerage.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Brokerage')
@Controller()
export class BrokerageController {
  constructor(private readonly brokerageService: BrokerageService) {}

  @Post('showings')
  @ApiOperation({ summary: 'Schedule a showing' })
  async createShowing(@Body() dto: any) {
    return this.brokerageService.createShowing(dto);
  }

  @Get('showings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all showings' })
  async getShowings() {
    return this.brokerageService.getShowings();
  }

  @Get('showings/availability')
  @ApiOperation({ summary: 'Get showing availability' })
  async getAvailability(@Query('propertyId') propertyId: number) {
    return this.brokerageService.getAvailability(propertyId);
  }

  @Patch('showings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update showing' })
  async updateShowing(@Body() dto: any) {
    return dto;
  }

  @Get('brokerage/approvals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get brokerage approvals' })
  async getApprovals() {
    return this.brokerageService.getApprovals();
  }

  @Patch('brokerage/approvals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update brokerage approval' })
  async updateApproval(@Body() dto: any) {
      return dto;
  }

  @Get('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lead assignment rules' })
  async getAssignmentRules() {
    return this.brokerageService.getAssignmentRules();
  }

  @Patch('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update lead assignment rule' })
  async updateAssignmentRule(@Body() dto: any) {
      return dto;
  }

  @Delete('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete lead assignment rule' })
  async deleteAssignmentRule(@Query('id') id: number) {
    return this.brokerageService.deleteAssignmentRule(id);
  }

  @Get('reports/brokerage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get brokerage reports' })
  async getReports() {
    return this.brokerageService.getReports();
  }

  @Get('website-inquiries')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get website inquiries' })
  async getWebsiteInquiries() {
    return this.brokerageService.getWebsiteInquiries();
  }
}
