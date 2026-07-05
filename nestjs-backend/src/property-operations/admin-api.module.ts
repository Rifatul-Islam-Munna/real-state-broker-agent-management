import { Module } from '@nestjs/common';
import { DatabaseCoreModule } from '../core/database-core.module';
import { ExternalCoreModule } from '../core/external-core.module';
import { JobsController } from './controllers/jobs.controller';
import { ManagementController } from './controllers/management.controller';
import { PublicAdminController } from './controllers/public-admin.controller';
import { UploadController } from './controllers/upload.controller';
import { WorkspaceRecordController } from './controllers/workspace-record.controller';

@Module({
  imports: [DatabaseCoreModule, ExternalCoreModule],
  controllers: [WorkspaceRecordController, ManagementController, PublicAdminController, UploadController, JobsController],
})
export class AdminApiModule {}
