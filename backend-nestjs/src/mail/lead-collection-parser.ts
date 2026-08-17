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
    .filter((line) => !looksMostlyDynamic(line))
    // Lines that became fragments after the mapped values were stripped
    // (e.g. "i am interested in .") never match a live email, so drop them.
    .filter((line) => !/["“”]/.test(line))
    .filter((line) => !/[.,;:]$/.test(line));

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

  if (values.name) {
    const cleanName = sanitizeLeadName(values.name, input.subject);
    if (cleanName) values.name = cleanName;
    else delete values.name;
  }
  if (!values.name) {
    const candidate =
      sanitizeLeadName(firstNameFromText(text), input.subject) ||
      subjectNameFromSubject(input.subject);
    if (candidate) {
      values.name = candidate;
      diagnostics.push('name: person name fallback');
    }
  }
  if (values.email && isProviderSenderAddress(values.email)) {
    delete values.email;
  }
  if (!values.email) {
    const fromAddress = `${input.fromAddress ?? ''}`.toLowerCase();
    const hrefs = `${input.htmlBody ?? ''}`
      .match(/href\s*=\s*["'][^"']+["']/gi)
      ?.join(' ') ?? '';
    const labeled = firstLabeledEmail(text);
    const labeledCandidate =
      labeled &&
      labeled !== fromAddress &&
      !isProviderSenderAddress(labeled)
        ? labeled
        : '';
    const candidate =
      labeledCandidate || firstPersonalEmail(text, hrefs, fromAddress);
    if (candidate) {
      values.email = candidate;
      diagnostics.push('email: generic email validation fallback');
    }
  }
  if (!values.phone) {
    const candidate = firstPhone(text);
    if (candidate) {
      values.phone = candidate;
      diagnostics.push('phone: generic phone validation fallback');
    }
  }
  if (!values.property) {
    const candidate = firstPropertyFromText(text);
    if (candidate) {
      values.property = candidate;
      diagnostics.push('property: address pattern fallback');
    }
  }
  if (!values.creditScore && fieldRequested(template, 'creditScore')) {
    const candidate = labeledCreditScore(text) ?? firstCreditScore(text);
    if (candidate) {
      values.creditScore = candidate;
      diagnostics.push('creditScore: generic credit score fallback');
    }
  }
  if (
    !values.budget &&
    !values.monthlyEarning &&
    (fieldRequested(template, 'budget') || fieldRequested(template, 'monthlyEarning'))
  ) {
    const candidate = firstBudgetFromText(text);
    if (candidate) {
      const target = fieldRequested(template, 'budget')
        ? 'budget'
        : 'monthlyEarning';
      values[target] = candidate;
      diagnostics.push(`${target}: numeric value fallback`);
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
  const occurrence = Math.max(0, finiteInt(mapping.occurrence, 0));
  let start = -1;
  let matchedPrefix = '';

  for (const prefix of prefixCandidates) {
    const index = findPrefixOccurrence(text, prefix, occurrence);
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
    const index = findPrefixOccurrence(text, suffix, occurrence, start);
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
  const variants = [normalized];
  // UI-saved label anchors end with ':' (e.g. "Name:"), but table-cell emails
  // render the label and value on separate lines without a colon. Try both.
  if (normalized.endsWith(':')) {
    variants.push(normalized.slice(0, -1).trim());
  } else {
    variants.push(`${normalized}:`);
  }
  const sizes = [normalized.length, 120, 80, 50, 28]
    .filter((size) => size > 0 && size <= normalized.length);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const nearestLine = direction === 'tail' ? lines[lines.length - 1] : lines[0];
  return [...new Set([
    ...variants.flatMap((variant) => [
      ...sizes.map((size) =>
        direction === 'tail' ? variant.slice(-size) : variant.slice(0, size),
      ),
      variant,
    ]),
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

const PROVIDER_SENDER_DOMAINS = [
  'zillow.com',
  'convo.zillow.com',
  'realtor.com',
  'trulia.com',
  'hotpads.com',
  'redfin.com',
  'apartments.com',
  'homes.com',
  'zumper.com',
  'apartmentlist.com',
  'movoto.com',
  'homefinder.com',
  'streeteasy.com',
];

export function isProviderSenderAddress(email: string) {
  const domain = `${email ?? ''}`.split('@')[1]?.toLowerCase() ?? '';
  if (!domain) return false;
  return PROVIDER_SENDER_DOMAINS.some(
    (provider) => domain === provider || domain.endsWith(`.${provider}`),
  );
}

/**
 * Rejects template-mapped names that are actually page CTAs or the email
 * subject (e.g. "Apply Now", "Request Information") instead of a real name.
 */
export function sanitizeLeadName(name: string, subject = '') {
  const value = `${name ?? ''}`.trim().replace(/\s+/g, ' ');
  if (value.length < 2) return '';
  if (/[@\d]/.test(value) && !/[a-zA-Z]{2,}/.test(value)) return '';
  const normalized = value.toLowerCase();
  const subjectNormalized = `${subject ?? ''}`.trim().toLowerCase();
  if (subjectNormalized && normalized === subjectNormalized) return '';
  const ctaPhrase =
    /^(apply|request|inquire|enquire|get|learn|find|book|schedule|view|see|search|contact|download|read|start|sign)\s+(now|more|info|information|a quote|a tour|today|here|started|in touch|with us|for free)\b/.test(
      normalized,
    );
  const singleVerb = /^(apply|request|inquire|enquire|learn|book|schedule|contact|search|view|find|download|read|sign)$/.test(
    normalized,
  );
  if (ctaPhrase || singleVerb) return '';
  return value;
}

export function extractLeadBasicsFromEmail(input: LeadCollectionEmailInput) {
  const text = prepareLeadCollectionSource({
    htmlBody: input.htmlBody,
    textBody: input.textBody,
  });
  const hrefs = `${input.htmlBody ?? ''}`
    .match(/href\s*=\s*["'][^"']+["']/gi)
    ?.join(' ') ?? '';
  const fromAddress = `${input.fromAddress ?? ''}`.toLowerCase();
  const labeled = firstLabeledEmail(text);
  const usableLabeled =
    labeled && labeled !== fromAddress && !isProviderSenderAddress(labeled)
      ? labeled
      : '';
  return {
    name:
      sanitizeLeadName(firstNameFromText(text), input.subject) ||
      subjectNameFromSubject(input.subject),
    email: usableLabeled || firstPersonalEmail(text, hrefs, fromAddress),
    phone: firstPhone(text) || firstPhone(hrefs) || '',
  };
}

function firstNameFromText(value: string) {
  const text = normalizeLeadCollectionText(value);
  const nameWord = '[A-Z][a-z]+(?:\\s+[A-Za-z]+){0,2}';
  const quoted = text.match(new RegExp(`["“](${nameWord})["”]`))?.[1];
  if (quoted) return quoted;
  const says = text.match(
    new RegExp(`(${nameWord})\\s+(?:says|said)\\s*[:,]?`),
  )?.[1];
  if (says) return says;
  const action = text.match(
    new RegExp(`(${nameWord})\\s+(?:is requesting|requested an application|would like to|wants to|is interested in|has a question|is asking)`),
  )?.[1];
  if (action) return action;
  const possessive = text.match(
    /([A-Z][a-z]+)'s\s+(?:phone|contact|message|application)/,
  )?.[1];
  if (possessive) return possessive;
  const labeled = text.match(
    /(?:^|\n)\s*(?:name|full name|client name|lead name|applicant name|buyer name|tenant name|prospect name|renter name|contact name)(?:[:|–—-]+\s*|\n\s*|\s+)([A-Z][A-Za-z' -]{1,60})(?:\n|$)/i,
  )?.[1];
  if (labeled) return labeled.trim();
  const fromHeader = text.match(
    /(?:^|\n)\s*(?:from|sender|lead|prospect|buyer|tenant|applicant|renter|client)\s*[:|–—-]\s*([A-Z][A-Za-z' -]{1,60})(?:\s*<[^>]+>)?\s*(?:\n|$)/i,
  )?.[1];
  if (fromHeader) return fromHeader.trim();
  const angle = text.match(/<([A-Za-z][A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/);
  if (angle) {
    const before = text.slice(0, angle.index).replace(/\s+$/, '');
    const trailingName = before.match(/([A-Z][a-z]+(?:\s+[A-Za-z]+){0,2})\s*$/);
    if (trailingName) return trailingName[1];
  }
  const parenthesized = text.match(
    /\b(?:from|by|name|contact)\s+([A-Z][A-Za-z' -]{1,60})\s*\([^)]*@[^)]*\)/i,
  )?.[1];
  if (parenthesized) return parenthesized.trim();
  return '';
}

/**
 * Extracts the prospect name from email subjects like "com lead - Gerard
 * Piette", "New Lead: Jane Doe", "Inquiry - John Smith".
 */
export function subjectNameFromSubject(subject: string) {
  const raw = `${subject ?? ''}`.trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  const cleaned = raw.replace(
    /^(?:new\s+)?(?:lead|leads|inquiry|inquiries|showing|application|applicant|buyer|renter|tenant|prospect|request|message|contact|question|inbox|com\s+lead|realtor\.com\s+lead|zillow\s+lead)\s*[-–—:|]\s*/i,
    '',
  );
  if (!cleaned || cleaned === raw) return '';
  const match = cleaned.match(
    /(?:^|[-–—:|])\s*([A-Z][A-Za-z']+(?:\s+[A-Za-z']+){0,3})\s*$/,
  );
  if (!match) return '';
  const name = match[1].trim();
  if (!name) return '';
  return sanitizeLeadName(name, subject);
}

/**
 * Derives a readable display name from a personal email local part,
 * e.g. norahsbec@gmail.com -> "Norah S Bec". Only used when no real name
 * was extracted and the address is not a provider/system sender.
 */
export function deriveNameFromEmail(email: string) {
  const address = `${email ?? ''}`.trim().toLowerCase();
  const local = address.split('@')[0] ?? '';
  if (!local || local.length < 3 || isProviderSenderAddress(address)) return '';
  const parts = local
    .replace(/[^a-z0-9._-]/g, '')
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
  if (parts.length < 2) return '';
  const digitsOnly = parts.every((part) => /^\d+$/.test(part));
  if (digitsOnly) return '';
  const name = parts
    .map((part) => {
      if (/^\d+$/.test(part)) return '';
      return part[0].toUpperCase() + part.slice(1);
    })
    .filter(Boolean)
    .join(' ');
  return name && name.split(' ').length >= 2 ? name : '';
}

function firstLabeledEmail(value: string) {
  const match = normalizeLeadCollectionText(value).match(
    /(?:^|\n)\s*(?:email|e-mail|email address|contact email|renter email|client email)\s*[:|–—-]\s*([^\s,;]+@[^\s,;]+)/i,
  );
  if (!match) return '';
  return match[1].replace(/[.,;]+$/, '').toLowerCase();
}

function firstEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
}

function hrefEmails(hrefs: string) {
  return [
    ...hrefs.matchAll(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi),
  ].map((match) => match[1].toLowerCase());
}

/**
 * Finds the first personal (non-provider, non-sender) email across the body
 * text and mailto: links. Provider addresses like leads@email.realtor.com or
 * rentalapplications@zillow.com are skipped so the prospect's real address
 * wins even when it appears later in the message.
 */
function firstPersonalEmail(text: string, hrefs = '', fromAddress = '') {
  const from = `${fromAddress ?? ''}`.toLowerCase();
  const candidates = [
    ...(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
    ...hrefEmails(hrefs),
  ]
    .map((value) => value.toLowerCase())
    .filter((value) => value !== from);
  return candidates.find((value) => !isProviderSenderAddress(value)) ?? '';
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
  const groups = trimmed.split(/[^\d]+/).filter((group) => group.length > 0);
  const sizes = groups.map((group) => group.length);
  // Reject noise sequences like "98101 2006 2026" (a ZIP-like 5-digit group
  // followed by year-like groups) that appear in newsletters and market
  // updates but are never real phone numbers.
  if (groups.length >= 3 && sizes[0] === 5) return '';
  const yearGroups = groups.filter(
    (group) => group.length === 4 && /^(19|20)\d{2}$/.test(group),
  ).length;
  if (yearGroups >= 2) return '';
  return trimmed;
}

function firstCreditScore(value: string) {
  const matches = normalizeLeadCollectionText(value).match(/\b\d{3}\b/g) ?? [];
  return matches.find((candidate) => {
    const score = Number(candidate);
    return score >= 300 && score <= 850;
  });
}

/**
 * Extracts a property address from email body text: a labeled address line
 * or a street-number line (e.g. "8526 NW 107th Psge Unit 2-40, Doral, FL").
 */
function firstPropertyFromText(value: string) {
  const text = normalizeLeadCollectionText(value);
  const labeled = text.match(
    /(?:^|\n)\s*(?:property(?: address)?|address|street address|listing address|location)\s*[:|–—-]?\s*([^\n]{5,160})/i,
  )?.[1]?.trim();
  if (labeled) return cleanPropertyCandidate(labeled);
  const street = text.match(
    /(?:^|[\n"“\s])(\d{1,6}\s+[A-Za-z][A-Za-z0-9 .'#/-]{2,120})/
  )?.[1]?.trim();
  return cleanPropertyCandidate(street ?? '');
}

function cleanPropertyCandidate(value: string) {
  const cleaned = `${value ?? ''}`
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+\s*$/, '')
    .trim();
  if (cleaned.length < 5) return '';
  if (cleaned.includes('|')) return '';
  if (/\b(?:call|tel|fax|www\.|http)/i.test(cleaned)) return '';
  if (/^\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}/.test(cleaned)) return '';
  if (/^(realtor\.com|zillow|the|please|thank|call|visit|view|click|more|download)/i.test(cleaned)) return '';
  return cleaned.slice(0, 200);
}

function firstBudgetFromText(value: string) {
  const text = normalizeLeadCollectionText(value);
  const labeled = text.match(
    /(?:^|\n)\s*(?:budget|monthly earning|monthly income|income|rent budget|max budget)\s*[:|–—-]?\s*([^\n]{1,60})/i,
  )?.[1]?.trim();
  if (labeled) {
    const digits = labeled.match(/\$?\s*([\d,]{3,})/);
    if (digits) return digits[1].replace(/,/g, '');
  }
  return '';
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

/**
 * Finds the Nth occurrence of an anchor. Single-line anchors (like a label
 * "Name") are matched only at line starts so they don't hit mid-word or
 * mid-sentence matches; multi-line anchors use plain substring search.
 */
function findPrefixOccurrence(
  text: string,
  anchor: string,
  occurrence: number,
  fromIndex = 0,
) {
  if (anchor.includes('\n') || anchor.length > 48) {
    const found = findOccurrence(text.slice(fromIndex), anchor, occurrence);
    return found >= 0 ? found + fromIndex : -1;
  }
  const safe = escapeRegExp(anchor);
  const pattern = new RegExp(
    `(^|\\n)\\s*${safe}(?=[\\s:;|\\u2013\\u2014-]|$)`,
    'gi',
  );
  let from = fromIndex;
  let occurrenceIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    // Return the anchor START so callers can add the anchor length.
    const index = match.index + match[0].length - safe.length;
    if (index <= from) {
      if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
      continue;
    }
    if (occurrenceIndex === occurrence) return index;
    occurrenceIndex += 1;
    if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
  }
  return -1;
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
  if (digits > value.length * 0.55 || /@/.test(value) || /^https?:/i.test(value)) {
    return true;
  }
  // Date/time lines differ on every live email, so they must never become
  // fingerprint anchors: "August 13, 2026 5:08 pm", "08/13/2026", "5:08 pm",
  // "Monday"...
  return (
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b/i.test(value) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(value) ||
    /\b\d{1,2}:\d{2}(?:\s*[ap]m)?\b/i.test(value) ||
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(value) ||
    /\b(?:am|pm)\b/i.test(value)
  );
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
