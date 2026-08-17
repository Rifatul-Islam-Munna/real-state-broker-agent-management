import { TenantInboxSyncService } from './tenant-inbox-sync.service';

describe('TenantInboxSyncService property matching', () => {
  const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

  function client(rows: any[]) {
    return {
      query: jest.fn().mockResolvedValue({ rowCount: rows.length, rows }),
    } as any;
  }

  test.each([
    ['6750', 1],
    ['#AWRWRWA 6750', 1],
    ['6750 sf', 1],
    ['6750 NW 8th Street', 1],
  ])('matches platform variant %s to the same property', async (input, expected) => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '930 NE 23rd Ct', payload: { location: 'Pompano Beach, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, input)).resolves.toBe(expected);
  });

  test('does not guess when the same property number is ambiguous', async () => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '6750 SW 12th Ave', payload: { location: 'Miami, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, '6750')).resolves.toBeNull();
  });

  test('uses the common number plus address words to disambiguate', async () => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '6750 SW 12th Ave', payload: { location: 'Miami, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, 'Listing #XYZ 6750 NW 8th Street')).resolves.toBe(1);
  });
});
