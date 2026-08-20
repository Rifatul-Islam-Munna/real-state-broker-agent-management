import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { zonedDateParts } from '../common/time-zone';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { LeadHistoryEntry, leadHistoryStatusDb } from './entities/lead-history.entity';
import { Lead, LeadFollowUpStatus } from './entities/lead.entity';
import { LeadOutreachService } from './lead-outreach.service';

@Injectable()
export class LeadOutreachBackgroundService {
  private readonly logger = new Logger(LeadOutreachBackgroundService.name);
  private lastMorningDate = '';

  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private readonly historyRepo: Repository<LeadHistoryEntry>,
    private readonly outreachService: LeadOutreachService,
    private readonly scheduling: SchedulingSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('15 * * * *')
  async checkOverdueFollowUps() {
    const count = await this.leadRepo.count({ where: { nextActionDate: LessThan(new Date()), followUpStatus: LeadFollowUpStatus.Scheduled } });
    if (count > 0) this.logger.log(`${count} scheduled lead follow-up(s) are due.`);
  }

  @Cron('* * * * *')
  async sendMorningOutreach() {
    const settings = await this.scheduling.getSettings();
    const local = zonedDateParts(new Date(), settings.timeZone);
    if (local.hour < settings.morningOutreachHour || this.lastMorningDate === local.dateKey) return;
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    const lockName = `morning-outreach:${local.dateKey}`;
    try {
      const [result] = await runner.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [lockName]);
      if (!result?.locked) return;
      const leads = await this.getLeadsNeedingOutreach();
      let queued = 0;
      for (const lead of leads) {
        const createdBy = `Morning Outreach ${local.dateKey}`;
        if (await this.historyRepo.findOne({ where: { leadId: lead.id, createdBy } })) continue;
        if (await this.queueOutreach(lead, createdBy)) queued++;
      }
      this.lastMorningDate = local.dateKey;
      this.logger.log(`Morning outreach queued ${queued} item(s) for ${settings.timeZone}.`);
    } catch (error) {
      this.logger.error('Morning outreach failed.', error);
    } finally {
      try { await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]); }
      finally { await runner.release(); }
    }
  }

  @Cron('* * * * *')
  async processOutreachQueue() {
    try {
      await this.recoverAbandonedClaims();
      const due = await this.historyRepo.find({
        relations: ['lead'],
        where: { scheduledAt: LessThanOrEqual(new Date()), status: 'Scheduled' as any },
        order: { scheduledAt: 'ASC' },
        take: 100,
      });
      let processed = 0;
      for (const item of due) if (await this.claimAndSend(item)) processed++;
      if (processed > 0) this.logger.log(`Processed ${processed} scheduled outreach item(s).`);
    } catch (error) {
      this.logger.error('Scheduled outreach processing failed.', error);
    }
  }

  private async claimAndSend(item: LeadHistoryEntry) {
    const originalSummary = item.summary;
    const claim = await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({ status: 'Logged', summary: `[Processing] ${originalSummary}` })
      .where('id = :id', { id: item.id })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .execute();
    if (claim.affected !== 1) return false;

    try {
      const trustedSmsSequence = item.createdBy.startsWith('Realtor Showing #') || item.createdBy.startsWith('Lead Intake:');
      if (item.kind === 'Sms' && item.lead?.inBoard && !trustedSmsSequence) {
        await this.finishItem(item.id, 'Failed', 'SMS auto-send canceled because lead is already on the board.', '', new Date());
        return true;
      }

      if (this.isRealtorShowingFollowUp(item.createdBy)) {
        const latestLead = await this.leadRepo.findOne({ where: { id: item.leadId } });
        if (latestLead?.followUpStatus === LeadFollowUpStatus.Completed) {
          await this.finishItem(
            item.id,
            'Failed',
            'Realtor showing follow-up canceled because a reply was received by email or SMS.',
            '',
            new Date(),
          );
          return true;
        }
      }

      const result = await this.outreachService.sendOutreach({
        ...(item.outreachConfig ?? {}),
        leadId: item.leadId,
        kind: item.kind,
        title: item.title,
        message: item.body || originalSummary || item.title,
        createdBy: item.createdBy || 'Scheduler',
        // Follow-ups were queued when this scheduled item was created.
        templateId: undefined,
      });
      await this.finishItem(item.id, result.status, result.summary, result.provider, new Date());
      if (['Sent', 'Completed'].includes(result.status) && item.createdBy.startsWith('Morning Outreach ')) {
        await this.leadRepo.update(item.leadId, {
          followUpStatus: LeadFollowUpStatus.Completed,
          nextActionDate: null,
          nextActionType: '',
          lastActivityAt: new Date(),
        });
      }
      return true;
    } catch (error: any) {
      await this.finishItem(item.id, 'Failed', error?.message || 'Scheduled outreach failed.', '', new Date());
      return true;
    }
  }

  private finishItem(id: number, status: string, summary: string, provider: string, occurredAt: Date) {
    return this.historyRepo.update(id, { status, summary, provider, occurredAt });
  }

  private async recoverAbandonedClaims() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({ status: 'Scheduled', summary: () => "regexp_replace(summary, '^(\\[Processing\\] )+', '')" })
      .where('status = :status', { status: leadHistoryStatusDb('Logged') })
      .andWhere("summary LIKE '[Processing] %'")
      .andWhere('updated_at < :cutoff', { cutoff })
      .execute();
  }

  async getLeadsNeedingOutreach() {
    return this.leadRepo.find({
      where: { nextActionDate: LessThanOrEqual(new Date()), followUpStatus: LeadFollowUpStatus.Scheduled },
      take: 100,
    });
  }

  async queueOutreach(lead: Lead, createdBy = 'Morning Outreach') {
    if (!lead.property) return null;
    const kind = lead.email ? 'Email' : lead.phone ? 'Sms' : null;
    if (!kind) return null;
    const target = kind === 'Email' ? lead.email : lead.phone;
    const property = lead.property || 'your property inquiry';
    const body = `Hi ${lead.name || 'there'}, this is a follow-up regarding ${property}. Please reply when convenient.`;
    return this.historyRepo.save(this.historyRepo.create({
      leadId: lead.id,
      kind,
      direction: 'Scheduled',
      status: 'Scheduled',
      title: lead.nextActionType || 'Scheduled follow-up',
      summary: `${kind} scheduled to ${target}.`,
      body,
      provider: kind === 'Email' ? 'SMTP Mail' : 'CRM SMS',
      createdBy,
      scheduledAt: new Date(),
      occurredAt: null,
    }));
  }

  async setFollowUpReminder(leadId: number, nextActionDate: Date, nextActionType: string, note?: string) {
    const lead = await this.requireLead(leadId);
    lead.nextActionDate = nextActionDate;
    lead.nextActionType = nextActionType || 'FollowUp';
    lead.followUpStatus = LeadFollowUpStatus.Scheduled;
    if (note) lead.notes = [...(lead.notes ?? []), `[Follow-up set] ${note}`];
    return this.leadRepo.save(lead);
  }

  async getPendingOutreach() {
    const items = await this.historyRepo.find({ where: { status: 'Scheduled' as any }, order: { scheduledAt: 'ASC' }, take: 100 });
    return items.map((item) => ({ id: item.id, leadId: item.leadId, channel: item.kind, template: item.body }));
  }

  async sendOutreach(item: { id: number; leadId: number; channel: string; template: string }) {
    const history = await this.historyRepo.findOne({ where: { id: item.id }, relations: ['lead'] });
    return history ? this.claimAndSend(history) : false;
  }

  async markFollowUpCompleted(leadId: number, channel: string) {
    const lead = await this.requireLead(leadId);
    lead.followUpStatus = LeadFollowUpStatus.Completed;
    lead.notes = [...(lead.notes ?? []), `[Outreach sent via ${channel}] ${new Date().toISOString()}`];
    return this.leadRepo.save(lead);
  }

  async markLeadAsOverdue(leadId: number) {
    const lead = await this.requireLead(leadId);
    lead.followUpStatus = LeadFollowUpStatus.Open;
    if (!(lead.notes ?? []).some((note) => note.startsWith('[Marked overdue]'))) {
      lead.notes = [...(lead.notes ?? []), `[Marked overdue] ${new Date().toISOString()}`];
    }
    return this.leadRepo.save(lead);
  }

  async getOverdueLeads(agencyId?: number) {
    void agencyId;
    return this.leadRepo.createQueryBuilder('lead')
      .where('lead.next_action_date < :now', { now: new Date() })
      .andWhere('lead.follow_up_status IN (:...statuses)', { statuses: [leadHistoryStatusDb('Logged'), leadHistoryStatusDb('Scheduled')] })
      .orderBy('lead.nextActionDate', 'ASC')
      .getMany();
  }

  async setBulkFollowUps(leadIds: number[], nextActionDate: Date, actionType: string) {
    let processedCount = 0;
    let errorCount = 0;
    for (const leadId of leadIds) {
      try { await this.setFollowUpReminder(leadId, nextActionDate, actionType); processedCount++; }
      catch { errorCount++; }
    }
    return { processedCount, errorCount };
  }

  private isRealtorShowingFollowUp(createdBy: string) {
    return createdBy.startsWith('Realtor Showing #') && createdBy.endsWith(' Follow-up');
  }

  private async requireLead(id: number) {
    const lead = await this.leadRepo.findOne({ where: { id } });
    if (!lead) throw new Error('Lead not found');
    return lead;
  }
}
