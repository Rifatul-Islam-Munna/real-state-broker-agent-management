import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { parseDateTimeInZone } from '../common/time-zone';
import { LeadHistoryEntry, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { Lead, LeadFollowUpStatus, LeadPriority, LeadStage } from '../leads/entities/lead.entity';
import { LeadOutreachService } from '../leads/lead-outreach.service';
import { Property } from '../properties/entities/property.entity';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { RealtorShowing } from './entities/realtor-showing.entity';

type ImportMapping = {
  realtorName?: string;
  realtorEmail?: string;
  realtorPhone?: string;
  property?: string;
  showingAt?: string;
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
  ) {}

  async findAll(search?: string) {
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

    return (await qb.getMany()).map((item) => this.mapShowing(item));
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
    const created: RealtorShowing[] = [];
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      try {
        const sourceData = this.cleanRecord(rows[index]);
        const realtorName = this.value(sourceData, mapping.realtorName);
        const realtorEmail = this.value(sourceData, mapping.realtorEmail).toLowerCase();
        const realtorPhone = normalizePhoneNumber(this.value(sourceData, mapping.realtorPhone), defaultPhoneCountry);
        const propertyText = this.value(sourceData, mapping.property);
        if (!realtorEmail && !realtorPhone) throw new Error('Email or phone required.');

        const match = this.bestPropertyMatch(propertyText, properties);
        const showingLocalValue = this.mappedDateTime(sourceData, mapping);
        const showingAt = this.dateValue(showingLocalValue, scheduling.timeZone);
        const lead = await this.findOrCreateRealtorLead({
          email: realtorEmail,
          name: realtorName,
          phone: realtorPhone,
          property: match.property?.title || propertyText,
          timeline: showingAt?.toISOString() ?? '',
        });
        const outreachAt = this.dateValue(payload.outreachAt, scheduling.timeZone);
        const showing = await this.showingRepo.save(this.showingRepo.create({
          directTemplateId: `${payload.directTemplateId ?? ''}`,
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
          realtorEmail,
          realtorName: realtorName || realtorEmail.split('@')[0] || realtorPhone,
          realtorPhone,
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
      },
      rows: [{
        property: payload.property ?? '',
        realtorEmail: payload.realtorEmail ?? '',
        realtorName: payload.realtorName ?? '',
        realtorPhone: payload.realtorPhone ?? '',
        showingAt: payload.showingAt ?? '',
      }],
    });
    if (result.createdCount === 0) {
      throw new BadRequestException(result.failures[0] ?? 'Unable to create realtor showing.');
    }
    return result;
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

  private async scheduleOutreach(showing: RealtorShowing, lead: Lead, templates: any[]) {
    if (!showing.emailEnabled && !showing.smsEnabled) return;
    const direct = templates.find((item: any) => item.id === showing.directTemplateId);
    const failures: string[] = [];
    const channels = [
      showing.emailEnabled ? 'Email' : null,
      showing.smsEnabled ? 'Sms' : null,
    ].filter(Boolean) as Array<'Email' | 'Sms'>;

    for (const kind of channels) {
      try {
        await this.outreachService.sendOutreach({
          attachPropertyDocuments: direct?.attachPropertyDocuments !== false,
          attachmentDocumentCategory: direct?.attachmentDocumentCategory,
          attachmentDocumentType: direct?.attachmentDocumentType,
          attachmentMode: direct?.attachmentMode,
          createdBy: this.automationCreators(showing.id)[0],
          kind,
          leadId: lead.id,
          message: this.resolveTokens(direct?.body || 'Hi {{client_name}}, this is a reminder for the showing at {{property_address}}.', lead),
          pdfTemplateId: direct?.pdfTemplateId,
          scheduledAt: showing.outreachAt?.toISOString() ?? null,
          title: this.resolveTokens(direct?.subject || 'Property showing follow-up', lead),
        });
      } catch (error: any) {
        failures.push(`${kind}: ${error?.message ?? 'send failed'}`);
      }
    }

    if (!showing.followUpEnabled || !showing.followUpTemplateId || showing.followUpGapDays <= 0) {
      if (failures.length > 0) throw new BadRequestException(failures.join('; '));
      return;
    }
    const followUp = templates.find((item: any) => item.id === showing.followUpTemplateId);
    if (!followUp) {
      if (failures.length > 0) throw new BadRequestException(failures.join('; '));
      return;
    }
    const followUpAt = new Date(showing.outreachAt ?? new Date());
    followUpAt.setUTCDate(followUpAt.getUTCDate() + showing.followUpGapDays);
    for (const kind of channels) {
      try {
        await this.outreachService.sendOutreach({
          attachPropertyDocuments: followUp.attachPropertyDocuments !== false,
          attachmentDocumentCategory: followUp.attachmentDocumentCategory,
          attachmentDocumentType: followUp.attachmentDocumentType,
          attachmentMode: followUp.attachmentMode,
          createdBy: this.automationCreators(showing.id)[1],
          kind,
          leadId: lead.id,
          message: this.resolveTokens(followUp.body || '', lead),
          pdfTemplateId: followUp.pdfTemplateId,
          scheduledAt: followUpAt.toISOString(),
          title: this.resolveTokens(followUp.subject || followUp.name || 'Showing follow-up', lead),
        });
      } catch (error: any) {
        failures.push(`${kind} follow-up: ${error?.message ?? 'schedule failed'}`);
      }
    }
    if (failures.length > 0) throw new BadRequestException(failures.join('; '));
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
      interest: 'Realtor showing',
      lastActivityAt: new Date(),
      name: input.name || input.email || input.phone,
      phone: input.phone,
      priority: LeadPriority.FollowUp,
      property: input.property,
      source: 'Realtor Showing CSV',
      stage: LeadStage.Contacted,
      summary: 'Realtor showing imported from CSV.',
      timeline: input.timeline,
    }));
  }

  private bestPropertyMatch(input: string, properties: Property[]) {
    const normalizedInput = this.normalize(input);
    if (!normalizedInput) return { property: null as Property | null, score: 0 };
    let best: Property | null = null;
    let bestScore = 0;
    for (const property of properties) {
      const candidates = [property.title, property.location, property.exactLocation]
        .map((value) => this.normalize(value))
        .filter(Boolean);
      const score = Math.max(0, ...candidates.map((candidate) => this.similarity(normalizedInput, candidate)));
      if (score > bestScore) {
        best = property;
        bestScore = score;
      }
    }
    return bestScore >= 0.34 ? { property: best, score: Number(bestScore.toFixed(3)) } : { property: null, score: Number(bestScore.toFixed(3)) };
  }

  private similarity(left: string, right: string) {
    if (left === right) return 1;
    if (left.includes(right) || right.includes(left)) return 0.9;
    const leftTokens = new Set(left.split(' ').filter((token) => token.length > 1));
    const rightTokens = new Set(right.split(' ').filter((token) => token.length > 1));
    const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const union = new Set([...leftTokens, ...rightTokens]).size;
    return union ? intersection / union : 0;
  }

  private mapShowing(item: RealtorShowing) {
    const responded = item.lead?.followUpStatus === LeadFollowUpStatus.Completed;
    return {
      ...item,
      automationStatus: responded ? 'StoppedByReply' : (item.emailEnabled || item.smsEnabled ? 'Scheduled' : 'NotScheduled'),
      lead: item.lead ? { id: item.lead.id, followUpStatus: item.lead.followUpStatus } : null,
      property: item.property ? { id: item.property.id, title: item.property.title, location: item.property.location } : null,
    };
  }

  private cleanRecord(input: any) {
    return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [`${key}`.trim(), `${value ?? ''}`.trim()]));
  }

  private value(record: Record<string, string>, column?: string) {
    return column ? `${record[column] ?? ''}`.trim() : '';
  }

  private mappedDateTime(record: Record<string, string>, mapping: ImportMapping) {
    const combined = this.value(record, mapping.showingAt);
    if (combined) return combined;

    const date = this.value(record, mapping.showingDate);
    const time = this.value(record, mapping.showingTime);
    return date && time ? `${date}T${time}` : date;
  }

  private normalize(value: string) {
    return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private dateValue(value: any, timeZone: string) {
    return parseDateTimeInZone(value, timeZone);
  }

  private automationCreators(showingId: number) {
    return [`Realtor Showing #${showingId}`, `Realtor Showing #${showingId} Follow-up`];
  }

  private resolveTokens(text: string, lead: Lead) {
    return `${text ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Realtor')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our team')
      .replaceAll('{{agency_name}}', 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the scheduled time');
  }
}
