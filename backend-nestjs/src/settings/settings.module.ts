import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencySettings } from './entities/settings.entity';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { IntegrationWorkspaceService } from './integration-workspace.service';
import { SchedulingSettingsService } from './scheduling-settings-json.service';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySettings, AgencyIntegrationSettings])],
  providers: [
    SettingsService,
    SchedulingSettingsService,
    IntegrationWorkspaceService,
  ],
  controllers: [SettingsController],
  exports: [SettingsService, SchedulingSettingsService],
})
export class SettingsModule {}
