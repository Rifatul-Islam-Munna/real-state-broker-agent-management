import { TenantLegacyCompatibilityService } from './tenant-legacy-compatibility.service';

describe('TenantLegacyCompatibilityService response defaults', () => {
  test('normalizes incomplete deal records before UI rendering', () => {
    const service = new TenantLegacyCompatibilityService(
      {} as any,
      {} as any,
      {} as any,
    );
    expect((service as any).dealItem({
      id: 7,
      payload: {},
      created_at: new Date('2026-08-18T00:00:00Z'),
      updated_at: new Date('2026-08-18T00:00:00Z'),
    })).toMatchObject({
      id: 7,
      title: '',
      client: '',
      type: 'Residential',
      stage: 'OfferMade',
      value: 0,
      commissionStatus: 'Estimated',
      checklistItems: [],
    });
  });
});
