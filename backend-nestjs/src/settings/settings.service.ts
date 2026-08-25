import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizePhoneCountry, normalizePhoneNumber } from '../common/phone-normalizer';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { AgencySettings } from './entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AgencySettings) private agencyRepository: Repository<AgencySettings>,
    @InjectRepository(AgencyIntegrationSettings) private integrationRepository: Repository<AgencyIntegrationSettings>,
  ) {}

  async getAdminSettings() {
    const settings = await this.ensureAgencySettings();
    const normalized = this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings());
    return {
      ...normalized,
      showingFeedbackAutomation: this.publicFeedbackAutomation(normalized.showingFeedbackAutomation),
      updatedAt: settings.updatedAt,
    };
  }

  async updateSettings(dto: any) {
    const settings = await this.ensureAgencySettings();
    const current = this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings());
    const payload = this.normalizeAgencySettings(dto);
    payload.showingFeedbackAutomation.deliveryState = current.showingFeedbackAutomation.deliveryState;
    payload.leadIntelligence.learnedQualified = current.leadIntelligence.learnedQualified;
    payload.leadIntelligence.learnedUnqualified = current.leadIntelligence.learnedUnqualified;
    settings.contentJson = JSON.stringify(payload);
    const saved = await this.agencyRepository.save(settings);
    return {
      ...payload,
      showingFeedbackAutomation: this.publicFeedbackAutomation(payload.showingFeedbackAutomation),
      updatedAt: saved.updatedAt,
    };
  }

  async getShowingFeedbackAutomation() {
    const settings = await this.ensureAgencySettings();
    return this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings()).showingFeedbackAutomation;
  }

  async getLeadIntelligence() {
    const settings = await this.ensureAgencySettings();
    return this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings()).leadIntelligence;
  }

  async addLeadLearningExample(kind: 'qualified' | 'unqualified', text: string) {
    const normalized = this.loose(text).slice(0, 1200);
    if (!normalized) return;
    const settings = await this.ensureAgencySettings();
    const payload = this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings());
    if (kind === 'qualified') {
      payload.leadIntelligence.learnedQualified = [normalized, ...(payload.leadIntelligence.learnedQualified ?? []).filter((item: string) => item !== normalized)].slice(0, 80);
    } else {
      payload.leadIntelligence.learnedUnqualified = [normalized, ...(payload.leadIntelligence.learnedUnqualified ?? []).filter((item: string) => item !== normalized)].slice(0, 80);
    }
    settings.contentJson = JSON.stringify(payload);
    await this.agencyRepository.save(settings);
  }

  async addShowingFeedbackLearningExample(sentiment: 'positive' | 'negative', text: string) {
    const normalized = this.loose(text).slice(0, 1000);
    if (!normalized) return;
    const settings = await this.ensureAgencySettings();
    const payload = this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings());
    if (sentiment === 'positive') {
      const current = `${payload.showingFeedbackAutomation.positiveKnowledge ?? ''}`.split(/\n+/).map((item) => item.trim()).filter(Boolean);
      const opposite = `${payload.showingFeedbackAutomation.negativeKnowledge ?? ''}`.split(/\n+/).map((item) => item.trim()).filter((item) => item && item !== normalized);
      payload.showingFeedbackAutomation.positiveKnowledge = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 80).join('\n').slice(0, 6000);
      payload.showingFeedbackAutomation.negativeKnowledge = opposite.join('\n').slice(0, 6000);
    } else {
      const current = `${payload.showingFeedbackAutomation.negativeKnowledge ?? ''}`.split(/\n+/).map((item) => item.trim()).filter(Boolean);
      const opposite = `${payload.showingFeedbackAutomation.positiveKnowledge ?? ''}`.split(/\n+/).map((item) => item.trim()).filter((item) => item && item !== normalized);
      payload.showingFeedbackAutomation.negativeKnowledge = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 80).join('\n').slice(0, 6000);
      payload.showingFeedbackAutomation.positiveKnowledge = opposite.join('\n').slice(0, 6000);
    }
    settings.contentJson = JSON.stringify(payload);
    await this.agencyRepository.save(settings);
  }

  async saveShowingFeedbackDeliveryState(propertyId: number, state: any) {
    const settings = await this.ensureAgencySettings();
    const payload = this.normalizeAgencySettings(this.readJson(settings.contentJson) ?? this.defaultAgencySettings());
    payload.showingFeedbackAutomation.deliveryState[String(propertyId)] = {
      lastError: this.loose(state?.lastError).slice(0, 500),
      lastFeedbackId: Math.max(0, Number(state?.lastFeedbackId) || 0),
      lastSentAt: state?.lastSentAt ? new Date(state.lastSentAt).toISOString() : null,
      processingStartedAt: state?.processingStartedAt ? new Date(state.processingStartedAt).toISOString() : null,
      processingThroughId: Math.max(0, Number(state?.processingThroughId) || 0),
    };
    settings.contentJson = JSON.stringify(payload);
    await this.agencyRepository.save(settings);
    return payload.showingFeedbackAutomation.deliveryState[String(propertyId)];
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
        defaultPhoneCountry: profile.defaultPhoneCountry,
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
      updatedAt: settings.updatedAt,
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

  async saveSmtpConfig(config: any) {
    let settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    if (!settings) settings = this.integrationRepository.create({ id: 1 });
    settings.smtpPayload = JSON.stringify(config ?? {});
    settings.smtpUpdatedAt = new Date();
    await this.integrationRepository.save(settings);
  }

  async getGmailConnectUrl(dto: any = {}) {
    const clientId = this.loose(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = this.gmailRedirectUri();
    if (!clientId || !redirectUri) {
      throw new BadRequestException('GOOGLE_CLIENT_ID and GOOGLE_GMAIL_REDIRECT_URI are required.');
    }
    const state = this.base64UrlEncode(JSON.stringify({
      returnTo: this.loose(dto?.returnTo, '/dashboard/settings'),
      mailboxTag: this.loose(dto?.mailboxTag, 'gmail'),
      leadTemplateTags: this.stringList(dto?.leadTemplateTags, []),
    }));
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('scope', [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ].join(' '));
    url.searchParams.set('state', state);
    return { url: url.toString() };
  }

  async completeGmailConnect(code: string, state: string) {
    if (!code) throw new BadRequestException('Missing Gmail authorization code.');
    const clientId = this.loose(process.env.GOOGLE_CLIENT_ID);
    const clientSecret = this.loose(process.env.GOOGLE_CLIENT_SECRET);
    const redirectUri = this.gmailRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_GMAIL_REDIRECT_URI are required.');
    }
    const parsedState = this.parseOauthState(state);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) throw new BadRequestException('Gmail connection failed.');
    const token: any = await tokenResponse.json();
    const accessToken = this.loose(token.access_token);
    const refreshToken = this.loose(token.refresh_token);
    if (!accessToken || !refreshToken) throw new BadRequestException('Gmail did not return a refresh token. Reconnect and allow offline access.');
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = profileResponse.ok ? await profileResponse.json() : {};
    const email = this.loose(profile.email);
    await this.saveSmtpConfig({
      providerName: 'Gmail',
      authType: 'gmail-oauth',
      host: 'smtp.gmail.com',
      port: 587,
      username: email,
      password: '',
      fromEmail: email,
      fromName: this.nullText(profile.name),
      useSsl: true,
      enableInboxSync: true,
      imapHost: null,
      imapPort: 993,
      imapUsername: null,
      imapPassword: null,
      imapUseSsl: true,
      imapFolder: 'INBOX',
      mailboxTag: parsedState.mailboxTag || 'gmail',
      leadTemplateTags: parsedState.leadTemplateTags,
      duplicatePolicy: 'skip-exact-message',
      autoCreateLeads: true,
      syncIntervalMinutes: 5,
      maxMessagesPerSync: 25,
      gmailEmail: email,
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
      gmailTokenExpiresAt: new Date(Date.now() + (Number(token.expires_in) || 3600) * 1000).toISOString(),
      gmailLabelIds: ['INBOX'],
    });
    const base = this.loose(process.env.FRONTEND_URL, 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}${parsedState.returnTo || '/dashboard/settings'}?gmail=connected`;
  }

  async getAiProviderConfig() {
    const settings = await this.integrationRepository.findOne({ where: { id: 1 } });
    return settings?.aiProviderPayload ? this.readJson(settings.aiProviderPayload) : null;
  }

  private async ensureAgencySettings() {
    let settings = await this.agencyRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.agencyRepository.create({ id: 1, contentJson: JSON.stringify(this.defaultAgencySettings()) });
      await this.agencyRepository.save(settings);
    }
    return settings;
  }

  private readJson(value: string) {
    try { return JSON.parse(value); } catch { return null; }
  }

  private normalizeMailProvider(input: any) {
    const providerName = this.loose(input?.providerName, 'Custom');
    const provider = providerName.toLowerCase();
    const authType = input?.authType === 'gmail-oauth' ? 'gmail-oauth' : 'password';
    const username = this.loose(input?.username);
    const password = this.loose(input?.password);
    const imapHost = this.loose(input?.imapHost, provider === 'gmail' ? 'imap.gmail.com' : provider === 'outlook' ? 'outlook.office365.com' : '');
    const enableInboxSync = input?.enableInboxSync === true;
    const imapUsername = this.loose(input?.imapUsername, username);
    const imapPassword = this.loose(input?.imapPassword, password);
    if (enableInboxSync && authType !== 'gmail-oauth' && !imapHost) throw new BadRequestException('IMAP host is required when inbox sync is enabled.');
    if (enableInboxSync && authType !== 'gmail-oauth' && !imapUsername) throw new BadRequestException('IMAP username is required when inbox sync is enabled.');
    if (enableInboxSync && authType !== 'gmail-oauth' && !imapPassword) throw new BadRequestException('IMAP password is required when inbox sync is enabled.');
    return {
      providerName,
      authType,
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
      leadTemplateTags: this.stringList(input?.leadTemplateTags, []),
      duplicatePolicy: input?.duplicatePolicy === 'process-every-message' ? 'process-every-message' : 'skip-exact-message',
      autoCreateLeads: input?.autoCreateLeads !== false,
      syncIntervalMinutes: this.clampInt(input?.syncIntervalMinutes, 10, 1, 120),
      maxMessagesPerSync: this.clampInt(input?.maxMessagesPerSync, 25, 5, 100),
      gmailEmail: this.loose(input?.gmailEmail),
      gmailAccessToken: this.loose(input?.gmailAccessToken),
      gmailRefreshToken: this.loose(input?.gmailRefreshToken),
      gmailTokenExpiresAt: this.nullText(input?.gmailTokenExpiresAt),
      gmailLabelIds: this.stringList(input?.gmailLabelIds, ['INBOX']),
    };
  }

  private gmailRedirectUri() {
    return this.loose(process.env.GOOGLE_GMAIL_REDIRECT_URI);
  }

  private parseOauthState(value: string) {
    try {
      const parsed = JSON.parse(Buffer.from(`${value ?? ''}`.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      return {
        returnTo: this.loose(parsed?.returnTo, '/dashboard/settings'),
        mailboxTag: this.loose(parsed?.mailboxTag, 'gmail'),
        leadTemplateTags: this.stringList(parsed?.leadTemplateTags, []),
      };
    } catch {
      return { returnTo: '/dashboard/settings', mailboxTag: 'gmail', leadTemplateTags: [] };
    }
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private normalizeCommunicationProvider(input: any) {
    const providerName = this.loose(input?.providerName, 'Twilio');
    const provider = providerName.toLowerCase();
    const baseUrl = this.loose(input?.baseUrl, provider === 'plivo' ? 'https://api.plivo.com' : provider === 'ringcentral' ? 'https://platform.ringcentral.com' : provider === 'twilio' ? 'https://api.twilio.com' : '');
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

  private normalizeAgencySettings(input: any) {
    const fallback = this.defaultAgencySettings();
    const profile = input?.profile ?? {};
    const sourceTemplates = Array.isArray(input?.communicationTemplates) && input.communicationTemplates.length
      ? input.communicationTemplates
      : fallback.communicationTemplates;
    const templates = sourceTemplates.map((item: any, index: number) => {
      const fallbackItem = fallback.communicationTemplates[index] ?? fallback.communicationTemplates[0];
      return {
        id: this.text(item?.id, fallbackItem.id),
        name: this.text(item?.name, fallbackItem.name),
        subject: this.text(item?.subject, fallbackItem.subject),
        body: this.text(item?.body, fallbackItem.body),
        channels: this.communicationChannels(item?.channels, fallbackItem.channels),
        variableTokens: this.stringList(item?.variableTokens, fallbackItem.variableTokens),
        sequenceType: ['Direct', 'FollowUp1', 'FollowUp2', 'FollowUp3', 'FollowUp4', 'FollowUp5', 'FollowUp6'].includes(item?.sequenceType) ? item.sequenceType : (fallbackItem.sequenceType ?? 'Direct'),
        gapDays: this.clampInt(item?.gapDays, fallbackItem.gapDays ?? 0, 0, 365),
        isActive: item?.isActive !== false,
        attachPropertyDocuments: item?.attachPropertyDocuments !== false,
        attachmentDocumentCategory: this.loose(item?.attachmentDocumentCategory),
        attachmentDocumentType: ['System', 'Property', 'Other', 'Lead', 'Realtor', 'OwnerFeedback'].includes(item?.attachmentDocumentType) ? item.attachmentDocumentType : '',
        attachmentMode: ['none', 'property', 'pdf', 'document'].includes(item?.attachmentMode) ? item.attachmentMode : (item?.attachPropertyDocuments !== false ? 'property' : 'none'),
        audience: item?.audience === 'OwnerFeedback' ? 'OwnerFeedback' : item?.audience === 'LeadShowing' ? 'LeadShowing' : item?.audience === 'Realtor' || item?.id === 'showing-confirmation' ? 'Realtor' : 'Lead',
        pdfTemplateId: this.loose(item?.pdfTemplateId),
      };
    });
    const defaultOwnerTemplate = fallback.communicationTemplates.find((item: any) => item.audience === 'OwnerFeedback');
    if (defaultOwnerTemplate && !templates.some((item: any) => item.audience === 'OwnerFeedback')) templates.push(defaultOwnerTemplate);
    const defaultLeadShowingTemplate = fallback.communicationTemplates.find((item: any) => item.audience === 'LeadShowing' && (item.sequenceType ?? 'Direct') === 'Direct');
    if (defaultLeadShowingTemplate && !templates.some((item: any) => item.audience === 'LeadShowing' && (item.sequenceType ?? 'Direct') === 'Direct')) templates.push(defaultLeadShowingTemplate);
    const existingShowingConfirmation = templates.find((item: any) => item.id === 'showing-confirmation');
    if (existingShowingConfirmation) {
      existingShowingConfirmation.audience = 'Realtor';
      existingShowingConfirmation.sequenceType = 'Direct';
      existingShowingConfirmation.gapDays = 0;
    }
    const defaultRealtorTemplate = fallback.communicationTemplates.find((item: any) => item.id === 'showing-confirmation');
    if (defaultRealtorTemplate && !templates.some((item: any) => item.audience === 'Realtor' && (item.sequenceType ?? 'Direct') === 'Direct')) templates.push(defaultRealtorTemplate);
    const leadAutomationInput = input?.leadAutomation ?? {};
    const defaultLeadAutomation = fallback.leadAutomation;
    const leadAutomationChannels = this.communicationChannels(leadAutomationInput.channels, defaultLeadAutomation.channels);
    const automationInput = input?.showingFeedbackAutomation ?? {};
    const defaultAutomation = fallback.showingFeedbackAutomation;
    const channels = Array.isArray(automationInput.channels)
      ? automationInput.channels.filter((item: any) => ['Email', 'SMS'].includes(item))
      : defaultAutomation.channels;
    const rawState = automationInput.deliveryState && typeof automationInput.deliveryState === 'object'
      ? automationInput.deliveryState
      : {};
    const deliveryState = Object.fromEntries(Object.entries(rawState).map(([propertyId, state]: [string, any]) => [propertyId, {
      lastError: this.loose(state?.lastError).slice(0, 500),
      lastFeedbackId: Math.max(0, Number(state?.lastFeedbackId) || 0),
      lastSentAt: state?.lastSentAt ? new Date(state.lastSentAt).toISOString() : null,
      processingStartedAt: state?.processingStartedAt ? new Date(state.processingStartedAt).toISOString() : null,
      processingThroughId: Math.max(0, Number(state?.processingThroughId) || 0),
    }]));
    return {
      profile: {
        agencyName: this.text(profile.agencyName, fallback.profile.agencyName),
        taxId: this.loose(profile.taxId),
        standardCommissionPercent: this.loose(profile.standardCommissionPercent, fallback.profile.standardCommissionPercent),
        logo: { url: this.loose(profile.logo?.url), objectName: this.nullText(profile.logo?.objectName) },
        officeLocations: this.stringList(profile.officeLocations, fallback.profile.officeLocations),
        contactEmail: this.text(profile.contactEmail, fallback.profile.contactEmail),
        defaultPhoneCountry: normalizePhoneCountry(profile.defaultPhoneCountry ?? fallback.profile.defaultPhoneCountry),
        contactPhone: normalizePhoneNumber(this.loose(profile.contactPhone, fallback.profile.contactPhone), profile.defaultPhoneCountry ?? fallback.profile.defaultPhoneCountry),
        socialLinks: ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok'].map((platform) => ({
          platform,
          url: this.loose((profile.socialLinks ?? []).find((item: any) => (item?.platform ?? '').toLowerCase() === platform)?.url),
        })),
      },
      communicationTemplates: templates,
      leadAutomation: {
        enabled: input?.firstMessageAutomation?.lead !== false,
        channels: leadAutomationChannels.length ? leadAutomationChannels : defaultLeadAutomation.channels,
        directTemplateId: this.loose(leadAutomationInput.directTemplateId, defaultLeadAutomation.directTemplateId),
        leadShowingTemplateId: this.loose(leadAutomationInput.leadShowingTemplateId, defaultLeadAutomation.leadShowingTemplateId),
        realtorShowingTemplateId: this.loose(leadAutomationInput.realtorShowingTemplateId, defaultLeadAutomation.realtorShowingTemplateId),
        followUpEnabled: leadAutomationInput.followUpEnabled !== false,
      },
      firstMessageAutomation: {
        lead: input?.firstMessageAutomation?.lead !== false,
        leadShowing: input?.firstMessageAutomation?.leadShowing !== false,
        realtorShowing: input?.firstMessageAutomation?.realtorShowing !== false,
        delayMinutes: this.clampInt(input?.firstMessageAutomation?.delayMinutes, fallback.firstMessageAutomation.delayMinutes, 0, 1440),
        leadDelayMinutes: this.clampInt(input?.firstMessageAutomation?.leadDelayMinutes ?? input?.firstMessageAutomation?.delayMinutes, fallback.firstMessageAutomation.leadDelayMinutes, 0, 1440),
        leadShowingDelayMinutes: this.clampInt(input?.firstMessageAutomation?.leadShowingDelayMinutes ?? input?.firstMessageAutomation?.delayMinutes, fallback.firstMessageAutomation.leadShowingDelayMinutes, 0, 1440),
        realtorShowingDelayMinutes: this.clampInt(input?.firstMessageAutomation?.realtorShowingDelayMinutes ?? input?.firstMessageAutomation?.delayMinutes, fallback.firstMessageAutomation.realtorShowingDelayMinutes, 0, 1440),
      },
      leadIntelligence: {
        qualifiedKnowledge: this.loose(input?.leadIntelligence?.qualifiedKnowledge, fallback.leadIntelligence.qualifiedKnowledge).slice(0, 6000),
        unqualifiedKnowledge: this.loose(input?.leadIntelligence?.unqualifiedKnowledge, fallback.leadIntelligence.unqualifiedKnowledge).slice(0, 6000),
        learnedQualified: this.stringList(input?.leadIntelligence?.learnedQualified, fallback.leadIntelligence.learnedQualified).slice(0, 80),
        learnedUnqualified: this.stringList(input?.leadIntelligence?.learnedUnqualified, fallback.leadIntelligence.learnedUnqualified).slice(0, 80),
      },
      showingFeedbackAutomation: {
        enabled: automationInput.enabled === true,
        gapDays: this.clampInt(automationInput.gapDays, defaultAutomation.gapDays, 0, 6),
        channels: channels.length ? [...new Set(channels)] : defaultAutomation.channels,
        templateId: this.loose(automationInput.templateId, defaultAutomation.templateId),
        compressWithAi: automationInput.compressWithAi !== false,
        sentimentFilter: automationInput.sentimentFilter === 'negative' ? 'negative' : 'all',
        maxFeedback: this.clampInt(automationInput.maxFeedback, defaultAutomation.maxFeedback, 1, 50),
        autoClassifyMinConfidence: this.clampInt(automationInput.autoClassifyMinConfidence, defaultAutomation.autoClassifyMinConfidence, 1, 100),
        aiFallbackMinConfidence: this.clampInt(automationInput.aiFallbackMinConfidence, defaultAutomation.aiFallbackMinConfidence, 0, 100),
        negativeKnowledge: this.loose(automationInput.negativeKnowledge, defaultAutomation.negativeKnowledge).slice(0, 6000),
        positiveKnowledge: this.loose(automationInput.positiveKnowledge, defaultAutomation.positiveKnowledge).slice(0, 6000),
        deliveryState,
      },
    };
  }

  private publicFeedbackAutomation(value: any) {
    return {
      enabled: value.enabled,
      gapDays: value.gapDays,
      channels: value.channels,
      templateId: value.templateId,
      compressWithAi: value.compressWithAi,
      sentimentFilter: value.sentimentFilter,
      maxFeedback: value.maxFeedback,
      autoClassifyMinConfidence: value.autoClassifyMinConfidence,
      aiFallbackMinConfidence: value.aiFallbackMinConfidence,
      negativeKnowledge: value.negativeKnowledge,
      positiveKnowledge: value.positiveKnowledge,
    };
  }

  private clampInt(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
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
    const items = Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
    return items.length ? items : fallback;
  }

  private communicationChannels(value: any, fallback: string[]) {
    const source = Array.isArray(value) ? value : fallback;
    const channels = [...new Set(source.map((item: any) => `${item ?? ''}`.trim()).filter((item: string) => item === 'Email' || item === 'SMS'))];
    return channels.length ? channels : fallback.filter((item) => item === 'Email' || item === 'SMS');
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
        defaultPhoneCountry: 'US',
        socialLinks: ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok'].map((platform) => ({ platform, url: '' })),
      },
      showingFeedbackAutomation: {
        enabled: false,
        gapDays: 1,
        channels: ['Email'],
        templateId: 'owner-feedback-summary',
        compressWithAi: true,
        sentimentFilter: 'all',
        maxFeedback: 10,
        autoClassifyMinConfidence: 72,
        aiFallbackMinConfidence: 0,
        negativeKnowledge: [
          'Client felt price was too high for the condition.',
          'Buyer did not like the layout, location, parking, noise, smell, size, or repairs needed.',
          'Realtor says the client is not interested after viewing.',
        ].join('\n'),
        positiveKnowledge: [
          'Client loved the property and wants next steps.',
          'Buyer liked the layout, location, condition, price, light, or amenities.',
          'Realtor says the showing went well and client is interested.',
        ].join('\n'),
        deliveryState: {},
      },
      leadAutomation: {
        enabled: true,
        channels: ['Email'],
        directTemplateId: 'new-lead-welcome',
        leadShowingTemplateId: 'lead-showing-confirmation',
        realtorShowingTemplateId: 'showing-confirmation',
        followUpEnabled: true,
      },
      firstMessageAutomation: {
        lead: true,
        leadShowing: true,
        realtorShowing: true,
        delayMinutes: 0,
        leadDelayMinutes: 0,
        leadShowingDelayMinutes: 0,
        realtorShowingDelayMinutes: 0,
      },
      leadIntelligence: {
        qualifiedKnowledge: [
          'Lead asks to schedule a showing, tour, viewing, or visit.',
          'Lead gives budget, timeline, pre-approval, cash offer, or move date.',
          'Lead says they are interested in buying, renting, applying, or making an offer.',
        ].join('\n'),
        unqualifiedKnowledge: [
          'Sender is vendor, recruiter, marketer, job seeker, spam, or partnership request.',
          'Sender only asks a generic question and shows no buyer/renter/seller intent.',
          'Sender says not interested, wrong number, unsubscribe, test, or maintenance request.',
        ].join('\n'),
        learnedQualified: [],
        learnedUnqualified: [],
      },
      communicationTemplates: [
        {
          id: 'new-lead-welcome',
          name: 'New Lead Welcome',
          subject: 'Welcome to Skyline Real Estate, {{client_name}}!',
          body: "Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}",
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{agency_name}}'],
          sequenceType: 'Direct', gapDays: 0, isActive: true, attachPropertyDocuments: true, attachmentMode: 'property', attachmentDocumentType: '', attachmentDocumentCategory: '', pdfTemplateId: '', audience: 'Lead',
        },
        {
          id: 'lead-showing-confirmation',
          name: 'Lead Showing Confirmation',
          subject: 'Showing request received for {{property_address}}',
          body: 'Hi {{client_name}}, your showing request for {{property_address}} is received. {{agent_name}} will confirm the best time shortly.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}'],
          sequenceType: 'Direct', gapDays: 0, isActive: true, attachPropertyDocuments: true, attachmentMode: 'property', attachmentDocumentType: '', attachmentDocumentCategory: '', pdfTemplateId: '', audience: 'LeadShowing',
        },
        {
          id: 'showing-confirmation',
          name: 'Showing Confirmation',
          subject: 'Your showing is confirmed for {{property_address}}',
          body: 'Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reach out to {{agent_name}} if you need to reschedule.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}', '{{showing_time}}', '{{agent_name}}'],
          sequenceType: 'Direct', gapDays: 0, isActive: true, attachPropertyDocuments: true, attachmentMode: 'property', attachmentDocumentType: '', attachmentDocumentCategory: '', pdfTemplateId: '', audience: 'Realtor',
        },
        {
          id: 'contract-executed', name: 'Contract Executed', subject: 'Contract executed for {{property_address}}',
          body: 'Hello {{client_name}}, the contract for {{property_address}} has been executed successfully. {{agent_name}} will guide you through the next steps and timeline.',
          channels: ['Email'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}'],
          sequenceType: 'FollowUp2', gapDays: 5, isActive: true, attachPropertyDocuments: true, attachmentMode: 'property', attachmentDocumentType: '', attachmentDocumentCategory: '', pdfTemplateId: '', audience: 'Lead',
        },
        {
          id: 'closing-reminder', name: 'Closing Reminder', subject: 'Closing reminder for {{property_address}}',
          body: 'Hello {{client_name}}, this is a reminder that your closing for {{property_address}} is scheduled on {{closing_date}}. Please bring the requested documents and contact {{agent_name}} with any questions.',
          channels: ['Email', 'SMS'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{closing_date}}', '{{agent_name}}'], audience: 'Lead',
        },
        {
          id: 'follow-up-after-visit', name: 'Follow-Up After Visit', subject: 'Thanks for visiting {{property_address}}',
          body: 'Hi {{client_name}}, thank you for viewing {{property_address}}. What questions can {{agent_name}} answer before your next step?',
          channels: ['Email', 'SMS'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}'], audience: 'Lead',
        },
        {
          id: 'document-request', name: 'Document Request', subject: 'Documents needed for {{property_address}}',
          body: 'Hello {{client_name}}, please send {{document_list}} so {{agent_name}} can keep your deal moving for {{property_address}}.',
          channels: ['Email', 'SMS'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{document_list}}'], audience: 'Lead',
        },
        {
          id: 'deal-update', name: 'Deal Update', subject: 'Deal update for {{property_address}}',
          body: 'Hi {{client_name}}, your deal for {{property_address}} is now at {{deal_stage}}. {{agent_name}} will follow up with the next action.',
          channels: ['Email', 'SMS'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{deal_stage}}'], audience: 'Lead',
        },
        {
          id: 'closing-congratulations', name: 'Closing Congratulations', subject: 'Congratulations on closing {{property_address}}',
          body: 'Congratulations {{client_name}}! Closing for {{property_address}} is complete. {{agency_name}} and {{agent_name}} are grateful to be part of the move.',
          channels: ['Email'], variableTokens: ['{{client_name}}', '{{property_address}}', '{{agent_name}}', '{{agency_name}}'], audience: 'Lead',
        },
        {
          id: 'owner-feedback-summary',
          name: 'Weekly Owner Feedback Summary',
          subject: 'Weekly showing feedback for {{property_address}}',
          body: 'Hello, here is the weekly showing feedback for {{property_address}} from {{fromdate}} to {{todate}}.\n\nPositive feedback\n{{positive_feedback}}\n\nNegative feedback\n{{negative_feedback}}\n\nSummary\n{{feedback_summary}}',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{property_address}}', '{{fromdate}}', '{{todate}}', '{{feedback_summary}}', '{{positive_feedback}}', '{{negative_feedback}}', '{{positive_summary}}', '{{negative_summary}}', '{{feedback1}}'],
          sequenceType: 'Direct', gapDays: 0, isActive: true, attachPropertyDocuments: false, attachmentMode: 'none', attachmentDocumentType: '', attachmentDocumentCategory: '', pdfTemplateId: '', audience: 'OwnerFeedback',
        },
      ],
    };
  }
}
