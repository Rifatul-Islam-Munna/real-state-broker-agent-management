import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  LeadCollectionSubjectMatchMode,
  LeadCollectionTemplate,
} from './entities/lead-collection-template.entity';
import { MailInboxItem } from './entities/mail.entity';
import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  parseLeadCollectionTemplate,
  prepareLeadCollectionSource,
} from './lead-collection-parser';
import { ConfigurableLeadCollectionTemplateService } from './configurable-lead-collection-template.service';
import { enrichEmailWithLinkedPage } from './linked-page-loader';

@Injectable()
export class ProviderLeadCollectionTemplateService extends ConfigurableLeadCollectionTemplateService {
  constructor(
    @InjectRepository(LeadCollectionTemplate)
    private readonly providerTemplateRepo: Repository<LeadCollectionTemplate>,
    @InjectRepository(MailInboxItem)
    mailRepo: Repository<MailInboxItem>,
    dataSource: DataSource,
  ) {
    super(providerTemplateRepo, mailRepo, dataSource);
  }

  override async test(dto: any) {
    const prepared = await this.prepareSource(dto);
    const input = {
      fromAddress: `${dto.testFromAddress ?? prepared.sampleFromAddress ?? ''}`.trim(),
      subject: `${dto.testSubject ?? prepared.sampleSubject ?? ''}`.trim(),
      htmlBody: `${dto.testHtml ?? prepared.sourceHtml ?? ''}`,
      textBody: `${dto.testText ?? prepared.sourceText ?? ''}`,
    };
    const effectiveInput = prepared.linkedPageSourceText
      ? enrichEmailWithLinkedPage(input, {
          url: prepared.linkedPageSampleUrl,
          html: prepared.linkedPageSourceHtml,
          text: prepared.linkedPageSourceText,
        })
      : input;
    const sourceText = prepareLeadCollectionSource(effectiveInput);
    const mappings = buildLeadCollectionMappings(sourceText, dto.mappings ?? []);
    if (!mappings.length) {
      throw new BadRequestException('Map at least one selected value to a Lead field.');
    }
    const mappedFields = new Set(mappings.map((mapping) => mapping.field));
    const requiredFields = [
      ...new Set([
        ...(Array.isArray(dto.requiredFields) ? dto.requiredFields : []).filter((field) => mappedFields.has(field)),
        ...mappings.filter((mapping) => mapping.required).map((mapping) => mapping.field),
      ]),
    ];
    const subjectMatchMode = Object.values(LeadCollectionSubjectMatchMode).includes(
      dto.subjectMatchMode as LeadCollectionSubjectMatchMode,
    )
      ? dto.subjectMatchMode as LeadCollectionSubjectMatchMode
      : LeadCollectionSubjectMatchMode.Contains;
    const template = this.providerTemplateRepo.create({
      id: Number(dto.id ?? 0) || undefined,
      name: `${dto.name ?? 'Template test'}`,
      providerName: `${dto.providerName ?? ''}`,
      description: `${dto.description ?? ''}`,
      sourceType: prepared.sourceType,
      sourceMailInboxId: prepared.sourceMailInboxId ?? null,
      sampleFromAddress: prepared.sampleFromAddress,
      sampleSubject: prepared.sampleSubject,
      senderPatterns: Array.isArray(dto.senderPatterns) ? dto.senderPatterns : prepared.senderPatterns,
      subjectPattern: `${dto.subjectPattern ?? prepared.subjectPattern ?? ''}`,
      subjectMatchMode,
      bodyFingerprint: buildLeadCollectionFingerprint(prepared.sourceText, mappings),
      sourceHtml: prepared.sourceHtml,
      sourceText: prepared.sourceText,
      linkedPageConfig: prepared.linkedPageConfig,
      linkedPageSampleUrl: prepared.linkedPageSampleUrl,
      linkedPageSourceHtml: prepared.linkedPageSourceHtml,
      linkedPageSourceText: prepared.linkedPageSourceText,
      mappings,
      requiredFields,
      confidenceThreshold: Math.min(0.99, Math.max(0.5, Number(dto.confidenceThreshold ?? 0.82))),
      isActive: dto.isActive !== false,
    });
    const result = parseLeadCollectionTemplate(template, effectiveInput);
    if (prepared.linkedPageSourceText) {
      this.pruneUnmappedValuesWhenManual(result, template);
      this.applyGenericLinkedFallbacks(result, template, prepared.linkedPageSourceText);
    }
    return result;
  }
}
