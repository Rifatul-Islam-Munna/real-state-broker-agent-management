import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShowingFeedbackEntryService } from './showing-feedback-entry.service';
import { ShowingFeedbackQueryService } from './showing-feedback-query.service';
import { ShowingFeedbackService } from './showing-feedback.service';

@ApiTags('Showing Feedback')
@Controller('showing-feedback')
@UseGuards(JwtAuthGuard)
export class ShowingFeedbackV2Controller {
  constructor(
    private readonly feedback: ShowingFeedbackService,
    private readonly entries: ShowingFeedbackEntryService,
    private readonly queries: ShowingFeedbackQueryService,
  ) {}

  @Get('properties')
  @ApiOperation({ summary: 'List properties having showing feedback' })
  propertySummary() {
    return this.feedback.propertySummary();
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
    return this.queries.findAll(
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
    return this.entries.createManual(payload);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import mapped showing feedback CSV rows' })
  importRows(@Body() payload: any) {
    return this.entries.importRows(payload);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Render owner feedback report preview' })
  preview(@Body() payload: any) {
    return this.queries.previewReport(payload);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send property feedback report to owner' })
  send(@Body() payload: any) {
    return this.queries.sendReport(payload);
  }
}
