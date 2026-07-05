import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { WorkspaceService } from '../../core/workspace.service';
import { ImportPropertiesDto, UpdateModuleStateDto } from '../dto/workspace-record.dto';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class WorkspaceRecordController {
  constructor(private readonly workspaces: WorkspaceService) {}

  @Get('workspaces')
  listWorkspaces() { return this.workspaces.list(); }

  @Post('import')
  importProperties(@Body() dto: ImportPropertiesDto) { return this.workspaces.importProperties(dto); }

  @Delete('workspaces')
  removeWorkspace(@Query('propertyId') propertyId: string) { return this.workspaces.remove(Number(propertyId)); }

  @Patch('module-state')
  updateModuleState(@Body() dto: UpdateModuleStateDto) { return this.workspaces.updateModuleState(dto); }
}
