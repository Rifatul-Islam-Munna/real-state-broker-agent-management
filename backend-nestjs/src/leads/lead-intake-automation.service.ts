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
    const automation = agency.leadAutomation ?? {};
    if (automation.enabled !== true) {
      return { sent: 0, skipped: 1, failures: ['Lead automation is disabled.'] };
    }
    if (agency.firstMessageAutomation?.lead === false) {
      return { sent: 0, skipped: 1, failures: ['Automatic first lead message is disabled. Send the first message manually.'] };
    }
    const directTemplates = (agency.communicationTemplates ?? []).filter((item: any) =>
      item.isActive !== false &&
      (item.audience ?? 'Lead') === 'Lead' &&
      (item.sequenceType ?? 'Direct') === 'Direct',
    );
    const selectedTemplate = directTemplates.find((item: any) => item.id === automation.directTemplateId) ?? directTemplates[0];
    if (!selectedTemplate) {
      return { sent: 0, skipped: 1, failures: ['No active direct lead automation template is configured.'] };
    }
    const [smtp, communication] = await Promise.all([
      this.settings.getSmtpConfig(),
      this.settings.getCommunicationConfig(),
    ]);
    const failures: string[] = [];
    let sent = 0;
    let skipped = 0;

    const channels = this.channels(automation.channels).filter((kind) =>
      this.channels(selectedTemplate.channels).includes(kind),
    );
    if (channels.length === 0) {
      return { sent: 0, skipped: 1, failures: ['Selected lead automation template has no enabled Email or SMS channel.'] };
    }

    for (const kind of channels) {
      if (kind === 'Email' && (!lead.email || !smtp?.host || !smtp?.username || !smtp?.password)) {
        skipped++;
        continue;
      }
      if (kind === 'Sms' && (!lead.phone || !communication?.supportsSms || !communication?.accountId || !communication?.authToken || !communication?.fromNumber)) {
        skipped++;
        continue;
      }
      const createdBy = `Lead Intake:${lead.id}:${property?.id ?? 'general'}:${selectedTemplate.id}:${kind}`;
      const duplicate = await this.historyRepo.findOne({ where: { leadId: lead.id, createdBy } });
      if (duplicate) {
        skipped++;
        continue;
      }
      try {
        const scheduledAt = this.firstMessageDelayAt(
          agency.firstMessageAutomation?.leadDelayMinutes ??
            agency.firstMessageAutomation?.delayMinutes,
        );
        const result = await this.outreach.sendOutreach({
          attachPropertyDocuments: selectedTemplate.attachPropertyDocuments !== false,
          attachmentDocumentCategory: selectedTemplate.attachmentDocumentCategory,
          attachmentDocumentType: selectedTemplate.attachmentDocumentType,
          attachmentMode: selectedTemplate.attachmentMode,
          createdBy,
          kind,
          leadId: lead.id,
          message: this.render(selectedTemplate.body, lead, agency.profile?.agencyName),
          pdfTemplateId: selectedTemplate.pdfTemplateId,
          scheduledAt: scheduledAt?.toISOString() ?? null,
          templateId: automation.followUpEnabled === false ? undefined : selectedTemplate.id,
          title: this.render(selectedTemplate.subject || selectedTemplate.name, lead, agency.profile?.agencyName),
        });
        if (result.status === 'Failed') failures.push(`${kind}: ${result.summary}`);
        else sent++;
      } catch (error: any) {
        failures.push(`${kind}: ${error?.message ?? 'Delivery failed.'}`);
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

  private render(value: unknown, lead: Lead, agencyName?: string) {
    return `${value ?? ''}`
      .replaceAll('{{client_name}}', lead.name || 'Client')
      .replaceAll('{{property_address}}', lead.property || 'the property')
      .replaceAll('{{agent_name}}', lead.agent || 'our team')
      .replaceAll('{{agency_name}}', agencyName || 'EstateBlue')
      .replaceAll('{{showing_time}}', lead.timeline || 'the requested time')
      .replaceAll('{{closing_date}}', lead.timeline || 'the scheduled date');
  }

  private firstMessageDelayAt(delayMinutes: unknown) {
    const minutes = Math.min(1440, Math.max(0, Number(delayMinutes) || 0));
    return minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null;
  }

  private normalize(value: unknown) {
    return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
}
