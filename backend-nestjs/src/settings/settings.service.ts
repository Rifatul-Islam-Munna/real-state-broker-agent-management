import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencySettings, AgencyIntegrationSettings } from './entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AgencySettings)
    private agencyRepository: Repository<AgencySettings>,
    @InjectRepository(AgencyIntegrationSettings)
    private integrationRepository: Repository<AgencyIntegrationSettings>,
  ) {}

  async getAdminSettings() {
    let settings = await this.agencyRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.agencyRepository.create();
      await this.agencyRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(dto: any) {
    const settings = await this.getAdminSettings();
    Object.assign(settings, dto);
    return this.agencyRepository.save(settings);
  }

  async getPublicSettings() {
    return this.getAdminSettings();
  }

  async getIntegrationStatus() {
    let settings = await this.integrationRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.integrationRepository.create();
      await this.integrationRepository.save(settings);
    }
    return settings;
  }

  async updateIntegration(dto: any) {
    const settings = await this.getIntegrationStatus();
    Object.assign(settings, dto);
    return this.integrationRepository.save(settings);
  }
}
