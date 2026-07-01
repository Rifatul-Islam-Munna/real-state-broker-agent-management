import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

const fallbackCountry = 'US';

export function normalizePhoneNumber(value: string | null | undefined, country?: string | null) {
  const raw = `${value ?? ''}`.trim();
  if (!raw) return '';
  const defaultCountry = normalizePhoneCountry(country);
  const parsed = parsePhoneNumberFromString(raw, defaultCountry as CountryCode);
  if (parsed?.isValid()) return parsed.number;
  if (raw.startsWith('+')) return raw.replace(/[^\d+]/g, '');
  return raw;
}

export function normalizePhoneCountry(value: string | null | undefined) {
  const normalized = `${value ?? ''}`.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : fallbackCountry;
}
