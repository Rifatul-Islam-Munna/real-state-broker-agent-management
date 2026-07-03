import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { zonedDateParts } from '../common/time-zone';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { Lead, LeadFollowUpStatus } from './entities/lead.entity';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { LeadOutreachService } from './lead-outreach.service';

@Injectable()
export class LeadOutreachBackgroundService {
  private readonly logger = new Logger(LeadOutreachBackgroundService.name);
  private lastMorningOutreachDate = '';

  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    private outreachService: LeadOutreachService,
    private schedulingSettingsService: SchedulingSettingsService,
  ) {}

  @Cron('0 * * * *')
  async checkOverdueFollowUps(): Promise<void> {
    try {
      const now = new Date();
      const overdueLeads = await this.leadRepo.find({
        where: {
          nextActionDate: LessThan(now),
          followUpStatus: 'Open' as any,
        },
      });

      for (const lead of overdueLeads) {
        await this.markLeadAsOverdue(lead.id);
      }

      if (overdueLeads.length > 0) {
        this.logger.log(`${overdueLeads.length} lead follow-up(s) marked overdue.`);
      }
    } catch (error) {
      this.logger.error('Error in checkOverdueFollowUps:', error);
    }
  }

  @Cron('* * * * *')
  async sendMorningOutreach(): Promise<void> {
    try {
      const settings = await this.schedulingSettingsService.getSettings();
      const now = zonedDateParts(new Date(), settings.timeZone);

      if (
        now.hour !== settings.morningOutreachHour ||
        now.minute > 4 ||
        this.lastMorningOutreachDate === now.dateKey
      ) {
        return;
      }

      this.lastMorningOutreachDate = now.dateKey;
      const leadsNeedingOutreach = await this.getLeadsNeedingOutreach();

      for (const lead of leadsNeedingOutreach) {
        await this.queueOutreach(lead, 'email');
      }

      this.logger.log(
        `Morning outreach queued for ${leadsNeedingOutreach.length} lead(s) at ${settings.morningOutreachHour}:00 ${settings.timeZone}.`,
      );
    } catch (error) {
      this.logger.error('Error in sendMorningOutreach:', error);
    }
  }

  @Cron('* * * * *')
  async processOutreachQueue(): Promise<void> {
    try {
      const dueItems = await this.historyRepo.find({
        relations: ['lead'],
        where: {
          scheduledAt: LessThan(new Date()),
          status: 'Scheduled' as any,
        },
        take: 100,
      });

      for (const item of dueItems) {
        await this.sendScheduledHistoryItem(item);
      }

      if (dueItems.length > 0) {
        this.logger.log(`Processed ${dueItems.length} scheduled outreach item(s).`);
      }
    } catch (error) {
      this.logger.error('Error in processOutreachQueue:', error);
    }
  }

  private async sendScheduledHistoryItem(item: LeadHistoryEntry): Promise<void> {
    const current = await this.historyRepo.findOne({
      where: { id: item.id },
      relations: ['lead'],
    });
    if (!current || current.status !== 'Scheduled') return;

    const now = new Date();
    if (
      current.kind === 'Sms' &&
      current.lead?.inBoard &&
      !current.createdBy.startsWith('Realtor Showing #')
    ) {
      current.status = 'Failed' as any;
      current.summary = 'SMS auto-send canceled because lead is already on the board.';
      current.occurredAt = now;
      await this.historyRepo.save(current);
      return;
    }

    const result = await this.outreachService.sendOutreach({
      leadId: current.leadId,
      kind: current.kind,
      title: current.title,
      message: current.body || current.summary || current.title,
      createdBy: current.createdBy || 'Scheduler',
      attachPropertyDocuments: true,
    });
    current.status = result.status as any;
    current.summary = result.summary;
    current.provider = result.provider;
    current.occurredAt = now;
    await this.historyRepo.save(current);
  }

  async setFollowUpReminder(
    leadId: number,
    nextActionDate: Date,
    nextActionType: string,
    note?: string,
  ): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.nextActionDate = nextActionDate;
    lead.nextActionType = nextActionType || 'FollowUp';
    lead.followUpStatus = 'Scheduled' as any;

    if (note) {
      lead.notes = [...(lead.notes ?? []), `[Follow-up set] ${note}`];
    }

    return this.leadRepo.save(lead);
  }

  async getLeadsNeedingOutreach(): Promise<Lead[]> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    return this.leadRepo.find({
      where: {
        nextActionDate: LessThan(tomorrow),
        followUpStatus: 'Scheduled' as any,
      },
      take: 50,
    });
  }

  async queueOutreach(
    lead: Lead,
    channel: 'email' | 'sms' | 'call',
    template?: string,
  ): Promise<{
    leadId: number;
    channel: string;
    status: string;
    queuedAt: Date;
  }> {
    void template;
    this.logger.log(`Queued ${channel} outreach for lead ${lead.id}`);

    return {
      leadId: lead.id,
      channel,
      status: 'Queued',
      queuedAt: new Date(),
    };
  }

  async getPendingOutreach(): Promise<
    Array<{
      id: number;
      leadId: number;
      channel: string;
      template: string;
    }>
  > {
    return [];
  }

  async sendOutreach(item: {
    id: number;
    leadId: number;
    channel: string;
    template: string;
  }): Promise<boolean> {
    try {
      const lead = await this.leadRepo.findOne({ where: { id: item.leadId } });

      if (!lead) {
        this.logger.warn(`Lead ${item.leadId} not found`);
        return false;
      }

      this.logger.log(`Sending ${item.channel} to ${lead.email || lead.phone}`);
      await this.markFollowUpCompleted(lead.id, item.channel);
      return true;
    } catch (error: any) {
      this.logger.error(`Error sending outreach: ${error.message}`);
      return false;
    }
  }

  async markFollowUpCompleted(leadId: number, channel: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.followUpStatus = LeadFollowUpStatus.Completed;
    lead.notes = [
      ...(lead.notes ?? []),
      `[Outreach sent via ${channel}] ${new Date().toISOString()}`,
    ];

    const nextAction = new Date();
    nextAction.setUTCDate(nextAction.getUTCDate() + 7);
    lead.nextActionDate = nextAction;
    lead.nextActionType = 'FollowUpIfNoResponse';
    lead.followUpStatus = 'Scheduled' as any;

    return this.leadRepo.save(lead);
  }

  async markLeadAsOverdue(leadId: number): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.followUpStatus = 'Open' as any;
    lead.notes = [
      ...(lead.notes ?? []),
      `[Marked overdue] ${new Date().toISOString()}`,
    ];

    return this.leadRepo.save(lead);
  }

  async getOverdueLeads(agencyId?: number): Promise<Lead[]> {
    void agencyId;
    const query = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.next_action_date < :now', { now: new Date() })
      .andWhere('lead.follow_up_status IN (0, 1)');

    return query.orderBy('lead.nextActionDate', 'ASC').getMany();
  }

  async setBulkFollowUps(
    leadIds: number[],
    nextActionDate: Date,
    actionType: string,
  ): Promise<{ processedCount: number; errorCount: number }> {
    let processedCount = 0;
    let errorCount = 0;

    for (const leadId of leadIds) {
      try {
        await this.setFollowUpReminder(leadId, nextActionDate, actionType);
        processedCount++;
      } catch (error: any) {
        this.logger.error(`Error setting follow-up for lead ${leadId}:`, error.message);
        errorCount++;
      }
    }

    return { processedCount, errorCount };
  }
}
