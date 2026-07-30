import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { bestPropertyAddressMatch } from '../common/property-address-match';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { parseDateTimeInZone } from '../common/time-zone';
import { LeadHistoryEntry, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { Lead, LeadFollowUpStatus, LeadPriority, LeadStage } from '../leads/entities/lead.entity';
import { LeadOutreachService } from '../leads/lead-outreach.service';
import { Property } from '../properties/entities/property.entity';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { RealtorsService } from '../realtors/realtors.service';
import { RealtorShowing } from './entities/realtor-showing.entity';

type ImportMapping = {
  realtorName?: string;
  realtorEmail?: string;
  realtorPhone?: string;
  property?: string;
  showingAt?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  leadId?: string;
  showingDate?: string;
  showingTime?: string;
};

@Injectable()
export class RealtorShowingsService {
  constructor(
    @InjectRepository(RealtorShowing) private readonly showingRepo: Repository<RealtorShowing>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) private readonly historyRepo: Repository<LeadHistoryEntry>,
    private readonly outreachService: LeadOutreachService,
    private readonly settingsService: SettingsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
    protected readonly realtorsService: RealtorsService,
  ) {}

  async findAll(search?: string, page = 1, pageSize = 25) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
    const qb = this.showingRepo.createQueryBuilder('showing')
      .leftJoinAndSelect('showing.property', 'property')
      .leftJoinAndSelect('showing.lead', 'lead')
      .orderBy('showing.showingAt', 'DESC', 'NULLS LAST')
      .addOrderBy('showing.createdAt', 'DESC');

    if (search?.trim()) {
      qb.where(
        '(showing.realtorName ILIKE :search OR showing.realtorEmail ILIKE :search OR showing.realtorPhone ILIKE :search OR showing.propertyText ILIKE :search OR property.title ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    const [items, totalCount] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items: items.map((item) => this.mapShowing(item)),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      hasNextPage: page * pageSize < totalCount,
      hasPreviousPage: page > 1,
    };
  }

  async getSequenceSummary(search?: string) {
    const qb = this.showingRepo.createQueryBuilder('showing')
      .leftJoin('showing.property', 'property');

    if (search?.trim()) {
      qb.where(
        '(showing.realtorName ILIKE :search OR showing.realtorEmail ILIKE :search OR showing.realtorPhone ILIKE :search OR showing.propertyText ILIKE :search OR property.title ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    const items = await qb.getMany();
    const total = items.length;
    const active = items.filter((item) => !item.replyReceived && item.sequenceStatus === 'active').length;
    const paused = items.filter((item) => item.sequenceStatus === 'paused').length;
    const cancelled = items.filter((item) => item.sequenceStatus === 'cancelled').length;
    const completed = items.filter((item) => item.replyReceived || item.sequenceStatus === 'completed').length;
    const replied = items.filter((item) => item.replyReceived).length;
    const emailOnly = items.filter((item) => item.emailEnabled && !item.smsEnabled).length;
    const smsOnly = items.filter((item) => item.smsEnabled && !item.emailEnabled).length;
    const multiChannel = items.filter((item) => item.emailEnabled && item.smsEnabled).length;
    const followUpEnabled = items.filter((item) => item.followUpEnabled).length;
    const averageGapDays = followUpEnabled > 0
      ? Number((items.filter((item) => item.followUpEnabled).reduce((sum, item) => sum + Math.max(0, item.followUpGapDays || 0), 0) / followUpEnabled).toFixed(1))
      : 0;
    const replyRate = total > 0 ? Number(((replied / total) * 100).toFixed(1)) : 0;
    const stopRate = total > 0 ? Number((((cancelled + paused) / total) * 100).toFixed(1)) : 0;
    const multiChannelReplyRate = multiChannel > 0
      ? Number((items.filter((item) => item.emailEnabled && item.smsEnabled && item.replyReceived).length / multiChannel * 100).toFixed(1))
      : 0;
    const singleChannelCount = emailOnly + smsOnly;
    const singleChannelReplies = items.filter((item) => (item.emailEnabled !== item.smsEnabled) && item.replyReceived).length;
    const singleChannelReplyRate = singleChannelCount > 0
      ? Number((singleChannelReplies / singleChannelCount * 100).toFixed(1))
      : 0;

    const tips: Array<{ id: string; title: string; detail: string; tone: 'primary' | 'secondary' | 'tertiary' }> = [];
    if (multiChannel > 0 && singleChannelCount > 0) {
      tips.push({
        id: 'channel-performance',
        title: 'Channel mix',
        detail: `Email + SMS sequences are replying at ${multiChannelReplyRate}% versus ${singleChannelReplyRate}% for single-channel sequences.`,
        tone: multiChannelReplyRate >= singleChannelReplyRate ? 'secondary' : 'tertiary',
      });
    }
    if (followUpEnabled > 0) {
      tips.push({
        id: 'follow-up-gap',
        title: 'Follow-up timing',
        detail: `The current average follow-up gap is ${averageGapDays} day${averageGapDays === 1 ? '' : 's'} across ${followUpEnabled} active follow-up sequences.`,
        tone: 'primary',
      });
    }
    if (paused + cancelled > 0) {
      tips.push({
        id: 'stopped-sequences',
        title: 'Stopped sequences',
        detail: `${paused + cancelled} sequence${paused + cancelled === 1 ? '' : 's'} are paused or cancelled and may need review.`,
        tone: 'tertiary',
      });
    }
    if (tips.length === 0) {
      tips.push({
        id: 'insufficient-data',
        title: 'More data needed',
        detail: 'Sequence optimization tips will appear after more outreach and reply activity is recorded.',
        tone: 'primary',
      });
    }

    return {
      total,
      active,
      paused,
      cancelled,
      completed,
      replied,
      replyRate,
      stopRate,
      emailOnly,
      smsOnly,
      multiChannel,
      followUpEnabled,
      averageGapDays,
      tips,
      generatedAt: new Date().toISOString(),
    };
  }

  async importRows(payload: any) {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows.');

    const mapping: ImportMapping = payload.mapping ?? {};
    const properties = await this.propertyRepo.find();
    const settings = await this.settingsService.getAdminSettings();
    const scheduling = await this.schedulingSettingsService.getSettings();
    const templates = settings.communicationTemplates ?? [];
    const defaultPhoneCountry = payload.defaultPhoneCountry || settings.profile?.defaultPhoneCountry;
    const defaultDirectTemplateId = this.defaultShowingTemplateId(settings, payload.directTemplateId);
    const created: RealtorShowing[] = [];
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      try {
        const sourceData = this.cleanRecord(rows[index]);
        const realtorName = this.value(sourceData, mapping.realtorName);
        const realtorEmail = this.value(sourceData, mapping.realtorEmail).toLowerCase();
        const realtorPhone = normalizePhoneNumber(this.value(sourceData, mapping.realtorPhone), defaultPhoneCountry);
        const savedRealtor = await this.realtorsService.findMatching(realtorEmail, realtorPhone);
        const effectiveRealtorEmail = realtorEmail || savedRealtor?.email || '';
        const effectiveRealtorPhone = realtorPhone || savedRealtor?.phone || '';
        const effectiveRealtorName = realtorName || savedRealtor?.name || effectiveRealtorEmail.split('@')[0] || effectiveRealtorPhone;
        const visitorName = this.value(sourceData, mapping.visitorName);
        const visitorEmail = this.value(sourceData, mapping.visitorEmail).toLowerCase();
        const visitorPhone = normalizePhoneNumber(this.value(sourceData, mapping.visitorPhone), defaultPhoneCountry);
        const propertyText = this.value(sourceData, mapping.property);
        if (!effectiveRealtorEmail && !effectiveRealtorPhone) throw new Error('Realtor email or phone required.');
        if (!savedRealtor) {
          await this.realtorsService.create({
            email: effectiveRealtorEmail,
            name: effectiveRealtorName,
            phone: effectiveRealtorPhone,
          });
        }
        if (!visitorEmail) throw new Error('Lead or tenant email is required.');

        const match = bestPropertyAddressMatch(propertyText, properties, 0.36);
        const showingLocalValue = this.mappedDateTime(sourceData, mapping, scheduling.morningOutreachHour);
        const showingAt = this.dateValue(showingLocalValue, scheduling.timeZone);
        const requestedLeadId = Number(payload.leadId || this.value(sourceData, mapping.leadId)) || 0;
        const existingLead = requestedLeadId ? await this.leadRepo.findOne({ where: { id: requestedLeadId } }) : null;
        const lead = existingLead ?? await this.findOrCreateRealtorLead({
          email: visitorEmail,
          name: visitorName,
          phone: visitorPhone,
          property: match.property?.title || propertyText,
          timeline: showingAt?.toISOString() ?? '',
        });
        const outreachAt = this.dateValue(payload.outreachAt, scheduling.timeZone);
        const showing = await this.showingRepo.save(this.showingRepo.create({
          directTemplateId: defaultDirectTemplateId,
          emailEnabled: !!payload.emailEnabled,
          followUpEnabled: !!payload.followUpEnabled,
          followUpGapDays: Math.max(0, Number(payload.followUpGapDays ?? 0) || 0),
          followUpTemplateId: `${payload.followUpTemplateId ?? ''}`,
          leadId: lead.id,
          outreachAt,
          propertyId: match.property?.id ?? null,
          propertyMatchMethod: match.property ? 'Auto' : 'Unmatched',
          propertyMatchScore: match.score,
          propertyText,
          realtorEmail: effectiveRealtorEmail,
          realtorName: effectiveRealtorName,
          realtorPhone: effectiveRealtorPhone,
          visitorName: visitorName || lead.name,
          visitorEmail: visitorEmail || lead.email,
          visitorPhone: visitorPhone || lead.phone,
          showingAt,
          smsEnabled: !!payload.smsEnabled,
          sourceData,
        }));
        created.push(showing);
        try {
          await this.scheduleOutreach(showing, lead, templates);
        } catch (error: any) {
          failures.push(`Row ${index + 2} outreach: ${error?.message ?? 'Scheduling failed.'}`);
        }
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }

    return { createdCount: created.length, failedCount: failures.length, failures };
  }

  async createManual(payload: any) {
    const result = await this.importRows({
      ...payload,
      mapping: {
        realtorEmail: 'realtorEmail',
        realtorName: 'realtorName',
        realtorPhone: 'realtorPhone',
        property: 'property',
        showingAt: 'showingAt',
        visitorName: 'visitorName',
        visitorEmail: 'visitorEmail',
        visitorPhone: 'visitorPhone',
        leadId: 'leadId',
      },
      rows: [{
        property: payload.property ?? '',
        realtorEmail: payload.realtorEmail ?? '',
        realtorName: payload.realtorName ?? '',
        realtorPhone: payload.realtorPhone ?? '',
        showingAt: payload.showingAt ?? '',
        visitorName: payload.visitorName ?? '',
        visitorEmail: payload.visitorEmail ?? '',
        visitorPhone: payload.visitorPhone ?? '',
        leadId: payload.leadId ? String(payload.leadId) : '',
      }],
    });
    if (result.createdCount === 0) {
      throw new BadRequestException(result.failures[0] ?? 'Unable to create realtor showing.');
    }
    return result;
  }

  async updateSequence(id: number, status: 'active' | 'paused' | 'cancelled') {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['lead', 'property'] });
    if (!showing) throw new NotFoundException('Showing not found.');
    showing.sequenceStatus = status;
    showing.followUpEnabled = status === 'active';
    if (status === 'cancelled') showing.sequenceStep = 'cancelled';
    if (status === 'paused') showing.sequenceStep = 'paused';
    const saved = await this.showingRepo.save(showing);
    if (showing.leadId) {
      await this.historyRepo.createQueryBuilder()
        .update(LeadHistoryEntry)
        .set({
          occurredAt: new Date(),
          status: 'Failed',
          summary: status === 'active'
            ? 'Realtor showing automation resumed with a refreshed schedule.'
            : `Realtor showing automation ${status}.`,
        })
        .where('lead_id = :leadId', { leadId: showing.leadId })
        .andWhere('status = :scheduledStatus', { scheduledStatus: leadHistoryStatusDb('Scheduled') })
        .andWhere('created_by IN (:...createdBy)', { createdBy: this.automationCreators(showing.id) })
        .execute();
    }
    if (status === 'active') {
      if (!showing.lead) throw new BadRequestException('Showing does not have a linked lead.');
      const settings = await this.settingsService.getAdminSettings();
      await this.scheduleOutreach(saved, showing.lead, settings.communicationTemplates ?? []);
    }
    return this.mapShowing(await this.showingRepo.findOneOrFail({ where: { id }, relations: ['lead', 'property'] }));
  }

  async updateProperty(id: number, propertyId: number | null) {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!showing) throw new NotFoundException('Realtor showing not found.');
    const property = propertyId ? await this.propertyRepo.findOne({ where: { id: propertyId } }) : null;
    if (propertyId && !property) throw new NotFoundException('Property not found.');

    showing.propertyId = property?.id ?? null;
    showing.propertyMatchMethod = property ? 'Manual' : 'Unmatched';
    showing.propertyMatchScore = property ? 1 : 0;
    if (showing.lead && property) {
      showing.lead.property = property.title;
      await this.leadRepo.save(showing.lead);
    }
    return this.mapShowing(await this.showingRepo.save(showing));
  }

  async updateAutomation(id: number, payload: any) {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!showing) throw new NotFoundException('Realtor showing not found.');
    if (!showing.lead) throw new BadRequestException('Showing does not have a linked realtor lead.');

    const timeZone = await this.schedulingSettingsService.getTimeZone();
    showing.emailEnabled = !!payload.emailEnabled;
    showing.smsEnabled = !!payload.smsEnabled;
    showing.directTemplateId = `${payload.directTemplateId ?? ''}`;
    showing.outreachAt = this.dateValue(payload.outreachAt, timeZone);
    showing.followUpEnabled = !!payload.followUpEnabled;
    showing.followUpTemplateId = `${payload.followUpTemplateId ?? ''}`;
    showing.followUpGapDays = Math.max(0, Number(payload.followUpGapDays ?? 0) || 0);
    const saved = await this.showingRepo.save(showing);

    await this.historyRepo.createQueryBuilder()
      .update(LeadHistoryEntry)
      .set({
        occurredAt: new Date(),
        status: 'Failed',
        summary: 'Realtor showing automation replaced by updated schedule.',
      })
      .where('lead_id = :leadId', { leadId: showing.lead.id })
      .andWhere('status = :status', { status: leadHistoryStatusDb('Scheduled') })
      .andWhere('created_by IN (:...createdBy)', { createdBy: this.automationCreators(showing.id) })
      .execute();

    const settings = await this.settingsService.getAdminSettings();
    await this.scheduleOutreach(saved, showing.lead, settings.communicationTemplates ?? []);
    return this.mapShowing(await this.showingRepo.findOneOrFail({ where: { id }, relations: ['lead', 'property'] }));
  }

  async sendManualFirstMessage(id: number) {
    const showing = await this.showingRepo.findOne({ where: { id }, relations: ['lead', 'property'] });
    if (!showing) throw new NotFoundException('Realtor showing not found.');
    if (!showing.lead) throw new BadRequestException('Showing does not have a linked lead.');
    if (!showing.emailEnabled && !showing.smsEnabled) throw new BadRequestException('Enable Email or SMS before sending.');

    const alreadyStarted = await this.historyRepo.createQueryBuilder('history')
      .where('history.lead_id = :leadId', { leadId: showing.lead.id })
      .andWhere('history.created_by = :createdBy', { createdBy: this.automationCreators(showing.id)[0] })
      .andWhere('history.status IN (:...statuses)', { statuses: ['Sent', 'Completed', 'Scheduled'].map(leadHistoryStatusDb) })
      .getExists();
    if (alreadyStarted) throw new BadRequestException('First message is already sent or scheduled.');

    const settings = await this.settingsService.getAdminSettings();
    const templates = settings.communicationTemplates ?? [];
    const direct = templates.find((item: any) => item.id === showing.directTemplateId);
    const failures = await this.sendShowingMessages(showing, showing.lead, direct, null, this.automationCreators(showing.id)[0]);
    if (failures.length > 0) throw new BadRequestException(failures.join('; '));
    await this.scheduleShowingFollowUp(showing, showing.lead, templates, new Date(), failures);
    if (failures.length > 0) throw new BadRequestException(failures.join('; '));
    showing.sequenceStatus = 'active';
    showing.sequenceStep = 'follow-up';
    return this.mapShowing(await this.showingRepo.save(showing));
  }

  private async scheduleOutreach(showing: RealtorShowing, lead: Lead, templates: any[]) {
    if (!showing.emailEnabled && !showing.smsEnabled) return;
    const direct = templates.find((item: any) => item.id === showing.directTemplateId);
    const settings = await this.settingsService.getAdminSettings();
    const firstMessageAuto = (direct?.audience === 'LeadShowing')
      ? settings.firstMessageAutomation?.leadShowing !== false
      : settings.firstMessageAutomation?.realtorShowing !== false;
    if (!firstMessageAuto) {
      showing.sequenceStatus = 'paused';
      showing.sequenceStep = 'manual-first-message';
      await this.showingRepo.save(showing);
      return;
    }
    const failures: string[] = [];
    const delayMinutes = direct?.audience === 'LeadShowing'
      ? settings.firstMessageAutomation?.leadShowingDelayMinutes ?? settings.firstMessageAutomation?.delayMinutes
      : settings.firstMessageAutomation?.realtorShowingDelayMinutes ?? settings.firstMessageAutomation?.delayMinutes;
    const firstAt = showing.outreachAt ?? this.firstMessageDelayAt(delayMinutes);
    await this.sendShowingMessages(showing, lead, direct, firstAt?.toISOString() ?? null, this.automationCreators(showing.id)[0], failures);
    await this.scheduleShowingFollowUp(showing, lead, templates, firstAt ?? new Date(), failures);
    if (failures.length > 0) throw new BadRequestException(failures.join('; '));
  }

  private async scheduleShowingFollowUp(showing: RealtorShowing, lead: Lead, templates: any[], baseAt: Date, failures: string[]) {
    if (!showing.followUpEnabled || !showing.followUpTemplateId || showing.followUpGapDays <= 0) {
      if (failures.length > 0) throw new BadRequestException(failures.join('; '));
      return;
    }
    const followUp = templates.find((item: any) => item.id === showing.followUpTemplateId);
    if (!followUp) {
      if (failures.length > 0) throw new BadRequestException(failures.join('; '));
      return;
    }
    const followUpAt = new Date(baseAt);
    followUpAt.setUTCDate(followUpAt.getUTCDate() + showing.followUpGapDays);
    await this.sendShowingMessages(showing, lead, followUp, followUpAt.toISOString(), this.automationCreators(showing.id)[1], failures, true);
  }

  private async sendShowingMessages(showing: RealtorShowing, lead: Lead, template: any, scheduledAt: string | null, createdBy: string, failures: string[] = [], isFollowUp = false) {
    const channels = [
      showing.emailEnabled ? 'Email' : null,
      showing.smsEnabled ? 'Sms' : null,
    ].filter(Boolean) as Array<'Email' | 'Sms'>;
    for (const kind of channels) {
      try {
        await this.outreachService.sendOutreach({
          attachPropertyDocuments: template?.attachPropertyDocuments !== false,
          attachmentDocumentCategory: template?.attachmentDocumentCategory,
          attachmentDocumentType: template?.attachmentDocumentType,
          attachmentMode: template?.attachmentMode,
          createdBy,
          kind,
          leadId: lead.id,
          message: this.resolveTokens(template?.body || 'Hi {{client_name}}, this is a reminder for the showing at {{property_address}}.', lead),
          pdfTemplateId: template?.pdfTemplateId,
          scheduledAt,
          title: this.resolveTokens(template?.subject || template?.name || (isFollowUp ? 'Showing follow-up' : 'Property showing follow-up'), lead),
        });
      } catch (error: any) {
        failures.push(`${kind}${isFollowUp ? ' follow-up' : ''}: ${error?.message ?? 'send failed'}`);
      }
    }
    return failures;
  }

  private async findOrCreateRealtorLead(input: { name: string; email: string; phone: string; property: string; timeline: string }) {
    let lead: Lead | null = null;
    if (input.email) {
      lead = await this.leadRepo.createQueryBuilder('lead')
        .where('LOWER(lead.email) = :email', { email: input.email.toLowerCase() })
        .getOne();
    }
    if (!lead && input.phone) {
      const digits = input.phone.replace(/\D/g, '');
      lead = await this.leadRepo.createQueryBuilder('lead')
        .where("regexp_replace(lead.phone, '[^0-9]', '', 'g') = :phone", { phone: digits })
        .getOne();
    }
    if (lead) {
      if (!lead.phone && input.phone) lead.phone = input.phone;
      if (!lead.email && input.email) lead.email = input.email;
      if (input.property) lead.property = input.property;
      if (input.timeline) lead.timeline = input.timeline;
      lead.followUpStatus = LeadFollowUpStatus.Scheduled;
      lead.lastActivityAt = new Date();
      return this.leadRepo.save(lead);
    }
    return this.leadRepo.save(this.leadRepo.create({
      email: input.email,
      followUpStatus: LeadFollowUpStatus.Scheduled,
      inBoard: false,
      interest: 'Property showing visitor',
      lastActivityAt: new Date(),
      name: input.name || input.email || input.phone,
      phone: input.phone,
      priority: LeadPriority.FollowUp,
      property: input.property,
      source: 'Property Showing',
      stage: LeadStage.Contacted,
      summary: 'Lead or tenant added as a property showing visitor.',
      timeline: input.timeline,
    }));
  }

  private mapShowing(item: RealtorShowing) {
    const responded = item.lead?.followUpStatus === LeadFollowUpStatus.Completed;
    const waitingForManualFirstMessage = item.sequenceStatus === 'paused' && item.sequenceStep === 'manual-first-message';
    return {
      ...item,
      automationStatus: responded ? 'StoppedByReply' : waitingForManualFirstMessage ? 'NotScheduled' : (item.emailEnabled || item.smsEnabled ? 'Scheduled' : 'NotScheduled'),
      lead: item.lead ? { id: item.lead.id, name: item.lead.name, email: item.lead.email, phone: item.lead.phone, followUpStatus: item.lead.followUpStatus } : null,
      property: item.property ? { id: item.property.id, title: item.property.title, location: item.property.location } : null,
    };
  }

  private cleanRecord(input: any) {
    return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [`${key}`.trim(), `${value ?? ''}`.trim()]));
  }

  private value(record: Record<string, string>, column?: string) {
    return column ? `${record[column] ?? ''}`.trim() : '';
  }

  private mappedDateTime(record: Record<string, string>, mapping: ImportMapping, defaultHour = 9) {
    const combined = this.value(record, mapping.showingAt);
    if (combined) return combined;

    const date = this.value(record, mapping.showingDate);
    const time = this.value(record, mapping.showingTime);
    if (!date) return '';
    if (time) return `${date}T${time}`;
    const hour = Math.min(23, Math.max(0, Number(defaultHour) || 9));
    return `${date}T${String(hour).padStart(2, '0')}:00`;
  }

  private dateValue(value: any, timeZone: string) {
    return parseDateTimeInZone(value, timeZone);
  }

  private automationCreators(showingId: number) {
    return [`Realtor Showing #${showingId}`, `Realtor Showing #${showingId} Follow-up`];
  }

  private firstMessageDelayAt(delayMinutes: unknown) {
    const minutes = Math.min(1440, Math.max(0, Number(delayMinutes) || 0));
    return minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;
  }

  private resolveTokens(text: string, lead: Lead) {
    return `${text ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Realtor')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our team')
      .replaceAll('{{agency_name}}', 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the scheduled time');
  }

  protected defaultShowingTemplateId(settings: any, requested?: string) {
    const explicit = `${requested ?? ''}`.trim();
    if (explicit) return explicit;
    const templates = settings.communicationTemplates ?? [];
    const configured = `${settings.leadAutomation?.realtorShowingTemplateId ?? ''}`.trim();
    const directRealtor = templates.find((item: any) =>
      item.isActive !== false &&
      item.audience === 'Realtor' &&
      (item.sequenceType ?? 'Direct') === 'Direct' &&
      (!configured || item.id === configured),
    );
    return directRealtor?.id
      ?? templates.find((item: any) => item.id === 'showing-confirmation')?.id
      ?? '';
  }
}

