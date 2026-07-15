import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShowingFeedbackEntryService } from './showing-feedback-entry.service';
import { ShowingFeedbackQueryService } from './showing-feedback-query.service';

@ApiTags('Showing Feedback')
@Controller('showing-feedback')
@UseGuards(JwtAuthGuard)
export class ShowingFeedbackV2Controller {
  constructor(
    private readonly entries: ShowingFeedbackEntryService,
    private readonly queries: ShowingFeedbackQueryService,
  ) {}

  @Get('properties')
  @ApiOperation({ summary: 'List properties having showing feedback' })
  propertySummary() {
    return this.queries.propertySummary();
  }

  @Get()
  @ApiOperation({ summary: 'List paginated showing feedback for a property' })
  findAll(
    @Query('propertyId') propertyId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('sentiment') sentiment?: string,
    @Query('readStatus') readStatus?: string,
    @Query('leadOnly') leadOnly?: string,
  ) {
    return this.queries.findAll(
      Number(propertyId),
      Number(page),
      Number(pageSize),
      fromDate,
      toDate,
      sentiment,
      readStatus,
      leadOnly === 'true',
    );
  }


  @Get('lead-inbox')
  leadInbox(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('readStatus') readStatus?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 25,
    @Query('sentiment') sentiment?: string,
    @Query('intent') intent?: string,
    @Query('minimumPriority') minimumPriority?: string,
  ) {
    return this.queries.leadInbox(fromDate, toDate, readStatus, Number(page), Number(pageSize), sentiment, intent, Number(minimumPriority) || 0);
  }

  @Patch('bulk/read')
  bulkMarkRead(@Body('ids') ids: number[], @Body('isRead') isRead?: boolean) {
    return this.queries.bulkMarkRead(Array.isArray(ids) ? ids : [], isRead !== false);
  }

  @Patch(':id/classification')
  reclassify(@Param('id') id: string, @Body() payload: any) {
    return this.queries.reclassify(Number(id), payload ?? {});
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Body('isRead') isRead?: boolean) {
    return this.queries.markRead(Number(id), isRead !== false);
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
