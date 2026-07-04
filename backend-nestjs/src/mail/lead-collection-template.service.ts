import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginated, toInt } from '../common/api-contract';
import { Lead } from '../leads/entities/lead.entity';
import { MailInboxItem } from './entities/mail.entity';
import {
  LeadCollectionFieldMapping,
  LeadCollectionSubjectMatchMode,
  LeadCollectionTemplate,
  LeadCollectionTemplateSourceType,
} from './entities/lead-collection-template.entity';
import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  htmlToLeadCollectionText,
  LeadCollectionEmailInput,
  LeadCollectionParseResult,
  normalizeLeadCollectionText,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
  prepareLeadCollectionSource,
} from './lead-collection-parser';

const SAFE_WRITABLE_LEAD_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'summary',
  'property',
  'budget',
  'source',
  'interest',
  'timeline',
  'nextActionType',
]);

const DEFAULT_REQUIRED_FIELDS = ['name', 'email', 'phone', 'property'];

type TemplateDraft = Record<string, unknown> & {
  mappings?: Array<Partial<LeadCollectionFieldMapping>>;
};

@Injectable()
export class LeadCollectionTemplateService {
  private cachedTemplates: LeadCollectionTemplate[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    @InjectRepository(LeadCollectionTemplate)
    private readonly templateRepo: Repository<LeadCollectionTemplate>,
    @InjectRepository(MailInboxItem)
    private readonly mailRepo: Repository<MailInboxItem>,
    private readonly dataSource: DataSource,
  ) {}

  getLeadFields() {
    const columns = this.dataSource.getMetadata(Lead).columns;
    return columns.map((column) => {
      const field = column.propertyName;
      const dataType = this.columnDataType(column.type);
      return {
        field,
        label: this.humanize(field),
        dataType,
        writable: SAFE_WRITABLE_LEAD_FIELDS.has(field),
        suggestedTransform: this.suggestedTransform(field, dataType),
        requiredByDefault: DEFAULT_REQUIRED_FIELDS.includes(field),
      };
    });
  }

