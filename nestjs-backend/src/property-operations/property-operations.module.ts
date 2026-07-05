import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../auth/admin.guard';
import { ManagementController } from './controllers/management.controller';
import { PublicAdminController } from './controllers/public-admin.controller';
import { PublicController } from './controllers/public.controller';
import { UploadController } from './controllers/upload.controller';
import { WorkspaceRecordController } from './controllers/workspace-record.controller';
import { OperationsRecord, OperationsRecordSchema, OperationsWorkspace, OperationsWorkspaceSchema } from './schemas/operations.schema';
import { OperationsActivity, OperationsActivitySchema, OperationsSettings, OperationsSettingsSchema, PublicAccess, PublicAccessSchema, PublicSubmission, PublicSubmissionSchema } from './schemas/public-access.schema';
import { ActivityService } from './services/activity.service';
import { CleanupService } from './services/cleanup.service';
import { InsightsService } from './services/insights.service';
import { PublicAccessService } from './services/public-access.service';
import { RecordService } from './services/record.service';
import { SettingsService } from './services/settings.service';
import { UploadService } from './services/upload.service';
import { WorkspaceService } from './services/workspace.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OperationsWorkspace.name, schema: OperationsWorkspaceSchema },
      { name: OperationsRecord.name, schema: OperationsRecordSchema },
      { name: OperationsSettings.name, schema: OperationsSettingsSchema },
      { name: PublicAccess.name, schema: PublicAccessSchema },
      { name: PublicSubmission.name, schema: PublicSubmissionSchema },
      { name: OperationsActivity.name, schema: OperationsActivitySchema },
    ]),
  ],
  controllers: [WorkspaceRecordController, ManagementController, PublicAdminController, PublicController, UploadController],
  providers: [AdminGuard, ActivityService, WorkspaceService, RecordService, SettingsService, InsightsService, PublicAccessService, CleanupService, UploadService],
})
export class PropertyOperationsModule {}
