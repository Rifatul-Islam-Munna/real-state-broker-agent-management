import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  ShowingBooking,
  ShowingBookingStatus,
  LeadAssignmentRule,
  BrokerageApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  AssignmentRuleType,
} from './entities/brokerage.entity';
import { BrokerageAuditLog, AuditAction, AuditEntityType, WebsiteInquiry } from './entities/audit-log.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';

@Injectable()
export class BrokerageService {
  constructor(
    @InjectRepository(ShowingBooking)
    private showingRepo: Repository<ShowingBooking>,
    @InjectRepository(LeadAssignmentRule)
    private assignmentRepo: Repository<LeadAssignmentRule>,
    @InjectRepository(BrokerageApprovalRequest)
    private approvalRepo: Repository<BrokerageApprovalRequest>,
    @InjectRepository(BrokerageAuditLog)
    private auditRepo: Repository<BrokerageAuditLog>,
    @InjectRepository(WebsiteInquiry)
    private inquiryRepo: Repository<WebsiteInquiry>,
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
  ) {}

  // ============ SHOWING BOOKING MANAGEMENT ============

  async createShowing(dto: {
    leadId?: number;
    propertyId: number;
    agentId?: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    startAt: Date;
    endAt: Date;
    notes?: string;
  }): Promise<ShowingBooking> {
    if (!dto.propertyId || !dto.startAt || !dto.endAt) {
      throw new BadRequestException('Property, start time, and end time are required');
    }

    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check for conflicts
    const conflict = await this.showingRepo.findOne({
      where: {
        propertyId: dto.propertyId,
        status: In([ShowingBookingStatus.Scheduled, ShowingBookingStatus.Completed]),
        startAt: Between(new Date(dto.startAt), new Date(dto.endAt)),
      },
    });

    if (conflict) {
      throw new BadRequestException('Time slot conflicts with existing booking');
    }

    const showing = this.showingRepo.create({
      ...dto,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });

    return this.showingRepo.save(showing);
  }

  async getShowings(agentId?: number, status?: ShowingBookingStatus): Promise<ShowingBooking[]> {
    const query = this.showingRepo.createQueryBuilder('showing');

    if (agentId) {
      query.where('showing.agentId = :agentId', { agentId });
    }

    if (status) {
      query.andWhere('showing.status = :status', { status });
    }

    return query.leftJoinAndSelect('showing.property', 'property').orderBy('showing.startAt', 'ASC').getMany();
  }

  async getShowingById(id: number): Promise<ShowingBooking> {
    const showing = await this.showingRepo.findOne({ where: { id } });
    if (!showing) {
      throw new NotFoundException('Showing not found');
    }
    return showing;
  }

  async updateShowingStatus(id: number, status: ShowingBookingStatus): Promise<ShowingBooking> {
    const showing = await this.getShowingById(id);
    showing.status = status;
    return this.showingRepo.save(showing);
  }

  async deleteShowing(id: number): Promise<void> {
    await this.showingRepo.delete(id);
  }

  async getAvailability(propertyId: number, date: Date): Promise<{ slots: string[] }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.showingRepo.find({
      where: {
        propertyId,
        status: ShowingBookingStatus.Scheduled,
        startAt: Between(startOfDay, endOfDay),
      },
    });

    // Generate 1-hour slots from 8 AM to 5 PM
    const slots = [];
    for (let hour = 8; hour < 17; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      const isBooked = bookings.some(
        (b) => b.startAt < slotEnd && b.endAt > slotStart,
      );

      if (!isBooked) {
        slots.push(`${hour}:00`);
      }
    }

