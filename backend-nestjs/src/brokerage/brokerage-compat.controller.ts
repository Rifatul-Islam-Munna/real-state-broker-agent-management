import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BrokerageService } from './brokerage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { paginated, toInt } from '../common/api-contract';

@Controller()
export class BrokerageCompatController {
  constructor(private readonly brokerageService: BrokerageService) {}

  @Get('website-inquiries')
  @UseGuards(JwtAuthGuard)
  async getWebsiteInquiries(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
  ) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const rows = await this.brokerageService.getWebsiteInquiries(undefined, undefined);
    const normalizedSearch = (search ?? '').trim().toLowerCase();
    const filtered = normalizedSearch
      ? rows.filter((item: any) => [
          item.contactName,
          item.contactEmail,
          item.contactPhone,
          item.propertyTitle,
          item.source,
          item.summary,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)))
      : rows;
    return paginated(filtered.slice((page - 1) * pageSize, page * pageSize), filtered.length, page, pageSize);
  }

  @Post('showings')
  async createShowing(@Body() dto: any) {
    return this.brokerageService.createShowing(dto);
  }

  @Get('showings')
  @UseGuards(JwtAuthGuard)
  async getShowings(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: any,
    @Query('agentId') agentId?: number,
    @Query('propertyId') propertyId?: number,
  ) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const rows = await this.brokerageService.getShowings(agentId, status, propertyId);
    return paginated(rows.slice((page - 1) * pageSize, page * pageSize), rows.length, page, pageSize);
  }

  @Patch('showings')
  @UseGuards(JwtAuthGuard)
  async updateShowing(@Body() dto: any) {
    return this.brokerageService.updateShowingStatus(dto.id, dto.status, dto.notes);
  }

  @Get('showings/availability')
  async getAvailability(@Query('propertyId') propertyId: number, @Query('date') date: string) {
    const result = await this.brokerageService.getAvailability(propertyId, new Date(date));
    return result;
  }

  @Get('brokerage/approvals')
  @UseGuards(JwtAuthGuard)
  async getApprovals(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: any,
  ) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const rows = await this.brokerageService.getApprovals(status, undefined);
    return paginated(rows.slice((page - 1) * pageSize, page * pageSize), rows.length, page, pageSize);
  }

  @Patch('brokerage/approvals')
  @UseGuards(JwtAuthGuard)
  async reviewApproval(@Body() dto: any) {
    return this.brokerageService.reviewApproval(dto.approvalId, dto);
  }

  @Get('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  async getAssignmentRules() {
    return this.brokerageService.getAssignmentRules();
  }

  @Patch('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  async saveAssignmentRule(@Body() dto: any) {
    return dto.id
      ? this.brokerageService.updateAssignmentRule(dto.id, dto)
      : this.brokerageService.createAssignmentRule(dto);
  }

  @Delete('lead-assignment-rules')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async deleteAssignmentRule(@Query('id') id: number) {
    await this.brokerageService.deleteAssignmentRule(id);
  }

  @Get('reports/brokerage')
  @UseGuards(JwtAuthGuard)
  async getReports() {
    return this.brokerageService.getBrokerageReports();
  }
}
