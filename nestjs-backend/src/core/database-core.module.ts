import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleStateEntity, OperationsRecordEntity } from '../database/entities/record.entity';
import { WorkspaceEntity } from '../database/entities/workspace.entity';
import { ActivityLogService } from './activity-log.service';
import { AnalyticsService } from './analytics.service';
import { AssistantService } from './assistant.service';
import { RecordService } from './record.service';
import { SettingsService } from './settings.service';
import { WorkspaceService } from './workspace.service';
import { PlatformSettingsService } from '../shared/platform-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity, ModuleStateEntity, OperationsRecordEntity])],
  providers: [PlatformSettingsService, ActivityLogService, WorkspaceService, RecordService, SettingsService, AnalyticsService, AssistantService],
  exports: [TypeOrmModule, PlatformSettingsService, ActivityLogService, WorkspaceService, RecordService, SettingsService, AnalyticsService, AssistantService],
})
export class DatabaseCoreModule {}
