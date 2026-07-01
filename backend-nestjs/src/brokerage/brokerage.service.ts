import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, Between } from 'typeorm';
import {
  ShowingBooking,
  ShowingBookingStatus,
  LeadAssignmentRule,
  BrokerageApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  AssignmentRuleType,
  showingStatuses,
  approvalStatuses,
} from './entities/brokerage.entity';
import { numericEnumValue } from '../common/numeric-enum';
import { BrokerageAuditLog, AuditAction, AuditEntityType } from './entities/audit-log.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';
import { ContactRequest } from '../contact/entities/contact.entity';
import { PropertyChatConversation } from '../property-chat/entities/property-chat.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { DealPipeline, DealCommissionStatus } from '../deals/entities/deal-pipeline.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';

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
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    @InjectRepository(ContactRequest)
    private contactRepo: Repository<ContactRequest>,
    @InjectRepository(PropertyChatConversation)
    private chatRepo: Repository<PropertyChatConversation>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(DealPipeline)
    private dealRepo: Repository<DealPipeline>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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
  }): Promise<any> {
    if (!dto.propertyId || !dto.startAt) {
      throw new BadRequestException('Property and start time are required');
    }

    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId }, relations: ['agent'] });
    if (!property) {
      throw new BadRequestException('Property was not found.');
    }

    const startAt = new Date(dto.startAt);
    if (startAt <= new Date(Date.now() + 15 * 60 * 1000)) {
      throw new BadRequestException('Choose a future showing time.');
    }

    const endAt = dto.endAt ? new Date(dto.endAt) : new Date(startAt.getTime() + 45 * 60 * 1000);
    if (startAt >= endAt) endAt.setTime(startAt.getTime() + 45 * 60 * 1000);
    const normalizedEmail = (dto.contactEmail ?? '').trim().toLowerCase();
    const normalizedPhone = (dto.contactPhone ?? '').trim();
    if (!dto.contactName?.trim() || (!normalizedEmail && !normalizedPhone)) {
      throw new BadRequestException('Name plus email or phone is required.');
    }

    let lead = normalizedEmail
      ? await this.leadRepo.findOne({ where: { email: normalizedEmail } })
      : null;
    if (!lead) {
      lead = this.leadRepo.create({
        name: dto.contactName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        agent: property.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : '',
        agentId: property.agentId,
        property: property.title,
        source: 'Schedule Viewing',
        interest: 'Schedule Viewing',
        stage: 'Visit' as any,
        priority: 'HighPriority' as any,
        followUpStatus: 'Scheduled' as any,
        inBoard: true,
        nextActionDate: startAt,
        nextActionType: 'Showing',
        summary: `Viewing requested for ${property.title}.`,
        timeline: this.utcDisplay(startAt),
        notes: dto.notes ? [dto.notes.trim()] : [],
      });
      const assignedAgentId = await this.autoAssignLead(lead, property);
      if (assignedAgentId) {
        const assigned = await this.userRepo.findOne({ where: { id: assignedAgentId } });
        lead.agentId = assignedAgentId;
        lead.agent = assigned ? `${assigned.firstName} ${assigned.lastName}`.trim() : lead.agent;
      }
    } else {
      lead.agentId = property.agentId ?? lead.agentId;
      lead.agent = property.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : lead.agent;
      lead.phone = normalizedPhone || lead.phone;
      lead.property = property.title;
      lead.source = 'Schedule Viewing';
      lead.stage = 'Visit' as any;
      lead.followUpStatus = 'Scheduled' as any;
      lead.inBoard = true;
      lead.nextActionDate = startAt;
      lead.nextActionType = 'Showing';
      lead.lastActivityAt = new Date();
    }
    lead = await this.leadRepo.save(lead);

    const showing = this.showingRepo.create({
      propertyId: property.id,
      leadId: lead.id,
      agentId: lead.agentId ?? property.agentId,
      contactName: dto.contactName.trim(),
      contactEmail: normalizedEmail,
      contactPhone: normalizedPhone,
      startAt,
      endAt,
      notes: (dto.notes ?? '').trim(),
      status: ShowingBookingStatus.Scheduled,
    });

    const saved = await this.showingRepo.save(showing);
    await this.historyRepo.save(this.historyRepo.create({
      leadId: lead.id,
      kind: 'System',
      direction: 'Scheduled',
      status: 'Scheduled',
      title: `Showing scheduled for ${property.title}`,
      summary: `Showing scheduled for ${this.utcDisplay(startAt)}.`,
      body: saved.notes,
      createdBy: 'Website',
      scheduledAt: startAt,
    }));
    await this.logAudit({
      entityType: AuditEntityType.Showing,
      entityId: saved.id,
      action: AuditAction.Create,
      newValue: property.title,
      actor: 'Website',
      note: saved.notes,
    });
    saved.property = property;
    if (saved.agentId) saved.agent = await this.userRepo.findOne({ where: { id: saved.agentId } }) ?? undefined;
    return this.mapShowing(saved);
  }

  async getShowings(agentId?: number, status?: ShowingBookingStatus, propertyId?: number): Promise<any[]> {
    const query = this.showingRepo.createQueryBuilder('showing');

    if (agentId) {
      query.where('showing.agent_id = :agentId', { agentId });
    }

    if (status) {
      query.andWhere('showing.status = :status', { status: numericEnumValue(showingStatuses, status) });
    }
    if (propertyId) {
      query.andWhere('showing.property_id = :propertyId', { propertyId });
    }

    const rows = await query
      .leftJoinAndSelect('showing.property', 'property')
      .leftJoinAndSelect('showing.agent', 'agent')
      .orderBy('showing.startAt', 'ASC')
      .getMany();
    return rows.map((row) => this.mapShowing(row));
  }

  async getShowingById(id: number): Promise<any> {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['property', 'agent'] });
    if (!showing) {
      throw new NotFoundException('Showing not found');
    }
    return this.mapShowing(showing);
  }

  async updateShowingStatus(id: number, status: ShowingBookingStatus, notes?: string): Promise<any> {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['property', 'agent'] });
    if (!showing) throw new NotFoundException('Showing not found');
    const oldStatus = showing.status;
    showing.status = status;
    showing.notes = (notes ?? '').trim();
    const saved = await this.showingRepo.save(showing);
    await this.logAudit({
      entityType: AuditEntityType.Showing,
      entityId: saved.id,
      action: AuditAction.Update,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: saved.status,
      actor: 'CRM',
      note: saved.notes,
    });
    return this.mapShowing(saved);
  }

  async deleteShowing(id: number): Promise<void> {
    await this.showingRepo.delete(id);
  }

  async getAvailability(propertyId: number, date: Date): Promise<any[]> {
    const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(day);
    endOfDay.setUTCDate(day.getUTCDate() + 1);

    const bookings = await this.showingRepo.find({
      where: {
        propertyId,
        status: ShowingBookingStatus.Scheduled,
        startAt: Between(day, endOfDay),
      },
    });

    const slotMinutes = [9 * 60, 10 * 60 + 30, 13 * 60, 15 * 60 + 30];
    return slotMinutes.map((minutes) => {
      const startAt = new Date(day.getTime() + minutes * 60 * 1000);
      const endAt = new Date(startAt.getTime() + 45 * 60 * 1000);
      const isBooked = bookings.some((booking) => Math.abs((Number(booking.startAt) - Number(startAt)) / 60000) < 15);
      return {
        startAt,
        endAt,
        isAvailable: startAt > new Date(Date.now() + 2 * 60 * 60 * 1000) && !isBooked,
      };
    });
  }

  // ============ LEAD ASSIGNMENT MANAGEMENT ============

  async createAssignmentRule(dto: {
    area?: string;
    propertyType?: any;
    listingType?: any;
    agentId?: number;
    priorityOrder?: number;
  }): Promise<any> {
    const rule = this.assignmentRepo.create({
      ...dto,
      area: (dto.area ?? '').trim(),
      priorityOrder: (dto.priorityOrder ?? 0) > 0 ? dto.priorityOrder! : 100,
    });
    const saved = await this.assignmentRepo.save(rule);
    return this.getMappedAssignmentRule(saved.id);
  }

  async getAssignmentRules(agencyId?: number): Promise<any[]> {
    const rows = await this.assignmentRepo.createQueryBuilder('rule')
      .leftJoinAndSelect('rule.agent', 'agent')
      .orderBy('rule.priorityOrder', 'ASC')
      .addOrderBy('rule.area', 'ASC')
      .getMany();
    return rows.map((row) => this.mapAssignmentRule(row));
  }

  async updateAssignmentRule(id: number, dto: Partial<LeadAssignmentRule>): Promise<any> {
    const rule = await this.assignmentRepo.findOne({ where: { id } });
    if (!rule) {
      throw new BadRequestException('Assignment rule was not found.');
    }
    rule.agentId = dto.agentId ?? rule.agentId;
    rule.area = (dto.area ?? '').trim();
    rule.isActive = dto.isActive ?? rule.isActive;
    rule.listingType = dto.listingType ?? null;
    rule.priorityOrder = (dto.priorityOrder ?? 0) > 0 ? dto.priorityOrder! : 100;
    rule.propertyType = dto.propertyType ?? null;
    const saved = await this.assignmentRepo.save(rule);
    return this.getMappedAssignmentRule(saved.id);
  }

  async deleteAssignmentRule(id: number): Promise<void> {
    await this.assignmentRepo.delete(id);
  }

  /**
   * Auto-assign a lead based on assignment rules
   * Priority: 1. Listing agent 2. Area/Type match 3. Lowest workload
   */
  async autoAssignLead(lead: Lead, property?: Property): Promise<number | null> {
    let assignedAgentId: number | null;

    if (lead.agentId) {
      const assigned = await this.userRepo.findOne({ where: { id: lead.agentId, role: UserRole.Agent } });
      if (assigned && !assigned.deletedAt) {
        lead.agent = `${assigned.firstName} ${assigned.lastName}`.trim();
        return assigned.id;
      }
      lead.agentId = null;
    }

    if (lead.agent?.trim()) {
      const normalized = lead.agent.trim().toLowerCase();
      const named = await this.userRepo.createQueryBuilder('user')
        .where('user.role = 1')
        .andWhere('user.deleted_at IS NULL')
        .andWhere("(LOWER(CONCAT(user.first_name, ' ', user.last_name)) = :normalized OR LOWER(user.email) = :normalized)", { normalized })
        .getOne();
      if (named) {
        lead.agentId = named.id;
        lead.agent = `${named.firstName} ${named.lastName}`.trim();
        return named.id;
      }
    }

    // Step 1: Check listing agent
    if (property?.agentId && property.agent?.isActive && !property.agent.deletedAt) {
      assignedAgentId = property.agentId;
    } else {
      // Step 2: Find matching rules by area/type
      const rules = await this.assignmentRepo.find({
        where: { isActive: true },
        relations: ['agent'],
        order: { priorityOrder: 'ASC', id: 'ASC' },
      });
      let matchedRule: LeadAssignmentRule | null = null;

      for (const rule of rules) {
        const areaText = `${property?.location ?? ''} ${property?.title ?? lead.property ?? ''}`.toLowerCase();
        const areaMatches = !rule.area || areaText.includes(rule.area.trim().toLowerCase());
        const propertyTypeMatches = !rule.propertyType || rule.propertyType === property?.propertyType;
        const listingTypeMatches = !rule.listingType || rule.listingType === property?.listingType;
        if (areaMatches && propertyTypeMatches && listingTypeMatches && rule.agent?.isActive && !rule.agent.deletedAt) {
          matchedRule = rule;
          break;
        }
      }

      if (matchedRule?.agentId) {
        assignedAgentId = matchedRule.agentId;
      } else {
        // Step 3: Assign to agent with lowest workload
        assignedAgentId = await this.findAgentWithLowestWorkload();
      }
    }

    if (!assignedAgentId) return null;
    const assigned = await this.userRepo.findOne({ where: { id: assignedAgentId } });
    if (!assigned) return null;
    lead.agentId = assigned.id;
    lead.agent = `${assigned.firstName} ${assigned.lastName}`.trim();
    return assigned.id;
  }

  private async findAgentWithLowestWorkload(): Promise<number | null> {
    const agents = await this.userRepo.find({
      where: { role: UserRole.Agent, isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    let selected: User | null = null;
    let selectedLoad = Number.MAX_SAFE_INTEGER;
    for (const agent of agents.filter((item) => !item.deletedAt)) {
      const [leadCount, propertyCount, showingCount] = await Promise.all([
        this.leadRepo.createQueryBuilder('lead').where('lead.agent_id = :id', { id: agent.id }).andWhere('lead.stage NOT IN (6, 7)').getCount(),
        this.propertyRepo.createQueryBuilder('property').where('property.agent_id = :id', { id: agent.id }).andWhere('property.status IN (0, 4, 5)').getCount(),
        this.showingRepo.createQueryBuilder('showing').where('showing.agent_id = :id', { id: agent.id }).andWhere('showing.status = 0').getCount(),
      ]);
      const load = leadCount + propertyCount + showingCount;
      if (load < selectedLoad) {
        selected = agent;
        selectedLoad = load;
      }
    }
    return selected?.id ?? null;
  }

  // ============ APPROVAL WORKFLOW ============

  async createApprovalRequest(dto: {
    type: ApprovalType;
    propertyId: number;
    oldPrice?: string;
    requestedPrice?: string;
    oldStatus?: any;
    requestedStatus?: any;
    requestedBy: string;
    requestNote?: string;
  }): Promise<BrokerageApprovalRequest> {
    const approval = this.approvalRepo.create({
      ...dto,
      status: ApprovalStatus.Pending,
    } as DeepPartial<BrokerageApprovalRequest>);
    return this.approvalRepo.save(approval);
  }

  async getApprovals(status?: ApprovalStatus, type?: ApprovalType): Promise<any[]> {
    const query = this.approvalRepo.createQueryBuilder('approval');

    if (status) {
      query.where('approval.status = :status', { status: numericEnumValue(approvalStatuses, status) });
    }

    if (type) {
      query.andWhere('approval.type = :type', { type });
    }

    const rows = await query
      .leftJoinAndSelect('approval.property', 'property')
      .orderBy('CASE WHEN approval.status = 0 THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('approval.createdAt', 'DESC')
      .getMany();
    return rows.map((row) => this.mapApproval(row));
  }

  async reviewApproval(id: number, dto: { status: ApprovalStatus; reviewedBy?: string; reviewNote?: string }): Promise<any> {
    const approval = await this.approvalRepo.findOne({ where: { id }, relations: ['property'] });
    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Approval request is already reviewed.');
    }

    if (![ApprovalStatus.Approved, ApprovalStatus.Rejected].includes(dto.status)) {
      throw new BadRequestException('Review status must be Approved or Rejected.');
    }

    approval.status = dto.status;
    approval.reviewedBy = (dto.reviewedBy ?? 'Admin').trim() || 'Admin';
    approval.reviewNote = (dto.reviewNote ?? '').trim();

    if (dto.status === ApprovalStatus.Approved && approval.property) {
      if (approval.type === ApprovalType.PriceChange && approval.requestedPrice) {
        const oldPrice = approval.property.price;
        approval.property.price = approval.requestedPrice;
        await this.propertyRepo.save(approval.property);
        await this.logAudit({ entityType: AuditEntityType.Property, entityId: approval.propertyId, action: AuditAction.Approve, fieldName: 'price', oldValue: oldPrice, newValue: approval.requestedPrice, actor: approval.reviewedBy, note: approval.reviewNote });
      }
      if (approval.type === ApprovalType.ListingPublish && approval.requestedStatus) {
        const oldStatus = approval.property.status;
        approval.property.status = approval.requestedStatus;
        await this.propertyRepo.save(approval.property);
        await this.logAudit({ entityType: AuditEntityType.Property, entityId: approval.propertyId, action: AuditAction.Approve, fieldName: 'status', oldValue: oldStatus, newValue: approval.requestedStatus, actor: approval.reviewedBy, note: approval.reviewNote });
      }
    }

    return this.mapApproval(await this.approvalRepo.save(approval));
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
    const log = this.auditRepo.create({
      entityType: dto.entityType,
      entityId: dto.entityId ?? null,
      action: dto.action,
      fieldName: dto.fieldName ?? '',
      oldValue: dto.oldValue ?? '',
      newValue: dto.newValue ?? '',
      actor: dto.actor ?? '',
      note: dto.note ?? '',
    });
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
      query.where('log.entity_type = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('log.entity_id = :entityId', { entityId });
    }

    if (startDate && endDate) {
      query.andWhere('log.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
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
  }): Promise<any> {
    const contact = await this.contactRepo.save(this.contactRepo.create({
      name: `${dto.name ?? ''}`.trim(),
      email: `${dto.email ?? ''}`.trim().toLowerCase(),
      phone: `${dto.phone ?? ''}`.trim(),
      message: `${dto.message ?? ''}`,
      inquiryType: `${dto.source ?? 'ContactForm'}`,
      status: 'New' as any,
      leadId: null,
    }));
    return {
      id: `contact-${contact.id}`,
      kind: 'Contact',
      source: 'Contact Form',
      contactName: contact.name,
      contactEmail: contact.email,
      contactPhone: contact.phone ?? '',
      propertyTitle: '',
      assignedAgent: '',
      leadId: null,
      status: contact.status,
      summary: contact.message,
      createdAt: contact.createdAt,
    };
  }

  async getWebsiteInquiries(status?: string, source?: string): Promise<any[]> {
    const [contacts, chats, showings] = await Promise.all([
      this.contactRepo.find(),
      this.chatRepo.find({ relations: ['property'] }),
      this.showingRepo.find({ relations: ['property', 'agent'] }),
    ]);

    const items: any[] = [
      ...contacts.map((item) => ({
        id: `contact-${item.id}`,
        kind: 'Contact',
        source: 'Contact Form',
        contactName: item.name,
        contactEmail: item.email,
        contactPhone: item.phone ?? '',
        propertyTitle: '',
        assignedAgent: '',
        leadId: item.leadId ?? null,
        status: item.status,
        summary: item.message,
        createdAt: item.createdAt,
      })),
      ...chats.map((item: any) => ({
        id: `chat-${item.id}`,
        kind: 'Property Chat',
        source: 'Property Chat',
        contactName: item.contactName ?? '',
        contactEmail: item.contactEmail ?? '',
        contactPhone: item.contactPhone ?? '',
        propertyTitle: item.propertyTitle ?? item.property?.title ?? '',
        assignedAgent: item.assignedAgent ?? '',
        leadId: item.leadId ?? null,
        status: item.status,
        summary: item.summary ?? '',
        createdAt: item.createdAt,
      })),
      ...showings.map((item) => ({
        id: `showing-${item.id}`,
        kind: 'Showing',
        source: 'Schedule Viewing',
        contactName: item.contactName,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        propertyTitle: item.property ? item.property.title : `Property #${item.propertyId}`,
        assignedAgent: item.agent ? `${item.agent.firstName ?? ''} ${item.agent.lastName ?? ''}`.trim() : '',
        leadId: item.leadId ?? null,
        status: item.status,
        summary: item.notes,
        createdAt: item.createdAt,
      })),
    ];

    return items
      .filter((item) => !status || item.status === status)
      .filter((item) => !source || item.source === source)
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))) as any;
  }

  async convertInquiryToLead(inquiryId: number, leadId: number): Promise<any> {
    const inquiry = await this.contactRepo.findOne({ where: { id: inquiryId } });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    inquiry.leadId = leadId;
    inquiry.status = 'Converted' as any;

    const saved = await this.contactRepo.save(inquiry);
    return {
      id: `contact-${saved.id}`,
      kind: 'Contact',
      source: 'Contact Form',
      contactName: saved.name,
      contactEmail: saved.email,
      contactPhone: saved.phone ?? '',
      propertyTitle: '',
      assignedAgent: '',
      leadId: saved.leadId ?? null,
      status: saved.status,
      summary: saved.message,
      createdAt: saved.createdAt,
    };
  }

  // ============ REPORTS ============

  async getBrokerageReports(agencyId?: number): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [leads, deals, properties] = await Promise.all([
      this.leadRepo.find(),
      this.dealRepo.find(),
      this.propertyRepo.find(),
    ]);

    const agentGroups = new Map<string, Lead[]>();
    for (const lead of leads) {
      const agentName = lead.agent?.trim() || 'Unassigned';
      const key = `${lead.agentId ?? 'null'}|${agentName}`;
      agentGroups.set(key, [...(agentGroups.get(key) ?? []), lead]);
    }
    const conversionByAgent = [...agentGroups.entries()].map(([key, group]) => {
      const [agentIdText, agentName] = key.split('|');
      const agentId = agentIdText === 'null' ? null : Number(agentIdText);
      const leadIds = new Set(group.map((item) => item.id));
      const dealCount = deals.filter((deal) =>
        (deal.agentId != null && deal.agentId === agentId) ||
        (deal.sourceLeadId != null && leadIds.has(deal.sourceLeadId)),
      ).length;
      return {
        agentId,
        agentName,
        leadCount: group.length,
        dealCount,
        conversionRate: group.length ? Math.round((dealCount / group.length) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.dealCount - a.dealCount || a.agentName.localeCompare(b.agentName));

    const sourceGroups = new Map<string, Lead[]>();
    for (const lead of leads) {
      const source = lead.source?.trim() || 'Unknown';
      sourceGroups.set(source, [...(sourceGroups.get(source) ?? []), lead]);
    }
    const sourcePerformance = [...sourceGroups.entries()].map(([source, group]) => {
      const leadIds = new Set(group.map((item) => item.id));
      const linkedDeals = deals.filter((deal) => deal.sourceLeadId != null && leadIds.has(deal.sourceLeadId));
      return {
        source,
        leadCount: group.length,
        dealCount: linkedDeals.length,
        dealValue: linkedDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0),
      };
    }).sort((a, b) => b.dealCount - a.dealCount || b.leadCount - a.leadCount);

    const estimatedCommission = deals.reduce((sum, deal) => sum + (Number(deal.commissionAmount) > 0
      ? Number(deal.commissionAmount)
      : Number(deal.value) * (Number(deal.commissionRate) / 100)), 0);
    const paidCommission = deals
      .filter((deal) => deal.commissionStatus === DealCommissionStatus.Paid)
      .reduce((sum, deal) => sum + (Number(deal.commissionAmount) > 0
        ? Number(deal.commissionAmount)
        : Number(deal.value) * (Number(deal.commissionRate) / 100)), 0);

    return {
      leadsThisMonth: leads.filter((lead) => new Date(lead.createdAt) >= startOfMonth).length,
      conversionByAgent,
      activeListings: properties.filter((property) => ['Open', 'Active', 'UnderOffer'].includes(property.status)).length,
      soldRentedCount: properties.filter((property) => ['Closed', 'Sold', 'Rented'].includes(property.status)).length,
      sourcePerformance,
      overdueFollowUps: leads.filter((lead) => lead.nextActionDate && new Date(lead.nextActionDate) < now &&
        ['Open', 'Scheduled'].includes(lead.followUpStatus) && !['Deal', 'Canceled'].includes(lead.stage)).length,
      commissionSummary: {
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
        paidCommission: Math.round(paidCommission * 100) / 100,
        openCommission: Math.round((estimatedCommission - paidCommission) * 100) / 100,
      },
    };
  }

  private mapAssignmentRule(rule: LeadAssignmentRule) {
    return {
      id: rule.id,
      area: rule.area,
      propertyType: rule.propertyType ?? null,
      listingType: rule.listingType ?? null,
      agentId: rule.agentId,
      agentName: rule.agent ? `${rule.agent.firstName} ${rule.agent.lastName}`.trim() : `Agent #${rule.agentId}`,
      priorityOrder: rule.priorityOrder,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }

  private async getMappedAssignmentRule(id: number) {
    const rule = await this.assignmentRepo.findOne({ where: { id }, relations: ['agent'] });
    if (!rule) throw new BadRequestException('Assignment rule was not found.');
    return this.mapAssignmentRule(rule);
  }

  private mapApproval(approval: BrokerageApprovalRequest) {
    return {
      id: approval.id,
      type: approval.type,
      status: approval.status,
      propertyId: approval.propertyId,
      propertyTitle: approval.property?.title ?? `Property #${approval.propertyId}`,
      oldPrice: approval.oldPrice,
      requestedPrice: approval.requestedPrice,
      oldStatus: approval.oldStatus ?? null,
      requestedStatus: approval.requestedStatus ?? null,
      requestedBy: approval.requestedBy,
      reviewedBy: approval.reviewedBy,
      requestNote: approval.requestNote,
      reviewNote: approval.reviewNote,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    };
  }

  private utcDisplay(date: Date) {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z');
  }

  private mapShowing(showing: ShowingBooking) {
    return {
      id: showing.id,
      leadId: showing.leadId ?? null,
      propertyId: showing.propertyId,
      propertyTitle: showing.property ? showing.property.title : `Property #${showing.propertyId}`,
      agentId: showing.agentId ?? null,
      assignedAgent: showing.agent ? `${showing.agent.firstName ?? ''} ${showing.agent.lastName ?? ''}`.trim() : '',
      contactName: showing.contactName,
      contactEmail: showing.contactEmail,
      contactPhone: showing.contactPhone,
      startAt: showing.startAt,
      endAt: showing.endAt,
      status: showing.status,
      notes: showing.notes,
      createdAt: showing.createdAt,
      updatedAt: showing.updatedAt,
    };
  }
}
