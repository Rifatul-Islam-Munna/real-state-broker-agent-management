import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Lead, leadStages } from './entities/lead.entity';
import { numericEnumValue } from '../common/numeric-enum';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { LeadIntakeAutomationService } from './lead-intake-automation.service';
import { paginated, toInt } from '../common/api-contract';
import { MailInboxItem } from '../mail/entities/mail.entity';
import { ContactRequest } from '../contact/entities/contact.entity';
import { BrokerageService } from '../brokerage/brokerage.service';
import { AuditAction, AuditEntityType } from '../brokerage/entities/audit-log.entity';
import { SettingsService } from '../settings/settings.service';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { LeadIntelligenceService } from './lead-intelligence.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private leadsRepository: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private historyRepository: Repository<LeadHistoryEntry>,
    @InjectRepository(MailInboxItem) private mailRepository: Repository<MailInboxItem>,
    @InjectRepository(ContactRequest) private contactRepository: Repository<ContactRequest>,
    private brokerageService: BrokerageService,
    private settingsService: SettingsService,
    private leadIntakeAutomation: LeadIntakeAutomationService,
    private leadIntelligence: LeadIntelligenceService,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, stage?: string, date?: string): Promise<any> {
    page = toInt(page, 1); pageSize = toInt(pageSize, 20);
    const qb = this.leadsRepository.createQueryBuilder('lead').leftJoinAndSelect('lead.assignedAgent', 'assignedAgent').leftJoinAndSelect('lead.deals', 'deals');
    if (search) qb.andWhere('(lead.name ILIKE :search OR lead.email ILIKE :search OR lead.property_name ILIKE :search OR lead.source ILIKE :search OR lead.agent ILIKE :search)', { search: `%${search}%` });
    if (stage) qb.andWhere('lead.stage = :stage', { stage: numericEnumValue(leadStages, stage) });
    if (/^\d{4}-\d{2}-\d{2}$/.test(`${date ?? ''}`)) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      qb.andWhere('lead.lastActivityAt >= :dateStart AND lead.lastActivityAt < :dateEnd', { dateStart: start, dateEnd: end });
    }
    const [rows, total] = await qb.orderBy('lead.lastActivityAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(rows.map((lead) => this.mapLead(lead)), total, page, pageSize);
  }

  async findOne(id: number): Promise<any> {
    const lead = await this.leadsRepository.findOne({ where: { id }, relations: ['assignedAgent', 'deals'] });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.mapLead(lead);
  }

  async create(createDto: any, actor = 'CRM', autoAssign = true): Promise<any> {
    const lead = this.leadsRepository.create((await this.normalizeLead(createDto)) as object);
    if (
      createDto?.skipLeadIntelligence !== true &&
      ['contact form', 'mail inbox', 'mail signup', 'website'].some((source) =>
        `${lead.source}`.toLowerCase().includes(source),
      )
    ) {
      this.leadIntelligence.applyDecision(lead, await this.leadIntelligence.classify(createDto), true);
    }
    if (autoAssign) {
      const assignedAgentId = await this.brokerageService.autoAssignLead(lead);
      if (assignedAgentId) lead.agentId = assignedAgentId;
    }
    const saved = await this.leadsRepository.save(lead);
    if (autoAssign) await this.brokerageService.logAudit({ entityType: AuditEntityType.Lead, entityId: saved.id, action: AuditAction.Create, newValue: saved.name, actor, note: saved.source });
    await this.leadIntakeAutomation.dispatch(saved.id).catch(() => null);
    return this.findOne(saved.id);
  }

  async update(id: number, updateDto: any, actor = 'CRM'): Promise<any> {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    const oldStage = lead.stage;
    const oldAgent = lead.agent;
    const oldNextActionDate = lead.nextActionDate;
    const before = this.leadsRepository.create({ ...lead });
    Object.assign(lead, await this.normalizeLead(updateDto));
    const assignedAgentId = await this.brokerageService.autoAssignLead(lead);
    if (assignedAgentId) lead.agentId = assignedAgentId;
    const saved = await this.leadsRepository.save(lead);
    if (oldStage !== saved.stage) await this.brokerageService.logAudit({ entityType: AuditEntityType.Lead, entityId: saved.id, action: AuditAction.Update, fieldName: 'stage', oldValue: oldStage, newValue: saved.stage, actor });
    if (oldAgent !== saved.agent) await this.brokerageService.logAudit({ entityType: AuditEntityType.Lead, entityId: saved.id, action: AuditAction.Update, fieldName: 'agent', oldValue: oldAgent, newValue: saved.agent, actor });
    if (Number(oldNextActionDate) !== Number(saved.nextActionDate)) await this.brokerageService.logAudit({ entityType: AuditEntityType.Lead, entityId: saved.id, action: AuditAction.Update, fieldName: 'next_action_date', oldValue: oldNextActionDate?.toISOString() ?? '', newValue: saved.nextActionDate?.toISOString() ?? '', actor });
    await this.leadIntelligence.learnFromHumanChange(before, saved);
    return this.findOne(saved.id);
  }

  async importRows(payload: any, actor = 'CRM') {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (!rows.length) throw new BadRequestException('CSV has no data rows.');
    const mapping = payload?.mapping ?? {};
    const failures: string[] = [];
    let createdCount = 0;
    for (let index = 0; index < rows.length; index++) {
      try {
        const row = this.cleanRecord(rows[index]);
        const dto = {
          budget: this.cell(row, mapping.budget),
          combinedCreditScore: this.cell(row, mapping.combinedCreditScore),
          combinedMonthlyEarning: this.cell(row, mapping.combinedMonthlyEarning),
          creditScore: this.cell(row, mapping.creditScore),
          monthlyEarning: this.cell(row, mapping.monthlyEarning),
          email: this.cell(row, mapping.email),
          interest: this.cell(row, mapping.interest),
          name: this.cell(row, mapping.name),
          phone: this.cell(row, mapping.phone),
          property: this.cell(row, mapping.property),
          source: this.cell(row, mapping.source) || 'CSV Import',
          summary: this.cell(row, mapping.summary),
          timeline: this.cell(row, mapping.timeline),
        };
        if (!dto.name && !dto.email && !dto.phone) throw new Error('Name, email, or phone required.');
        await this.create(dto, actor, true);
        createdCount++;
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }
    return { createdCount, failedCount: failures.length, failures };
  }

  async delete(id: number): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.leadsRepository.remove(lead);
  }

  async findByEmail(email: string): Promise<any | null> {
    const lead = await this.leadsRepository.createQueryBuilder('lead').leftJoinAndSelect('lead.assignedAgent', 'assignedAgent').leftJoinAndSelect('lead.deals', 'deals').where('LOWER(lead.email) = :email', { email: `${email ?? ''}`.trim().toLowerCase() }).getOne();
    return lead ? this.mapLead(lead) : null;
  }

  async getHistory(leadId: number) {
    const [stored, mail, contacts] = await Promise.all([this.historyRepository.find({ where: { leadId } }), this.mailRepository.find({ where: { leadId } }), this.contactRepository.find({ where: { leadId } })]);
    return [
      ...stored.map((item) => this.mapHistory(item)),
      ...mail.map((item) => ({ id: -item.id, leadId, kind: 'MailInbox', direction: 'Incoming', status: String(item.status) === 'Replied' ? 'Completed' : 'Received', title: item.subject || 'Incoming email', summary: item.subject || 'Inbound email linked to this lead.', body: item.message, provider: 'Mail Inbox', createdBy: item.name || item.email, scheduledAt: null, occurredAt: item.createdAt, createdAt: item.createdAt, updatedAt: item.updatedAt })),
      ...contacts.map((item) => ({ id: -(100000 + item.id), leadId, kind: 'ContactForm', direction: 'Incoming', status: 'Received', title: item.inquiryType || 'Contact form inquiry', summary: item.message || 'Contact form inquiry linked to this lead.', body: item.message, provider: 'Contact Form', createdBy: item.name || item.email, scheduledAt: null, occurredAt: item.createdAt, createdAt: item.createdAt, updatedAt: item.updatedAt })),
    ].sort((a, b) => Number(new Date(b.scheduledAt ?? b.occurredAt ?? b.createdAt)) - Number(new Date(a.scheduledAt ?? a.occurredAt ?? a.createdAt)) || Math.abs(b.id) - Math.abs(a.id));
  }

  async createHistory(dto: any) {
    if (!dto.leadId) throw new BadRequestException('Lead id is required.');
    if (![dto.title, dto.summary, dto.body].some((value) => `${value ?? ''}`.trim())) throw new BadRequestException('Add a title, summary, or body for the history item.');
    const lead = await this.leadsRepository.findOne({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead was not found.');
    const body = `${dto.body ?? ''}`.trim();
    const title = `${dto.title ?? dto.summary ?? ''}`.trim() || this.historyTitle(dto.kind);
    const summary = `${dto.summary ?? ''}`.trim() || (body ? body.length > 220 ? `${body.slice(0, 217)}...` : body : title);
    const entry = this.historyRepository.create({ ...dto, kind: dto.kind ?? 'Note', direction: dto.direction ?? 'Internal', status: dto.status ?? 'Logged', title, summary, body, provider: `${dto.provider ?? ''}`.trim(), createdBy: `${dto.createdBy ?? ''}`.trim() || 'Admin' } as DeepPartial<LeadHistoryEntry>);
    const saved = await this.historyRepository.save(entry);
    lead.lastActivityAt = new Date();
    await this.leadsRepository.save(lead);
    return this.mapHistory(saved);
  }

  private mapHistory(item: LeadHistoryEntry) { return { id: item.id, leadId: item.leadId, kind: item.kind, direction: item.direction, status: item.status, title: item.title, summary: item.summary, body: item.body, provider: item.provider, createdBy: item.createdBy, scheduledAt: item.scheduledAt ?? null, occurredAt: item.occurredAt ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
  private historyTitle(kind: string) { return ({ Email: 'Email activity', Sms: 'SMS activity', Call: 'Call activity', PropertyChat: 'Property chat activity', ContactForm: 'Contact form activity', MailInbox: 'Mail inbox activity', System: 'System activity' } as any)[kind] ?? 'Lead note'; }

  private async normalizeLead(dto: any) {
    const nextActionDate = dto.nextActionDate ? new Date(dto.nextActionDate) : null;
    const settings = await this.settingsService.getAdminSettings();
    const defaultPhoneCountry = settings.profile?.defaultPhoneCountry ?? 'US';
    return {
      ...dto,
      name: `${dto.name ?? ''}`.trim(),
      email: `${dto.email ?? ''}`.trim().toLowerCase(),
      phone: normalizePhoneNumber(dto.phone, defaultPhoneCountry),
      summary: `${dto.summary ?? ''}`,
      property: `${dto.property ?? ''}`,
      propertyId: dto.propertyId ? Number(dto.propertyId) : null,
      budget: `${dto.budget ?? ''}`,
      creditScore: this.normalizeCreditScore(dto.creditScore),
      combinedCreditScore: this.normalizeCreditScore(dto.combinedCreditScore),
      monthlyEarning: `${dto.monthlyEarning ?? ''}`.trim(),
      combinedMonthlyEarning: `${dto.combinedMonthlyEarning ?? ''}`.trim(),
      agent: `${dto.agent ?? ''}`.trim(),
      source: `${dto.source ?? ''}`.trim(),
      interest: `${dto.interest ?? ''}`,
      timeline: `${dto.timeline ?? ''}`,
      nextActionDate,
      nextActionType: `${dto.nextActionType ?? ''}`.trim() || (nextActionDate ? 'Follow up' : ''),
      notes: Array.isArray(dto.notes) ? dto.notes : [],
      lastActivityAt: new Date(),
    };
  }

  private mapLead(lead: Lead) {
    const deals = [...(lead.deals ?? [])].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
    const linkedDeal = deals[0];
    const nextActionDate = lead.nextActionDate ? new Date(lead.nextActionDate) : null;
    const overdue = !!nextActionDate && nextActionDate < new Date() && ['Open', 'Scheduled'].includes(String(lead.followUpStatus)) && !['Deal', 'Canceled'].includes(String(lead.stage));
    return {
      id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, summary: lead.summary,
      property: lead.property, propertyId: lead.propertyId ?? null, budget: lead.budget,
      creditScore: lead.creditScore, combinedCreditScore: lead.combinedCreditScore,
      monthlyEarning: lead.monthlyEarning, combinedMonthlyEarning: lead.combinedMonthlyEarning,
      stage: lead.stage, priority: lead.priority,
      agent: lead.agent, agentId: lead.agentId ?? null,
      assignedAgentName: lead.assignedAgent ? `${lead.assignedAgent.firstName ?? ''} ${lead.assignedAgent.lastName ?? ''}`.trim() : null,
      source: lead.source, interest: lead.interest, timeline: lead.timeline, inBoard: lead.inBoard,
      intelligenceClassifier: lead.intelligenceClassifier,
      intelligenceConfidence: lead.intelligenceConfidence,
      nextActionDate: lead.nextActionDate ?? null, nextActionType: lead.nextActionType, followUpStatus: lead.followUpStatus,
      isFollowUpOverdue: overdue, notes: lead.notes ?? [], createdAt: lead.createdAt, updatedAt: lead.updatedAt,
      lastActivityAt: lead.lastActivityAt, linkedDealId: linkedDeal?.id ?? null, linkedDealTitle: linkedDeal?.title ?? null,
    };
  }

  private normalizeCreditScore(value: unknown) {
    const candidates = `${value ?? ''}`.match(/\b\d{3}\b/g) ?? [];
    return candidates.find((candidate) => {
      const score = Number(candidate);
      return score >= 300 && score <= 850;
    }) ?? '';
  }

  private cleanRecord(input: any) {
    return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [`${key}`.trim(), `${value ?? ''}`.trim()]));
  }

  private cell(record: Record<string, string>, column?: string) {
    return column ? `${record[column] ?? ''}`.trim() : '';
  }
}
