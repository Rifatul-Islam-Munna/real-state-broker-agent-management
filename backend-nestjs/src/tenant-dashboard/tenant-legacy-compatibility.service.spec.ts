import { TenantLegacyCompatibilityService } from './tenant-legacy-compatibility.service';

describe('TenantLegacyCompatibilityService response defaults', () => {
  test('permanently deletes lead and all connected tenant records in one transaction', async () => {
    const statements: string[] = [];
    const query = jest.fn(async (sql: string) => {
      statements.push(sql);
      if (sql.includes('DELETE FROM tenant_lead WHERE')) {
        return { rowCount: 1, rows: [{ id: 9 }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantLegacyCompatibilityService(
      databases as any,
      {} as any,
      {} as any,
    );

    await expect(service.deleteLead(
      { databaseName: 'tenant_1_demo' } as any,
      { id: 9 },
    )).resolves.toEqual({ deleted: [9] });
    expect(statements).toEqual(expect.arrayContaining([
      'BEGIN',
      expect.stringContaining('tenant_mail_deletion_tombstone'),
      expect.stringContaining('DELETE FROM tenant_outreach_job'),
      expect.stringContaining('DELETE FROM tenant_legacy_resource'),
      expect.stringContaining('DELETE FROM tenant_audit_log'),
      expect.stringContaining('DELETE FROM tenant_lead WHERE'),
      'COMMIT',
    ]));
  });

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

  test('filters leads by mail activity date instead of created date', () => {
    const service = new TenantLegacyCompatibilityService(
      {} as any,
      {} as any,
      {} as any,
    );
    const items = [
      { id: 1, name: 'Today mail', createdAt: new Date('2026-08-17T10:00:00Z'), lastActivityAt: new Date('2026-08-18T10:00:00Z') },
      { id: 2, name: 'Older mail', createdAt: new Date('2026-08-18T10:00:00Z'), lastActivityAt: new Date('2026-08-17T10:00:00Z') },
    ];
    expect((service as any).filter(items, { date: '2026-08-18' })).toEqual([items[0]]);
  });

  test('returns lead history as an array for the lead detail UI', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{
        id: 12,
        payload: { leadId: 7, action: 'Created' },
        created_at: new Date('2026-08-18T00:00:00Z'),
        updated_at: new Date('2026-08-18T00:00:00Z'),
      }],
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantLegacyCompatibilityService(
      databases as any,
      {} as any,
      {} as any,
    );

    await expect(service.genericList(
      { databaseName: 'tenant_1_demo' } as any,
      'lead-history',
      { leadId: 7 },
    )).resolves.toEqual([expect.objectContaining({ id: 12, leadId: 7 })]);
  });
});
