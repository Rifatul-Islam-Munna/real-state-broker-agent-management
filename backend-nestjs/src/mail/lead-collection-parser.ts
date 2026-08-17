import type {
  LeadCollectionFieldMapping,
  LeadCollectionFieldTransform,
} from './entities/lead-collection-template.entity';

export type LeadCollectionEmailInput = {
  fromAddress: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  mailboxTag?: string;
};

export type LeadCollectionTemplateLike = {
  id?: number;
  name: string;
  senderPatterns: string[];
  mailboxTags?: string[];
  subjectPattern: string;
  subjectMatchMode: string;
  bodyFingerprint: string[];
  mappings: LeadCollectionFieldMapping[];
  requiredFields: string[];
  confidenceThreshold: number;
};

export type LeadCollectionParseResult = {
  matched: boolean;
  templateId: number | null;
  templateName: string;
  matchScore: number;
  confidence: number;
  threshold: number;
  values: Record<string, string>;
  missingRequiredFields: string[];
  extractedFields: string[];
  diagnostics: string[];
  scopeMatched?: boolean;
};

const BLOCK_TAGS = [
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
];

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export function normalizeLeadCollectionText(value: unknown) {
  return `${value ?? ''}`
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function htmlToLeadCollectionText(html: unknown) {
  let value = `${html ?? ''}`;
  value = value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n');

  for (const tag of BLOCK_TAGS) {
    value = value.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '\n');
  }

  value = value.replace(/<[^>]+>/g, ' ');
  value = decodeHtmlEntities(value);
  return normalizeLeadCollectionText(value);
}

export function prepareLeadCollectionSource(input: {
  htmlBody?: string;
  textBody?: string;
}) {
  const fromHtml = input.htmlBody ? htmlToLeadCollectionText(input.htmlBody) : '';
  return normalizeLeadCollectionText(fromHtml || input.textBody || '');
}

export function buildLeadCollectionMappings(
  sourceText: string,
  mappings: Array<Partial<LeadCollectionFieldMapping>>,
): LeadCollectionFieldMapping[] {
  const text = normalizeLeadCollectionText(sourceText);
  const sourceParts = splitLeadCollectionSources(text);
  return mappings
    .map<LeadCollectionFieldMapping | null>((mapping, index) => {
      const field = `${mapping.field ?? ''}`.trim();
      const sampleValue = normalizeLeadCollectionText(mapping.sampleValue ?? '');
      if (!field || !sampleValue) return null;
      const source = mapping.source === 'LinkedPage' ? 'LinkedPage' : 'EmailBody';
      const mappingText = source === 'LinkedPage'
        ? sourceParts.linkedText || text
        : sourceParts.emailText;

      let selectionStart = finiteInt(mapping.selectionStart, -1);
      let selectionEnd = finiteInt(mapping.selectionEnd, -1);
      const selected =
        selectionStart >= 0 && selectionEnd > selectionStart
          ? normalizeLeadCollectionText(mappingText.slice(selectionStart, selectionEnd))
          : '';
      if (!selected || selected !== sampleValue) {
        const occurrence = Math.max(0, finiteInt(mapping.occurrence, 0));
        selectionStart = findOccurrence(mappingText, sampleValue, occurrence);
        selectionEnd = selectionStart >= 0 ? selectionStart + sampleValue.length : -1;
      }
      const prefix = `${mapping.prefix ?? ''}`.trim()
        ? normalizeLeadCollectionText(mapping.prefix)
        : selectionStart >= 0
          ? buildPrefixAnchor(mappingText, selectionStart)
          : '';
      const suffix = `${mapping.suffix ?? ''}`.trim()
        ? normalizeLeadCollectionText(mapping.suffix)
        : selectionEnd > selectionStart
          ? buildSuffixAnchor(mappingText, selectionEnd)
          : '';
      const transform = normalizeTransform(mapping.transform, field);
      const foundSelection = selectionStart >= 0 && selectionEnd > selectionStart;
      const fallbackStart = Math.max(0, finiteInt(mapping.selectionStart, 0));
      const fallbackEnd = Math.max(
        fallbackStart + sampleValue.length,
        finiteInt(mapping.selectionEnd, fallbackStart + sampleValue.length),
      );

      return {
        field,
        label: `${mapping.label ?? humanize(field)}`.trim() || humanize(field),
        source,
        sampleValue,
        selectionStart: foundSelection ? selectionStart : fallbackStart,
        selectionEnd: foundSelection ? selectionEnd : fallbackEnd,
        prefix,
        suffix,
        occurrence: Math.max(0, finiteInt(mapping.occurrence, index)),
        required: mapping.required === true,
        transform,
      } satisfies LeadCollectionFieldMapping;
    })
    .filter((mapping): mapping is LeadCollectionFieldMapping => Boolean(mapping));
}

