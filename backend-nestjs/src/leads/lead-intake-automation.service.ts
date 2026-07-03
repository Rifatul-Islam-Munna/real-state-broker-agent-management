import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPropertyLeadEligible } from '../properties/property-availability';
import { Property } from '../properties/entities/property.entity';
import { SettingsService } from '../settings/settings.service';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { Lead } from './entities/lead.entity';
import { LeadOutreachService } from './lead-outreach.service';

@Injectable()
export class LeadIntakeAutomationService {
  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Property) private readonly propertyRepo: Repository<Property>,
    @InjectRepository(LeadHistoryEntry) private readonly historyRepo: Repository<LeadHistoryEntry>,
    private readonly settings: SettingsService,
    private readonly outreach: LeadOutreachService,
  ) {}

  async dispatch(leadId: number) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) return { sent: 0, skipped: 1, failures: ['Lead not found.'] };
    const property = await this.resolveProperty(lead);
    if (lead.property && property && !isPropertyLeadEligible(property)) {
      return { sent: 0, skipped: 1, failures: ['Property is not accepting leads.'] };
    }

    if (property) {
      lead.propertyId = property.id;
      lead.property = property.title;
      await this.leadRepo.save(lead);
    }

    const agency = await this.settings.getAdminSettings();
    const templates = (agency.communicationTemplates ?? []).filter((item: any) =>
      item.isActive !== false &&
      (item.audience ?? 'Lead') === 'Lead' &&
      (item.sequenceType ?? 'Direct') === 'Direct',
    );
    const [smtp, communication] = await Promise.all([
      this.settings.getSmtpConfig(),
      this.settings.getCommunicationConfig(),
    ]);
    const failures: string[] = [];
    let sent = 0;
    let skipped = 0;

    for (const template of templates) {
      for (const kind of this.channels(template.channels)) {
        if (kind === 'Email' && (!lead.email || !smtp?.host || !smtp?.username || !smtp?.password)) {
          skipped++;
          continue;
        }
        if (kind === 'Sms' && (!lead.phone || !communication?.supportsSms || !communication?.accountId || !communication?.authToken || !communication?.fromNumber)) {
          skipped++;
          continue;
        }
        const createdBy = `Lead Intake:${lead.id}:${property?.id ?? 'general'}:${template.id}:${kind}`;
        const duplicate = await this.historyRepo.findOne({ where: { leadId: lead.id, createdBy } });
        if (duplicate) {
          skipped++;
          continue;
        }
        try {
          const result = await this.outreach.sendOutreach({
            attachPropertyDocuments: template.attachPropertyDocuments !== false,
            createdBy,
            kind,
            leadId: lead.id,
            message: this.render(template.body, lead),
            templateId: template.id,
            title: this.render(template.subject || template.name, lead),
          });
          if (result.status === 'Failed') failures.push(`${kind}: ${result.summary}`);
          else sent++;
        } catch (error: any) {
          failures.push(`${kind}: ${error?.message ?? 'Delivery failed.'}`);
        }
      }
    }
    return { sent, skipped, failures };
  }

  private async resolveProperty(lead: Lead) {
    if (lead.propertyId) return this.propertyRepo.findOne({ where: { id: lead.propertyId } });
    const requested = this.normalize(lead.property);
    if (!requested) return null;
    const properties = await this.propertyRepo.find();
    return properties.find((item) => this.normalize(item.title) === requested) ?? null;
  }

  private channels(value: unknown): Array<'Email' | 'Sms'> {
    const channels = Array.isArray(value) ? value : [];
    return [channels.includes('Email') ? 'Email' : null, channels.includes('SMS') ? 'Sms' : null].filter(Boolean) as Array<'Email' | 'Sms'>;
  }

  private render(value: unknown, lead: Lead) {
    return `${value ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Client')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our team')
      .replaceAll('{{agency_name}}', 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the requested time');
  }

  private normalize(value: unknown) {
    return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
}
