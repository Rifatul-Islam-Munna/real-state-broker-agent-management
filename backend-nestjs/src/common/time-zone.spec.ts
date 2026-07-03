import {
  dateRangeInZone,
  normalizeTimeZone,
  parseDateTimeInZone,
} from './time-zone';

describe('time-zone helpers', () => {
  test('converts Bangladesh local time to UTC', () => {
    expect(
      parseDateTimeInZone('2026-07-03T09:30', 'Asia/Dhaka')?.toISOString(),
    ).toBe('2026-07-03T03:30:00.000Z');
  });

  test('uses New York daylight-saving offsets', () => {
    expect(
      parseDateTimeInZone(
        '2026-07-03T09:30',
        'America/New_York',
      )?.toISOString(),
    ).toBe('2026-07-03T13:30:00.000Z');
    expect(
      parseDateTimeInZone(
        '2026-01-03T09:30',
        'America/New_York',
      )?.toISOString(),
    ).toBe('2026-01-03T14:30:00.000Z');
  });

  test('keeps absolute ISO timestamps unchanged', () => {
    expect(
      parseDateTimeInZone(
        '2026-07-03T09:30:00.000Z',
        'Asia/Dhaka',
      )?.toISOString(),
    ).toBe('2026-07-03T09:30:00.000Z');
  });

  test('builds agency-local date boundaries', () => {
    const range = dateRangeInZone(
      '2026-07-03',
      '2026-07-03',
      'Asia/Dhaka',
    );
    expect(range?.start.toISOString()).toBe('2026-07-02T18:00:00.000Z');
    expect(range?.endExclusive.toISOString()).toBe(
      '2026-07-03T18:00:00.000Z',
    );
  });

  test('falls back for invalid timezone identifiers', () => {
    expect(normalizeTimeZone('Not/AZone', 'UTC')).toBe('UTC');
  });
});
