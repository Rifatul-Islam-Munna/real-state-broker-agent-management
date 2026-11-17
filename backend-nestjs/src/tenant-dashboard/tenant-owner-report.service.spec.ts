import { TenantOwnerReportService, normalizeOwnerRecipients } from './tenant-owner-report.service';

const tenant = {
  id: 7,
  databaseName: 'tenant_7',
} as any;

function setup(contacts?: Array<{ name: string; email: string; phone: string }>) {
  const owners = contacts ?? [
    { name: 'Alex Owner', email: 'alex@example.com', phone: '+15550001001' },
    { name: 'Taylor Owner', email: 'taylor@example.com', phone: '+15550001002' },
  ];
  const jobs: any[] = [];
  let reportCount = 0;
  let savedReportId = 0;
  const client = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT title, payload FROM tenant_property')) {
        return {
          rows: [{ title: '12 Garden Road', payload: {
            ownerName: owners[0].name,
            ownerEmail: owners[0].email,
            ownerPhone: owners[0].phone,
            owners,
          } }],
          rowCount: 1,
        };
      }
      if (sql.includes('INSERT INTO tenant_owner_report (')) {
        reportCount++;
        savedReportId = 700 + reportCount;
        return { rows: [{ id: savedReportId }], rowCount: 1 };
      }
      if (sql.includes('FROM tenant_owner_report r') && sql.includes('WHERE r.id = $1')) {
        return {
          rows: [{
            id: String(savedReportId),
            propertyId: 12,
            managedPropertyId: null,
            propertyTitle: '12 Garden Road',
            ownerName: owners[0].name,
            ownerEmail: owners[0].email,
            ownerPhone: owners[0].phone,
            owners,
            subject: 'Owner update',
            body: 'Week 2 report',
            channels: ['Email'],
            deliveryResults: [],
            deliveryStatus: 'scheduled',
            sentByName: 'Staff',
            sentAt: new Date('2026-11-10T10:00:00Z').toISOString(),
          }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM tenant_outreach_job')) {
        return {
          rows: jobs.map((job) => ({
            id: job.id,
            sourceId: String(savedReportId),
            channel: job.channel,
            status: job.status,
            ownerName: job.name,
            recipientEmail: job.email,
            recipientPhone: job.phone,
            lastError: '',
            providerMessageId: '',
          })),
          rowCount: jobs.length,
        };
      }
      return { rows: [], rowCount: 1, params };
    }),
  };

  const database = {
    withTenantClient: jest.fn(async (_name: string, callback: (client: any) => unknown) =>
      callback(client)),
  };
  const outreach = {
    enqueueWithClient: jest.fn(async (_client: any, input: any) => {
      const job = {
        id: 1000 + jobs.length,
        channel: input.channels[0],
        status: 'scheduled',
        name: input.recipientName,
        email: input.recipientEmail,
        phone: input.recipientPhone,
      };
      jobs.push(job);
      return [{ ...job, last_error: '' }];
    }),
  };
  const repository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const service = new TenantOwnerReportService(
    database as any,
    outreach as any,
    repository as any,
  );
  return {
    service,
    client,
    database,
    outreach,
    getReportCount: () => reportCount,
    jobs,
  };
}

