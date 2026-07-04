import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { DocumentRepositoryItem } from '../documents/entities/document.entity';
import { MailInboxItem, MailInboxKind, MailInboxStatus } from '../mail/entities/mail.entity';
import { PdfsService } from '../pdfs/pdfs.service';
import { Property } from '../properties/entities/property.entity';
import { SettingsService } from '../settings/settings.service';
import { SmsService } from '../sms/sms.service';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { Lead } from './entities/lead.entity';
import { LeadOutreachService } from './lead-outreach.service';

@Injectable()
export class LeadOutreachV2Service extends LeadOutreachService {
  constructor(
    @InjectRepository(Lead) private readonly v2LeadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private readonly v2HistoryRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(DealPipeline) dealRepo: Repository<DealPipeline>,
    @InjectRepository(DocumentRepositoryItem) documentRepo: Repository<DocumentRepositoryItem>,
    @InjectRepository(Property) propertyRepo: Repository<Property>,
    @InjectRepository(MailInboxItem) private readonly mailRepo: Repository<MailInboxItem>,
    private readonly v2Settings: SettingsService,
    smsService: SmsService,
    pdfsService: PdfsService,
  ) {
    super(v2LeadRepo, v2HistoryRepo, dealRepo, documentRepo, propertyRepo, v2Settings, smsService, pdfsService);
  }

  override async sendOutreach(dto: any) {
    if ((dto.kind ?? 'Email') !== 'Email') return super.sendOutreach(dto);
    const lead = dto.leadId ? await this.v2LeadRepo.findOne({ where: { id: Number(dto.leadId) } }) : null;
    const config = await this.v2Settings.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) {
      return this.saveFailure(dto, lead, 'SMTP mail is not configured.');
    }

    try {
      const result = await super.sendOutreach(dto);
      if (result.status === 'Sent' && lead) {
        const messageId = `lead-history-${result.id}`;
        const exists = await this.mailRepo.findOne({ where: { messageId } });
        if (!exists) {
          await this.mailRepo.save(this.mailRepo.create({
            email: lead.email,
            extractedLead: {},
            inReplyTo: '',
            kind: MailInboxKind.Direct,
            leadId: lead.id,
            mailboxTag: 'outbound',
            message: result.body,
            messageId,
            name: lead.name || lead.email,
            references: [],
            status: MailInboxStatus.Replied,
            subject: result.title,
          }));
        }
      }
      return result;
    } catch (error: any) {
      return this.saveFailure(dto, lead, error?.message ?? 'SMTP delivery failed.');
    }
  }

  private async saveFailure(dto: any, lead: Lead | null, reason: string) {
    const now = new Date();
    const entry = await this.v2HistoryRepo.save(this.v2HistoryRepo.create({
      body: `${dto.message ?? ''}`.trim(),
      createdBy: `${dto.createdBy ?? 'CRM'}`.trim(),
      direction: 'Outgoing',
      kind: 'Email',
      leadId: Number(dto.leadId),
      occurredAt: now,
      provider: 'SMTP Mail',
      scheduledAt: null,
      status: 'Failed',
      summary: `Email delivery failed${lead?.email ? ` for ${lead.email}` : ''}: ${reason}`,
      title: `${dto.title || 'Email outreach'} failed`,
    }));
    return {
      id: entry.id,
      leadId: entry.leadId,
      kind: entry.kind,
      direction: entry.direction,
      status: entry.status,
      title: entry.title,
      summary: entry.summary,
      body: entry.body,
      provider: entry.provider,
      createdBy: entry.createdBy,
      scheduledAt: null,
      occurredAt: entry.occurredAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
