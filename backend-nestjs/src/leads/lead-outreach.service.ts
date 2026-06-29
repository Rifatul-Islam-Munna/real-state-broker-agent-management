import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry, leadHistoryKindDb, leadHistoryStatusDb } from './entities/lead-history.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class LeadOutreachService {
  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(DealPipeline)
    private dealRepo: Repository<DealPipeline>,
    private settingsService: SettingsService,
  ) {}

  async getTemplates() {
    const settings = await this.settingsService.getAdminSettings();
    return settings.communicationTemplates ?? [];
  }

  async getSchedule(leadId?: number, kind?: string, status?: string) {
    const qb = this.historyRepo.createQueryBuilder('history')
      .leftJoinAndSelect('history.lead', 'lead')
      .where('history.kind IN (:...kinds)', { kinds: ['Email', 'Sms', 'Call'].map(leadHistoryKindDb) })
      .andWhere('(history.direction = 3 OR history.scheduled_at IS NOT NULL)');

    if (leadId) qb.andWhere('history.lead_id = :leadId', { leadId });
    if (kind) qb.andWhere('history.kind = :kind', { kind: leadHistoryKindDb(kind) });
    if (status) qb.andWhere('history.status = :status', { status: leadHistoryStatusDb(status) });

    const rows = await qb
      .orderBy('CASE WHEN history.status = 1 THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('COALESCE(history.scheduled_at, history.created_at)', 'ASC')
      .addOrderBy('history.id', 'ASC')
      .getMany();

    return rows.map((entry) => this.mapSchedule(entry));
  }

  async getCallScript(historyEntryId?: number, provider?: string, message?: string, title?: string) {
    const body = message || (historyEntryId ? (await this.historyRepo.findOne({ where: { id: historyEntryId } }))?.body : '') || title || '';
    if (!body.trim()) {
      return null;
    }
    const safe = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return (provider ?? '').toLowerCase() === 'plivo'
      ? `<Response><Speak>${safe}</Speak></Response>`
      : `<Response><Say>${safe}</Say></Response>`;
  }

  async sendOutreach(dto: any) {
    if (!dto.leadId) throw new BadRequestException('Lead id is required.');
    if (!['Email', 'Sms', 'Call'].includes(dto.kind ?? 'Email')) {
      throw new BadRequestException('Only email, SMS, and call outreach are supported.');
    }
    if (!dto.message?.trim()) throw new BadRequestException('Add a message before sending or scheduling outreach.');
    if ((dto.kind ?? 'Email') === 'Email' && !dto.title?.trim()) throw new BadRequestException('Email subject is required.');

    const lead = await this.leadRepo.findOne({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead was not found.');

    const now = new Date();
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const shouldSchedule = !!scheduledAt && scheduledAt.getTime() > now.getTime() + 30_000;
    const kind = dto.kind ?? 'Email';
    const provider = this.providerName(kind);
    const hasTarget = kind === 'Email' ? !!lead.email : !!lead.phone;
    const status = shouldSchedule ? 'Scheduled' : hasTarget ? (kind === 'Call' ? 'Completed' : 'Sent') : 'Failed';
    const summary = shouldSchedule
      ? this.scheduledSummary(lead, kind, scheduledAt!)
      : hasTarget
        ? `${kind === 'Email' ? 'Email sent to' : kind === 'Sms' ? 'SMS sent to' : 'Call triggered to'} ${kind === 'Email' ? lead.email : lead.phone} via ${provider}.`
        : `${kind === 'Email' ? 'Email delivery failed because the lead does not have an email address.' : kind === 'Sms' ? 'SMS delivery failed because the lead does not have a phone number.' : 'Call could not be triggered because the lead does not have a phone number.'}`;

    const entry = this.historyRepo.create({
      leadId: lead.id,
      kind,
      direction: shouldSchedule ? 'Scheduled' : 'Outgoing',
      status,
      title: status === 'Failed' ? `${dto.title || `${kind} outreach`} failed` : (dto.title || `${kind} outreach`),
      summary,
      body: dto.message.trim(),
      provider,
      createdBy: dto.createdBy?.trim() || 'CRM',
      scheduledAt: shouldSchedule ? scheduledAt : null,
      occurredAt: shouldSchedule ? null : now,
    });
    const saved = await this.historyRepo.save(entry);

    if (['Sent', 'Completed'].includes(status)) {
      lead.lastActivityAt = now;
      lead.updatedAt = now;
      if (lead.stage === 'New') {
        lead.stage = 'Contacted' as any;
        lead.inBoard = true;
      }
      await this.leadRepo.save(lead);
    }

    return this.mapHistory(saved);
  }

  async sendBulkOutreach(dto: any) {
    const targets = await this.resolveAudience(dto);
    if (targets.length === 0) throw new BadRequestException('No matching leads were found for the selected audience.');

    const failures: string[] = [];
    let savedCount = 0;
    for (const lead of targets) {
      try {
        const result = await this.sendOutreach({ ...dto, leadId: lead.id });
        if (result.status === 'Failed') failures.push(`${lead.name}: ${result.summary}`);
        else savedCount++;
      } catch (error: any) {
        failures.push(`${lead.name}: ${error.message}`);
      }
    }

    return {
      audienceType: dto.audienceType ?? 'LeadStage',
      audienceLabel: dto.leadStage ?? dto.dealStage ?? '',
      matchedCount: targets.length,
      savedCount,
      skippedCount: 0,
      failedCount: failures.length,
      failures,
    };
  }

  private async resolveAudience(dto: any) {
    if ((dto.audienceType ?? 'LeadStage') === 'DealStage') {
      if (!dto.dealStage) throw new BadRequestException('Choose a deal stage before scheduling bulk outreach.');
      const deals = await this.dealRepo.find({ where: { stage: dto.dealStage }, relations: ['sourceLead'] });
      return deals.map((deal) => deal.sourceLead).filter(Boolean);
    }
    if (!dto.leadStage) throw new BadRequestException('Choose a lead stage before scheduling bulk outreach.');
    return this.leadRepo.find({ where: { stage: dto.leadStage } });
  }

  private mapHistory(entry: LeadHistoryEntry) {
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
      scheduledAt: entry.scheduledAt ?? null,
      occurredAt: entry.occurredAt ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private mapSchedule(entry: LeadHistoryEntry) {
    return {
      ...this.mapHistory(entry),
      leadName: entry.lead?.name ?? '',
      leadEmail: entry.lead?.email ?? '',
      leadPhone: entry.lead?.phone ?? '',
    };
  }

  private providerName(kind: string) {
    return kind === 'Email' ? 'SMTP Mail' : kind === 'Sms' ? 'CRM SMS' : 'CRM Call';
  }

  private scheduledSummary(lead: Lead, kind: string, scheduledAt: Date) {
    const target = kind === 'Email' ? lead.email : lead.phone;
    const label = kind === 'Call' ? 'Call' : kind === 'Sms' ? 'SMS' : 'Email';
    return `${label} scheduled for ${scheduledAt.toISOString()} to ${target || 'the lead'}.`;
  }
}
