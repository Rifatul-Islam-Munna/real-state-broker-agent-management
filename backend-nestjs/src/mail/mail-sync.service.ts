import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { DataSource, Repository } from 'typeorm';
import { AgencyIntegrationSettings } from '../settings/entities/integration-settings.entity';
import { Lead, LeadPriority, LeadStage } from '../leads/entities/lead.entity';
import { MailboxLeadIntelligenceService } from '../leads/mailbox-lead-intelligence.service';
import { Property } from '../properties/entities/property.entity';
import { MailInboxItem, MailInboxKind, MailInboxStatus } from './entities/mail.entity';

interface MailProviderConfig {
  providerName: string;
  enableInboxSync: boolean;
  imapHost: string;
  imapPort: number;
  imapUsername: string;
  imapPassword: string;
  imapUseSsl: boolean;
  imapFolder: string;
  syncIntervalMinutes: number;
  maxMessagesPerSync: number;
}

interface InboundEmail {
  senderEmail: string;
  senderName: string;
  subject: string;
  body: string;
  receivedAt: Date;
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
    private leadIntelligence: MailboxLeadIntelligenceService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
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
            ? 'Inbox sync imports unread mail and marks it as read.'
            : 'Inbox sync imports unread mail and marks it as read, but AI extraction is not configured for new sender matching.',
    };
  }

  private async runSync(trigger: string, forceRun: boolean) {
    const settings = await this.integrationRepo.findOne({ where: { id: 1 } });
    const config = this.readMailConfig(settings?.smtpPayload);
    if (!config?.enableInboxSync || this.isRunning) return;

    if (!forceRun && this.lastStartedAt) {
      const nextRunAt = this.lastStartedAt.getTime() + config.syncIntervalMinutes * 60_000;
      if (Date.now() < nextRunAt) return;
    }

    this.isRunning = true;
    this.lastTrigger = trigger;
    this.lastStartedAt = new Date();
    this.lastError = null;

    try {
      const result = await this.syncInbox(config);
      this.lastImportedCount = result.importedCount;
      this.lastMatchedLeadCount = result.matchedLeadCount;
      this.lastCreatedLeadCount = result.createdLeadCount;
      this.lastSkippedCount = result.skippedCount;
      this.lastCompletedAt = new Date();
      this.lastSucceededAt = this.lastCompletedAt;
    } catch (error) {
      this.lastCompletedAt = new Date();
      this.lastError = this.errorMessage(error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async syncInbox(config: MailProviderConfig): Promise<SyncRunResult> {
    this.validateConfig(config);
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
        const unseen = await client.search({ seen: false }, { uid: true });
        const uids = (unseen || []).slice(-config.maxMessagesPerSync);
        const messages = uids.length
          ? await client.fetchAll(uids, { uid: true, source: true, internalDate: true }, { uid: true })
          : [];

        for (const message of messages) {
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
            receivedAt: parsed.date ?? this.toDate(message.internalDate) ?? new Date(),
          };

          if (!inbound.senderEmail || (!inbound.subject && !inbound.body)) {
            result.skippedCount++;
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
            continue;
          }

          const saved = await this.saveInbound(inbound, properties);
          if (saved.skipped) result.skippedCount++;
          else result.importedCount++;
          if (saved.matchedLead) result.matchedLeadCount++;
          if (saved.createdLead) result.createdLeadCount++;

          await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
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

  private async saveInbound(inbound: InboundEmail, properties: Property[]) {
    const extracted = await this.leadIntelligence.extractLeadFromEmail({
      ...inbound,
      receivedAt: inbound.receivedAt,
    });
    const matchedProperty = this.matchProperty(properties, inbound);
    const combined = `${inbound.subject}\n${inbound.body}`.toLowerCase();
    const isPropertyInquiry = !!matchedProperty || this.isPropertyInquiry(combined);

    return this.dataSource.transaction(async (manager) => {
      const mailRepo = manager.getRepository(MailInboxItem);
      const leadRepo = manager.getRepository(Lead);
      const duplicate = await mailRepo.exists({
        where: {
          email: inbound.senderEmail,
          subject: inbound.subject,
          message: inbound.body,
        },
      });
      if (duplicate) return { skipped: true, matchedLead: false, createdLead: false };

      let lead = await leadRepo.createQueryBuilder('lead')
        .where('LOWER(lead.email) = :email', { email: inbound.senderEmail })
        .getOne();
      let matchedLead = false;
      let createdLead = false;

      if (lead) {
        matchedLead = true;
        lead.lastActivityAt = inbound.receivedAt;
        if (extracted.phone && !lead.phone) lead.phone = extracted.phone;
        if (extracted.interest) lead.interest = extracted.interest;
        if (matchedProperty) {
          if (!lead.property) lead.property = matchedProperty.title;
          if (!lead.agent && matchedProperty.agent) {
            lead.agent = `${matchedProperty.agent.firstName ?? ''} ${matchedProperty.agent.lastName ?? ''}`.trim();
          }
          if (!lead.agentId) lead.agentId = matchedProperty.agentId;
        }
        lead = await leadRepo.save(lead);
      } else if (isPropertyInquiry) {
        const interest = this.inferInterest(combined, extracted.interest);
        lead = leadRepo.create({
          name: this.chooseName(extracted.name, inbound),
          email: inbound.senderEmail,
          phone: extracted.phone ?? 'Not provided',
          summary: this.buildSummary(inbound, interest),
          property: matchedProperty?.title ?? '',
          stage: LeadStage.New,
          priority: LeadPriority.Warm,
          agent: matchedProperty?.agent
            ? `${matchedProperty.agent.firstName ?? ''} ${matchedProperty.agent.lastName ?? ''}`.trim()
            : '',
          agentId: matchedProperty?.agentId,
          source: 'Mail Inbox',
          interest,
          timeline: '',
          inBoard: true,
          notes: [],
          createdAt: inbound.receivedAt,
          updatedAt: inbound.receivedAt,
          lastActivityAt: inbound.receivedAt,
        });
        lead = await leadRepo.save(lead);
        createdLead = true;
      }

      const mail = mailRepo.create({
        email: inbound.senderEmail,
        name: inbound.senderName,
        subject: inbound.subject,
        message: inbound.body,
        kind: MailInboxKind.Direct,
        status: MailInboxStatus.New,
        leadId: lead?.id ?? null,
        createdAt: inbound.receivedAt,
        updatedAt: inbound.receivedAt,
      });
      await mailRepo.save(mail);
      return { skipped: false, matchedLead, createdLead };
    });
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
      enableInboxSync: raw.enableInboxSync === true,
      imapHost: `${raw.imapHost ?? defaultHost}`.trim(),
      imapPort: this.clampInt(raw.imapPort, 993, 1, 65_535),
      imapUsername: `${raw.imapUsername ?? raw.username ?? ''}`.trim(),
      imapPassword: `${raw.imapPassword ?? raw.password ?? ''}`.trim(),
      imapUseSsl: raw.imapUseSsl !== false,
      imapFolder: `${raw.imapFolder ?? 'INBOX'}`.trim() || 'INBOX',
      syncIntervalMinutes: this.clampInt(raw.syncIntervalMinutes, 10, 5, 120),
      maxMessagesPerSync: this.clampInt(raw.maxMessagesPerSync, 25, 5, 100),
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
    if (!config.imapHost) throw new Error('IMAP host is required when inbox sync is enabled.');
    if (!config.imapUsername) throw new Error('IMAP username is required when inbox sync is enabled.');
    if (!config.imapPassword) throw new Error('IMAP password is required when inbox sync is enabled.');
  }

  private matchProperty(properties: Property[], inbound: InboundEmail) {
    const text = `${inbound.subject}\n${inbound.body}`.toLowerCase();
    return properties
      .filter((property) => !!property.title?.trim())
      .sort((a, b) => b.title.length - a.title.length)
      .find((property) => text.includes(property.title.trim().toLowerCase()));
  }

  private isPropertyInquiry(text: string) {
    return [
      'property', 'listing', 'apartment', 'flat', 'house', 'home', 'condo',
      'commercial', 'land', 'plot', 'office', 'shop', 'rent', 'buy', 'sale',
      'showing', 'viewing', 'bedroom', 'bathroom', 'real estate',
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

  private chooseName(suggested: string, inbound: InboundEmail) {
    if (suggested && suggested !== 'Unknown') return suggested.trim();
    if (inbound.senderName) return inbound.senderName;
    return (inbound.senderEmail.split('@')[0] || 'Email Lead').replace(/[._-]+/g, ' ').trim();
  }

  private clampInt(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
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