export function buildLeadCollectionFingerprint(
  sourceText: string,
  mappings: LeadCollectionFieldMapping[],
) {
  let staticText = normalizeLeadCollectionText(sourceText);
  for (const mapping of mappings) {
    if (!mapping.sampleValue) continue;
    staticText = replaceAllCaseInsensitive(staticText, mapping.sampleValue, ' ');
  }

  const lines = staticText
    .split('\n')
    .map((line) => normalizeMatchText(line))
    .filter((line) => line.length >= 3 && line.length <= 120)
    .filter((line) => /[a-z0-9]/i.test(line))
    .filter((line) => !looksMostlyDynamic(line));

  return [...new Set(lines)]
    .sort((a, b) => fingerprintWeight(b) - fingerprintWeight(a))
    .slice(0, 14);
}

export function parseLeadCollectionTemplates(
  templates: LeadCollectionTemplateLike[],
  input: LeadCollectionEmailInput,
) {
  const text = prepareLeadCollectionSource({
    htmlBody: input.htmlBody,
    textBody: input.textBody,
  });
  const ranked = templates
    .map((template) => ({
      template,
      score: scoreLeadCollectionTemplate(template, input, text),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 0.35) {
    return emptyParseResult('No saved template matched this email.');
  }
  return parseLeadCollectionTemplate(best.template, input, text, best.score);
}

export function parseLeadCollectionTemplate(
  template: LeadCollectionTemplateLike,
  input: LeadCollectionEmailInput,
  preparedText?: string,
  knownMatchScore?: number,
): LeadCollectionParseResult {
  const text = preparedText ??
    prepareLeadCollectionSource({
      htmlBody: input.htmlBody,
      textBody: input.textBody,
    });
  const matchScore = knownMatchScore ?? scoreLeadCollectionTemplate(template, input, text);
  const values: Record<string, string> = {};
  const diagnostics: string[] = [];
  let extractionScore = 0;
  const sourceTexts = splitLeadCollectionSources(text);

  for (const mapping of template.mappings ?? []) {
    const mappingText = mapping.source === 'LinkedPage'
      ? sourceTexts.linkedText || text
      : sourceTexts.emailText;
    const result = extractMappedValue(mappingText, mapping);
    if (result.value) values[mapping.field] = result.value;
    extractionScore += result.score;
    diagnostics.push(`${mapping.field}: ${result.reason}`);
  }

  if (!values.email && fieldRequested(template, 'email')) {
    const candidate = firstEmail(text);
    if (candidate) {
      values.email = candidate;
      diagnostics.push('email: generic email validation fallback');
    }
  }
  if (!values.phone && fieldRequested(template, 'phone')) {
    const candidate = firstPhone(text);
    if (candidate) {
      values.phone = candidate;
      diagnostics.push('phone: generic phone validation fallback');
    }
  }

  const mappingCount = Math.max(1, template.mappings?.length ?? 0);
  const extractionRatio = extractionScore / mappingCount;
  const requiredFields = [
    ...new Set([
      ...(template.requiredFields ?? []),
      ...(template.mappings ?? []).filter((mapping) => mapping.required).map((mapping) => mapping.field),
    ]),
  ];
  const missingRequiredFields = requiredFields.filter((field) => !`${values[field] ?? ''}`.trim());
  const requiredCoverage = requiredFields.length
    ? (requiredFields.length - missingRequiredFields.length) / requiredFields.length
    : 1;
  const confidence = missingRequiredFields.length === 0 && (template.mappings?.length ?? 0) > 0
    ? 1
    : clamp01(matchScore * 0.45 + extractionRatio * 0.45 + requiredCoverage * 0.1);
  const threshold = clamp(template.confidenceThreshold, 0.5, 0.99, 0.82);

  return {
    matched: matchScore >= 0.35,
    templateId: template.id ?? null,
    templateName: template.name,
    matchScore: roundScore(matchScore),
    confidence: roundScore(confidence),
    threshold,
    values,
    missingRequiredFields,
    extractedFields: Object.keys(values),
    diagnostics,
    scopeMatched: true,
  };
}

function fieldRequested(template: LeadCollectionTemplateLike, field: string) {
  return (template.requiredFields ?? []).includes(field)
    || (template.mappings ?? []).some((mapping) => mapping.field === field);
}

export function scoreLeadCollectionTemplate(
  template: LeadCollectionTemplateLike,
  input: LeadCollectionEmailInput,
  preparedText?: string,
) {
  const text = normalizeMatchText(
    preparedText ??
      prepareLeadCollectionSource({
        htmlBody: input.htmlBody,
        textBody: input.textBody,
      }),
  );
  const parts: Array<{ weight: number; score: number }> = [];

  if (template.senderPatterns?.length) {
    parts.push({
      weight: 0.35,
      score: senderPatternScore(template.senderPatterns, input.fromAddress),
    });
  }
  if (`${template.subjectPattern ?? ''}`.trim()) {
    parts.push({
      weight: 0.25,
      score: subjectPatternScore(
        template.subjectPattern,
        template.subjectMatchMode,
        input.subject,
      ),
    });
  }
  if (template.bodyFingerprint?.length) {
    const fingerprint = template.bodyFingerprint.map(normalizeMatchText).filter(Boolean);
    const matched = fingerprint.filter((part) => text.includes(part)).length;
    parts.push({
      weight: 0.4,
      score: fingerprint.length ? matched / fingerprint.length : 0,
    });
  }

  if (!parts.length) return 0;
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  return clamp01(
    parts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight,
  );
}

function extractMappedValue(text: string, mapping: LeadCollectionFieldMapping) {
  const exactSelected = exactSampleCandidate(text, mapping);
  if (exactSelected) return exactSelected;

  const prefixCandidates = anchorCandidates(mapping.prefix, 'tail');
  const suffixCandidates = anchorCandidates(mapping.suffix, 'head');
  let start = -1;
  let matchedPrefix = '';

  for (const prefix of prefixCandidates) {
    const index = findInsensitive(text, prefix);
    if (index >= 0) {
      start = index + prefix.length;
      matchedPrefix = prefix;
      break;
    }
  }

  if (start < 0 && !mapping.prefix) {
    const generic = genericTransformCandidate(text, mapping.transform);
    return generic
      ? { value: generic, score: 0.45, reason: 'generic field validator fallback' }
      : { value: '', score: 0, reason: 'no stable anchor for selected text' };
  }
  if (start < 0) {
    const generic = genericTransformCandidate(text, mapping.transform);
    return generic
      ? { value: generic, score: 0.45, reason: 'generic field validator fallback' }
      : { value: '', score: 0, reason: 'prefix anchor not found' };
  }

  let end = -1;
  let matchedSuffix = '';
  for (const suffix of suffixCandidates) {
    const index = findInsensitive(text, suffix, start);
    if (index >= start) {
      end = index;
      matchedSuffix = suffix;
      break;
    }
  }

  if (end < 0) {
    const newline = text.indexOf('\n', start);
    end = newline >= 0 ? newline : Math.min(text.length, start + 300);
  }

  const raw = text.slice(start, end).trim().replace(/^[\s:|\-–—]+|[\s:|\-–—]+$/g, '');
  const transformed = transformMappedValue(raw, mapping.transform);
  if (!transformed) {
    const generic = genericTransformCandidate(text, mapping.transform);
    return generic
      ? { value: generic, score: 0.45, reason: 'anchors matched but validator used generic fallback' }
      : { value: '', score: 0.15, reason: 'anchors matched but extracted value was invalid' };
  }

  const fullPrefix = matchedPrefix === normalizeLeadCollectionText(mapping.prefix);
  const fullSuffix = matchedSuffix === normalizeLeadCollectionText(mapping.suffix);
  const score = fullPrefix && fullSuffix ? 1 : matchedPrefix && matchedSuffix ? 0.86 : 0.68;
  return {
    value: transformed,
    score,
    reason: fullPrefix && fullSuffix ? 'exact anchors matched' : 'partial anchors matched',
  };
}

function splitLeadCollectionSources(text: string) {
  const marker = text.match(/(?:^|\n)Linked detail page \([^)]+\)\n/i);
  if (!marker || marker.index === undefined) {
    return { emailText: text, linkedText: '' };
  }
  const linkedStart = marker.index + marker[0].length;
  return {
    emailText: text.slice(0, marker.index).trim(),
    linkedText: text.slice(linkedStart).trim(),
  };
}

function buildPrefixAnchor(text: string, selectionStart: number) {
  const context = text.slice(Math.max(0, selectionStart - 220), selectionStart);
  const lines = context.split('\n');
  const candidate = lines.slice(Math.max(0, lines.length - 3)).join('\n');
  return candidate.slice(-160).trim();
}

function buildSuffixAnchor(text: string, selectionEnd: number) {
  const context = text.slice(selectionEnd, Math.min(text.length, selectionEnd + 220));
  const lines = context.split('\n');
  const candidate = lines.slice(0, 3).join('\n');
  return candidate.slice(0, 160).trim();
}

function anchorCandidates(anchor: string, direction: 'head' | 'tail') {
  const normalized = normalizeLeadCollectionText(anchor);
  if (!normalized) return [];
  const sizes = [normalized.length, 120, 80, 50, 28]
    .filter((size) => size > 0 && size <= normalized.length);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const nearestLine = direction === 'tail' ? lines[lines.length - 1] : lines[0];
  return [...new Set([
    ...sizes.map((size) =>
      direction === 'tail' ? normalized.slice(-size) : normalized.slice(0, size),
    ),
    nearestLine,
  ])].filter((value) => value && value.length >= 3);
}

function senderPatternScore(patterns: string[], fromAddress: string) {
  const address = `${fromAddress ?? ''}`.trim().toLowerCase();
  const domain = address.split('@')[1] ?? '';
  const rootDomain = domain.split('.').slice(-2).join('.');
  let score = 0;
  for (const rawPattern of patterns) {
    const pattern = `${rawPattern ?? ''}`.trim().toLowerCase();
    if (!pattern) continue;
    if (pattern === address) score = Math.max(score, 1);
    else {
      const patternDomain = pattern
        .replace(/^\*@/, '')
        .replace(/^@/, '')
        .replace(/^https?:\/\//, '')
        .split('/')[0];
      if (patternDomain && patternDomain === domain) score = Math.max(score, 0.94);
      else if (patternDomain && patternDomain === rootDomain) score = Math.max(score, 0.9);
      else if (patternDomain && domain.endsWith(`.${patternDomain}`)) score = Math.max(score, 0.88);
      else if (address.includes(pattern)) score = Math.max(score, 0.75);
      else if (patternDomain && address.includes(patternDomain)) score = Math.max(score, 0.72);
    }
  }
  return score;
}

function exactSampleCandidate(text: string, mapping: LeadCollectionFieldMapping) {
  const sample = normalizeLeadCollectionText(mapping.sampleValue);
  if (!sample || !hasFlexibleText(text, sample)) return null;
  const value = transformMappedValue(sample, mapping.transform);
  return value
    ? { value, score: 0.9, reason: 'exact selected sample matched' }
    : null;
}

function subjectPatternScore(pattern: string, mode: string, subject: string) {
  const expected = `${pattern ?? ''}`.trim();
  const actual = `${subject ?? ''}`.trim();
  if (!expected) return 0;
  if (`${mode}`.toLowerCase() === 'regex') {
    try {
      return new RegExp(expected, 'i').test(actual) ? 1 : 0;
    } catch {
      return 0;
    }
  }
  if (`${mode}`.toLowerCase() === 'exact') {
    return normalizeMatchText(actual) === normalizeMatchText(expected) ? 1 : 0;
  }
  return normalizeMatchText(actual).includes(normalizeMatchText(expected)) ? 1 : 0;
}

function transformMappedValue(value: string, transform: LeadCollectionFieldTransform) {
  const normalized = normalizeLeadCollectionText(value);
  const clean = normalized.split('\n')[0]?.trim() ?? '';
  if (!clean) return '';
  if (transform === 'Email') return firstEmail(normalized) ?? '';
  if (transform === 'Phone') return firstPhone(normalized) ?? '';
  if (transform === 'CreditScore') return firstCreditScore(normalized) ?? '';
  if (transform === 'Number') {
    const match = normalized.match(/[-+]?\d[\d,.]*(?:\s*[a-z%]+)?/i);
    return match?.[0]?.trim() ?? '';
  }
  if (transform === 'Date') return clean.slice(0, 80);
  return normalized.replace(/\n+/g, ' ').slice(0, 2000).trim();
}

function genericTransformCandidate(text: string, transform: LeadCollectionFieldTransform) {
  if (transform === 'Email') return firstEmail(text) ?? '';
  if (transform === 'Phone') return firstPhone(text) ?? '';
  if (transform === 'CreditScore') return labeledCreditScore(text) ?? '';
  return '';
}

function firstEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
}

function firstPhone(value: string) {
  const labeled = normalizeLeadCollectionText(value).match(
    /(?:^|\n)\s*(?:phone|phone number|telephone|mobile|cell|contact phone|lead phone|renter phone)\s*[:|–—-]\s*([^\n]{7,40})/i,
  )?.[1];
  const labeledPhone = labeled ? validPhoneCandidate(labeled) : '';
  if (labeledPhone) return labeledPhone;

  const candidates = value.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) ?? [];
  return candidates
    .map((candidate) => candidate.trim())
    .find(validPhoneCandidate);
}

