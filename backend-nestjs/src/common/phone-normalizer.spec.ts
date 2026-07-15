import { normalizePhoneNumber } from './phone-normalizer';

describe('phone normalizer', () => {
  test('adds the default country code for local US numbers', () => {
    expect(normalizePhoneNumber('754-223-9582', 'US')).toBe('+17542239582');
  });

  test('keeps valid international numbers', () => {
    expect(normalizePhoneNumber('+44 20 7946 0958', 'US')).toBe('+442079460958');
  });
});
