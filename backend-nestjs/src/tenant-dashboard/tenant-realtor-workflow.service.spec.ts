import { TenantRealtorWorkflowService } from './tenant-realtor-workflow.service';

function tenant() {
  return {
    id: 7,
    businessName: 'Blue Realty',
    subdomain: 'blue',
    databaseName: 'tenant_7_blue',
  } as any;
}

function setup(query: jest.Mock) {
  const client = { query };
  const databases = {
    withTenantClient: jest.fn(async (_name: string, callback: any) =>
      callback(client),
    ),
  };
  const outreach = {
    enqueueWithClient: jest.fn(async () => [
      { id: 901, channel: 'Email', status: 'scheduled' },
    ]),
  };
  const platformDomain = {
    getTenantFrontendUrl: jest.fn(
      (subdomain: string, path: string) =>
        `http://${subdomain}.localhost:3000${path}`,
    ),
  };
  const service = new TenantRealtorWorkflowService(
    databases as any,
    outreach as any,
    platformDomain as any,
  );
  return { service, client, databases, outreach, platformDomain };
}

describe('TenantRealtorWorkflowService', () => {
  it('approves a submitted request and creates the tenant showing in one transaction', async () => {
    let approved = false;
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('FROM tenant_showing_request r') &&
        sql.includes('WHERE r.id = $1')
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 21,
              accessToken: 'secure-token',
              leadId: 9,
              leadName: 'Buyer One',
              recipientEmail: 'buyer@example.com',
              recipientPhone: '01700000000',
              propertyId: null,
              requestedPropertyId: 12,
              requestedPropertyTitle: 'Live Home',
              propertyMode: 'respondent',
              status: approved ? 'approved' : 'submitted',
              preferredShowingAt: new Date(
                Date.now() + 3_600_000,
              ).toISOString(),
              assignedRealtorName: approved ? 'Assigned Agent' : '',
              approvedShowingId: approved ? 77 : null,
            },
          ],
        };
      }
      if (
        sql.includes('SELECT id, title, status, payload FROM tenant_property')
      ) {
        return {
          rowCount: 1,
          rows: [
            { id: 12, title: 'Live Home', status: 'published', payload: {} },
          ],
        };
      }
      if (
        sql.includes('SELECT id FROM tenant_showing WHERE showing_request_id')
      ) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('INSERT INTO tenant_showing(')) {
        return { rowCount: 1, rows: [{ id: 77 }] };
      }
      if (sql.includes("SET status = 'approved'")) approved = true;
      return { rowCount: 1, rows: [] };
    });
    const state = setup(query);

    const result = await state.service.approveShowingRequest(
      tenant(),
      21,
      {
        propertyId: 12,
        showingAt: new Date(Date.now() + 7_200_000).toISOString(),
        realtorName: 'Assigned Agent',
        realtorEmail: 'agent@example.com',
        realtorPhone: '01800000000',
        notes: 'Meet at the front entrance',
      },
      { id: 5, fullName: 'Tenant Owner' },
    );

    expect(result).toMatchObject({
      id: 21,
      status: 'approved',
      assignedRealtorName: 'Assigned Agent',
      approvedShowingId: 77,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tenant_showing('),
      expect.arrayContaining([21, 9, 12, 'Buyer One', 'Assigned Agent']),
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
  });

  it('offers only published tenant properties on respondent-choice public forms', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WHERE r.access_token = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 31,
              leadId: 9,
              leadName: 'Buyer One',
              propertyId: null,
              propertyTitle: null,
              title: 'Choose a home',
              message: 'Pick the listing you want to see.',
              propertyMode: 'respondent',
              fields: [],
              answers: {},
              status: 'viewed',
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
              preferredShowingAt: null,
            },
          ],
        };
      }
      if (sql.includes("WHERE key IN ('branding', 'tenant_identity')")) {
        return {
          rowCount: 2,
          rows: [
            { key: 'branding', value: { primaryColor: '#0d766e' } },
            { key: 'tenant_identity', value: { businessName: 'Blue Realty' } },
          ],
        };
      }
      if (sql.includes("WHERE status = 'published'")) {
        return {
          rowCount: 2,
          rows: [
            { id: 12, title: 'Live Home' },
            { id: 13, title: 'Second Live Home' },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    const state = setup(query);

    const result = await state.service.publicShowingRequest(
      tenant(),
      'secure-token',
    );

    expect(result.properties).toEqual([
      { id: 12, title: 'Live Home' },
      { id: 13, title: 'Second Live Home' },
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE status = 'published'"),
    );
  });

  it('marks an expired secure link and rejects access', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WHERE r.access_token = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 41,
              leadId: 9,
              leadName: 'Buyer One',
              propertyId: 12,
              propertyTitle: 'Live Home',
              title: 'Expired request',
              message: '',
              propertyMode: 'fixed',
              fields: [],
              answers: {},
              status: 'sent',
              expiresAt: new Date(Date.now() - 60_000).toISOString(),
              preferredShowingAt: null,
            },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    const state = setup(query);

    await expect(
      state.service.publicShowingRequest(tenant(), 'expired-token'),
    ).rejects.toThrow('expired');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'expired'"),
      [41],
    );
  });
});
