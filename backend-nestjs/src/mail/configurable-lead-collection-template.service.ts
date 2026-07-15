import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  LeadCollectionLinkedPageConfig,
  LeadCollectionTemplate,
  LeadCollectionTemplateSourceType,
} from './entities/lead-collection-template.entity';
import { MailInboxItem } from './entities/mail.entity';
import {
  buildLeadCollectionFingerprint,
  LeadCollectionEmailInput,
  LeadCollectionParseResult,
  normalizeLeadCollectionText,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
} from './lead-collection-parser';
import { LeadCollectionTemplateService } from './lead-collection-template.service';
import {
  linkedPageHostAllowed,
  normalizeLinkedPageConfig,
} from './linked-page-config';
import {
  enrichEmailWithLinkedPage,
  LinkedPageResult,
  loadConfiguredLinkedPage,
} from './linked-page-loader';

@Injectable()
export class ConfigurableLeadCollectionTemplateService extends LeadCollectionTemplateService {
  constructor(
    @InjectRepository(LeadCollectionTemplate)
    private readonly configurableTemplateRepo: Repository<LeadCollectionTemplate>,
    @InjectRepository(MailInboxItem)
    mailRepo: Repository<MailInboxItem>,
    dataSource: DataSource,
  ) {
    super(configurableTemplateRepo, mailRepo, dataSource);
  }

  override async prepareSource(dto: Record<string, unknown>) {
    const prepared = await super.prepareSource(dto);
    const config = normalizeLinkedPageConfig(dto.linkedPageConfig);
    this.validateConfig(config);
    const linked = config.enabled
      ? await this.resolveLinkedSample(dto, this.toInput(prepared), config)
      : null;
    return {
      ...prepared,
      linkedPageConfig: config,
      linkedPageSampleUrl: linked?.url ?? '',
      linkedPageSourceHtml: linked?.html ?? '',
      linkedPageSourceText: linked?.text ?? '',
      linkedPageStatus: config.enabled
        ? linked
          ? 'Loaded'
          : 'No matching public link could be loaded'
        : 'Disabled',
    };
  }

  override async create(dto: any) {
    const draft = await this.prepareDraft(dto);
    const saved = await super.create(draft.transformed);
    return this.restoreOriginalSample(saved, draft);
  }

  override async update(id: number, dto: any) {
    const draft = await this.prepareDraft(dto);
    const saved = await super.update(id, draft.transformed);
    return this.restoreOriginalSample(saved, draft);
  }

  override async test(dto: any) {
    const draft = await this.prepareDraft(dto);
    return super.test(draft.transformed);
  }

  override async extractFromEmail(input: LeadCollectionEmailInput) {
    const templates = await this.configurableTemplateRepo.find({
      where: { isActive: true },
      order: { successCount: 'DESC', updatedAt: 'DESC' },
    });
    const initial = parseLeadCollectionTemplates(templates, input);
    if (!initial.templateId) return initial;
    const template = templates.find((item) => item.id === initial.templateId);
    if (!template) return initial;

    const config = normalizeLinkedPageConfig(template.linkedPageConfig);
    if (!config.enabled) return initial;
    const linked = await loadConfiguredLinkedPage(input, config).catch(() => null);
    if (!linked) {
      initial.diagnostics.push('linked-page: no configured public detail link could be loaded');
      return initial;
    }

    const result = parseLeadCollectionTemplate(
      template,
      enrichEmailWithLinkedPage(input, linked),
    );
    this.pruneUnmappedValuesWhenManual(result, template);
    this.applyGenericLinkedFallbacks(result, template, linked.text);
    result.diagnostics.unshift(`linked-page: enriched from ${linked.url}`);
    return result;
  }

  private async prepareDraft(dto: any) {
    const prepared = await super.prepareSource(dto);
    const config = normalizeLinkedPageConfig(dto.linkedPageConfig);
    this.validateConfig(config);
    const input = this.toInput(prepared);
    const linked = config.enabled
      ? await this.resolveLinkedSample(dto, input, config)
      : null;
    if (config.enabled && !linked) {
      throw new BadRequestException(
        'The linked detail page could not be loaded. Check the allowed host and link filters, then prepare the sample again.',
      );
    }

    const enriched = linked ? enrichEmailWithLinkedPage(input, linked) : input;
    return {
      prepared,
      config,
      linked,
      transformed: {
        ...dto,
        sourceType: enriched.htmlBody
          ? LeadCollectionTemplateSourceType.PastedHtml
          : LeadCollectionTemplateSourceType.PastedText,
        sourceMailInboxId: null,
        sourceHtml: enriched.htmlBody ?? '',
        sourceText: enriched.textBody ?? '',
        sampleFromAddress: prepared.sampleFromAddress,
        sampleSubject: prepared.sampleSubject,
        linkedPageConfig: config,
        linkedPageSampleUrl: linked?.url ?? '',
        linkedPageSourceHtml: linked?.html ?? '',
        linkedPageSourceText: linked?.text ?? '',
      },
    };
  }

