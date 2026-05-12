import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencySettings } from './entities/settings.entity';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AgencySettings)
    private agencyRepository: Repository<AgencySettings>,
    @InjectRepository(AgencyIntegrationSettings)
    private integrationRepository: Repository<AgencyIntegrationSettings>,
  ) {}

  async getAdminSettings() {
    let settings = await this.agencyRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.agencyRepository.create({ id: 1, agencyName: 'Elite Estates' });
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
    const settings = await this.getAdminSettings();
    const { contactEmail, contactPhone, agencyName, logoUrl, primaryColor } = settings;
    return { contactEmail, contactPhone, agencyName, logoUrl, primaryColor };
  }

  async getIntegrationStatus() {
    let settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.integrationRepository.create({ id: 1 });
      await this.integrationRepository.save(settings);
    }
    return {
        hasTwilioConfig: !!settings.twilioPayload,
        twilioUpdatedAt: settings.twilioUpdatedAt,
        hasAiProviderConfig: !!settings.aiProviderPayload,
        aiProviderUpdatedAt: settings.aiProviderUpdatedAt,
        hasSmtpConfig: !!settings.smtpPayload,
        smtpUpdatedAt: settings.smtpUpdatedAt,
        updatedAt: settings.updatedAt
    };
  }

  async updateIntegration(dto: any) {
    let settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    if (!settings) settings = this.integrationRepository.create({ id: 1 });

    if (dto.clearTwilio) { settings.twilioPayload = null; settings.twilioUpdatedAt = null; }
    else if (dto.twilio) { settings.twilioPayload = JSON.stringify(dto.twilio); settings.twilioUpdatedAt = new Date(); }

    if (dto.clearAiProvider) { settings.aiProviderPayload = null; settings.aiProviderUpdatedAt = null; }
    else if (dto.aiProvider) { settings.aiProviderPayload = JSON.stringify(dto.aiProvider); settings.aiProviderUpdatedAt = new Date(); }

    if (dto.clearSmtp) { settings.smtpPayload = null; settings.smtpUpdatedAt = null; }
    else if (dto.smtp) { settings.smtpPayload = JSON.stringify(dto.smtp); settings.smtpUpdatedAt = new Date(); }

    return this.integrationRepository.save(settings);
  }

  async getWorkspaceStatus() {
      const status = await this.getIntegrationStatus();
      return {
          ...status,
          mailboxSyncEnabled: false, // Placeholder
          communicationProviderName: 'Twilio',
          aiProviderName: 'OpenAI',
          smtpProviderName: 'Custom'
      };
  }

  async updateWorkspace(dto: any) {
      return this.updateIntegration(dto);
  }
}
