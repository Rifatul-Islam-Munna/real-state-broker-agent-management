import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Query, Param } from '@nestjs/common';
import { BrokerageService } from './brokerage.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShowingBookingStatus, ApprovalStatus, ApprovalType, AssignmentRuleType, AuditEntityType, AuditAction } from './entities/brokerage.entity';

@ApiTags('Brokerage')
@Controller('brokerage')
export class BrokerageController {
  constructor(private readonly brokerageService: BrokerageService) {}

  // ============ SHOWING BOOKING ENDPOINTS ============

  @Post('showings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new showing booking' })
  async createShowing(@Body() dto: any) {
    return this.brokerageService.createShowing(dto);
  }

  @Get('showings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all showings with optional filters' })
  async getShowings(
    @Query('agentId') agentId?: number,
    @Query('status') status?: ShowingBookingStatus,
  ) {
    return this.brokerageService.getShowings(agentId, status);
  }

  @Get('showings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get showing by ID' })
  async getShowingById(@Param('id') id: number) {
    return this.brokerageService.getShowingById(id);
  }

  @Get('showings/availability')
  @ApiOperation({ summary: 'Get available time slots for a property' })
  async getAvailability(
    @Query('propertyId') propertyId: number,
    @Query('date') date: string,
  ) {
    return this.brokerageService.getAvailability(propertyId, new Date(date));
  }

  @Patch('showings/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update showing status' })
  async updateShowingStatus(
    @Param('id') id: number,
    @Body() dto: { status: ShowingBookingStatus },
  ) {
    return this.brokerageService.updateShowingStatus(id, dto.status);
  }

  @Delete('showings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete showing' })
  async deleteShowing(@Param('id') id: number) {
    await this.brokerageService.deleteShowing(id);
    return { message: 'Showing deleted successfully' };
  }

  // ============ LEAD ASSIGNMENT ENDPOINTS ============

  @Post('assignment-rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new lead assignment rule' })
  async createAssignmentRule(@Body() dto: any) {
    return this.brokerageService.createAssignmentRule(dto);
  }

  @Get('assignment-rules')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all assignment rules' })
  async getAssignmentRules(@Query('agencyId') agencyId?: number) {
    return this.brokerageService.getAssignmentRules(agencyId);
  }

  @Patch('assignment-rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update assignment rule' })
  async updateAssignmentRule(@Param('id') id: number, @Body() dto: any) {
    return this.brokerageService.updateAssignmentRule(id, dto);
  }

  @Delete('assignment-rules/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete assignment rule' })
  async deleteAssignmentRule(@Param('id') id: number) {
    await this.brokerageService.deleteAssignmentRule(id);
    return { message: 'Rule deleted successfully' };
  }

  // ============ APPROVAL WORKFLOW ENDPOINTS ============

  @Post('approvals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create approval request' })
  async createApprovalRequest(@Body() dto: any) {
    return this.brokerageService.createApprovalRequest(dto);
  }

  @Get('approvals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get approvals with optional filters' })
  async getApprovals(
    @Query('status') status?: ApprovalStatus,
    @Query('type') type?: ApprovalType,
  ) {
    return this.brokerageService.getApprovals(status, type);
  }

  @Patch('approvals/:id/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Review and approve/reject request' })
  async reviewApproval(@Param('id') id: number, @Body() dto: any) {
    return this.brokerageService.reviewApproval(id, dto);
  }

  // ============ AUDIT LOG ENDPOINTS ============

  @Post('audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create audit log entry' })
  async logAudit(@Body() dto: any) {
    return this.brokerageService.logAudit(dto);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get audit logs with filters' })
  async getAuditLogs(
    @Query('entityType') entityType?: AuditEntityType,
    @Query('entityId') entityId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.brokerageService.getAuditLogs(
      entityType,
      entityId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ============ WEBSITE INQUIRY ENDPOINTS ============

  @Post('website-inquiries')
  @ApiOperation({ summary: 'Create website inquiry' })
  async createWebsiteInquiry(@Body() dto: any) {
    return this.brokerageService.createWebsiteInquiry(dto);
  }

  @Get('website-inquiries')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get website inquiries' })
  async getWebsiteInquiries(
    @Query('status') status?: string,
    @Query('source') source?: string,
  ) {
    return this.brokerageService.getWebsiteInquiries(status, source);
  }

  @Patch('website-inquiries/:id/convert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert inquiry to lead' })
  async convertInquiryToLead(
    @Param('id') id: number,
    @Body() dto: { leadId: number },
  ) {
    return this.brokerageService.convertInquiryToLead(id, dto.leadId);
  }

  // ============ REPORTS ENDPOINTS ============

  @Get('reports')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get brokerage reports' })
  async getReports(@Query('agencyId') agencyId?: number) {
    return this.brokerageService.getBrokerageReports(agencyId);
  }
}