function validPhoneCandidate(candidate: string) {
  const trimmed = candidate.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  if (/^\d{4}\s*[-–—]\s*\d{4}$/.test(trimmed)) return '';
  return trimmed;
}

function firstCreditScore(value: string) {
  const matches = normalizeLeadCollectionText(value).match(/\b\d{3}\b/g) ?? [];
  return matches.find((candidate) => {
    const score = Number(candidate);
    return score >= 300 && score <= 850;
  });
}

function labeledCreditScore(value: string) {
  const labeled = normalizeLeadCollectionText(value).match(
    /(?:^|\n)\s*(?:combined\s+)?credit\s*score\s*[:|–—-]?\s*([^\n]{1,80})/i,
  )?.[1];
  return labeled ? firstCreditScore(labeled) : undefined;
}

function normalizeTransform(value: unknown, field: string): LeadCollectionFieldTransform {
  const allowed: LeadCollectionFieldTransform[] = ['Text', 'Email', 'Phone', 'Number', 'CreditScore', 'Date'];
  if (allowed.includes(value as LeadCollectionFieldTransform)) {
    return value as LeadCollectionFieldTransform;
  }
  if (field.toLowerCase().includes('email')) return 'Email';
  if (field.toLowerCase().includes('phone')) return 'Phone';
  if (field.toLowerCase().includes('creditscore') || field.toLowerCase().includes('credit_score')) return 'CreditScore';
  if (field.toLowerCase().includes('budget') || field.toLowerCase().includes('earning')) return 'Number';
  if (field.toLowerCase().includes('date')) return 'Date';
  return 'Text';
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (HTML_ENTITIES[normalized]) return HTML_ENTITIES[normalized];
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ' ';
    }
    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ' ';
    }
    return ' ';
  });
}