  private async restoreOriginalSample(
    saved: LeadCollectionTemplate,
    draft: {
      prepared: any;
      config: LeadCollectionLinkedPageConfig;
      linked: LinkedPageResult | null;
    },
  ) {
    saved.sourceType = draft.prepared.sourceType;
    saved.sourceMailInboxId = draft.prepared.sourceMailInboxId ?? null;
    saved.sourceHtml = draft.prepared.sourceHtml ?? '';
    saved.sourceText = draft.prepared.sourceText ?? '';
    saved.bodyFingerprint = buildLeadCollectionFingerprint(saved.sourceText, saved.mappings);
    saved.linkedPageConfig = draft.config;
    saved.linkedPageSampleUrl = draft.linked?.url ?? '';
    saved.linkedPageSourceHtml = draft.linked?.html ?? '';
    saved.linkedPageSourceText = draft.linked?.text ?? '';
    return this.configurableTemplateRepo.save(saved);
  }

  private async resolveLinkedSample(
    dto: Record<string, unknown>,
    input: LeadCollectionEmailInput,
    config: LeadCollectionLinkedPageConfig,
  ) {
    const savedUrl = `${dto.linkedPageSampleUrl ?? ''}`.trim();
    const savedText = `${dto.linkedPageSourceText ?? ''}`.trim();
    if (savedUrl && savedText) {
      try {
        if (linkedPageHostAllowed(new URL(savedUrl).hostname, config.allowedHosts)) {
          return {
            url: savedUrl,
            html: `${dto.linkedPageSourceHtml ?? ''}`,
            text: savedText,
          } satisfies LinkedPageResult;
        }
      } catch {
        // Try the link in the current sample email instead.
      }
    }
    return loadConfiguredLinkedPage(input, config).catch(() => null);
  }

  private validateConfig(config: LeadCollectionLinkedPageConfig) {
    if (config.enabled && !config.allowedHosts.length) {
      throw new BadRequestException(
        'Add at least one allowed website host, such as *.zillow.com.',
      );
    }
  }

  private toInput(prepared: any): LeadCollectionEmailInput {
    return {
      fromAddress: prepared.sampleFromAddress ?? '',
      subject: prepared.sampleSubject ?? '',
      htmlBody: prepared.sourceHtml ?? '',
      textBody: prepared.sourceText ?? '',
    };
  }

  protected applyGenericLinkedFallbacks(
    result: LeadCollectionParseResult,
    template: LeadCollectionTemplate,
    linkedText: string,
  ) {
    if (template.linkedPageConfig?.autoFillContactFields === false) return;
    const before = new Set(Object.keys(result.values));
    const text = normalizeLeadCollectionText(linkedText);
    if (!result.values.name) {
      const name = this.labeledValue(text, [
        'contact name', 'lead name', 'prospect name', 'consumer name', 'full name', 'name',
      ]);
      if (name && !/^(contact|lead|prospect|consumer|unknown)$/i.test(name)) {
        result.values.name = name;
      }
    }
    if (!result.values.phone) {
      const phone = (text.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) ?? [])
        .map((item) => item.trim())
        .find((item) => {
          const digits = item.replace(/\D/g, '');
          return digits.length >= 7 && digits.length <= 15;
        });
      if (phone) result.values.phone = phone;
    }
    if (!result.values.email && this.fieldRequested(template, 'email')) {
      const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
      if (email) result.values.email = email.toLowerCase();
    }
    if (!result.values.property && this.fieldRequested(template, 'property')) {
      const property = this.labeledValue(text, [
        'property address', 'listing address', 'street address', 'property', 'address',
      ]);
      if (property) result.values.property = property;
    }

    const required = [
      ...new Set([
        ...(template.requiredFields ?? []),
        ...(template.mappings ?? []).filter((item) => item.required).map((item) => item.field),
      ]),
    ];
    result.missingRequiredFields = required.filter(
      (field) => !`${result.values[field] ?? ''}`.trim(),
    );
    result.extractedFields = Object.keys(result.values);
    const added = result.extractedFields.filter((field) => !before.has(field));
    if (added.length) {
      result.confidence = Math.min(0.99, result.confidence + added.length * 0.07);
      result.diagnostics.push(`linked-page: recovered ${added.join(', ')}`);
    }
  }

  protected pruneUnmappedValuesWhenManual(
    result: LeadCollectionParseResult,
    template: LeadCollectionTemplate,
  ) {
    if (template.linkedPageConfig?.autoFillContactFields !== false) return;
    const mappedFields = new Set((template.mappings ?? []).map((item) => item.field));
    for (const field of Object.keys(result.values)) {
      if (!mappedFields.has(field)) delete result.values[field];
    }
    result.extractedFields = Object.keys(result.values);
    const required = [
      ...new Set([
        ...(template.requiredFields ?? []),
        ...(template.mappings ?? []).filter((item) => item.required).map((item) => item.field),
      ]),
    ];
    result.missingRequiredFields = required.filter(
      (field) => !`${result.values[field] ?? ''}`.trim(),
    );
  }

  private labeledValue(text: string, labels: string[]) {
    for (const label of labels) {
      const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const value = text.match(
        new RegExp(`(?:^|\\n)\\s*${safe}\\s*[:|\\-–—]\\s*([^\\n]{2,180})`, 'i'),
      )?.[1]?.trim();
      if (value) return value.replace(/\s+/g, ' ').slice(0, 180);
    }
    return '';
  }
}
