import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { RecordService } from '../../core/record.service';
import { WorkspaceService } from '../../core/workspace.service';
import { DeliveryService } from '../../shared/delivery.service';
import { ImportPropertiesDto, RecordActionDto, SaveRecordDto, UpdateModuleStateDto } from '../dto/workspace-record.dto';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class WorkspaceRecordController {
  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly records: RecordService,
    private readonly delivery: DeliveryService,
  ) {}
}