function normalizeMatchText(value: unknown) {
  return normalizeLeadCollectionText(value).toLowerCase();
}

function replaceAllCaseInsensitive(value: string, search: string, replacement: string) {
  if (!search) return value;
  return value.replace(new RegExp(escapeRegExp(search), 'gi'), replacement);
}

function findInsensitive(value: string, search: string, fromIndex = 0) {
  return value.toLowerCase().indexOf(search.toLowerCase(), fromIndex);
}

function findOccurrence(value: string, search: string, occurrence: number) {
  let from = 0;
  let found = -1;
  for (let index = 0; index <= occurrence; index++) {
    found = findInsensitive(value, search, from);
    if (found < 0) return -1;
    from = found + search.length;
  }
  return found;
}

function hasFlexibleText(value: string, search: string) {
  const direct = findInsensitive(value, search);
  if (direct >= 0) return true;
  const pattern = search
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp)
    .join('\\s+');
  return pattern ? new RegExp(pattern, 'i').test(value) : false;
}

function looksMostlyDynamic(value: string) {
  const digits = (value.match(/\d/g) ?? []).length;
  return digits > value.length * 0.55 || /@/.test(value) || /^https?:/i.test(value);
}

function fingerprintWeight(value: string) {
  const labelBonus = /[:|]/.test(value) ? 40 : 0;
  return labelBonus + Math.min(100, value.length);
}

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function finiteInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function roundScore(value: number) {
  return Math.round(clamp01(value) * 1000) / 1000;
}

function emptyParseResult(reason: string): LeadCollectionParseResult {
  return {
    matched: false,
    templateId: null,
    templateName: '',
    matchScore: 0,
    confidence: 0,
    threshold: 0.82,
    values: {},
    missingRequiredFields: [],
    extractedFields: [],
    diagnostics: [reason],
    scopeMatched: false,
  };
}
