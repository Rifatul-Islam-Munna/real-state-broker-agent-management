import { BadRequestException, Injectable } from '@nestjs/common';
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
      settings = this.agencyRepository.create({ id: 1, contentJson: JSON.stringify(this.defaultAgencySettings()) });
      await this.agencyRepository.save(settings);
    }
    return {
      ...this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings()),
      updatedAt: settings.updatedAt,
    };
  }

  async updateSettings(dto: any) {
    let settings = await this.agencyRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.agencyRepository.create({ id: 1 });
    }
    const payload = this.normalizeAgencySettings(dto);
    settings.contentJson = JSON.stringify(payload);
    const saved = await this.agencyRepository.save(settings);
    return { ...payload, updatedAt: saved.updatedAt };
  }

  async getPublicSettings() {
    const settings = await this.getAdminSettings();
    const profile = settings.profile ?? this.defaultAgencySettings().profile;
    return {
      profile: {
        agencyName: profile.agencyName,
        logo: profile.logo,
        officeLocations: profile.officeLocations,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        socialLinks: profile.socialLinks,
      },
      updatedAt: settings.updatedAt,
    };
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
    const now = new Date();

    if (dto.clearTwilio) { settings.twilioPayload = null; settings.twilioUpdatedAt = null; }
    else if (dto.twilio) { settings.twilioPayload = JSON.stringify(this.normalizeCommunicationProvider(dto.twilio)); settings.twilioUpdatedAt = now; }

    if (dto.clearAiProvider) { settings.aiProviderPayload = null; settings.aiProviderUpdatedAt = null; }
    else if (dto.aiProvider) { settings.aiProviderPayload = JSON.stringify(dto.aiProvider); settings.aiProviderUpdatedAt = now; }

    if (dto.clearSmtp) { settings.smtpPayload = null; settings.smtpUpdatedAt = null; }
    else if (dto.smtp) { settings.smtpPayload = JSON.stringify(this.normalizeMailProvider(dto.smtp)); settings.smtpUpdatedAt = now; }

    await this.integrationRepository.save(settings);
    return this.getIntegrationStatus();
  }

  async getWorkspaceStatus() {
      const settings = await this.integrationRepository.findOne({ where: { id: 1 } });
      const smtp = settings?.smtpPayload ? this.readJson(settings.smtpPayload) : null;
      const communication = settings?.twilioPayload ? this.readJson(settings.twilioPayload) : null;
      const aiProvider = settings?.aiProviderPayload ? this.readJson(settings.aiProviderPayload) : null;
      return {
          hasCommunicationConfig: !!settings?.twilioPayload,
          communicationUpdatedAt: settings?.twilioUpdatedAt ?? null,
          communicationProviderName: communication?.providerName ?? null,
          communicationSmsSyncEnabled: !!communication?.enableSmsSync,
          communicationSmsSyncIntervalMinutes: communication?.enableSmsSync ? communication.syncIntervalMinutes : null,
          hasAiProviderConfig: !!settings?.aiProviderPayload,
          aiProviderUpdatedAt: settings?.aiProviderUpdatedAt ?? null,
          aiProviderName: aiProvider?.providerName ?? null,
          hasSmtpConfig: !!settings?.smtpPayload,
          smtpUpdatedAt: settings?.smtpUpdatedAt ?? null,
          smtpProviderName: smtp?.providerName ?? null,
          mailboxSyncEnabled: !!smtp?.enableInboxSync,
          mailboxSyncIntervalMinutes: smtp?.enableInboxSync ? smtp.syncIntervalMinutes : null,
          updatedAt: settings?.updatedAt ?? null,
      };
  }

  async updateWorkspace(dto: any) {
    let settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    if (!settings) settings = this.integrationRepository.create({ id: 1 });
    const now = new Date();

    if (dto.clearCommunication) { settings.twilioPayload = null; settings.twilioUpdatedAt = null; }
    else if (dto.communication) { settings.twilioPayload = JSON.stringify(this.normalizeCommunicationProvider(dto.communication)); settings.twilioUpdatedAt = now; }

    if (dto.clearAiProvider) { settings.aiProviderPayload = null; settings.aiProviderUpdatedAt = null; }
    else if (dto.aiProvider) { settings.aiProviderPayload = JSON.stringify(dto.aiProvider); settings.aiProviderUpdatedAt = now; }

    if (dto.clearSmtp) { settings.smtpPayload = null; settings.smtpUpdatedAt = null; }
    else if (dto.smtp) { settings.smtpPayload = JSON.stringify(this.normalizeMailProvider(dto.smtp)); settings.smtpUpdatedAt = now; }

    await this.integrationRepository.save(settings);
    return this.getWorkspaceStatus();
  }

  async getCommunicationConfig() {
    const settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    return settings?.twilioPayload ? this.readJson(settings.twilioPayload) : null;
  }

  async getSmtpConfig() {
    const settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    return settings?.smtpPayload ? this.readJson(settings.smtpPayload) : null;
  }

  private readJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private normalizeMailProvider(input: any) {
    const providerName = this.loose(input?.providerName, 'Custom');
    const provider = providerName.toLowerCase();
    const username = this.loose(input?.username);
    const password = this.loose(input?.password);
    const imapHost = this.loose(
      input?.imapHost,
      provider === 'gmail' ? 'imap.gmail.com' : provider === 'outlook' ? 'outlook.office365.com' : '',
    );
    const enableInboxSync = input?.enableInboxSync === true;
    const imapUsername = this.loose(input?.imapUsername, username);
    const imapPassword = this.loose(input?.imapPassword, password);

    if (enableInboxSync && !imapHost) throw new BadRequestException('IMAP host is required when inbox sync is enabled.');
    if (enableInboxSync && !imapUsername) throw new BadRequestException('IMAP username is required when inbox sync is enabled.');
    if (enableInboxSync && !imapPassword) throw new BadRequestException('IMAP password is required when inbox sync is enabled.');

    return {
      providerName,
      host: this.loose(input?.host),
      port: this.clampInt(input?.port, 587, 1, 65_535),
      username,
      password,
      fromEmail: this.loose(input?.fromEmail),
      fromName: this.nullText(input?.fromName),
      useSsl: input?.useSsl !== false,
      enableInboxSync,
      imapHost: imapHost || null,
      imapPort: this.clampInt(input?.imapPort, 993, 1, 65_535),
      imapUsername: imapUsername || null,
      imapPassword: imapPassword || null,
      imapUseSsl: input?.imapUseSsl !== false,
      imapFolder: this.loose(input?.imapFolder, 'INBOX'),
      mailboxTag: this.loose(input?.mailboxTag),
      duplicatePolicy: input?.duplicatePolicy === 'process-every-message' ? 'process-every-message' : 'skip-exact-message',
      autoCreateLeads: input?.autoCreateLeads !== false,
      syncIntervalMinutes: this.clampInt(input?.syncIntervalMinutes, 10, 5, 120),
      maxMessagesPerSync: this.clampInt(input?.maxMessagesPerSync, 25, 5, 100),
    };
  }

  private normalizeCommunicationProvider(input: any) {
    const providerName = this.loose(input?.providerName, 'Twilio');
    const provider = providerName.toLowerCase();
    const baseUrl = this.loose(
      input?.baseUrl,
      provider === 'plivo' ? 'https://api.plivo.com'
        : provider === 'ringcentral' ? 'https://platform.ringcentral.com'
          : provider === 'twilio' ? 'https://api.twilio.com'
            : '',
    );

    return {
      providerName,
      accountId: this.loose(input?.accountId),
      authToken: this.loose(input?.authToken),
      fromNumber: this.loose(input?.fromNumber),
      baseUrl: baseUrl || null,
      voiceWebhookUrl: this.nullText(input?.voiceWebhookUrl),
      smsWebhookUrl: this.nullText(input?.smsWebhookUrl),
      supportsSms: input?.supportsSms !== false,
      supportsVoice: input?.supportsVoice !== false,
      enableSmsSync: input?.enableSmsSync === true,
      syncIntervalMinutes: this.clampInt(input?.syncIntervalMinutes, 5, 1, 120),
      maxMessagesPerSync: this.clampInt(input?.maxMessagesPerSync, 25, 5, 100),
    };
  }

  private clampInt(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private normalizeAgencySettings(input: any) {
    const fallback = this.defaultAgencySettings();
    const profile = input?.profile ?? {};
    const templates = Array.isArray(input?.communicationTemplates) && input.communicationTemplates.length
      ? input.communicationTemplates
      : fallback.communicationTemplates;

    return {
      profile: {
        agencyName: this.text(profile.agencyName, fallback.profile.agencyName),
        taxId: this.loose(profile.taxId),
        standardCommissionPercent: this.loose(profile.standardCommissionPercent, fallback.profile.standardCommissionPercent),
        logo: {
          url: this.loose(profile.logo?.url),
          objectName: this.nullText(profile.logo?.objectName),
        },
        officeLocations: this.stringList(profile.officeLocations, fallback.profile.officeLocations),
        contactEmail: this.text(profile.contactEmail, fallback.profile.contactEmail),
        contactPhone: this.loose(profile.contactPhone, fallback.profile.contactPhone),
        socialLinks: ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok'].map((platform) => ({
          platform,
          url: this.loose((profile.socialLinks ?? []).find((item: any) => (item?.platform ?? '').toLowerCase() === platform)?.url),
        })),
      },
      communicationTemplates: templates.map((item: any, index: number) => {
        const fallbackItem = fallback.communicationTemplates[index] ?? fallback.communicationTemplates[0];
        return {
          id: this.text(item?.id, fallbackItem.id),
          name: this.text(item?.name, fallbackItem.name),
          subject: this.text(item?.subject, fallbackItem.subject),
          body: this.text(item?.body, fallbackItem.body),
          channels: Array.isArray(item?.channels) && item.channels.length ? [...new Set(item.channels)] : fallbackItem.channels,
          variableTokens: this.stringList(item?.variableTokens, fallbackItem.variableTokens),
          sequenceType: ['Direct', 'FollowUp1', 'FollowUp2', 'FollowUp3'].includes(item?.sequenceType) ? item.sequenceType : (fallbackItem.sequenceType ?? 'Direct'),
          gapDays: this.clampInt(item?.gapDays, fallbackItem.gapDays ?? 0, 0, 365),
          isActive: item?.isActive !== false,
          attachPropertyDocuments: item?.attachPropertyDocuments !== false,
        };
      }),
    };
  }

  private text(value: any, fallback: string) {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }

  private loose(value: any, fallback = '') {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }

  private nullText(value: any) {
    const normalized = `${value ?? ''}`.trim();
    return normalized || null;
  }

  private stringList(value: any, fallback: string[]) {
    const items = Array.isArray(value)
      ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))]
      : [];
    return items.length ? items : fallback;
  }

  private defaultAgencySettings() {
    return {
      profile: {
        agencyName: '',
        taxId: '',
        standardCommissionPercent: '3.0',
        logo: { url: '', objectName: null },
        officeLocations: [],
        contactEmail: '',
        contactPhone: '',
        socialLinks: ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok'].map((platform) => ({ platform, url: '' })),
      },
      communicationTemplates: [
        {
          id: 'new-lead-welcome',
          name: 'New Lead Welcome',
          subject: 'Welcome to Skyline Real Estate, {{client_name}}!',
          body: "Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}",
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{agency_name}}'],
          sequenceType: 'Direct',
          gapDays: 0,
          isActive: true,
          attachPropertyDocuments: true,
        },
        {
          id: 'showing-confirmation',
          name: 'Showing Confirmation',
          subject: 'Your showing is confirmed for {{property_address}}',
          body: 'Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reach out to {{agent_name}} if you need to reschedule.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{showing_time}}', '{{agent_name}}'],
          sequenceType: 'FollowUp1',
          gapDays: 2,
          isActive: true,
          attachPropertyDocuments: true,
        },
        {
          id: 'contract-executed',
          name: 'Contract Executed',
          subject: 'Contract executed for {{property_address}}',
          body: 'Hello {{client_name}}, the contract for {{property_address}} has been executed successfully. {{agent_name}} will guide you through the next steps and timeline.',
          channels: ['Email'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}'],
          sequenceType: 'FollowUp2',
          gapDays: 5,
          isActive: true,
          attachPropertyDocuments: true,
        },
        {
          id: 'closing-reminder',
          name: 'Closing Reminder',
          subject: 'Closing reminder for {{property_address}}',
          body: 'Hello {{client_name}}, this is a reminder that your closing for {{property_address}} is scheduled on {{closing_date}}. Please bring the requested documents and contact {{agent_name}} with any questions.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{closing_date}}', '{{agent_name}}'],
        },
        {
          id: 'follow-up-after-visit',
          name: 'Follow-Up After Visit',
          subject: 'Thanks for visiting {{property_address}}',
          body: 'Hi {{client_name}}, thank you for viewing {{property_address}}. What questions can {{agent_name}} answer before your next step?',
          channels: ['Email', 'SMS', 'WhatsApp'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}'],
        },
        {
          id: 'document-request',
          name: 'Document Request',
          subject: 'Documents needed for {{property_address}}',
          body: 'Hello {{client_name}}, please send {{document_list}} so {{agent_name}} can keep your deal moving for {{property_address}}.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{document_list}}'],
        },
        {
          id: 'deal-update',
          name: 'Deal Update',
          subject: 'Deal update for {{property_address}}',
          body: 'Hi {{client_name}}, your deal for {{property_address}} is now at {{deal_stage}}. {{agent_name}} will follow up with the next action.',
          channels: ['Email', 'SMS', 'WhatsApp'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{deal_stage}}'],
        },
        {
          id: 'closing-congratulations',
          name: 'Closing Congratulations',
          subject: 'Congratulations on closing {{property_address}}',
          body: 'Congratulations {{client_name}}! Closing for {{property_address}} is complete. {{agency_name}} and {{agent_name}} are grateful to be part of the move.',
          channels: ['Email', 'WhatsApp'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{agency_name}}'],
        },
      ],
    };
  }
}
