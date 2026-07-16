import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  PropertyChatConversation,
  PropertyChatConversationStatus,
  PropertyChatMessage,
  PropertyChatSenderRole,
} from './entities/property-chat.entity';
import { paginated, toInt } from '../common/api-contract';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { LeadIntakeAutomationService } from '../leads/lead-intake-automation.service';
import { Property } from '../properties/entities/property.entity';
import { isPropertyLeadEligible } from '../properties/property-availability';
import { SettingsService } from '../settings/settings.service';
import { normalizePhoneNumber } from '../common/phone-normalizer';

@Injectable()
export class PropertyChatService {
  constructor(
    @InjectRepository(PropertyChatConversation) private conversationRepo: Repository<PropertyChatConversation>,
    @InjectRepository(PropertyChatMessage) private messageRepo: Repository<PropertyChatMessage>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private historyRepo: Repository<LeadHistoryEntry>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    private settingsService: SettingsService,
    private leadAutomation: LeadIntakeAutomationService,
  ) {}

  async createConversation(dto: any) {
    const property = await this.propertyRepo.findOne({ where: { id: dto.propertyId }, relations: ['agent'] });
    if (!isPropertyLeadEligible(property)) throw new NotFoundException('Property is not available.');
    const summary = this.buildSummary(dto);
    const contactEmail = (dto.contactEmail ?? '').trim().toLowerCase();
    const settings = await this.settingsService.getAdminSettings();
    const contactPhone = normalizePhoneNumber(dto.contactPhone, settings.profile?.defaultPhoneCountry ?? 'US');
    let lead: Lead | null = null;
    const hasMinimumLeadData = !!dto.contactName?.trim() && (!!contactEmail || !!contactPhone);
    if (hasMinimumLeadData) {
      lead = contactEmail ? await this.leadRepo.findOne({ where: { email: contactEmail } }) : null;
      if (!lead) {
        lead = this.leadRepo.create({
          name: dto.contactName.trim(), email: contactEmail, phone: contactPhone,
          agent: property.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : '',
          agentId: property.agentId, budget: (dto.budget ?? '').trim(), property: property.title, propertyId: property.id,
          source: 'Property Chat', interest: (dto.interest ?? '').trim(), timeline: (dto.timeline ?? '').trim(), summary,
          notes: summary ? [summary.slice(0, 600)] : [], stage: 'Qualified' as any, priority: 'Warm' as any,
          followUpStatus: 'Open' as any, nextActionDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          nextActionType: 'Reply to property chat', inBoard: true, lastActivityAt: new Date(),
        });
      } else {
        lead.agent = property.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : lead.agent;
        lead.agentId = property.agentId ?? lead.agentId;
        lead.phone = contactPhone || lead.phone;
        lead.budget = dto.budget?.trim() || lead.budget;
        lead.property = property.title;
        lead.propertyId = property.id;
        lead.source = 'Property Chat';
        lead.interest = dto.interest?.trim() || lead.interest;
        lead.timeline = dto.timeline?.trim() || lead.timeline;
        lead.summary = summary;
        lead.notes = summary ? [...(lead.notes ?? []), summary.slice(0, 600)] : (lead.notes ?? []);
        lead.lastActivityAt = new Date();
      }
      lead = await this.leadRepo.save(lead);
      await this.historyRepo.save(this.historyRepo.create({
        leadId: lead.id, kind: 'PropertyChat', direction: 'Incoming', status: 'Received',
        title: `Property chat for ${property.title}`, summary: summary || 'Property chat received.', body: summary, createdBy: 'System',
      }));
      await this.leadAutomation.dispatch(lead.id).catch(() => null);
    }

    const conversation = this.conversationRepo.create({
      ...dto, summary, propertyTitle: property.title,
      assignedAgent: property.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : '',
      contactEmail, contactPhone, leadId: lead?.id ?? null, autoQualified: !!lead, qualificationScore: lead ? 0.75 : 0,
      status: lead ? PropertyChatConversationStatus.LeadCreated : hasMinimumLeadData ? PropertyChatConversationStatus.NeedsReview : PropertyChatConversationStatus.New,
      messages: this.buildMessages(dto),
    } as object);
    return this.mapConversation(await this.conversationRepo.save(conversation));
  }

