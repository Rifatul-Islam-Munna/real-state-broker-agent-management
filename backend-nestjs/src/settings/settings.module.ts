import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencySettings } from './entities/settings.entity';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationWorkspaceService } from './integration-workspace.service';
import { SchedulingSettingsService } from './scheduling-settings-json.service';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySettings, AgencyIntegrationSettings])],
  providers: [SettingsService, SchedulingSettingsService, IntegrationWorkspaceService, IntegrationHealthService],
  controllers: [SettingsController],
  exports: [SettingsService, SchedulingSettingsService, IntegrationHealthService],
})
export class SettingsModule {}
