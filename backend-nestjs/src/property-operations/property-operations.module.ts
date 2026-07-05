import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { SettingsModule } from '../settings/settings.module';
import {
  PropertyOperationsModuleState,
  PropertyOperationsPreferences,
  PropertyOperationsPublicAccess,
  PropertyOperationsRecord,
  PropertyOperationsSubmission,
  PropertyOperationsWorkspace,
} from './property-operations.entity';
import {
  PropertyOperationsAdminController,
  PropertyOperationsPublicController,
} from './property-operations.controller';
import { PropertyOperationsPublicService } from './property-operations-public.service';
import { PropertyOperationsService } from './property-operations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyOperationsWorkspace,
      PropertyOperationsModuleState,
      PropertyOperationsRecord,
      PropertyOperationsPublicAccess,
      PropertyOperationsSubmission,
      PropertyOperationsPreferences,
    ]),
    SettingsModule,
    FileUploadModule,
  ],
  controllers: [PropertyOperationsAdminController, PropertyOperationsPublicController],
  providers: [PropertyOperationsService, PropertyOperationsPublicService, JwtAuthGuard],
  exports: [PropertyOperationsService],
})
export class PropertyOperationsModule {}
