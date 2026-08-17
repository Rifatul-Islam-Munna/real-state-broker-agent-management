import { TenantMailInboxService } from './tenant-mail-inbox.service';

describe('TenantMailInboxService local deletion', () => {
  test('stores provider tombstone before deleting synced email', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [{
            id: 286,
            direction: 'Incoming',
            provider: 'gmail:agent@example.com',
            provider_message_id: 'gmail-message-286',
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantMailInboxService(
      databases as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.delete(
      { databaseName: 'tenant_1_demo' } as any,
      286,
    )).resolves.toEqual({
      id: 286,
      deleted: true,
      providerMessageDeleted: false,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_mail_deletion_tombstone'),
      ['gmail:agent@example.com', 'gmail-message-286'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM tenant_outreach_job'),
      [286],
    );
    expect(query.mock.calls.map(([sql]) => sql.trim())).toContain('COMMIT');
  });
});
