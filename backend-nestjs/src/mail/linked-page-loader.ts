import { LeadCollectionLinkedPageConfig } from './entities/lead-collection-template.entity';
import { htmlToLeadCollectionText, LeadCollectionEmailInput, normalizeLeadCollectionText } from './lead-collection-parser';
import { linkedPageHostAllowed, normalizeLinkedPageConfig } from './linked-page-config';
import { extractLinkedPageStructuredText } from './linked-page-structured-text';

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
  const candidates = extractLinks(input, config)
    .sort((left, right) => scoreLink(right, config) - scoreLink(left, config))
    .slice(0, config.maxLinks);

  for (const candidate of candidates) {
    const page = await loadPage(candidate.url, config).catch(() => null);
    if (page?.text) return page;
  }
  return null;
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

function extractLinks(input: LeadCollectionEmailInput, config: LeadCollectionLinkedPageConfig) {
  const candidates: LinkCandidate[] = [];
  const html = `${input.htmlBody ?? ''}`;
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    candidates.push({
      url: decodeEntities(match[1]),
      text: htmlToLeadCollectionText(match[2]),
    });
  }
  const plain = `${input.textBody ?? ''}\n${htmlToLeadCollectionText(html)}`;
  for (const match of plain.matchAll(/https:\/\/[^\s<>"')\]]+/gi)) {
    candidates.push({ url: decodeEntities(match[0]), text: '' });
  }

  const unique = new Map<string, LinkCandidate>();
  for (const candidate of candidates) {
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

function scoreLink(candidate: LinkCandidate, config: LeadCollectionLinkedPageConfig) {
  const url = candidate.url.toLowerCase();
  const text = candidate.text.toLowerCase();
  return config.urlIncludes.filter((part) => url.includes(part)).length * 5
    + config.linkTextIncludes.filter((part) => text.includes(part)).length * 6
    + (candidate.text ? 1 : 0);
}

async function loadPage(value: string, config: LeadCollectionLinkedPageConfig) {
  const requested = new URL(value);
  if (!linkedPageHostAllowed(requested.hostname, config.allowedHosts)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(requested, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
      },
    });
    if (!response.ok) return null;
    const finalUrl = new URL(response.url || requested.toString());
    if (!linkedPageHostAllowed(finalUrl.hostname, config.allowedHosts)) return null;
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > 1_500_000) return null;
    const raw = (await response.text()).slice(0, 1_500_000);
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
