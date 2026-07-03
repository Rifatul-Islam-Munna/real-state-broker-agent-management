import { PropertyStatus } from './entities/property.entity';
import { isLivePropertyStatus } from './property-availability';

describe('property availability', () => {
  test('live statuses are public', () => {
    expect(isLivePropertyStatus(PropertyStatus.Open)).toBe(true);
    expect(isLivePropertyStatus(PropertyStatus.Active)).toBe(true);
    expect(isLivePropertyStatus(PropertyStatus.UnderOffer)).toBe(true);
  });

  test('paused and completed statuses are hidden', () => {
    expect(isLivePropertyStatus(PropertyStatus.Unpublished)).toBe(false);
    expect(isLivePropertyStatus(PropertyStatus.Sold)).toBe(false);
    expect(isLivePropertyStatus(PropertyStatus.Rented)).toBe(false);
    expect(isLivePropertyStatus(PropertyStatus.Closed)).toBe(false);
  });
});
