import { LeadCollectionLinkedPageConfig } from './entities/lead-collection-template.entity';

export const DEFAULT_LINKED_PAGE_CONFIG: LeadCollectionLinkedPageConfig = {
  enabled: false,
  allowedHosts: [],
  urlIncludes: [],
  linkTextIncludes: [],
  maxLinks: 3,
};

export function normalizeLinkedPageConfig(value: unknown): LeadCollectionLinkedPageConfig {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const selectedUrl = safeUrl(raw.selectedUrl);
  return {
    enabled: raw.enabled === true,
    allowedHosts: stringArray(raw.allowedHosts)
      .map((item) => item.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase())
      .filter(Boolean),
    urlIncludes: stringArray(raw.urlIncludes).map((item) => item.toLowerCase()),
    linkTextIncludes: stringArray(raw.linkTextIncludes).map((item) => item.toLowerCase()),
    maxLinks: clampInt(raw.maxLinks, 3, 1, 5),
    openPage: raw.openPage === false ? false : true,
    autoFillContactFields: raw.autoFillContactFields === false ? false : true,
    ...(selectedUrl ? { selectedUrl } : {}),
  };
}

export function linkedPageHostAllowed(hostname: string, allowedHosts: string[]) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  return allowedHosts.some((raw) => {
    const pattern = `${raw ?? ''}`.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    if (!pattern) return false;
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      return host === suffix || host.endsWith(`.${suffix}`);
    }
    return host === pattern;
  });
}

function stringArray(value: unknown) {
  if (typeof value === 'string') value = value.split(',');
  return [...new Set((Array.isArray(value) ? value : []).map((item) => `${item ?? ''}`.trim()).filter(Boolean))];
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(`${value ?? ''}`, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function safeUrl(value: unknown) {
  const raw = `${value ?? ''}`.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
