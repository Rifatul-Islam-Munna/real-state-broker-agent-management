import { TenantInboxSyncService } from './tenant-inbox-sync.service';

describe('debug', () => {
  test('dump calls', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job')) {
        return {
          rowCount: 1,
          rows: [{
            id: 42,
            lead_id: null,
            recipient_email: 'jean@convo.zillow.com',
            title: 'Jean is requesting an application',
            body: 'New application request',
            payload: { htmlBody: '<a>Send application</a>', mailbox: 'Leads' },
            received_at: new Date('2026-08-17T19:01:00Z'),
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = { withTenantClient: jest.fn((_d: string, cb: any) => cb({ query })) };
    const settings = { getRawSmtp: jest.fn().mockResolvedValue({ leadTemplateTags: ['Leads'] }) };
    const service = new TenantInboxSyncService({} as any, databases as any, settings as any);
    jest.spyOn(service as any, 'createOrMatchLeadFromTemplate').mockResolvedValue({
      lead: null,
      created: false,
      result: {
        matched: false,
        templateId: null,
        templateName: '',
        matchScore: 0,
        confidence: 0,
        threshold: 0.82,
        values: {},
        missingRequiredFields: [],
        extractedFields: [],
        diagnostics: ['No saved template matched this email.'],
        scopeMatched: false,
      },
    });
    await service.convertStoredEmailWithTemplate(
      { databaseName: 'tenant_1_demo' } as any,
      42,
    );
    for (const call of query.mock.calls) {
      console.log('CALL:', JSON.stringify(call).slice(0, 500));
    }
  });
});
