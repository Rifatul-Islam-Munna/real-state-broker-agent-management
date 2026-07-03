import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencySettings } from './entities/settings.entity';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { AiJsonClientService } from './ai-json-client.service';
import { IntegrationHealthController } from './integration-health.controller';
import { IntegrationHealthService } from './integration-health.service';
import { IntegrationWorkspaceService } from './integration-workspace.service';
import { SchedulingSettingsService } from './scheduling-settings-json.service';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySettings, AgencyIntegrationSettings])],
  providers: [SettingsService, SchedulingSettingsService, IntegrationWorkspaceService, IntegrationHealthService, AiJsonClientService],
  controllers: [SettingsController, IntegrationHealthController],
  exports: [SettingsService, SchedulingSettingsService, IntegrationHealthService, AiJsonClientService],
})
export class SettingsModule {}
