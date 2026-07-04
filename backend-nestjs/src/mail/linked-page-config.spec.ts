import {
  linkedPageHostAllowed,
  normalizeLinkedPageConfig,
} from './linked-page-config';

describe('linked page configuration', () => {
  test('does not enable external pages without an explicit setting', () => {
    expect(normalizeLinkedPageConfig(undefined)).toEqual({
      enabled: false,
      allowedHosts: [],
      urlIncludes: [],
      linkTextIncludes: [],
      maxLinks: 3,
    });
  });

  test('normalizes provider hosts and link filters', () => {
    expect(normalizeLinkedPageConfig({
      enabled: true,
      allowedHosts: ['https://www.zillow.com/path', '*.example.com'],
      urlIncludes: ['Lead', 'DETAIL'],
      linkTextIncludes: ['View Lead'],
      maxLinks: 99,
    })).toEqual({
      enabled: true,
      allowedHosts: ['www.zillow.com', '*.example.com'],
      urlIncludes: ['lead', 'detail'],
      linkTextIncludes: ['view lead'],
      maxLinks: 5,
    });
  });

  test('supports exact hosts and configured subdomain wildcards only', () => {
    expect(linkedPageHostAllowed('zillow.com', ['zillow.com'])).toBe(true);
    expect(linkedPageHostAllowed('www.zillow.com', ['zillow.com'])).toBe(false);
    expect(linkedPageHostAllowed('www.zillow.com', ['*.zillow.com'])).toBe(true);
    expect(linkedPageHostAllowed('malicious-zillow.com', ['*.zillow.com'])).toBe(false);
  });
});
