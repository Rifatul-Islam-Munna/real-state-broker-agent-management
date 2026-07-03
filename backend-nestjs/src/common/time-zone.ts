export const DEFAULT_AGENCY_TIME_ZONE = 'UTC';

export function normalizeTimeZone(value: unknown, fallback = DEFAULT_AGENCY_TIME_ZONE) {
  const candidate = `${value ?? ''}`.trim();
  if (!candidate) return fallback;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

export function parseDateTimeInZone(value: unknown, timeZone: string): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = `${value ?? ''}`.trim();
  if (!text) return null;

  if (/Z$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const absoluteDate = new Date(text);
    return Number.isNaN(absoluteDate.getTime()) ? null : absoluteDate;
  }

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const normalizedZone = normalizeTimeZone(timeZone);
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  let offset = timeZoneOffsetMilliseconds(new Date(localAsUtc), normalizedZone);
  let result = new Date(localAsUtc - offset);
  const adjustedOffset = timeZoneOffsetMilliseconds(result, normalizedZone);

  if (adjustedOffset !== offset) {
    offset = adjustedOffset;
    result = new Date(localAsUtc - offset);
  }

  return Number.isNaN(result.getTime()) ? null : result;
}

export function dateRangeInZone(
  fromDate: string,
  toDate: string,
  timeZone: string,
) {
  const start = parseDateTimeInZone(`${fromDate}T00:00:00`, timeZone);
  const endExclusive = parseDateTimeInZone(
    `${addDaysToDateKey(toDate, 1)}T00:00:00`,
    timeZone,
  );

  return start && endExclusive ? { start, endExclusive } : null;
}

export function zonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    year: Number(parts.year),
  };
}

function addDaysToDateKey(value: string, days: number) {
  const match = `${value ?? ''}`.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = zonedDateParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return representedAsUtc - date.getTime();
}