  async getConversations(page: number, pageSize: number, search?: string, propertyId?: number, leadId?: number) {
    page = toInt(page, 1); pageSize = toInt(pageSize, 20);
    const query = this.conversationRepo.createQueryBuilder('conv').leftJoinAndSelect('conv.property', 'property').leftJoinAndSelect('conv.lead', 'lead').leftJoinAndSelect('conv.messages', 'messages').orderBy('conv.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    if (search) query.andWhere('(conv.contact_name ILIKE :search OR conv.contact_email ILIKE :search OR conv.property_title ILIKE :search OR conv.summary ILIKE :search)', { search: `%${search}%` });
    if (propertyId) query.andWhere('conv.property_id = :propertyId', { propertyId });
    if (leadId) query.andWhere('conv.lead_id = :leadId', { leadId });
    if (!this.showDemoData()) {
      query.andWhere('conv.contact_email NOT ILIKE :demoEmail', { demoEmail: '%@demo.local' });
      query.andWhere("(property.slug IS NULL OR property.slug NOT LIKE 'demo-property-%')");
    }
    const [items, total] = await query.getManyAndCount();
    return paginated(items.map((item) => this.mapConversation(item)), total, page, pageSize);
  }

  async getConversation(id: number) {
    const conv = await this.conversationRepo.findOne({ where: { id }, relations: ['messages', 'property', 'lead'] });
    if (!conv) throw new NotFoundException('Conversation not found');
    return this.mapConversation(conv);
  }

  private buildSummary(dto: any) {
    const lines: string[] = [];
    if (dto.timeline) lines.push(`Timeline: ${dto.timeline}`);
    if (dto.interest) lines.push(`Interest: ${dto.interest}`);
    if (dto.additionalMessage) lines.push(`Message: ${dto.additionalMessage}`);
    for (const answer of dto.answers ?? []) if (answer.answerText) lines.push(`${answer.questionPrompt || 'Pre-question'}: ${answer.answerText}`);
    return lines.length ? lines.join('\n') : (dto.summary ?? 'No extra intake details shared.');
  }

  private buildMessages(dto: any) {
    const now = new Date();
    const messages: DeepPartial<PropertyChatMessage>[] = [];
    for (const answer of dto.answers ?? []) {
      messages.push({ message: answer.questionPrompt || 'Pre-question', senderRole: PropertyChatSenderRole.System, createdAt: now });
      if (answer.answerText || answer.attachmentUrl) messages.push({ message: answer.answerText || 'Shared a file.', senderRole: PropertyChatSenderRole.Visitor, attachmentUrl: answer.attachmentUrl ?? null, attachmentObjectName: answer.attachmentObjectName ?? null, createdAt: now });
    }
    return messages;
  }

  private mapConversation(item: PropertyChatConversation) {
    return {
      id: item.id, propertyId: item.propertyId, propertyTitle: item.propertyTitle || item.property?.title || '', assignedAgent: item.assignedAgent,
      contactName: item.contactName, contactEmail: item.contactEmail, contactPhone: item.contactPhone, budget: item.budget, timeline: item.timeline,
      interest: item.interest, summary: item.summary, qualificationScore: item.qualificationScore, autoQualified: item.autoQualified,
      status: item.status, leadId: item.leadId ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt,
      messages: (item.messages ?? []).sort((a, b) => Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)) || a.id - b.id).map((message) => ({ id: message.id, senderRole: message.senderRole, message: message.message, attachmentUrl: message.attachmentUrl ?? null, attachmentObjectName: message.attachmentObjectName ?? null, createdAt: message.createdAt })),
    };
  }

  private showDemoData() {
    return `${process.env.isDemoData ?? ''}`.trim().toLowerCase() === 'true';
  }
}
