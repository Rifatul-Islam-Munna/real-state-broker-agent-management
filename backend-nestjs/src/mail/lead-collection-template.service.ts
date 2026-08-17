import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
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
  'creditScore',
  'combinedCreditScore',
  'monthlyEarning',
  'combinedMonthlyEarning',
  'source',
  'interest',
  'timeline',
  'nextActionType',
]);

const DEFAULT_REQUIRED_FIELDS = ['name', 'phone'];
const LINKED_PAGE_MAX_BYTES = 1_500_000;
const LINKED_PAGE_TIMEOUT_MS = 8_000;
const ZILLOW_HOST = /(^|\.)zillow\.com$/i;

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

type TemplateDraft = Record<string, unknown> & {
  mappings?: Array<Partial<LeadCollectionFieldMapping>>;
};

type LinkedPageResult = {
  url: string;
  text: string;
};

@Injectable()
export class LeadCollectionTemplateService {
  private readonly logger = new Logger(LeadCollectionTemplateService.name);
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
    return this.parseTemplateWithLinkedPage(template, emailInput);
  }

  async extractFromEmail(input: LeadCollectionEmailInput) {
    const templates = this.templatesForMailboxTag(await this.getActiveTemplates(), input.mailboxTag);
    const initial = parseLeadCollectionTemplates(templates, input);
    initial.scopeMatched = templates.length > 0;
    if (!initial.templateId) return initial;
    const template = templates.find((item) => item.id === initial.templateId);
    if (!template) return initial;
    return this.parseTemplateWithLinkedPage(template, input, initial);
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

  private async parseTemplateWithLinkedPage(
    template: LeadCollectionTemplate,
    input: LeadCollectionEmailInput,
    initial?: LeadCollectionParseResult,
  ) {
    const base = initial ?? parseLeadCollectionTemplate(template, input);
    if (!this.isZillowTemplate(template, input)) return base;

    const linked = await this.fetchBestLinkedLeadPage(input);
    if (!linked) {
      base.diagnostics.push('linked-page: no safe Zillow detail link could be loaded');
      return base;
    }

    const linkedBlock = `\n\nLinked Zillow detail page (${linked.url})\n${linked.text}`;
    const enrichedInput: LeadCollectionEmailInput = {
      ...input,
      htmlBody: input.htmlBody
        ? `${input.htmlBody}<section data-lead-linked-page="true"><pre>${this.escapeHtml(linkedBlock)}</pre></section>`
        : '',
      textBody: `${input.textBody ?? ''}${linkedBlock}`,
    };
    const result = parseLeadCollectionTemplate(template, enrichedInput);
    this.applyLinkedPageFallbacks(result, template, linked);
    result.diagnostics.unshift(`linked-page: enriched from ${linked.url}`);
    return result;
  }

  private applyLinkedPageFallbacks(
    result: LeadCollectionParseResult,
    template: LeadCollectionTemplate,
    linked: LinkedPageResult,
  ) {
    const before = new Set(Object.keys(result.values));
    const text = normalizeLeadCollectionText(linked.text);
    if (!result.values.name) {
      const name = this.firstLabeledValue(text, [
        'contact name',
        'lead name',
        'prospect name',
        'consumer name',
        'name',
      ]);
      if (name && !this.looksLikeSystemName(name)) result.values.name = name;
    }
    if (!result.values.phone) {
      const phone = this.firstPhone(text);
      if (phone) result.values.phone = phone;
    }
    if (!result.values.email && this.fieldRequested(template, 'email')) {
      const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
      if (email) result.values.email = email.toLowerCase();
    }
    if (!result.values.property && this.fieldRequested(template, 'property')) {
      const property = this.firstLabeledValue(text, [
        'property address',
        'listing address',
        'property',
        'listing',
        'address',
      ]);
      if (property) result.values.property = property;
    }

    const requiredFields = [
      ...new Set([
        ...(template.requiredFields ?? []),
        ...(template.mappings ?? [])
          .filter((mapping) => mapping.required)
          .map((mapping) => mapping.field),
      ]),
    ];
    result.missingRequiredFields = requiredFields.filter(
      (field) => !`${result.values[field] ?? ''}`.trim(),
    );
    result.extractedFields = Object.keys(result.values);
    const added = result.extractedFields.filter((field) => !before.has(field));
    if (added.length) {
      result.confidence = this.roundScore(
        Math.min(0.99, Math.max(result.confidence, result.confidence + added.length * 0.07)),
      );
      result.diagnostics.push(`linked-page: recovered ${added.join(', ')}`);
    }
  }

  private isZillowTemplate(
    template: LeadCollectionTemplate,
    input: LeadCollectionEmailInput,
  ) {
    const haystack = [
      template.name,
      template.providerName,
      ...(template.senderPatterns ?? []),
      input.fromAddress,
      input.subject,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes('zillow') || haystack.includes('zillow.com');
  }

  private async fetchBestLinkedLeadPage(
    input: LeadCollectionEmailInput,
  ): Promise<LinkedPageResult | null> {
    const links = this.extractZillowLinks(input)
      .sort((left, right) => this.linkScore(right) - this.linkScore(left))
      .slice(0, 3);

    for (const url of links) {
      try {
        const page = await this.fetchLinkedPage(url);
        if (page?.text && (this.firstPhone(page.text) || this.firstLabeledValue(page.text, ['name', 'contact name', 'lead name']))) {
          return page;
        }
      } catch (error) {
        this.logger.debug(`Zillow linked-page enrichment skipped ${url}: ${this.errorMessage(error)}`);
      }
    }
    return null;
  }

  private extractZillowLinks(input: LeadCollectionEmailInput) {
    const values: string[] = [];
    const html = `${input.htmlBody ?? ''}`;
    for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
      values.push(this.decodeBasicEntities(match[1]));
    }
    const plain = `${input.textBody ?? ''}\n${htmlToLeadCollectionText(html)}`;
    for (const match of plain.matchAll(/https:\/\/[^\s<>"')\]]+/gi)) {
      values.push(this.decodeBasicEntities(match[0]));
    }

    return [...new Set(values)]
      .map((value) => {
        try {
          return new URL(value).toString();
        } catch {
          return '';
        }
      })
      .filter(Boolean)
      .filter((value) => {
        const url = new URL(value);
        return (
          url.protocol === 'https:' &&
          ZILLOW_HOST.test(url.hostname) &&
          !/(unsubscribe|preferences|privacy|terms|support|help|static|image|logo)/i.test(
            `${url.pathname} ${url.search}`,
          )
        );
      });
  }

  private linkScore(value: string) {
    const text = value.toLowerCase();
    let score = 0;
    if (/(lead|contact|consumer|inquiry|message|detail|prospect)/.test(text)) score += 8;
    if (/(premier|agent|rental|showing)/.test(text)) score += 4;
    if (/click\./.test(text)) score += 1;
    if (/(unsubscribe|privacy|terms)/.test(text)) score -= 20;
    return score;
  }

  private async fetchLinkedPage(value: string): Promise<LinkedPageResult | null> {
    const url = new URL(value);
    await this.assertSafeZillowUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LINKED_PAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8',
          'Accept-Language': 'en-US,en;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (compatible; RealEstateLeadEnricher/1.0; +https://example.invalid/bot)',
        },
      });
      if (!response.ok) return null;
      const finalUrl = new URL(response.url || url.toString());
      await this.assertSafeZillowUrl(finalUrl);
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > LINKED_PAGE_MAX_BYTES) return null;
      const raw = await this.readLimitedBody(response, LINKED_PAGE_MAX_BYTES);
      const contentType = `${response.headers.get('content-type') ?? ''}`.toLowerCase();
      const visible = contentType.includes('html')
        ? htmlToLeadCollectionText(raw)
        : normalizeLeadCollectionText(raw);
      const structured = contentType.includes('html')
        ? this.extractStructuredLeadText(raw)
        : '';
      const text = normalizeLeadCollectionText(`${structured}\n${visible}`).slice(0, 16_000);
      return text ? { url: finalUrl.toString(), text } : null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async assertSafeZillowUrl(url: URL) {
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('Only credential-free HTTPS links are allowed.');
    }
    if (!ZILLOW_HOST.test(url.hostname) || isIP(url.hostname)) {
      throw new Error('Linked page is outside the approved Zillow domain.');
    }
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((item) => this.isPrivateAddress(item.address))) {
      throw new Error('Linked page resolved to a private or unavailable address.');
    }
  }

  private isPrivateAddress(address: string) {
    if (address === '::1' || address === '::' || address.toLowerCase().startsWith('fe80:')) {
      return true;
    }
    if (address.toLowerCase().startsWith('fc') || address.toLowerCase().startsWith('fd')) {
      return true;
    }
    return PRIVATE_IPV4.some((pattern) => pattern.test(address));
  }

  private async readLimitedBody(response: Response, maxBytes: number) {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('Linked page exceeded the response-size limit.');
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder('utf-8').decode(merged);
  }

  private extractStructuredLeadText(html: string) {
    const lines: string[] = [];
    const scriptPattern = /<script\b[^>]*(?:type=["'](?:application\/ld\+json|application\/json)["']|id=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/gi;
    for (const match of html.matchAll(scriptPattern)) {
      const raw = this.decodeBasicEntities(match[1]).trim();
      if (!raw || raw.length > 500_000) continue;
      try {
        this.flattenStructuredValue(JSON.parse(raw), lines, 0);
      } catch {
        continue;
      }
    }
    for (const match of html.matchAll(/["'](?:name|fullName|contactName|phone|telephone|email|streetAddress|address)["']\s*:\s*["']([^"']{2,180})["']/gi)) {
      lines.push(`${match[0].split(':')[0].replace(/["']/g, '')}: ${this.decodeBasicEntities(match[1])}`);
    }
    return normalizeLeadCollectionText(lines.join('\n')).slice(0, 8_000);
  }

  private flattenStructuredValue(value: unknown, lines: string[], depth: number) {
    if (depth > 7 || lines.length >= 180 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.slice(0, 40).forEach((item) => this.flattenStructuredValue(item, lines, depth + 1));
      return;
    }
    if (typeof value !== 'object') return;
    const relevant = /^(name|fullName|contactName|givenName|familyName|phone|telephone|email|streetAddress|address|addressLocality|postalCode)$/i;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (typeof child === 'string' && relevant.test(key) && child.trim()) {
        lines.push(`${key}: ${child.trim()}`);
      } else if (typeof child === 'object') {
        this.flattenStructuredValue(child, lines, depth + 1);
      }
    }
  }

  private firstLabeledValue(text: string, labels: string[]) {
    for (const label of labels) {
      const pattern = new RegExp(
        `(?:^|\\n)\\s*${this.escapeRegExp(label)}\\s*[:|\\-–—]\\s*([^\\n]{2,180})`,
        'i',
      );
      const value = text.match(pattern)?.[1]?.trim();
      if (value) return value.replace(/\s+/g, ' ').slice(0, 180);
    }
    return '';
  }

  private firstPhone(value: string) {
    const candidates = value.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) ?? [];
    return (
      candidates
        .map((candidate) => candidate.trim())
        .find((candidate) => {
          const digits = candidate.replace(/\D/g, '');
          return digits.length >= 7 && digits.length <= 15;
        }) ?? ''
    );
  }

  private looksLikeSystemName(value: string) {
    return /^(zillow|contact|lead|prospect|consumer|inquiry|property|listing|unknown|not provided)$/i.test(
      value.trim(),
    );
  }

  private decodeBasicEntities(value: string) {
    return `${value ?? ''}`
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private roundScore(value: number) {
    return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : `${error}`;
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

    const mappedFields = new Set(mappings.map((mapping) => mapping.field));
    const requiredFields = [
      ...new Set([
        ...this.stringArray(dto.requiredFields).filter((field) => mappedFields.has(field)),
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
      mailboxTags: this.stringArray(dto.mailboxTags),
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

  protected fieldRequested(template: LeadCollectionTemplate, field: string) {
    return (template.requiredFields ?? []).includes(field)
      || (template.mappings ?? []).some((mapping) => mapping.field === field);
  }

  private templatesForMailboxTag(templates: LeadCollectionTemplate[], mailboxTag?: string) {
    const tag = `${mailboxTag ?? ''}`.trim().toLowerCase();
    return templates.filter((template) => {
      const tags = this.stringArray(template.mailboxTags).map((item) => item.toLowerCase());
      return !tags.length || (!!tag && tags.includes(tag));
    });
  }

  private invalidateCache() {
    this.cachedTemplates = null;
    this.cacheExpiresAt = 0;
  }

  private inferSenderPatterns(fromAddress: string) {
    const address = `${fromAddress ?? ''}`.trim().toLowerCase();
    if (!address) return [];
    const domain = address.split('@')[1];
    const rootDomain = domain?.split('.').slice(-2).join('.');
    return [...new Set([
      address,
      domain ? `@${domain}` : '',
      domain ? `*@${domain}` : '',
      rootDomain && rootDomain !== domain ? `*@${rootDomain}` : '',
      rootDomain && rootDomain !== domain ? `@${rootDomain}` : '',
    ].filter(Boolean))];
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
    const normalizedField = field.toLowerCase();
    if (normalizedField.includes('email')) return 'Email';
    if (normalizedField.includes('phone')) return 'Phone';
    if (normalizedField.includes('creditscore') || normalizedField.includes('credit_score')) return 'CreditScore';
    if (normalizedField.includes('earning')) return 'Number';
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
