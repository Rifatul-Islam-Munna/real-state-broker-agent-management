import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgencySettings, AgencyIntegrationSettings } from './entities/settings.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgencySettings, AgencyIntegrationSettings])],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
