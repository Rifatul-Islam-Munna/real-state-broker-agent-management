import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { ImportPropertiesDto, RecordActionDto, SaveRecordDto, UpdateModuleStateDto } from '../dto/workspace-record.dto';
import { CleanupService } from '../services/cleanup.service';
import { DeliveryService } from '../services/delivery.service';
import { RecordService } from '../services/record.service';
import { WorkspaceService } from '../services/workspace.service';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class WorkspaceRecordController {
  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly records: RecordService,
    private readonly cleanup: CleanupService,
    private readonly delivery: DeliveryService,
  ) {}

  @Get('workspaces')
  listWorkspaces() {
    return this.workspaces.list();
  }

  @Post('import')
  importProperties(@Body() dto: ImportPropertiesDto) {
    return this.workspaces.importProperties(dto);
  }

  @Delete('workspaces')
  removeWorkspace(@Query('propertyId') propertyId: string) {
    return this.cleanup.removeProperty(Number(propertyId));
  }

  @Patch('module-state')
  updateModuleState(@Body() dto: UpdateModuleStateDto) {
    return this.workspaces.updateModuleState(dto);
  }

  @Get('records')
  listRecords(
    @Query('propertyId') propertyId: string,
    @Query('moduleKey') moduleKey?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.records.list(Number(propertyId), moduleKey, status, search);
  }

  @Post('records/save')
  saveRecord(@Body() dto: SaveRecordDto) {
    return this.records.save(dto);
  }

  @Delete('records')
  removeRecord(@Query('id') id: string) {
    return this.records.remove(id);
  }

  @Patch('records/:id/actions/:action')
  runRecordAction(@Param('id') id: string, @Param('action') action: string, @Body() dto: RecordActionDto) {
    if (action === 'send') {
      const channel = String(dto.payload?.channel ?? 'email').toLowerCase();
      return this.delivery.send(id, channel);
    }
    return this.records.action(id, action, dto);
  }
}
