import { LeadCollectionLinkedPageConfig } from './entities/lead-collection-template.entity';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { htmlToLeadCollectionText, LeadCollectionEmailInput, normalizeLeadCollectionText } from './lead-collection-parser';
import { linkedPageHostAllowed, normalizeLinkedPageConfig } from './linked-page-config';
import { extractLinkedPageStructuredText } from './linked-page-structured-text';

const LINKED_PAGE_MAX_BYTES = 1_500_000;
const LINKED_PAGE_TIMEOUT_MS = 8_000;

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];

export type LinkedPageResult = {
  url: string;
  html: string;
  text: string;
};

type LinkCandidate = {
  url: string;
  text: string;
};

export async function loadConfiguredLinkedPage(
  input: LeadCollectionEmailInput,
  configValue: unknown,
): Promise<LinkedPageResult | null> {
  const config = normalizeLinkedPageConfig(configValue);
  if (!config.enabled || !config.allowedHosts.length) return null;
  const candidates = extractConfiguredLinkedPageLinks(input, config)
    .sort((left, right) => scoreLink(right, config) - scoreLink(left, config))
    .slice(0, config.maxLinks);
  if (config.selectedUrl) {
    candidates.unshift(...expandRedirectTargets([{ url: config.selectedUrl, text: 'Selected link' }]));
  }

  for (const candidate of candidates) {
    const urlFields = linkedCandidateHostAllowed(candidate.url, config)
      ? extractLinkedLeadTextFromUrl(candidate.url)
      : '';
    if (urlFields) {
      return { url: candidate.url, html: '', text: urlFields };
    }
    if (config.openPage === false) continue;
    const page = await loadPage(candidate.url, config).catch(() => null);
    if (page?.text) return page;
  }
  return null;
}

function linkedCandidateHostAllowed(value: string, config: LeadCollectionLinkedPageConfig) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && linkedPageHostAllowed(url.hostname, config.allowedHosts);
  } catch {
    return false;
  }
}

export function enrichEmailWithLinkedPage(
  input: LeadCollectionEmailInput,
  linked: LinkedPageResult,
): LeadCollectionEmailInput {
  const block = `\n\nLinked detail page (${linked.url})\n${linked.text}`;
  return {
    ...input,
    htmlBody: input.htmlBody
      ? `${input.htmlBody}<section data-lead-linked-page="true"><pre>${escapeHtml(block)}</pre></section>`
      : '',
    textBody: `${input.textBody ?? ''}${block}`,
  };
}

export function extractConfiguredLinkedPageLinks(
  input: LeadCollectionEmailInput,
  config: LeadCollectionLinkedPageConfig,
) {
  const candidates: LinkCandidate[] = [];
  const html = `${input.htmlBody ?? ''}`;
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    candidates.push({
      url: decodeEntities(match[1]),
      text: htmlToLeadCollectionText(match[2]),
    });
  }
  for (const match of html.matchAll(/<(?:area|form)\b[^>]*(?:href|action)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    candidates.push({ url: decodeEntities(match[1]), text: '' });
  }
  for (const match of html.matchAll(/\b(?:data-href|data-url|data-link)\s*=\s*["']([^"']+)["']/gi)) {
    candidates.push({ url: decodeEntities(match[1]), text: '' });
  }
  const plain = `${input.textBody ?? ''}\n${htmlToLeadCollectionText(html)}`;
  for (const match of plain.matchAll(/https:\/\/[^\s<>"')\]]+/gi)) {
    candidates.push({ url: decodeEntities(match[0]), text: '' });
  }

  const unique = new Map<string, LinkCandidate>();
  for (const candidate of expandRedirectTargets(candidates)) {
    try {
      const url = new URL(candidate.url);
      if (url.protocol !== 'https:' || !linkedPageHostAllowed(url.hostname, config.allowedHosts)) continue;
      const urlText = `${url.pathname} ${url.search}`.toLowerCase();
      const linkText = candidate.text.toLowerCase();
      if (config.urlIncludes.length && !config.urlIncludes.some((part) => urlText.includes(part))) continue;
      if (config.linkTextIncludes.length && !config.linkTextIncludes.some((part) => linkText.includes(part))) continue;
      unique.set(url.toString(), { url: url.toString(), text: candidate.text });
    } catch {
      continue;
    }
  }
  return [...unique.values()];
}

function expandRedirectTargets(candidates: LinkCandidate[]) {
  const expanded: LinkCandidate[] = [];
  for (const candidate of candidates) {
    expanded.push(candidate);
    try {
      const url = new URL(candidate.url);
      for (const value of url.searchParams.values()) {
        const decoded = decodeURIComponent(value);
        if (/^https:\/\//i.test(decoded)) {
          expanded.push({ url: decoded, text: candidate.text });
        }
      }
    } catch {
      continue;
    }
  }
  return expanded;
}

function scoreLink(candidate: LinkCandidate, config: LeadCollectionLinkedPageConfig) {
  const url = candidate.url.toLowerCase();
  const text = candidate.text.toLowerCase();
  return config.urlIncludes.filter((part) => url.includes(part)).length * 5
    + config.linkTextIncludes.filter((part) => text.includes(part)).length * 6
    + (candidate.text ? 1 : 0);
}

export function extractLinkedLeadTextFromUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return '';
  }

  const params = url.searchParams;
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const [key, rawValue] of params.entries()) {
    const decoded = normalizeLeadCollectionText(rawValue);
    if (!decoded || /^(null|undefined|n\/a|unknown)$/i.test(decoded)) continue;
    const label = urlParamLabel(key);
    const line = `${label}: ${decoded}`;
    if (!seen.has(line.toLowerCase())) {
      lines.push(line);
      seen.add(line.toLowerCase());
    }
  }

  const hasName = [...params.keys()].some((key) => /^(name|fullName|fullname|contactName|leadName|renterName|consumerName|prospectName|customerName)$/i.test(key));
  if (!hasName) {
    const combined = [firstParam(params, ['firstName', 'givenName']), firstParam(params, ['lastName', 'familyName'])]
      .filter(Boolean)
      .join(' ');
    if (combined) lines.unshift(`Name: ${combined}`);
  }
  return normalizeLeadCollectionText(lines.join('\n'));
}

