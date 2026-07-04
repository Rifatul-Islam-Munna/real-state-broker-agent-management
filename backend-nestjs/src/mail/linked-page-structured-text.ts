import { normalizeLeadCollectionText } from './lead-collection-parser';

export function extractLinkedPageStructuredText(html: string) {
  const lines: string[] = [];
  const pattern = /<script\b[^>]*(?:type=["'](?:application\/ld\+json|application\/json)["']|id=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    const raw = decodeEntities(match[1]).trim();
    if (!raw || raw.length > 500_000) continue;
    try {
      flattenValue(JSON.parse(raw), lines, 0);
    } catch {
      continue;
    }
  }
  return normalizeLeadCollectionText(lines.join('\n')).slice(0, 8_000);
}

function flattenValue(value: unknown, lines: string[], depth: number) {
  if (depth > 7 || lines.length >= 180 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.slice(0, 40).forEach((item) => flattenValue(item, lines, depth + 1));
    return;
  }
  if (typeof value !== 'object') return;
  const useful = /^(name|fullName|contactName|givenName|familyName|phone|telephone|email|streetAddress|address|addressLocality|postalCode|propertyAddress|listingAddress)$/i;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (typeof child === 'string' && useful.test(key) && child.trim()) {
      lines.push(`${key}: ${child.trim()}`);
    } else if (typeof child === 'object') {
      flattenValue(child, lines, depth + 1);
    }
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