  async findAll(
    page = 1,
    pageSize = 20,
    search?: string,
    isActive?: boolean,
  ) {
    page = toInt(page, 1);
    pageSize = Math.min(toInt(pageSize, 20), 200);
    const qb = this.templateRepo.createQueryBuilder('template');
    if (search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.provider_name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    if (typeof isActive === 'boolean') {
      qb.andWhere('template.is_active = :isActive', { isActive });
    }
    const [items, total] = await qb
      .orderBy('template.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginated(items, total, page, pageSize);
  }

  async findOne(id: number) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Lead collection template not found.');
    return template;
  }

  async prepareSource(dto: Record<string, unknown>) {
    const source = await this.resolveSource(dto);
    const sourceText = prepareLeadCollectionSource({
      htmlBody: source.sourceHtml,
      textBody: source.sourceText,
    });
    if (!sourceText) {
      throw new BadRequestException('The selected email or pasted content has no readable text.');
    }
    const senderPatterns = this.inferSenderPatterns(source.sampleFromAddress);
    const subjectPattern = this.inferSubjectPattern(source.sampleSubject);
    return {
      ...source,
      sourceText,
      senderPatterns,
      subjectPattern,
      subjectMatchMode: LeadCollectionSubjectMatchMode.Contains,
      bodyFingerprint: buildLeadCollectionFingerprint(sourceText, []),
    };
  }

  async create(dto: TemplateDraft) {
    const normalized = await this.normalizeTemplate(dto);
    const saved = await this.templateRepo.save(this.templateRepo.create(normalized));
    this.invalidateCache();
    return saved;
  }

  async update(id: number, dto: TemplateDraft) {
    const current = await this.findOne(id);
    const normalized = await this.normalizeTemplate({ ...current, ...dto });
    Object.assign(current, normalized);
    const saved = await this.templateRepo.save(current);
    this.invalidateCache();
    return saved;
  }

  async delete(id: number) {
    const template = await this.findOne(id);
    await this.templateRepo.remove(template);
    this.invalidateCache();
  }

  async test(dto: TemplateDraft & { id?: number }) {
    const source = await this.resolveSource(dto);
    const emailInput: LeadCollectionEmailInput = {
      fromAddress: `${dto.testFromAddress ?? source.sampleFromAddress ?? ''}`.trim(),
      subject: `${dto.testSubject ?? source.sampleSubject ?? ''}`.trim(),
      htmlBody: `${dto.testHtml ?? source.sourceHtml ?? ''}`,
      textBody: `${dto.testText ?? source.sourceText ?? ''}`,
    };

    let template: LeadCollectionTemplate;
    if (dto.id) {
      const existing = await this.findOne(Number(dto.id));
      const normalized = await this.normalizeTemplate({ ...existing, ...dto });
      template = this.templateRepo.create({ ...existing, ...normalized });
    } else {
      const normalized = await this.normalizeTemplate(dto);
      template = this.templateRepo.create(normalized);
    }
    return parseLeadCollectionTemplate(template, emailInput);
  }

  async extractFromEmail(input: LeadCollectionEmailInput) {
    const templates = await this.getActiveTemplates();
    return parseLeadCollectionTemplates(templates, input);
  }

  async recordTemplateResult(result: LeadCollectionParseResult, aiFallbackUsed: boolean) {
    if (!result.templateId) return;
    await this.templateRepo
      .createQueryBuilder()
      .update(LeadCollectionTemplate)
      .set({
        matchCount: () => 'match_count + 1',
        successCount:
          result.confidence >= result.threshold && result.missingRequiredFields.length === 0
            ? () => 'success_count + 1'
            : () => 'success_count',
        aiFallbackCount: aiFallbackUsed
          ? () => 'ai_fallback_count + 1'
          : () => 'ai_fallback_count',
        lastMatchedAt: new Date(),
      })
      .where('id = :id', { id: result.templateId })
      .execute();
    this.invalidateCache();
  }

  isConfident(result: LeadCollectionParseResult) {
    return (
      result.matched &&
      result.confidence >= result.threshold &&
      result.missingRequiredFields.length === 0
    );
  }

  private async normalizeTemplate(dto: TemplateDraft) {
    const name = `${dto.name ?? ''}`.trim();
    if (!name) throw new BadRequestException('Template name is required.');

    const source = await this.resolveSource(dto);
    const sourceText = prepareLeadCollectionSource({
      htmlBody: source.sourceHtml,
      textBody: source.sourceText,
    });
    if (!sourceText) throw new BadRequestException('A sample email is required.');

    const rawMappings = Array.isArray(dto.mappings) ? dto.mappings : [];
    const mappings = buildLeadCollectionMappings(sourceText, rawMappings)
      .filter((mapping) => SAFE_WRITABLE_LEAD_FIELDS.has(mapping.field));
    if (!mappings.length) {
      throw new BadRequestException('Map at least one selected value to a Lead field.');
    }

    const requiredFields = [
      ...new Set([
        ...this.stringArray(dto.requiredFields),
        ...mappings.filter((mapping) => mapping.required).map((mapping) => mapping.field),
      ]),
    ].filter((field) => SAFE_WRITABLE_LEAD_FIELDS.has(field));
    const senderPatterns = this.stringArray(dto.senderPatterns);
    const subjectPattern = `${dto.subjectPattern ?? source.sampleSubject ?? ''}`.trim();
    const subjectMatchMode = Object.values(LeadCollectionSubjectMatchMode).includes(
      dto.subjectMatchMode as LeadCollectionSubjectMatchMode,
    )
      ? (dto.subjectMatchMode as LeadCollectionSubjectMatchMode)
      : LeadCollectionSubjectMatchMode.Contains;
    const sourceType = Object.values(LeadCollectionTemplateSourceType).includes(
      dto.sourceType as LeadCollectionTemplateSourceType,
    )
      ? (dto.sourceType as LeadCollectionTemplateSourceType)
      : source.sourceType;
    const bodyFingerprint = buildLeadCollectionFingerprint(sourceText, mappings);

    return {
      name,
      providerName: `${dto.providerName ?? ''}`.trim(),
      description: `${dto.description ?? ''}`.trim(),
      sourceType,
      sourceMailInboxId: source.sourceMailInboxId,
      sampleFromAddress: source.sampleFromAddress,
      sampleSubject: source.sampleSubject,
      senderPatterns: senderPatterns.length
        ? senderPatterns
        : this.inferSenderPatterns(source.sampleFromAddress),
      subjectPattern: subjectPattern || this.inferSubjectPattern(source.sampleSubject),
      subjectMatchMode,
      bodyFingerprint,
      sourceHtml: source.sourceHtml,
      sourceText,
      mappings,
      requiredFields,
      confidenceThreshold: this.clampNumber(dto.confidenceThreshold, 0.82, 0.5, 0.99),
      isActive: dto.isActive === undefined ? true : Boolean(dto.isActive),
      matchCount: Math.max(0, Number(dto.matchCount ?? 0)),
      successCount: Math.max(0, Number(dto.successCount ?? 0)),
      aiFallbackCount: Math.max(0, Number(dto.aiFallbackCount ?? 0)),
      lastMatchedAt: dto.lastMatchedAt ? new Date(`${dto.lastMatchedAt}`) : null,
    };
  }

  private async resolveSource(dto: Record<string, unknown>) {
    const sourceMailInboxId = Number(dto.sourceMailInboxId ?? 0) || null;
    if (sourceMailInboxId) {
      const mail = await this.mailRepo.findOne({ where: { id: sourceMailInboxId } });
      if (!mail) throw new NotFoundException('Source inbox email not found.');
      return {
        sourceType: LeadCollectionTemplateSourceType.InboxEmail,
        sourceMailInboxId,
        sourceHtml: mail.htmlBody ?? '',
        sourceText: mail.message ?? '',
        sampleFromAddress: mail.email ?? '',
        sampleSubject: mail.subject ?? '',
      };
    }

    const sourceHtml = `${dto.sourceHtml ?? ''}`;
    const sourceText = `${dto.sourceText ?? ''}`;
    const sourceType = Object.values(LeadCollectionTemplateSourceType).includes(
      dto.sourceType as LeadCollectionTemplateSourceType,
    )
      ? (dto.sourceType as LeadCollectionTemplateSourceType)
      : sourceHtml
        ? LeadCollectionTemplateSourceType.PastedHtml
        : LeadCollectionTemplateSourceType.PastedText;
    return {
      sourceType,
      sourceMailInboxId: null,
      sourceHtml,
      sourceText: sourceText || (sourceHtml ? htmlToLeadCollectionText(sourceHtml) : ''),
      sampleFromAddress: `${dto.sampleFromAddress ?? ''}`.trim().toLowerCase(),
      sampleSubject: `${dto.sampleSubject ?? ''}`.trim(),
    };
  }

  private async getActiveTemplates() {
    if (this.cachedTemplates && Date.now() < this.cacheExpiresAt) {
      return this.cachedTemplates;
    }
    this.cachedTemplates = await this.templateRepo.find({
      where: { isActive: true },
      order: { successCount: 'DESC', updatedAt: 'DESC' },
    });
    this.cacheExpiresAt = Date.now() + 60_000;
    return this.cachedTemplates;
  }

  private invalidateCache() {
    this.cachedTemplates = null;
    this.cacheExpiresAt = 0;
  }

  private inferSenderPatterns(fromAddress: string) {
    const address = `${fromAddress ?? ''}`.trim().toLowerCase();
    if (!address) return [];
    const domain = address.split('@')[1];
    return [...new Set([address, domain ? `@${domain}` : ''].filter(Boolean))];
  }

  private inferSubjectPattern(subject: string) {
    return normalizeLeadCollectionText(subject)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
      .replace(/\b\d[\d,.$-]*\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
  }

  private stringArray(value: unknown) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        value = Array.isArray(parsed) ? parsed : String(value).split(',');
      } catch {
        value = String(value).split(',');
      }
    }
    return [
      ...new Set(
        (Array.isArray(value) ? value : [])
          .map((item) => `${item ?? ''}`.trim())
          .filter(Boolean),
      ),
    ];
  }

  private columnDataType(type: unknown) {
    const value = `${type}`.toLowerCase();
    if (value.includes('bool')) return 'boolean';
    if (value.includes('date') || value.includes('time')) return 'date';
    if (value.includes('int') || value.includes('number') || value.includes('decimal')) {
      return 'number';
    }
    if (value.includes('json') || value.includes('array')) return 'list';
    return 'text';
  }

  private suggestedTransform(field: string, dataType: string) {
    if (field.toLowerCase().includes('email')) return 'Email';
    if (field.toLowerCase().includes('phone')) return 'Phone';
    if (dataType === 'number') return 'Number';
    if (dataType === 'date') return 'Date';
    return 'Text';
  }

  private humanize(value: string) {
    return `${value ?? ''}`
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim();
  }

  private clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }
}