describe('TenantOwnerReportService multi-owner delivery', () => {
  it('validates every selected owner channel, not only the first owner', () => {
    expect(() =>
      normalizeOwnerRecipients([
        { name: 'Alex', email: 'alex@example.com', phone: '' },
        { name: 'Taylor', email: '', phone: '+15550001002' },
      ], ['Email']),
    ).toThrow('Owner 2');

    expect(() =>
      normalizeOwnerRecipients([
        { name: 'Alex', email: 'alex@example.com', phone: '+15550001001' },
        { name: 'Taylor', email: 'taylor@example.com', phone: '' },
      ], ['Email', 'SMS']),
    ).toThrow('Owner 2');

    expect(() => normalizeOwnerRecipients(
      Array.from({ length: 6 }, (_, index) => ({
        name: `Owner ${index + 1}`,
        email: `owner${index + 1}@example.com`,
        phone: '',
      })),
      ['Email'],
    )).toThrow('one and five owners');
  });

  it('queues one email per owner but records exactly one report', async () => {
    const state = setup();
    const result = await state.service.sendOwnerReport(
      tenant,
      {
        propertyId: 12,
        subject: 'Owner update',
        body: 'Week 2 report',
        channels: ['Email'],
      },
      { id: 3, fullName: 'Staff' },
    );

    expect(state.getReportCount()).toBe(1);
    expect(state.outreach.enqueueWithClient).toHaveBeenCalledTimes(2);
    expect(state.jobs.map((job) => job.email)).toEqual([
      'alex@example.com',
      'taylor@example.com',
    ]);
    expect(result.id).toBe(701);
    expect(typeof result.id).toBe('number');
    expect(result.owners).toHaveLength(2);
    expect(result.deliveryResults).toHaveLength(2);
    expect(state.client.query).toHaveBeenCalledWith('BEGIN');
    expect(state.client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('sends four channel/owner jobs for two owners with Email and SMS', async () => {
    const state = setup();
    await state.service.sendOwnerReport(
      tenant,
      {
        propertyId: 12,
        subject: 'Owner update',
        body: 'Week 3 report',
        channels: ['Email', 'SMS'],
      },
      { id: 3, fullName: 'Staff' },
    );
    expect(state.getReportCount()).toBe(1);
    expect(state.jobs).toHaveLength(4);
    expect(state.jobs.map((job) => job.channel)).toEqual([
      'Email', 'SMS', 'Email', 'SMS',
    ]);
  });

  it('stores and queues the report with every line break and space intact', async () => {
    const state = setup();
    const body = '\nHello Alex,\r\n\r\nHere is your weekly activity report.\r\n  [ 3 ] Inquiries\r\n\t[ 2 ] Showings\r\n\r\nBest regards,\r\n\r\nStaff  \n';
    await state.service.sendOwnerReport(tenant, {
      propertyId: 12,
      subject: 'Owner update',
      body,
      channels: ['Email', 'SMS'],
    }, { id: 3, fullName: 'Staff' });

    const insert = state.client.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_owner_report ('),
    );
    expect(insert?.[1]?.[7]).toBe(body);
    expect(state.outreach.enqueueWithClient).toHaveBeenCalledTimes(4);
    for (const [, input] of state.outreach.enqueueWithClient.mock.calls) {
      expect(input.body).toBe(body);
    }
  });

  it('rejects a report containing only whitespace', async () => {
    const state = setup();
    await expect(state.service.sendOwnerReport(tenant, {
      propertyId: 12,
      subject: 'Owner update',
      body: ' \r\n\t ',
      channels: ['Email'],
    }, { id: 3 })).rejects.toThrow('Report subject and body are required.');
    expect(state.getReportCount()).toBe(0);
  });

  it('deduplicates duplicate contact addresses while keeping both owners', async () => {
    const contacts = [
      { name: 'Alex', email: 'shared@example.com', phone: '+15550001001' },
      { name: 'Taylor', email: 'shared@example.com', phone: '+15550001002' },
    ];
    const state = setup(contacts);
    const result = await state.service.sendOwnerReport(
      tenant,
      {
        propertyId: 12,
        subject: 'Owner update',
        body: 'Week 2 report',
        channels: ['Email'],
      },
      { id: 3, fullName: 'Staff' },
    );
    expect(state.getReportCount()).toBe(1);
    expect(state.jobs).toHaveLength(1);
    expect(result.owners).toHaveLength(2);
  });

  it('does not create a report when a selected owner lacks a required contact', async () => {
    const state = setup();
    await expect(state.service.sendOwnerReport(
      tenant,
      {
        propertyId: 12,
        owners: [
          { name: 'Alex', email: 'alex@example.com', phone: '' },
          { name: 'Taylor', email: '', phone: '' },
        ],
        subject: 'Owner update',
        body: 'Week 1 report',
        channels: ['Email'],
      },
      { id: 3, fullName: 'Staff' },
    )).rejects.toThrow('Owner 2');
    expect(state.getReportCount()).toBe(0);
    expect(state.outreach.enqueueWithClient).not.toHaveBeenCalled();
  });
});

describe('TenantOwnerReportService deletion', () => {
  function deletionState(jobStatuses: string[] = [], reportExists = true) {
    const client = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('SELECT property_title FROM tenant_owner_report')) {
          return { rows: reportExists ? [{ property_title: '12 Garden Road' }] : [], rowCount: reportExists ? 1 : 0 };
        }
        if (sql.includes('SELECT status FROM tenant_outreach_job')) {
          return { rows: jobStatuses.map((status) => ({ status })), rowCount: jobStatuses.length };
        }
        if (sql.includes('UPDATE tenant_outreach_job')) {
          return { rows: [], rowCount: jobStatuses.filter((status) => ['scheduled', 'retrying', 'paused'].includes(status)).length };
        }
        return { rows: [], rowCount: 1 };
      }),
    };
    const database = {
      withTenantClient: jest.fn(async (_db: string, callback: (client: any) => unknown) => callback(client)),
    };
    const service = new TenantOwnerReportService(database as any, {} as any, {} as any);
    return { service, database, client };
  }

  it('cancels pending messages before removing a report and records the deletion', async () => {
    const { service, database, client } = deletionState(['scheduled', 'retrying', 'sent']);
    const result = await service.deleteOwnerReport(tenant, 701, { id: 3 });
    expect(result).toEqual({ deleted: true, id: 701, cancelledMessages: 2 });
    expect(database.withTenantClient).toHaveBeenCalledWith('tenant_7', expect.any(Function));
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('SELECT property_title FROM tenant_owner_report WHERE id = $1 FOR UPDATE', [701]);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id FOR UPDATE'), ['701']);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("status IN ('scheduled', 'retrying', 'paused')"), ['701']);
    expect(client.query).toHaveBeenCalledWith('DELETE FROM tenant_owner_report WHERE id = $1', [701]);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("'owner-report.deleted'"),
      [3, 'Owner report #701 deleted', expect.stringContaining('"cancelledMessages":2')],
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    const queries = client.query.mock.calls.map(([sql]) => sql);
    expect(queries.findIndex((sql) => sql.startsWith('UPDATE tenant_outreach_job'))).toBeLessThan(
      queries.findIndex((sql) => sql.startsWith('DELETE FROM tenant_owner_report')),
    );
  });

  it('blocks deletion while a delivery is processing, without touching the report', async () => {
    const { service, client } = deletionState(['processing', 'scheduled']);
    await expect(service.deleteOwnerReport(tenant, 701, { id: 3 }))
      .rejects.toThrow('being delivered');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE FROM tenant_owner_report'))).toBe(false);
    expect(client.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE tenant_outreach_job'))).toBe(false);
  });

  it('does not delete a missing report', async () => {
    const { service, client } = deletionState([], false);
    await expect(service.deleteOwnerReport(tenant, 999, { id: 3 }))
      .rejects.toThrow('Owner report not found');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE FROM tenant_owner_report'))).toBe(false);
  });

  it('rejects an invalid report ID before beginning a transaction', async () => {
    const { service, database } = deletionState();
    await expect(service.deleteOwnerReport(tenant, -1, { id: 3 }))
      .rejects.toThrow('Owner report not found');
    expect(database.withTenantClient).not.toHaveBeenCalled();
  });
});
