import { Module } from '@nestjs/common';
import { DatabaseCoreModule } from '../core/database-core.module';
import { ExternalCoreModule } from '../core/external-core.module';
import { ExternalAdminController } from './controllers/external-admin.controller';
import { JobsController } from './controllers/jobs.controller';
import { ManagementController } from './controllers/management.controller';
import { UploadPgController } from './controllers/upload-pg.controller';
import { WorkspaceRecordController } from './controllers/workspace-record.controller';
import { RecordApiModule } from './record-api.module';

@Module({
  imports: [DatabaseCoreModule, ExternalCoreModule, RecordApiModule],
  controllers: [WorkspaceRecordController, ManagementController, ExternalAdminController, UploadPgController, JobsController],
})
export class AdminApiModule {}
