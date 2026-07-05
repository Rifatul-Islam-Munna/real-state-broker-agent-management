import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { RecordService } from '../../core/record.service';
import { SaveRecordDto } from '../dto/workspace-record.dto';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class RecordCrudController {
  constructor(private readonly records: RecordService) {}

  @Get('records')
  list(@Query('propertyId') propertyId: string, @Query('moduleKey') moduleKey?: string, @Query('status') status?: string, @Query('search') search?: string) {
    return this.records.list(Number(propertyId), moduleKey, status, search);
  }

  @Post('records/save')
  save(@Body() dto: SaveRecordDto) { return this.records.save(dto); }

  @Delete('records')
  remove(@Query('id') id: string) { return this.records.remove(id); }
}
