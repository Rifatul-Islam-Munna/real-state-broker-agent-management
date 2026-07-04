import {
  bestPropertyAddressMatch,
  propertyAddressSimilarity,
} from './property-address-match';

describe('property address matching', () => {
  const properties = [
    {
      id: 1,
      title: '123 Main Street',
      location: 'Springfield, IL',
      exactLocation: '123 Main St, Springfield, IL 62701',
    },
    {
      id: 2,
      title: '975 Oak Avenue',
      location: 'Springfield, IL',
      exactLocation: '975 Oak Ave, Springfield, IL 62704',
    },
  ];

  test('normalizes street suffixes and matches a partial address', () => {
    const result = bestPropertyAddressMatch(
      'Showing at 123 Main St in Springfield',
      properties,
      0.36,
    );

    expect(result.property?.id).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  test('matches reordered partial address tokens when the house number agrees', () => {
    const result = bestPropertyAddressMatch(
      'Springfield Main 123',
      properties,
      0.36,
    );

    expect(result.property?.id).toBe(1);
  });

  test('penalizes an otherwise similar address with a conflicting house number', () => {
    const correct = propertyAddressSimilarity(
      '123 Main Street Springfield',
      '123 Main St Springfield',
    );
    const conflicting = propertyAddressSimilarity(
      '999 Main Street Springfield',
      '123 Main St Springfield',
    );

    expect(correct).toBeGreaterThan(0.9);
    expect(conflicting).toBeLessThan(0.5);
  });
});
