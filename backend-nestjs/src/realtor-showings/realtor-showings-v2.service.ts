import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { parseDateTimeInZone } from '../common/time-zone';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { Lead, LeadFollowUpStatus, LeadPriority, LeadStage } from '../leads/entities/lead.entity';
import { LeadOutreachService } from '../leads/lead-outreach.service';
import { Property } from '../properties/entities/property.entity';
import { isPropertyLeadEligible } from '../properties/property-availability';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { RealtorShowing } from './entities/realtor-showing.entity';
import { RealtorShowingsService } from './realtor-showings.service';

type Mapping = {
  realtorName?: string;
  realtorEmail?: string;
  realtorPhone?: string;
  property?: string;
  showingAt?: string;
  showingDate?: string;
  showingTime?: string;
};

@Injectable()
export class RealtorShowingsV2Service extends RealtorShowingsService {
  constructor(
    @InjectRepository(RealtorShowing) private readonly v2ShowingRepo: Repository<RealtorShowing>,
    @InjectRepository(Property) private readonly v2PropertyRepo: Repository<Property>,
    @InjectRepository(Lead) private readonly v2LeadRepo: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry) historyRepo: Repository<LeadHistoryEntry>,
    outreach: LeadOutreachService,
    settings: SettingsService,
    scheduling: SchedulingSettingsService,
  ) {
    super(v2ShowingRepo, v2PropertyRepo, v2LeadRepo, historyRepo, outreach, settings, scheduling);
    this.settings = settings;
    this.scheduling = scheduling;
  }

  private readonly settings: SettingsService;
  private readonly scheduling: SchedulingSettingsService;

  override async importRows(payload: any) {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (!rows.length) throw new BadRequestException('CSV has no data rows.');
    const mapping: Mapping = payload?.mapping ?? {};
    const [allProperties, settings, scheduling] = await Promise.all([
      this.v2PropertyRepo.find(),
      this.settings.getAdminSettings(),
      this.scheduling.getSettings(),
    ]);
    const liveProperties = allProperties.filter(isPropertyLeadEligible);
    const unavailable = allProperties.filter((item) => !isPropertyLeadEligible(item));
    const defaultCountry = payload.defaultPhoneCountry || settings.profile?.defaultPhoneCountry;
    const failures: string[] = [];
    let createdCount = 0;

    for (let index = 0; index < rows.length; index++) {
      try {
        const sourceData = this.clean(rows[index]);
        const propertyText = this.cell(sourceData, mapping.property);
        const match = this.bestMatch(propertyText, liveProperties);
        const blockedMatch = this.bestMatch(propertyText, unavailable);
        if (!match.property && blockedMatch.score >= 0.9) throw new Error('Matched property is paused, sold, rented, closed, or unpublished.');
        const realtorEmail = this.cell(sourceData, mapping.realtorEmail).toLowerCase();
        const realtorPhone = normalizePhoneNumber(this.cell(sourceData, mapping.realtorPhone), defaultCountry);
        if (!realtorEmail && !realtorPhone) throw new Error('Email or phone required.');
        const showingAt = parseDateTimeInZone(this.combinedDateTime(sourceData, mapping), scheduling.timeZone);
        const lead = await this.findOrCreateLead({
          email: realtorEmail,
          name: this.cell(sourceData, mapping.realtorName),
          phone: realtorPhone,
          property: match.property?.title || propertyText,
          propertyId: match.property?.id ?? null,
          timeline: showingAt?.toISOString() ?? '',
        });
        const showing = await this.v2ShowingRepo.save(this.v2ShowingRepo.create({
          directTemplateId: `${payload.directTemplateId ?? ''}`,
          emailEnabled: !!payload.emailEnabled,
          followUpEnabled: !!payload.followUpEnabled,
          followUpGapDays: Math.max(0, Number(payload.followUpGapDays ?? 0) || 0),
          followUpTemplateId: `${payload.followUpTemplateId ?? ''}`,
          leadId: lead.id,
          outreachAt: parseDateTimeInZone(payload.outreachAt, scheduling.timeZone),
          propertyId: match.property?.id ?? null,
          propertyMatchMethod: match.property ? 'Auto' : 'Unmatched',
          propertyMatchScore: match.score,
          propertyText,
          realtorEmail,
          realtorName: this.cell(sourceData, mapping.realtorName) || realtorEmail.split('@')[0] || realtorPhone,
          realtorPhone,
          showingAt,
          smsEnabled: !!payload.smsEnabled,
          sourceData,
        }));
        createdCount++;
        if (showing.emailEnabled || showing.smsEnabled) {
          try { await super.updateAutomation(showing.id, payload); }
          catch (error: any) { failures.push(`Row ${index + 2} outreach: ${error?.message ?? 'Scheduling failed.'}`); }
        }
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }
    return { createdCount, failedCount: failures.length, failures };
  }

  override async createManual(payload: any) {
    const result = await this.importRows({
      ...payload,
      mapping: { realtorEmail: 'realtorEmail', realtorName: 'realtorName', realtorPhone: 'realtorPhone', property: 'property', showingAt: 'showingAt' },
      rows: [{ property: payload.property ?? '', realtorEmail: payload.realtorEmail ?? '', realtorName: payload.realtorName ?? '', realtorPhone: payload.realtorPhone ?? '', showingAt: payload.showingAt ?? '' }],
    });
    if (!result.createdCount) throw new BadRequestException(result.failures[0] ?? 'Unable to create realtor showing.');
    return result;
  }

  override async updateProperty(id: number, propertyId: number | null) {
    if (propertyId) {
      const property = await this.v2PropertyRepo.findOne({ where: { id: propertyId } });
      if (!property) throw new NotFoundException('Property not found.');
      if (!isPropertyLeadEligible(property)) throw new BadRequestException('Only a live property can be assigned to a new showing lead.');
    }
    const result = await super.updateProperty(id, propertyId);
    const showing = await this.v2ShowingRepo.findOne({ where: { id }, relations: ['lead', 'property'] });
    if (showing?.lead) {
      showing.lead.propertyId = showing.propertyId;
      showing.lead.property = showing.property?.title || showing.propertyText;
      await this.v2LeadRepo.save(showing.lead);
    }
    return result;
  }

  private async findOrCreateLead(input: { name: string; email: string; phone: string; property: string; propertyId: number | null; timeline: string }) {
    let lead: Lead | null = null;
    if (input.email) lead = await this.v2LeadRepo.createQueryBuilder('lead').where('LOWER(lead.email) = :email', { email: input.email }).getOne();
    if (!lead && input.phone) {
      const digits = input.phone.replace(/\D/g, '');
      lead = await this.v2LeadRepo.createQueryBuilder('lead').where("regexp_replace(lead.phone, '[^0-9]', '', 'g') = :phone", { phone: digits }).getOne();
    }
    if (lead) {
      lead.email ||= input.email;
      lead.phone ||= input.phone;
      lead.property = input.property || lead.property;
      lead.propertyId = input.propertyId;
      lead.timeline = input.timeline || lead.timeline;
      lead.followUpStatus = LeadFollowUpStatus.Scheduled;
      lead.lastActivityAt = new Date();
      return this.v2LeadRepo.save(lead);
    }
    return this.v2LeadRepo.save(this.v2LeadRepo.create({
      email: input.email, followUpStatus: LeadFollowUpStatus.Scheduled, inBoard: false,
      interest: 'Realtor showing', lastActivityAt: new Date(), name: input.name || input.email || input.phone,
      phone: input.phone, priority: LeadPriority.FollowUp, property: input.property, propertyId: input.propertyId,
      source: 'Realtor Showing CSV', stage: LeadStage.Contacted, summary: 'Realtor showing imported from CSV.', timeline: input.timeline,
    }));
  }

  private bestMatch(input: string, properties: Property[]) {
    const requested = this.normalize(input);
    if (!requested) return { property: null as Property | null, score: 0 };
    const exact = properties.find((property) => this.candidates(property).includes(requested));
    if (exact) return { property: exact, score: 1 };
    let best: Property | null = null;
    let score = 0;
    for (const property of properties) {
      const candidateScore = Math.max(0, ...this.candidates(property).map((candidate) => this.score(requested, candidate)));
      if (candidateScore > score) { best = property; score = candidateScore; }
    }
    return score >= 0.34 ? { property: best, score: Number(score.toFixed(3)) } : { property: null, score: Number(score.toFixed(3)) };
  }

  private score(left: string, right: string) {
    if (left === right) return 1;
    const leftNumber = left.match(/^\d+[a-z]?\b/)?.[0];
    const rightNumber = right.match(/^\d+[a-z]?\b/)?.[0];
    if (leftNumber && leftNumber === rightNumber) {
      if (left.includes(right) || right.includes(left)) return 0.98;
      return Math.max(0.82, this.tokenScore(left, right));
    }
    if (left.includes(right) || right.includes(left)) return 0.9;
    return this.tokenScore(left, right);
  }

  private tokenScore(left: string, right: string) {
    const a = new Set(left.split(' ').filter((token) => token.length > 1));
    const b = new Set(right.split(' ').filter((token) => token.length > 1));
    const intersection = [...a].filter((token) => b.has(token)).length;
    const union = new Set([...a, ...b]).size;
    return union ? intersection / union : 0;
  }

  private candidates(property: Property) {
    return [property.title, property.location, property.exactLocation].map((value) => this.normalize(value)).filter(Boolean);
  }
  private clean(input: any) { return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [`${key}`.trim(), `${value ?? ''}`.trim()])); }
  private cell(record: Record<string, string>, column?: string) { return column ? `${record[column] ?? ''}`.trim() : ''; }
  private combinedDateTime(record: Record<string, string>, mapping: Mapping) {
    const combined = this.cell(record, mapping.showingAt);
    if (combined) return combined;
    const date = this.cell(record, mapping.showingDate);
    const time = this.cell(record, mapping.showingTime);
    return date && time ? `${date}T${time}` : date;
  }
  private normalize(value: unknown) { return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
}
