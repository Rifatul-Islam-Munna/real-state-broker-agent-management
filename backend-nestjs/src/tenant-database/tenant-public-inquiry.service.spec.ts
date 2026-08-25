import { createHash } from 'node:crypto';
import { TenantPublicInquiryService } from './tenant-public-inquiry.service';

describe('TenantPublicInquiryService chatbot session', () => {
  it('returns a random token while storing only its hash', async () => {
    const calls: Array<[string, unknown[] | undefined]> = [];
    const query = jest.fn(async (sql: string, values?: unknown[]) => {
      calls.push([sql, values]);
      if (sql.includes('FROM tenant_property')) {
        return { rowCount: 1, rows: [{
          id: 9, title: 'Oak Home', status: 'published', payload: {},
        }] };
      }
      if (sql.includes("key = 'contact_form'")) {
        return { rows: [{ value: { enabled: true } }] };
      }
      if (sql.includes('INSERT INTO tenant_legacy_resource')) {
        return { rows: [{
          id: 51, payload: { name: 'Sam', email: 'sam@example.com' },
          created_at: new Date(), updated_at: new Date(),
        }] };
      }
      if (sql.includes('SELECT id FROM tenant_lead')) return { rows: [] };
      if (sql.includes('INSERT INTO tenant_lead')) return { rows: [{ id: 7 }] };
      if (sql.includes('INSERT INTO tenant_chatbot_web_session')) return { rows: [] };
      return { rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn(async (_name: string, work: any) => work({ query })),
    };
    const service = new TenantPublicInquiryService(databases as any);

    const result = await service.createPropertyInquiry({
      databaseName: 'tenant_42',
    } as any, {
      propertyId: 9,
      name: 'Sam',
      email: 'sam@example.com',
      message: 'Please contact me.',
    });

    expect(result.chatSessionToken).toMatch(/^[a-f0-9]{64}$/);
    const sessionInsert = calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_chatbot_web_session'));
    expect(sessionInsert).toBeDefined();
    expect(sessionInsert?.[1]?.[0]).toBe(
      createHash('sha256').update(result.chatSessionToken).digest('hex'),
    );
    expect(JSON.stringify(sessionInsert?.[1])).not.toContain(result.chatSessionToken);
  });
});