function urlParamLabel(key: string) {
  const aliases: Record<string, string> = {
    fullname: 'Full name',
    contactname: 'Contact name',
    leadname: 'Lead name',
    rentername: 'Renter name',
    consumername: 'Consumer name',
    prospectname: 'Prospect name',
    phonenumber: 'Phone',
    telephone: 'Phone',
    contactphone: 'Contact phone',
    leadphone: 'Lead phone',
    renterphone: 'Renter phone',
    consumerphone: 'Consumer phone',
    emailaddress: 'Email',
    contactemail: 'Contact email',
    leademail: 'Lead email',
    renteremail: 'Renter email',
    propertyaddress: 'Property address',
    listingaddress: 'Listing address',
    streetaddress: 'Street address',
    homeaddress: 'Home address',
    inquiryid: 'Inquiry id',
    intentiontype: 'Intention type',
  };
  const compact = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (aliases[compact]) return aliases[compact];
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || key;
}

function firstParam(params: URLSearchParams, names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const [key, value] of params.entries()) {
    if (!wanted.has(key.toLowerCase())) continue;
    const decoded = normalizeLeadCollectionText(value);
    if (decoded && !/^(null|undefined|n\/a|unknown)$/i.test(decoded)) return decoded;
  }
  return '';
}

async function loadPage(value: string, config: LeadCollectionLinkedPageConfig) {
  const requested = new URL(value);
  await assertSafeLinkedPageUrl(requested, config);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINKED_PAGE_TIMEOUT_MS);
  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(requested, config, controller.signal);
    if (!response.ok) return null;
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > LINKED_PAGE_MAX_BYTES) return null;
    const raw = await readLimitedBody(response, LINKED_PAGE_MAX_BYTES);
    const contentType = `${response.headers.get('content-type') ?? ''}`.toLowerCase();
    const visible = contentType.includes('html') ? htmlToLeadCollectionText(raw) : raw;
    const structured = contentType.includes('html') ? extractLinkedPageStructuredText(raw) : '';
    const text = normalizeLeadCollectionText(`${structured}\n${visible}`).slice(0, 16_000);
    return text
      ? {
          url: finalUrl.toString(),
          html: contentType.includes('html') ? raw.slice(0, 500_000) : '',
          text,
        }
      : null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithSafeRedirects(
  initialUrl: URL,
  config: LeadCollectionLinkedPageConfig,
  signal: AbortSignal,
) {
  let current = initialUrl;
  for (let hop = 0; hop < 5; hop += 1) {
    await assertSafeLinkedPageUrl(current, config);
    const response = await fetch(current, {
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (compatible; RealEstateLeadEnricher/1.0; +https://example.invalid/bot)',
      },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: current };
    }
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) return { response, finalUrl: current };
    current = new URL(location, current);
  }
  throw new Error('Linked page exceeded the redirect limit.');
}

async function assertSafeLinkedPageUrl(url: URL, config: LeadCollectionLinkedPageConfig) {
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || isIP(url.hostname)
    || !linkedPageHostAllowed(url.hostname, config.allowedHosts)
  ) {
    throw new Error('Linked page is outside the approved HTTPS hosts.');
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error('Linked page resolved to a private or unavailable address.');
  }
}

function isPrivateAddress(address: string) {
  const lower = address.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  return PRIVATE_IPV4.some((pattern) => pattern.test(address));
}

async function readLimitedBody(response: Response, maxBytes: number) {
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

function decodeEntities(value: string) {
  return `${value ?? ''}`
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