    return { slots };
  }

  // ============ LEAD ASSIGNMENT MANAGEMENT ============

  async createAssignmentRule(dto: {
    agencyId: number;
    type: AssignmentRuleType;
    area?: string;
    propertyType?: string;
    agentId?: number;
    priorityOrder?: number;
  }): Promise<LeadAssignmentRule> {
    const rule = this.assignmentRepo.create({
      ...dto,
      priorityOrder: dto.priorityOrder || 100,
    });
    return this.assignmentRepo.save(rule);
  }

  async getAssignmentRules(agencyId?: number): Promise<LeadAssignmentRule[]> {
    const query = this.assignmentRepo.createQueryBuilder('rule').where('rule.isActive = :isActive', { isActive: true });

    if (agencyId) {
      query.andWhere('rule.agencyId = :agencyId', { agencyId });
    }

    return query.orderBy('rule.priorityOrder', 'ASC').getMany();
  }

  async updateAssignmentRule(id: number, dto: Partial<LeadAssignmentRule>): Promise<LeadAssignmentRule> {
    await this.assignmentRepo.update(id, dto);
    const rule = await this.assignmentRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }
    return rule;
  }

  async deleteAssignmentRule(id: number): Promise<void> {
    await this.assignmentRepo.delete(id);
  }

  /**
   * Auto-assign a lead based on assignment rules
   * Priority: 1. Listing agent 2. Area/Type match 3. Lowest workload
   */
  async autoAssignLead(lead: Lead, property?: Property): Promise<number> {
    let assignedAgentId: number;

    // Step 1: Check listing agent
    if (property?.agentId) {
      assignedAgentId = property.agentId;
    } else {
      // Step 2: Find matching rules by area/type
      const rules = await this.getAssignmentRules(lead.agencyId);
      let matchedRule: LeadAssignmentRule = null;

      for (const rule of rules) {
        if (rule.type === AssignmentRuleType.Area && lead.area === rule.area) {
          matchedRule = rule;
          break;
        }
        if (rule.type === AssignmentRuleType.Agent) {
          matchedRule = rule;
        }
      }

      if (matchedRule?.agentId) {
        assignedAgentId = matchedRule.agentId;
      } else {
        // Step 3: Assign to agent with lowest workload
        assignedAgentId = await this.findAgentWithLowestWorkload(lead.agencyId);
      }
    }

    return assignedAgentId;
  }

  private async findAgentWithLowestWorkload(agencyId: number): Promise<number> {
    // Query to find agent with least open leads
    const result = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.assignedAgentId, COUNT(lead.id) as lead_count')
      .where('lead.agencyId = :agencyId', { agencyId })
      .andWhere("lead.status IN ('Open', 'In Progress')")
      .groupBy('lead.assignedAgentId')
      .orderBy('lead_count', 'ASC')
      .limit(1)
      .getRawOne();

    return result?.lead_assigned_agent_id || 1; // Fallback to agent 1
  }

  // ============ APPROVAL WORKFLOW ============

  async createApprovalRequest(dto: {
    type: ApprovalType;
    propertyId: number;
    dealId?: number;
    oldPrice?: string;
    requestedPrice?: string;
    oldStatus?: string;
    requestedStatus?: string;
    requestedBy: string;
    requestedByUserId?: number;
    requestNote?: string;
  }): Promise<BrokerageApprovalRequest> {
    const approval = this.approvalRepo.create({
      ...dto,
      status: ApprovalStatus.Pending,
    });
    return this.approvalRepo.save(approval);
  }

  async getApprovals(
    status?: ApprovalStatus,
    type?: ApprovalType,
  ): Promise<BrokerageApprovalRequest[]> {
    const query = this.approvalRepo.createQueryBuilder('approval');

    if (status) {
      query.where('approval.status = :status', { status });
    }

    if (type) {
      query.andWhere('approval.type = :type', { type });
    }

    return query.leftJoinAndSelect('approval.property', 'property').orderBy('approval.createdAt', 'DESC').getMany();
  }

  async reviewApproval(id: number, dto: { status: ApprovalStatus; reviewedBy: string; reviewedByUserId?: number; reviewNote?: string }): Promise<BrokerageApprovalRequest> {
    const approval = await this.approvalRepo.findOne({ where: { id } });
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Approval has already been reviewed');
    }

    approval.status = dto.status;
    approval.reviewedBy = dto.reviewedBy;
    approval.reviewedByUserId = dto.reviewedByUserId;
    approval.reviewNote = dto.reviewNote;

    return this.approvalRepo.save(approval);
  }

  // ============ AUDIT LOGGING ============

  async logAudit(dto: {
    entityType: AuditEntityType;
    entityId: number;
    action: AuditAction;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    actor: string;
    actorUserId?: number;
    note?: string;
  }): Promise<BrokerageAuditLog> {
    const log = this.auditRepo.create(dto);
    return this.auditRepo.save(log);
  }

  async getAuditLogs(
    entityType?: AuditEntityType,
    entityId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BrokerageAuditLog[]> {
    const query = this.auditRepo.createQueryBuilder('log');

    if (entityType) {
      query.where('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    if (startDate && endDate) {
      query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return query.orderBy('log.createdAt', 'DESC').getMany();
  }

  // ============ WEBSITE INQUIRY MANAGEMENT ============

  async createWebsiteInquiry(dto: {
    name: string;
    email: string;
    phone?: string;
    source: 'ContactForm' | 'PropertyChat' | 'ScheduleViewing';
    message?: string;
  }): Promise<WebsiteInquiry> {
    const inquiry = this.inquiryRepo.create({
      ...dto,
      status: 'New',
    });
    return this.inquiryRepo.save(inquiry);
  }

  async getWebsiteInquiries(status?: string, source?: string): Promise<WebsiteInquiry[]> {
    const query = this.inquiryRepo.createQueryBuilder('inquiry');

    if (status) {
      query.where('inquiry.status = :status', { status });
    }

    if (source) {
      query.andWhere('inquiry.source = :source', { source });
    }

    return query.orderBy('inquiry.createdAt', 'DESC').getMany();
  }

  async convertInquiryToLead(inquiryId: number, leadId: number): Promise<WebsiteInquiry> {
    const inquiry = await this.inquiryRepo.findOne({ where: { id: inquiryId } });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    inquiry.leadId = leadId;
    inquiry.status = 'Converted';
    inquiry.convertedAt = new Date();

    return this.inquiryRepo.save(inquiry);
  }

  // ============ REPORTS ============

  async getBrokerageReports(agencyId?: number): Promise<{
    totalLeads: number;
    leadsThisMonth: number;
    totalShowings: number;
    pendingApprovals: number;
    convertedLeads: number;
    conversionRate: number;
    totalProperties: number;
    activeListings: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const query = agencyId ? { agencyId } : {};

    const [totalLeads, leadsThisMonth, totalShowings, pendingApprovals, totalProperties, activeListings] =
      await Promise.all([
        this.leadRepo.count({ where: query }),
        this.leadRepo.count({
          where: {
            ...query,
            createdAt: Between(startOfMonth, now),
          },
        }),
        this.showingRepo.count(),
        this.approvalRepo.count({
          where: { status: ApprovalStatus.Pending },
        }),
        this.propertyRepo.count({ where: query }),
        this.propertyRepo.count({
          where: {
            ...query,
            status: 'Active',
          },
        }),
      ]);

    const convertedLeads = await this.leadRepo.count({
      where: {
        ...query,
        dealId: null, // Rough estimate
      },
    });

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      leadsThisMonth,
      totalShowings,
      pendingApprovals,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalProperties,
      activeListings,
    };
  }
}
