import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { DataSource, Repository } from 'typeorm';
import { AgencyIntegrationSettings } from '../settings/entities/integration-settings.entity';
import { Lead, LeadFollowUpStatus, LeadPriority, LeadStage } from '../leads/entities/lead.entity';
import { LeadHistoryEntry, leadHistoryKindDb, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { LeadIntelligenceService } from '../leads/lead-intelligence.service';
import { MailboxLeadIntelligenceService } from '../leads/mailbox-lead-intelligence.service';
import { Property } from '../properties/entities/property.entity';
import { MailInboxItem, MailInboxKind, MailInboxStatus } from './entities/mail.entity';
import { SettingsService } from '../settings/settings.service';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { ShowingFeedbackService } from '../showing-feedback/showing-feedback.service';
import { LeadCollectionTemplateService } from './lead-collection-template.service';
import type { LeadCollectionParseResult } from './lead-collection-parser';

interface MailProviderConfig {
  providerName: string;
  authType: 'password' | 'gmail-oauth';
  enableInboxSync: boolean;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapPassword: string;
  imapUseSsl: boolean;
  imapFolder: string;
  mailboxTag: string;
  leadTemplateTags: string[];
  duplicatePolicy: 'skip-exact-message' | 'process-every-message';
  autoCreateLeads: boolean;
  syncIntervalMinutes: number;
  maxMessagesPerSync: number;
  markAsReadAfterSync: boolean;
  lastSuccessfulScanAt: string | null;
  gmailEmail: string;
  gmailAccessToken: string;
  gmailRefreshToken: string;
  gmailTokenExpiresAt: string | null;
  gmailLabelIds: string[];
}

interface InboundEmail {
  senderEmail: string;
  senderName: string;
  subject: string;
  body: string;
  htmlBody: string;
  messageId: string;
  inReplyTo: string;
  references: string[];
  mailboxTag: string;
  receivedAt: Date;
}

interface AiProviderConfig {
  providerName: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface ExtractedLeadInfo {
  name?: string;
  email?: string;
  phone?: string;
  propertyTitle?: string;
  propertyLocation?: string;
  budget?: string;
  timeline?: string;
  interest?: string;
  intent?: string;
  confidence?: number;
  shouldCreateLead?: boolean;
  rawFields?: Record<string, string>;
}

interface LeadExtractionOutcome {
  info: ExtractedLeadInfo;
  method: 'Template' | 'Template+Fallback' | 'Fallback' | 'AI';
  confidence: number;
  aiUsed: boolean;
}

interface SyncRunResult {
  importedCount: number;
  matchedLeadCount: number;
  createdLeadCount: number;
  skippedCount: number;
}

@Injectable()
export class MailInboxSyncBackgroundService {
  private readonly logger = new Logger(MailInboxSyncBackgroundService.name);
  private isRunning = false;
  private lastTrigger = 'Idle';
  private lastStartedAt: Date | null = null;
  private lastCompletedAt: Date | null = null;
  private lastSucceededAt: Date | null = null;
  private lastImportedCount = 0;
  private lastMatchedLeadCount = 0;
  private lastCreatedLeadCount = 0;
  private lastSkippedCount = 0;
  private lastError: string | null = null;

  constructor(
    @InjectRepository(AgencyIntegrationSettings)
    private integrationRepo: Repository<AgencyIntegrationSettings>,
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    private dataSource: DataSource,
    private mailboxLeadIntelligence: MailboxLeadIntelligenceService,
    private leadCollectionTemplates: LeadCollectionTemplateService,
    private settingsService: SettingsService,
    private showingFeedbackService: ShowingFeedbackService,
    private leadLearner: LeadIntelligenceService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    try {
      await this.runSync('Scheduled', false);
    } catch (error) {
      this.logger.error(`Scheduled mailbox sync failed: ${this.errorMessage(error)}`);
    }
  }

  async sync() {
    await this.runSync('Manual', true);
    return this.getSyncStatus();
  }

  async syncRange(fromDate: Date, toDate: Date) {
    if (this.isRunning) throw new Error('A sync is already running. Please wait and try again.');
    const settings = await this.integrationRepo.findOne({ where: { id: 1 } });
    const config = this.readMailConfig(settings?.smtpPayload);
    if (!config) throw new Error('Mail is not configured.');
    this.validateConfig(config);
    this.isRunning = true;
    this.lastTrigger = 'Range';
    this.lastStartedAt = new Date();
    this.lastError = null;
    try {
      const aiConfig = this.readAiConfig(settings?.aiProviderPayload);
      const result = await this.syncInbox(config, aiConfig, { fromDate, toDate });
      this.lastImportedCount = result.importedCount;
      this.lastMatchedLeadCount = result.matchedLeadCount;
      this.lastCreatedLeadCount = result.createdLeadCount;
      this.lastSkippedCount = result.skippedCount;
      this.lastCompletedAt = new Date();
      this.lastSucceededAt = this.lastCompletedAt;
      return { ...result, fromDate, toDate };
    } catch (error) {
      this.lastCompletedAt = new Date();
      this.lastError = this.errorMessage(error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async getSyncStatus() {
    const settings = await this.integrationRepo.findOne({ where: { id: 1 } });
    const config = this.readMailConfig(settings?.smtpPayload);
    const isConfigured = config !== null;
    const syncEnabled = config?.enableInboxSync === true;
    const syncIntervalMinutes = syncEnabled ? config.syncIntervalMinutes : null;

    return {
      isConfigured,
      syncEnabled,
      syncIntervalMinutes,
      hasAiProviderConfig: !!settings?.aiProviderPayload && this.isJson(settings.aiProviderPayload),
      isRunning: this.isRunning,
      lastTrigger: this.lastTrigger,
      lastStartedAt: this.lastStartedAt,
      lastCompletedAt: this.lastCompletedAt,
      lastSucceededAt: this.lastSucceededAt,
      nextRunAt: syncEnabled && this.lastStartedAt && syncIntervalMinutes
        ? new Date(this.lastStartedAt.getTime() + syncIntervalMinutes * 60_000)
        : null,
      lastImportedCount: this.lastImportedCount,
      lastMatchedLeadCount: this.lastMatchedLeadCount,
      lastCreatedLeadCount: this.lastCreatedLeadCount,
      lastSkippedCount: this.lastSkippedCount,
      lastError: this.lastError,
      statusMessage: !isConfigured
        ? 'Mail is not configured yet.'
        : !syncEnabled
          ? 'Inbox sync is turned off.'
          : settings?.aiProviderPayload && this.isJson(settings.aiProviderPayload)
            ? 'Inbox sync imports unread mail, extracts lead details, links replies, and routes property inquiries to assigned agents.'
            : 'Inbox sync imports unread mail and uses fallback parsing. Connect AI to improve property, phone, budget, and intent extraction.',
    };
  }

  private async runSync(trigger: string, forceRun: boolean) {
    const settings = await this.integrationRepo.findOne({ where: { id: 1 } });
    const config = this.readMailConfig(settings?.smtpPayload);
    const gmailDisconnected =
      config?.authType === 'gmail-oauth' &&
      (!config.gmailRefreshToken || !config.gmailEmail);
    if (!config?.enableInboxSync || gmailDisconnected || this.isRunning) return;

    if (!forceRun && this.lastStartedAt) {
      const nextRunAt = this.lastStartedAt.getTime() + config.syncIntervalMinutes * 60_000;
      if (Date.now() < nextRunAt) return;
    }

    this.isRunning = true;
    this.lastTrigger = trigger;
    this.lastStartedAt = new Date();
    this.lastError = null;

    try {
      const aiConfig = this.readAiConfig(settings?.aiProviderPayload);
      const scanStartedAt = new Date();
      const result = await this.syncInbox(config, aiConfig);
      this.lastImportedCount = result.importedCount;
      this.lastMatchedLeadCount = result.matchedLeadCount;
      this.lastCreatedLeadCount = result.createdLeadCount;
      this.lastSkippedCount = result.skippedCount;
      this.lastCompletedAt = new Date();
      this.lastSucceededAt = this.lastCompletedAt;
      await this.persistScanCursor(scanStartedAt);
    } catch (error) {
      this.lastCompletedAt = new Date();
      this.lastError = this.errorMessage(error);
      if (
        settings &&
        config.authType === 'gmail-oauth' &&
        /Gmail token refresh failed:\s*(400|401)/i.test(this.lastError)
      ) {
        settings.smtpPayload = JSON.stringify({
          ...config,
          enableInboxSync: false,
          gmailEmail: '',
          gmailAccessToken: '',
          gmailRefreshToken: '',
          gmailTokenExpiresAt: null,
        });
        await this.integrationRepo.save(settings);
      }
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async syncInbox(config: MailProviderConfig, aiConfig: AiProviderConfig | null, dateRange?: { fromDate: Date; toDate: Date }): Promise<SyncRunResult> {
    this.validateConfig(config);
    if (config.authType === 'gmail-oauth') return this.syncGmailInbox(config, aiConfig, dateRange);
    const result: SyncRunResult = {
      importedCount: 0,
      matchedLeadCount: 0,
      createdLeadCount: 0,
      skippedCount: 0,
    };
    const properties = await this.propertyRepo.find({ relations: ['agent'], order: { updatedAt: 'DESC' } });
    const client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapUseSsl && config.imapPort === 993,
      doSTARTTLS: config.imapUseSsl ? undefined : false,
      auth: { user: config.imapUsername, pass: config.imapPassword },
      logger: false,
      connectionTimeout: 30_000,
      greetingTimeout: 20_000,
      socketTimeout: 120_000,
      maxLiteralSize: 25 * 1024 * 1024,
      tls: { rejectUnauthorized: !this.isLocalHost(config.imapHost) },
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock(config.imapFolder, { description: 'mail-inbox-sync' });
      try {
        const imapSearchQuery = dateRange
          ? { since: dateRange.fromDate }
          : config.lastSuccessfulScanAt
            ? { since: new Date(config.lastSuccessfulScanAt) }
            : { seen: false };
        const candidates = await client.search(imapSearchQuery, { uid: true });
        const uids = dateRange ? (candidates || []) : (candidates || []).slice(-config.maxMessagesPerSync);
        const messages = uids.length
          ? await client.fetchAll(uids, { uid: true, source: true, internalDate: true }, { uid: true })
          : [];

        const cursorTime = !dateRange && config.lastSuccessfulScanAt ? new Date(config.lastSuccessfulScanAt).getTime() : null;
        for (const message of messages) {
          const msgTime = message.internalDate ? new Date(message.internalDate).getTime() : null;
          if (dateRange && msgTime && msgTime > dateRange.toDate.getTime()) continue;
          if (!dateRange && cursorTime && msgTime && msgTime <= cursorTime) continue;
          if (!message.source || !message.uid) {
            result.skippedCount++;
            continue;
          }

          const parsed = await simpleParser(message.source, { skipImageLinks: true });
          const sender = parsed.from?.value?.[0];
          const inbound: InboundEmail = {
            senderEmail: (sender?.address ?? '').trim().toLowerCase(),
            senderName: (sender?.name ?? '').trim(),
            subject: (parsed.subject ?? '').trim(),
            body: (parsed.text ?? '').trim(),
            htmlBody: typeof parsed.html === 'string' ? parsed.html : '',
            messageId: `${parsed.messageId ?? ''}`.trim(),
            inReplyTo: `${parsed.inReplyTo ?? ''}`.trim(),
            references: this.normalizeReferences(parsed.references),
            mailboxTag: config.mailboxTag,
            receivedAt: parsed.date ?? this.toDate(message.internalDate) ?? new Date(),
          };

          if (!inbound.senderEmail || (!inbound.subject && !inbound.body)) {
            result.skippedCount++;
            if (config.markAsReadAfterSync) {
              await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
            }
            continue;
          }

          const saved = await this.saveInbound(inbound, properties, config, aiConfig);
          if (saved.skipped) result.skippedCount++;
          else result.importedCount++;
          if (saved.matchedLead) result.matchedLeadCount++;
          if (saved.createdLead) result.createdLeadCount++;

          if (config.markAsReadAfterSync) {
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      if (client.usable) {
        try {
          await client.logout();
        } catch {
          client.close();
        }
      } else {
        client.close();
      }
    }

    return result;
  }

  private async syncGmailInbox(config: MailProviderConfig, aiConfig: AiProviderConfig | null, dateRange?: { fromDate: Date; toDate: Date }): Promise<SyncRunResult> {
    const result: SyncRunResult = { importedCount: 0, matchedLeadCount: 0, createdLeadCount: 0, skippedCount: 0 };
    const properties = await this.propertyRepo.find({ relations: ['agent'], order: { updatedAt: 'DESC' } });
    const accessToken = await this.getGmailAccessToken(config);
    const labels = config.gmailLabelIds.length ? config.gmailLabelIds : ['INBOX'];
    const gmailQ = dateRange
      ? `after:${Math.floor(dateRange.fromDate.getTime() / 1000)} before:${Math.floor(dateRange.toDate.getTime() / 1000)}`
      : config.lastSuccessfulScanAt
        ? `after:${Math.floor(new Date(config.lastSuccessfulScanAt).getTime() / 1000)}`
        : 'is:unread';
    const messages: any[] = [];
    let pageToken = '';
    do {
      const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      listUrl.searchParams.set('maxResults', String(dateRange ? 100 : config.maxMessagesPerSync));
      listUrl.searchParams.set('q', gmailQ);
      for (const label of labels) listUrl.searchParams.append('labelIds', label);
      if (pageToken) listUrl.searchParams.set('pageToken', pageToken);
      const listResponse = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!listResponse.ok) throw new Error(`Gmail list failed: ${listResponse.status} ${await this.safeErrorBody(listResponse)}`);
      const list: any = await listResponse.json();
      messages.push(...(list.messages ?? []));
      pageToken = dateRange ? `${list.nextPageToken ?? ''}`.trim() : '';
    } while (pageToken);
    for (const item of messages) {
      const id = `${item.id ?? ''}`.trim();
      if (!id) continue;
      const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=raw`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!messageResponse.ok) {
        result.skippedCount++;
        continue;
      }
      const message: any = await messageResponse.json();
      const source = Buffer.from(this.base64UrlDecode(`${message.raw ?? ''}`), 'base64');
      const parsed = await simpleParser(source, { skipImageLinks: true });
      const sender = parsed.from?.value?.[0];
      const inbound: InboundEmail = {
        senderEmail: (sender?.address ?? '').trim().toLowerCase(),
        senderName: (sender?.name ?? '').trim(),
        subject: (parsed.subject ?? '').trim(),
        body: (parsed.text ?? '').trim(),
        htmlBody: typeof parsed.html === 'string' ? parsed.html : '',
        messageId: `gmail:${id}`,
        inReplyTo: `${parsed.inReplyTo ?? ''}`.trim(),
        references: this.normalizeReferences(parsed.references),
        mailboxTag: config.mailboxTag || 'gmail',
        receivedAt: parsed.date ?? new Date(Number(message.internalDate || Date.now())),
      };
      // For range sync, filter out messages outside the toDate boundary
      if (dateRange) {
        const t = inbound.receivedAt.getTime();
        if (t < dateRange.fromDate.getTime() || t > dateRange.toDate.getTime()) {
          result.skippedCount++;
          continue;
        }
      }
      if (!inbound.senderEmail || (!inbound.subject && !inbound.body)) {
        result.skippedCount++;
        if (config.markAsReadAfterSync) await this.markGmailRead(id, accessToken);
        continue;
      }
      const saved = await this.saveInbound(inbound, properties, config, aiConfig);
      if (saved.skipped) result.skippedCount++;
      else result.importedCount++;
      if (saved.matchedLead) result.matchedLeadCount++;
      if (saved.createdLead) result.createdLeadCount++;
      if (config.markAsReadAfterSync) await this.markGmailRead(id, accessToken);
    }
    return result;
  }

  private async saveInbound(inbound: InboundEmail, properties: Property[], config: MailProviderConfig, aiConfig: AiProviderConfig | null) {
    const templateResult = await this.leadCollectionTemplates.extractFromEmail({
      fromAddress: inbound.senderEmail,
      subject: inbound.subject,
      htmlBody: inbound.htmlBody,
      textBody: inbound.body,
      mailboxTag: inbound.mailboxTag,
    });
    const fallback = await this.mailboxLeadIntelligence.extractLeadFromEmail({
      ...inbound,
      receivedAt: inbound.receivedAt,
    });
    const extraction = await this.extractLeadInfo(inbound, aiConfig, fallback, templateResult);
    const extracted = extraction.info;
    const agencySettings = await this.settingsService.getAdminSettings();
    const defaultPhoneCountry = agencySettings.profile?.defaultPhoneCountry ?? 'US';
    extracted.phone = normalizePhoneNumber(extracted.phone, defaultPhoneCountry);
    const matchedProperty = this.matchProperty(properties, inbound, extracted);
    const leadTemplateAllowed = templateResult.scopeMatched !== false && templateResult.matched === true;
    const combined = `${inbound.subject}\n${inbound.body}`.toLowerCase();
    const isPropertyInquiry = leadTemplateAllowed || this.isPropertyInquiry(combined);

    const outcome = await this.dataSource.transaction(async (manager) => {
      const mailRepo = manager.getRepository(MailInboxItem);
      const leadRepo = manager.getRepository(Lead);
      const historyRepo = manager.getRepository(LeadHistoryEntry);
      if (config.duplicatePolicy === 'skip-exact-message') {
        const duplicate = await this.findDuplicate(mailRepo, inbound);
        if (duplicate) return { skipped: true, matchedLead: false, createdLead: false, leadId: null, mailId: null };
      }

      let lead = await this.findThreadLead(mailRepo, leadRepo, inbound);
      if (!lead) lead = await leadRepo.createQueryBuilder('lead')
        .where('LOWER(lead.email) = :email', { email: (extracted.email || inbound.senderEmail).toLowerCase() })
        .getOne();
      let matchedLead = false;
      let createdLead = false;

      if (lead) {
        matchedLead = true;
        lead.lastActivityAt = inbound.receivedAt;
        if (!['Deal', 'Canceled'].includes(String(lead.stage))) lead.stage = LeadStage.Replied;
        if (extracted.name && (!lead.name || lead.name === 'Unknown')) lead.name = extracted.name;
        if (extracted.phone && (!lead.phone || lead.phone === 'Not provided')) lead.phone = extracted.phone;
        if (extracted.budget && !lead.budget) lead.budget = extracted.budget;
        if (extracted.timeline && !lead.timeline) lead.timeline = extracted.timeline;
        if (extracted.interest) lead.interest = extracted.interest;
        if (matchedProperty) {
          if (!lead.property) lead.property = matchedProperty.title;
          if (matchedProperty.agent) {
            lead.agent = `${matchedProperty.agent.firstName ?? ''} ${matchedProperty.agent.lastName ?? ''}`.trim();
          }
          if (matchedProperty.agentId) lead.agentId = matchedProperty.agentId;
        } else if (extracted.propertyTitle && !lead.property) {
          lead.property = extracted.propertyTitle;
        }
        lead = await leadRepo.save(lead);
      } else if (config.autoCreateLeads && isPropertyInquiry) {
        const interest = this.inferInterest(combined, extracted.interest);
        lead = leadRepo.create({
          name: this.chooseName(extracted.name, inbound),
          email: (extracted.email || inbound.senderEmail).toLowerCase(),
          phone: extracted.phone ?? 'Not provided',
          summary: extracted.rawFields?.summary || this.buildSummary(inbound, interest),
          property: matchedProperty?.title ?? extracted.propertyTitle ?? '',
          budget: extracted.budget ?? '',
          stage: LeadStage.New,
          priority: this.priorityFromIntent(extracted.intent, extracted.confidence),
          agent: matchedProperty?.agent
            ? `${matchedProperty.agent.firstName ?? ''} ${matchedProperty.agent.lastName ?? ''}`.trim()
            : '',
          agentId: matchedProperty?.agentId,
          source: extracted.rawFields?.source || 'Mail Inbox',
          interest,
          timeline: extracted.timeline ?? '',
          inBoard: true,
          followUpStatus: LeadFollowUpStatus.Open,
          nextActionDate: new Date(inbound.receivedAt.getTime() + 24 * 60 * 60 * 1000),
          nextActionType: extracted.rawFields?.nextActionType || 'Reply to inbound email',
          notes: [],
          lastActivityAt: inbound.receivedAt,
        });
        this.leadLearner.applyDecision(lead, await this.leadLearner.classify({
          ...extracted,
          message: inbound.body,
          property: matchedProperty?.title ?? extracted.propertyTitle ?? '',
          source: 'Mail Inbox',
          summary: extracted.rawFields?.summary || inbound.subject,
        }), true);
        lead = await leadRepo.save(lead);
        createdLead = true;
      }

      const mail = mailRepo.create({
        email: inbound.senderEmail,
        name: inbound.senderName,
        subject: inbound.subject,
        message: inbound.body,
        htmlBody: inbound.htmlBody,
        messageId: inbound.messageId,
        inReplyTo: inbound.inReplyTo,
        references: inbound.references,
        mailboxTag: inbound.mailboxTag,
        extractedLead: extracted,
        extractionMethod: extraction.method,
        extractionConfidence: extraction.confidence,
        leadCollectionTemplateId: templateResult.templateId,
        leadCollectionTemplateName: templateResult.templateName,
        aiFallbackUsed: extraction.aiUsed,
        extractionDetails: {
          matchScore: templateResult.matchScore,
          missingRequiredFields: templateResult.missingRequiredFields,
          diagnostics: templateResult.diagnostics,
        },
        kind: MailInboxKind.Direct,
        status: MailInboxStatus.New,
        leadId: lead?.id ?? null,
        createdAt: inbound.receivedAt,
        updatedAt: inbound.receivedAt,
      });
      const savedMail = await mailRepo.save(mail);
      if (lead) {
        await historyRepo.save(historyRepo.create({
          leadId: lead.id,
          kind: 'MailInbox',
          direction: 'Incoming',
          status: 'Received',
          title: inbound.subject || 'Inbound email',
          summary: this.buildHistorySummary(inbound, extracted, matchedProperty),
          body: inbound.body,
          provider: 'Mail Inbox',
          createdBy: inbound.senderName || inbound.senderEmail,
          occurredAt: inbound.receivedAt,
        }));
        await this.cancelScheduledLeadAutomation(historyRepo, lead.id, inbound.receivedAt);
        await leadRepo.update(lead.id, {
          followUpStatus: LeadFollowUpStatus.Completed,
          ...(createdLead || ['Deal', 'Canceled'].includes(String(lead.stage)) ? {} : { stage: LeadStage.Replied }),
          lastActivityAt: inbound.receivedAt,
          updatedAt: inbound.receivedAt,
        });
      }
      return {
        skipped: false,
        matchedLead,
        createdLead,
        leadId: lead?.id ?? null,
        mailId: savedMail.id,
      };
    });

    await this.leadCollectionTemplates.recordTemplateResult(templateResult, extraction.aiUsed);

    if (outcome.leadId) {
      await this.showingFeedbackService.processInbound({
        channel: 'Email',
        leadId: outcome.leadId,
        message: inbound.body,
        receivedAt: inbound.receivedAt,
        realtorContact: inbound.senderEmail,
        sourceMessageId: inbound.messageId || `mail-${outcome.mailId}`,
        subject: inbound.subject,
      });
    }
    return outcome;
  }

  private async cancelScheduledLeadAutomation(historyRepo: Repository<LeadHistoryEntry>, leadId: number, repliedAt: Date) {
    await historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({
        occurredAt: repliedAt,
        status: 'Failed',
        summary: 'Automatic outreach canceled because lead replied by email.',
      })
      .where('lead_id = :leadId', { leadId })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .andWhere('kind IN (:...kinds)', { kinds: ['Email', 'Sms', 'Call'].map(leadHistoryKindDb) })
      .execute();
  }

  private readMailConfig(payload?: string | null): MailProviderConfig | null {
    if (!payload) return null;
    let raw: any;
    try {
      raw = JSON.parse(payload);
    } catch {
      return null;
    }

    const providerName = `${raw.providerName ?? 'Custom'}`.trim() || 'Custom';
    const provider = providerName.toLowerCase();
    const defaultHost = provider === 'gmail'
      ? 'imap.gmail.com'
      : provider === 'outlook'
        ? 'outlook.office365.com'
        : '';
    return {
      providerName,
      authType: raw.authType === 'gmail-oauth' ? 'gmail-oauth' : 'password',
      enableInboxSync: raw.enableInboxSync === true,
      imapHost: `${raw.imapHost ?? defaultHost}`.trim(),
      imapPort: this.clampInt(raw.imapPort, 993, 1, 65_535),
      imapUsername: `${raw.imapUsername ?? raw.username ?? ''}`.trim(),
      imapPassword: `${raw.imapPassword ?? raw.password ?? ''}`.trim(),
      imapUseSsl: raw.imapUseSsl !== false,
      imapFolder: `${raw.imapFolder ?? 'INBOX'}`.trim() || 'INBOX',
      mailboxTag: `${raw.mailboxTag ?? ''}`.trim(),
      leadTemplateTags: this.stringList(raw.leadTemplateTags),
      duplicatePolicy: raw.duplicatePolicy === 'process-every-message' ? 'process-every-message' : 'skip-exact-message',
      autoCreateLeads: raw.autoCreateLeads !== false,
      syncIntervalMinutes: this.clampInt(raw.syncIntervalMinutes, 10, 1, 120),
      maxMessagesPerSync: this.clampInt(raw.maxMessagesPerSync, 25, 5, 100),
      markAsReadAfterSync: raw.markAsReadAfterSync === true,
      lastSuccessfulScanAt: this.validDateString(raw.lastSuccessfulScanAt),
      gmailEmail: `${raw.gmailEmail ?? ''}`.trim(),
      gmailAccessToken: `${raw.gmailAccessToken ?? ''}`.trim(),
      gmailRefreshToken: `${raw.gmailRefreshToken ?? ''}`.trim(),
      gmailTokenExpiresAt: raw.gmailTokenExpiresAt ? `${raw.gmailTokenExpiresAt}` : null,
      gmailLabelIds: this.stringList(raw.gmailLabelIds).length ? this.stringList(raw.gmailLabelIds) : ['INBOX'],
    };
  }

  private readAiConfig(payload?: string | null): AiProviderConfig | null {
    if (!payload) return null;
    const raw = this.parseJson(payload);
    if (!raw?.apiKey || !raw?.model) return null;
    const providerName = `${raw.providerName ?? 'OpenAI'}`.trim() || 'OpenAI';
    const defaultBaseUrl = providerName.toLowerCase().includes('openai') ? 'https://api.openai.com/v1' : '';
    return {
      providerName,
      baseUrl: `${raw.baseUrl ?? defaultBaseUrl}`.replace(/\/+$/, ''),
      model: `${raw.model}`.trim(),
      apiKey: `${raw.apiKey}`.trim(),
    };
  }

  private isJson(payload: string) {
    try {
      JSON.parse(payload);
      return true;
    } catch {
      return false;
    }
  }

  private validateConfig(config: MailProviderConfig) {
    if (config.authType === 'gmail-oauth') {
      if (!config.gmailRefreshToken) throw new Error('Gmail refresh token is required when Gmail OAuth is enabled.');
      return;
    }
    if (!config.imapHost) throw new Error('IMAP host is required when inbox sync is enabled.');
    if (!config.imapUsername) throw new Error('IMAP username is required when inbox sync is enabled.');
    if (!config.imapPassword) throw new Error('IMAP password is required when inbox sync is enabled.');
  }

  private matchProperty(properties: Property[], inbound: InboundEmail, extracted?: ExtractedLeadInfo) {
    const text = this.normalizeAddressMatch(`${inbound.subject}\n${inbound.body}\n${extracted?.propertyTitle ?? ''}\n${extracted?.propertyLocation ?? ''}`);
    return properties
      .filter((property) => !!property.title?.trim())
      .map((property) => ({ property, score: this.propertyMatchScore(property, text) }))
      .filter((item) => item.score >= 0.42)
      .sort((a, b) => b.score - a.score || b.property.title.length - a.property.title.length)
      .map((item) => item.property)
      .find(Boolean);
  }

  private async persistScanCursor(scannedAt: Date) {
    const current = await this.settingsService.getSmtpConfig();
    await this.settingsService.saveSmtpConfig({
      ...(current ?? {}),
      lastSuccessfulScanAt: scannedAt.toISOString(),
    });
  }

  private validDateString(value: unknown): string | null {
    if (!value) return null;
    const date = new Date(`${value}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private async getGmailAccessToken(config: MailProviderConfig) {
    const expiresAt = config.gmailTokenExpiresAt ? new Date(config.gmailTokenExpiresAt).getTime() : 0;
    if (config.gmailAccessToken && expiresAt > Date.now() + 60_000) return config.gmailAccessToken;
    const clientId = `${process.env.GOOGLE_CLIENT_ID ?? ''}`.trim();
    const clientSecret = `${process.env.GOOGLE_CLIENT_SECRET ?? ''}`.trim();
    if (!clientId || !clientSecret || !config.gmailRefreshToken) {
      throw new Error('Google OAuth credentials are required for Gmail sync.');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: config.gmailRefreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) throw new Error(`Gmail token refresh failed: ${response.status}`);
    const token: any = await response.json();
    config.gmailAccessToken = `${token.access_token ?? ''}`.trim();
    config.gmailTokenExpiresAt = new Date(Date.now() + (Number(token.expires_in) || 3600) * 1000).toISOString();
    await this.settingsService.saveSmtpConfig({
      ...await this.settingsService.getSmtpConfig(),
      gmailAccessToken: config.gmailAccessToken,
      gmailTokenExpiresAt: config.gmailTokenExpiresAt,
    });
    return config.gmailAccessToken;
  }

  private async markGmailRead(id: string, accessToken: string) {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    }).catch(() => undefined);
  }

  private async safeErrorBody(response: any) {
    try {
      return (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 500);
    } catch {
      return '';
    }
  }

  private propertyMatchScore(property: Property, normalizedEmailText: string) {
    const title = this.normalizeAddressMatch(property.title);
    const location = this.normalizeAddressMatch(`${property.location ?? ''} ${property.exactLocation ?? ''}`);
    const candidates = [title, location].filter(Boolean);
    let score = 0;
    for (const candidate of candidates) {
      if (candidate && normalizedEmailText.includes(candidate)) score = Math.max(score, 1);
      const number = candidate.match(/\b\d{2,}\b/)?.[0];
      if (number && normalizedEmailText.includes(number)) score = Math.max(score, 0.55);
      const words = candidate.split(/\s+/).filter((word) => word.length >= 4);
      const matched = words.filter((word) => normalizedEmailText.includes(word)).length;
      if (words.length) score = Math.max(score, matched / words.length);
      if (number && matched > 0) score = Math.max(score, 0.7);
    }
    return score;
  }

  private normalizeAddressMatch(value: unknown) {
    return `${value ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(street|st|road|rd|avenue|ave|drive|dr|court|ct|lane|ln|boulevard|blvd|north|south|east|west|n|s|e|w)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isPropertyInquiry(text: string) {
    return [
      'property', 'listing', 'apartment', 'flat', 'house', 'home', 'condo',
      'commercial', 'land', 'plot', 'office', 'shop', 'rent', 'buy', 'sale',
      'showing', 'viewing', 'bedroom', 'bathroom', 'real estate',
      'inquiry', 'enquiry', 'interested', 'available', 'availability',
      'price', 'unit', 'lease', 'tour', 'move', 'sqft', 'square feet',
      'floor plan', 'mortgage', 'contact', 'schedule', 'visit', 'purchase',
    ].some((keyword) => text.includes(keyword));
  }

  private inferInterest(text: string, fallback?: string) {
    if (text.includes('rent') || text.includes('lease')) return 'Rent';
    if (text.includes('showing') || text.includes('viewing') || text.includes('visit')) return 'Schedule Viewing';
    if (text.includes('buy') || text.includes('sale') || text.includes('purchase')) return 'Buy';
    return fallback ?? 'Property Inquiry';
  }

  private buildSummary(inbound: InboundEmail, interest: string) {
    const summary = inbound.subject || (inbound.body.length > 180 ? `${inbound.body.slice(0, 180).trim()}...` : inbound.body);
    return `Interest: ${interest}\nMessage: ${summary || 'New inbound email inquiry.'}`;
  }

  private chooseName(suggested: string | undefined, inbound: InboundEmail) {
    if (suggested && suggested !== 'Unknown') return suggested.trim();
    if (inbound.senderName) return inbound.senderName;
    return (inbound.senderEmail.split('@')[0] || 'Email Lead').replace(/[._-]+/g, ' ').trim();
  }

  private async extractLeadInfo(
    inbound: InboundEmail,
    aiConfig: AiProviderConfig | null,
    fallback: any,
    templateResult: LeadCollectionParseResult,
  ): Promise<LeadExtractionOutcome> {
    const templateValues = templateResult.values ?? {};
    const fallbackInfo: ExtractedLeadInfo = {
      name: templateValues.name || fallback.name,
      email: templateValues.email || inbound.senderEmail,
      phone: templateValues.phone || fallback.phone,
      propertyTitle: templateValues.property || '',
      budget: templateValues.budget || '',
      timeline: templateValues.timeline || '',
      interest: templateValues.interest || fallback.interest,
      shouldCreateLead:
        templateResult.scopeMatched !== false &&
        (
          this.leadCollectionTemplates.isConfident(templateResult) ||
          (templateResult.matched && this.isPropertyInquiry(`${inbound.subject}
${inbound.body}`.toLowerCase()))
        ),
      confidence: Math.max(templateResult.confidence, 0.45),
      rawFields: templateValues,
    };

    if (this.leadCollectionTemplates.isConfident(templateResult)) {
      return {
        info: fallbackInfo,
        method: 'Template',
        confidence: templateResult.confidence,
        aiUsed: false,
      };
    }

    if (templateResult.scopeMatched === false || !templateResult.matched || !aiConfig?.baseUrl) {
      return {
        info: fallbackInfo,
        method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
        confidence: fallbackInfo.confidence ?? 0.45,
        aiUsed: false,
      };
    }

    try {
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiConfig.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Extract real estate lead info from email. Return only JSON with keys: name,email,phone,propertyTitle,propertyLocation,budget,timeline,interest,intent,confidence,shouldCreateLead. confidence 0-1. shouldCreateLead true for buyer/renter/seller/property inquiry.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                from: inbound.senderEmail,
                senderName: inbound.senderName,
                subject: inbound.subject,
                body: inbound.body.slice(0, 8000),
                deterministicTemplateAttempt: {
                  templateName: templateResult.templateName,
                  confidence: templateResult.confidence,
                  values: templateResult.values,
                  missingRequiredFields: templateResult.missingRequiredFields,
                },
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        return {
          info: fallbackInfo,
          method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
          confidence: fallbackInfo.confidence ?? 0.45,
          aiUsed: false,
        };
      }
      const data: any = await response.json();
      const parsed = this.parseJson(data?.choices?.[0]?.message?.content);
      if (!parsed) {
        return {
          info: fallbackInfo,
          method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
          confidence: fallbackInfo.confidence ?? 0.45,
          aiUsed: false,
        };
      }
      const info: ExtractedLeadInfo = {
        ...fallbackInfo,
        name: this.cleanText(parsed.name) || fallbackInfo.name,
        email: this.cleanText(parsed.email) || fallbackInfo.email,
        phone: this.cleanText(parsed.phone) || fallbackInfo.phone,
        propertyTitle: this.cleanText(parsed.propertyTitle) || fallbackInfo.propertyTitle,
        propertyLocation: this.cleanText(parsed.propertyLocation),
        budget: this.cleanText(parsed.budget) || fallbackInfo.budget,
        timeline: this.cleanText(parsed.timeline) || fallbackInfo.timeline,
        interest: this.cleanText(parsed.interest) || fallbackInfo.interest,
        intent: this.cleanText(parsed.intent),
        confidence: this.clampNumber(parsed.confidence, fallbackInfo.confidence ?? 0.45, 0, 1),
        shouldCreateLead: parsed.shouldCreateLead === true || fallbackInfo.shouldCreateLead,
      };
      return {
        info,
        method: 'AI',
        confidence: info.confidence ?? 0.45,
        aiUsed: true,
      };
    } catch {
      return {
        info: fallbackInfo,
        method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
        confidence: fallbackInfo.confidence ?? 0.45,
        aiUsed: false,
      };
    }
  }

  private async findDuplicate(mailRepo: Repository<MailInboxItem>, inbound: InboundEmail) {
    if (inbound.messageId) {
      const byMessageId = await mailRepo.findOne({ where: { messageId: inbound.messageId } });
      if (byMessageId) return byMessageId;
    }
    return mailRepo.findOne({
      where: {
        email: inbound.senderEmail,
        subject: inbound.subject,
        message: inbound.body,
      },
    });
  }

  private async findThreadLead(mailRepo: Repository<MailInboxItem>, leadRepo: Repository<Lead>, inbound: InboundEmail) {
    const threadIds = [inbound.inReplyTo, ...inbound.references].map((item) => item.trim()).filter(Boolean);
    if (!threadIds.length) return null;
    const previous = await mailRepo.createQueryBuilder('mail')
      .where('mail.messageId IN (:...threadIds)', { threadIds })
      .andWhere('mail.leadId IS NOT NULL')
      .orderBy('mail.createdAt', 'DESC')
      .getOne();
    return previous?.leadId ? leadRepo.findOne({ where: { id: previous.leadId } }) : null;
  }

  private buildHistorySummary(inbound: InboundEmail, extracted: ExtractedLeadInfo, property?: Property) {
    return [
      property ? `Property: ${property.title}` : extracted.propertyTitle ? `Property: ${extracted.propertyTitle}` : '',
      extracted.phone ? `Phone: ${extracted.phone}` : '',
      extracted.budget ? `Budget: ${extracted.budget}` : '',
      extracted.timeline ? `Timeline: ${extracted.timeline}` : '',
      `Subject: ${inbound.subject || 'Inbound email'}`,
    ].filter(Boolean).join('\n');
  }

  private priorityFromIntent(intent?: string, confidence = 0) {
    const text = `${intent ?? ''}`.toLowerCase();
    if (confidence >= 0.75 && ['buy', 'rent', 'viewing', 'showing', 'urgent'].some((word) => text.includes(word))) return LeadPriority.HighPriority;
    return LeadPriority.Warm;
  }

  private normalizeReferences(value: unknown) {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\s+/) : [];
    return raw.map((item) => `${item ?? ''}`.trim()).filter(Boolean);
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private cleanText(value: any) {
    return `${value ?? ''}`.trim() || undefined;
  }

  private clampNumber(value: any, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private clampInt(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private stringList(value: any) {
    return Array.isArray(value)
      ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))]
      : typeof value === 'string'
        ? [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
        : [];
  }

  private base64UrlDecode(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  }

  private toDate(value?: Date | string) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isLocalHost(host: string) {
    return ['localhost', '127.0.0.1', '::1'].includes(host.trim().toLowerCase());
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : `${error}`;
  }
}
