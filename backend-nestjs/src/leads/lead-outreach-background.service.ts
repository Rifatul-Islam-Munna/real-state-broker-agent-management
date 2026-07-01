import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Lead, LeadFollowUpStatus } from './entities/lead.entity';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { LeadOutreachService } from './lead-outreach.service';

/**
 * Lead Outreach Background Service
 * Handles scheduled follow-ups, reminders, and automated outreach campaigns
 */
@Injectable()
export class LeadOutreachBackgroundService {
  private readonly logger = new Logger(LeadOutreachBackgroundService.name);

  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    private outreachService: LeadOutreachService,
  ) {}

  /**
   * Run every hour: Check for overdue follow-ups
   */
  @Cron('0 * * * *')
  async checkOverdueFollowUps(): Promise<void> {
    try {
      this.logger.log('Checking for overdue follow-ups...');

      const now = new Date();
      const overdueLeads = await this.leadRepo.find({
        where: {
          nextActionDate: LessThan(now),
          followUpStatus: 'Open' as any,
        },
      });

      for (const lead of overdueLeads) {
        await this.markLeadAsOverdue(lead.id);
        this.logger.log(`Lead ${lead.id} marked as overdue`);
      }

      this.logger.log(`Completed: ${overdueLeads.length} overdue leads found`);
    } catch (error) {
      this.logger.error('Error in checkOverdueFollowUps:', error);
    }
  }

  /**
   * Run daily at 9 AM: Send morning outreach
   */
  @Cron('0 9 * * *')
  async sendMorningOutreach(): Promise<void> {
    try {
      this.logger.log('Sending morning outreach campaigns...');

      // Get leads that need morning outreach
      const leadsNeedingOutreach = await this.getLeadsNeedingOutreach();

      for (const lead of leadsNeedingOutreach) {
        await this.queueOutreach(lead, 'email');
      }

      this.logger.log(`Morning outreach queued for ${leadsNeedingOutreach.length} leads`);
    } catch (error) {
      this.logger.error('Error in sendMorningOutreach:', error);
    }
  }

  /**
   * Run every 6 hours: Process outreach queue
   */
  @Cron('0 */6 * * *')
  async processOutreachQueue(): Promise<void> {
    try {
      this.logger.log('Processing outreach queue...');

      const dueItems = await this.historyRepo.find({
        relations: ['lead'],
        where: {
          scheduledAt: LessThan(new Date()),
          status: 'Scheduled' as any,
        },
        take: 50,
      });

      for (const item of dueItems) {
        await this.sendScheduledHistoryItem(item);
      }

      this.logger.log(`Processed ${dueItems.length} outreach items`);
    } catch (error) {
      this.logger.error('Error in processOutreachQueue:', error);
    }
  }

  private async sendScheduledHistoryItem(item: LeadHistoryEntry): Promise<void> {
    const current = await this.historyRepo.findOne({ where: { id: item.id }, relations: ['lead'] });
    if (!current || current.status !== 'Scheduled') return;
    item = current;
    const now = new Date();
    if (item.kind === 'Sms' && item.lead?.inBoard) {
      item.status = 'Failed' as any;
      item.summary = 'SMS auto-send canceled because lead is already on the board.';
      item.occurredAt = now;
      await this.historyRepo.save(item);
      return;
    }

    const result = await this.outreachService.sendOutreach({
      leadId: item.leadId,
      kind: item.kind,
      title: item.title,
      message: item.body || item.summary || item.title,
      createdBy: item.createdBy || 'Scheduler',
      attachPropertyDocuments: true,
    });
    item.status = result.status as any;
    item.summary = result.summary;
    item.provider = result.provider;
    item.occurredAt = now;
    await this.historyRepo.save(item);
  }

  /**
   * Mark lead as requiring follow-up
   */
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

  /**
   * Get leads that need outreach
   */
  async getLeadsNeedingOutreach(): Promise<Lead[]> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.leadRepo.find({
      where: {
        nextActionDate: LessThan(tomorrow),
        followUpStatus: 'Scheduled' as any,
      },
      take: 50,
    });
  }

  /**
   * Queue outreach for a lead
   */
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
    // In production, this would queue to a message broker (RabbitMQ, SQS, etc.)
    this.logger.log(
      `Queued ${channel} outreach for lead ${lead.id}`,
    );

    return {
      leadId: lead.id,
      channel,
      status: 'Queued',
      queuedAt: new Date(),
    };
  }

  /**
   * Get pending outreach items
   */
  async getPendingOutreach(): Promise<
    Array<{
      id: number;
      leadId: number;
      channel: string;
      template: string;
    }>
  > {
    // Mock implementation - in production, fetch from queue storage
    return [];
  }

  /**
   * Send outreach (email, SMS, etc.)
   */
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

      // Mock send - in production, integrate with email/SMS service
      this.logger.log(
        `Sending ${item.channel} to ${lead.email || lead.phone}`,
      );

      // Mark follow-up as completed
      await this.markFollowUpCompleted(lead.id, item.channel);

      return true;
    } catch (error) {
      this.logger.error(`Error sending outreach: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark follow-up as completed
   */
  async markFollowUpCompleted(leadId: number, channel: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.followUpStatus = LeadFollowUpStatus.Completed;
    lead.notes = [...(lead.notes ?? []), `[Outreach sent via ${channel}] ${new Date().toISOString()}`];

    // Set next follow-up automatically (7 days if no response)
    const nextAction = new Date();
    nextAction.setDate(nextAction.getDate() + 7);
    lead.nextActionDate = nextAction;
    lead.nextActionType = 'FollowUpIfNoResponse';
    lead.followUpStatus = 'Scheduled' as any;

    return this.leadRepo.save(lead);
  }

  /**
   * Mark lead as overdue
   */
  async markLeadAsOverdue(leadId: number): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.followUpStatus = 'Open' as any;
    lead.notes = [...(lead.notes ?? []), `[Marked overdue] ${new Date().toISOString()}`];

    return this.leadRepo.save(lead);
  }

  /**
   * Get overdue leads
   */
  async getOverdueLeads(agencyId?: number): Promise<Lead[]> {
    const query = this.leadRepo.createQueryBuilder('lead')
      .where('lead.next_action_date < :now', { now: new Date() })
      .andWhere('lead.follow_up_status IN (0, 1)');

    return query.orderBy('lead.nextActionDate', 'ASC').getMany();
  }

  /**
   * Bulk set follow-ups for campaigns
   */
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
      } catch (error) {
        this.logger.error(`Error setting follow-up for lead ${leadId}:`, error.message);
        errorCount++;
      }
    }

    return { processedCount, errorCount };
  }
}
