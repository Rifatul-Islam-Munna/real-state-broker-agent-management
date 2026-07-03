import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShowingFeedbackService } from './showing-feedback.service';

@ApiTags('Showing Feedback')
@Controller('showing-feedback')
@UseGuards(JwtAuthGuard)
export class ShowingFeedbackController {
  constructor(private readonly showingFeedbackService: ShowingFeedbackService) {}

  @Get('properties')
  @ApiOperation({ summary: 'List properties having showing feedback' })
  propertySummary() {
    return this.showingFeedbackService.propertySummary();
  }

  @Get()
  @ApiOperation({ summary: 'List paginated showing feedback for a property' })
  findAll(
    @Query('propertyId') propertyId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.showingFeedbackService.findAll(
      Number(propertyId),
      Number(page),
      Number(pageSize),
      fromDate,
      toDate,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create one showing feedback entry manually' })
  createManual(@Body() payload: any) {
    return this.showingFeedbackService.createManual(payload);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import mapped showing feedback CSV rows' })
  importRows(@Body() payload: any) {
    return this.showingFeedbackService.importRows(payload);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Render owner feedback report preview' })
  preview(@Body() payload: any) {
    return this.showingFeedbackService.previewReport(payload);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send property feedback report to owner' })
  send(@Body() payload: any) {
    return this.showingFeedbackService.sendReport(payload);
  }
}
