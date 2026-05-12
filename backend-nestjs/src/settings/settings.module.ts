import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencySettings } from './entities/settings.entity';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySettings, AgencyIntegrationSettings])],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
