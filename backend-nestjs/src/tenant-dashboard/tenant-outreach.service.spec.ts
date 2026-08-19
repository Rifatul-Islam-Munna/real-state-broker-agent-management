import { TenantOutreachService } from './tenant-outreach.service';

const tenant = {
  id: 11,
  subdomain: 'alpha',
  databaseName: 'tenant_11_alpha',
} as any;

function createService(query: jest.Mock) {
  const client = { query };
  const databases = {
    withTenantClient: jest.fn(async (databaseName: string, callback: any) => {
      expect(databaseName).toBe('tenant_11_alpha');
      return callback(client);
    }),
  };
  const settings = {
    getAgencySettings: jest.fn(),
    getScheduling: jest.fn(async () => ({ timeZone: 'UTC' })),
    getRawSmtp: jest.fn(),
    getRawCommunication: jest.fn(),
    getAgencyPhoneCountry: jest.fn(async () => 'US'),
  };
  return {
    service: new TenantOutreachService(databases as any, settings as any),
    databases,
    settings,
  };
}

describe('TenantOutreachService reliability', () => {
  it('deduplicates queue writes by tenant-local idempotency key', async () => {
    const existing = {
      id: 41,
      idempotency_key: 'request-1',
      channel: 'Email',
      status: 'scheduled',
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO tenant_outreach_job')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('WHERE idempotency_key = $1')) {
        return { rowCount: 1, rows: [existing] };
      }
      return { rowCount: 0, rows: [] };
    });
    const { service } = createService(query);

    const result = await service.enqueue(tenant, {
      channels: ['Email'],
      recipientEmail: 'buyer@example.com',
      title: 'Hello',
      body: 'Message',
      idempotencyKey: 'request-1',
    });

    expect(result).toEqual([existing]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (idempotency_key) DO NOTHING'),
      expect.arrayContaining(['request-1']),
    );
  });

  it('claims due work with a transaction and SKIP LOCKED', async () => {
    const row = {
      id: 51,
      lead_id: 7,
      source_type: 'lead-outreach',
      source_id: '',
      channel: 'Email',
      recipient_name: 'Buyer',
      recipient_email: 'buyer@example.com',
      recipient_phone: '',
      title: 'Hello',
      body: 'Message',
      media_urls: [],
      provider: '',
      created_by: 'Test',
      scheduled_at: new Date(),
      attempt_count: 1,
      max_attempts: 5,
      payload: {},
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('WITH due AS')) return { rowCount: 1, rows: [row] };
      return { rowCount: 0, rows: [] };
    });
    const { service } = createService(query);

    const jobs = await service.claimDueJobs(tenant, 'worker-a', 20);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: 51, attemptCount: 1 });
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(
      expect.arrayContaining([
        'BEGIN',
        expect.stringContaining('FOR UPDATE SKIP LOCKED'),
        'COMMIT',
      ]),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'processing'"),
      [20, 'worker-a'],
    );
  });

  it.each([
    { attemptCount: 1, maxAttempts: 5, expected: 'retrying' },
    { attemptCount: 5, maxAttempts: 5, expected: 'dead_letter' },
  ])(
    'moves transient provider failures to $expected',
    async ({ attemptCount, maxAttempts, expected }) => {
      const { service } = createService(jest.fn());
      jest.spyOn(service as any, 'beginAttempt').mockResolvedValue(101);
      jest
        .spyOn(service as any, 'deliver')
        .mockRejectedValue(new Error('Provider timed out'));
      const finish = jest
        .spyOn(service as any, 'finishFailure')
        .mockResolvedValue(undefined);

      const result = await service.processClaimedJob(tenant, {
        id: 61,
        leadId: 3,
        sourceType: 'lead-outreach',
        sourceId: '',
        channel: 'Email',
        recipientName: 'Buyer',
        recipientEmail: 'buyer@example.com',
        recipientPhone: '',
        title: 'Hello',
        body: 'Message',
        mediaUrls: [],
        provider: '',
        createdBy: 'Test',
        scheduledAt: new Date(),
        attemptCount,
        maxAttempts,
        payload: {},
      } as any);

      expect(result.status).toBe(expected);
      expect(finish).toHaveBeenCalledWith(
        tenant,
        expect.objectContaining({ id: 61 }),
        101,
        expected,
        'Provider timed out',
      );
    },
  );

  it('blocks email and SMS outreach for leads without a property', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_lead_property')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("payload->>'property'")) {
        return { rowCount: 1, rows: [{ property: '' }] };
      }
      if (sql.includes('SELECT to_jsonb(lead)')) {
        return {
          rowCount: 1,
          rows: [{
            value: { id: 9, full_name: 'Buyer', email: 'buyer@example.com' },
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const { service } = createService(query);

    await expect(service.queueOutreach(tenant, {
      leadId: 9,
      kind: 'Email',
      message: 'Hi',
    })).rejects.toThrow('no property selected');
    await expect(service.queueOutreach(tenant, {
      leadId: 9,
      kind: 'Sms',
      message: 'Hi',
    })).rejects.toThrow('no property selected');
  });

  it('allows outreach for leads that have a linked property', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_lead_property')) {
        return { rowCount: 1, rows: [{ lead_id: 9 }] };
      }
      if (sql.includes('SELECT to_jsonb(lead)')) {
        return {
          rowCount: 1,
          rows: [{
            value: {
              id: 9,
              full_name: 'Buyer',
              email: 'buyer@example.com',
              payload: { property: '2500 Parkview Dr' },
            },
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const { service } = createService(query);
    jest.spyOn(service as any, 'enqueueWithClient').mockResolvedValue([{
      id: 99,
      status: 'scheduled',
      leadId: 9,
      channel: 'Email',
      recipientEmail: 'buyer@example.com',
    }]);

    await expect(service.queueOutreach(tenant, {
      leadId: 9,
      kind: 'Email',
      title: 'Hello',
      message: 'Hi',
    })).resolves.toMatchObject({ id: 99, status: 'Scheduled' });
  });

  it('stores inbound replies in the tenant database and cancels only that lead automation', async () => {
    const statements: string[] = [];
    const query = jest.fn(async (sql: string) => {
      statements.push(sql);
      if (sql.includes('FROM tenant_lead WHERE LOWER(email)')) {
        return {
          rowCount: 1,
          rows: [{ id: 9, fullName: 'Buyer', email: 'buyer@example.com' }],
        };
      }
      if (sql.includes('INSERT INTO tenant_outreach_job')) {
        return { rowCount: 1, rows: [{ id: 71 }] };
      }
      if (sql.includes("AND status = 'sent'")) {
        return { rowCount: 1, rows: [{ exists: 1 }] };
      }
      if (sql.includes('WHERE j.id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 71,
              lead_id: 9,
              channel: 'Email',
              direction: 'Incoming',
              status: 'received',
              recipient_name: 'Buyer',
              recipient_email: 'buyer@example.com',
              recipient_phone: '',
              title: 'Re: Hello',
              body: 'Yes, I am interested.',
              media_urls: [],
              provider: 'Gmail',
              provider_message_id: '<message-1>',
              created_by: 'Buyer',
              scheduled_at: new Date(),
              occurred_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rowCount: 1, rows: [] };
    });
    const { service, databases } = createService(query);

    const reply = await service.recordInboundEmail(tenant, {
      senderEmail: 'buyer@example.com',
      senderName: 'Buyer',
      subject: 'Re: Hello',
      body: 'Yes, I am interested.',
      messageId: '<message-1>',
      provider: 'Gmail',
    });

    expect(reply).toMatchObject({ id: 71, leadId: 9, status: 'Received' });
    expect(databases.withTenantClient).toHaveBeenCalled();
    expect(statements.join('\n')).toContain("status = 'cancelled'");
    expect(statements.join('\n')).toContain(
      'WHERE lead_id = $1\n               AND id <> $2',
    );
    expect(statements.join('\n')).toContain("followUpStatus', 'Completed'");
    expect(statements.join('\n')).toContain("ELSE 'Replied'");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("AND channel = $2"),
      [9, 'Email', expect.any(Date), 'buyer@example.com'],
    );
  });

  it('does not mark inbound mail as a reply before same-channel outreach was sent', async () => {
    const statements: string[] = [];
    const query = jest.fn(async (sql: string) => {
      statements.push(sql);
      if (sql.includes('FROM tenant_lead WHERE LOWER(email)')) {
        return { rowCount: 1, rows: [{ id: 9, fullName: 'Buyer', email: 'buyer@example.com' }] };
      }
      if (sql.includes('INSERT INTO tenant_outreach_job')) {
        return { rowCount: 1, rows: [{ id: 72 }] };
      }
      if (sql.includes('WHERE j.id = $1')) {
        return {
          rowCount: 1,
          rows: [{
            id: 72,
            lead_id: 9,
            channel: 'Email',
            direction: 'Incoming',
            status: 'received',
            media_urls: [],
            payload: {},
          }],
        };
      }
      if (sql.includes("AND status = 'sent'")) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [] };
    });
    const { service } = createService(query);

    await service.recordInboundEmail(tenant, {
      senderEmail: 'buyer@example.com',
      subject: 'New inquiry',
      body: 'Is this available?',
      messageId: '<message-before-outreach>',
      provider: 'Gmail',
    });

    expect(statements.some((sql) => sql.includes("SET status = 'cancelled'"))).toBe(false);
    expect(statements.some((sql) => sql.includes("ELSE 'Replied'"))).toBe(false);
  });

  it('records sent post-visit follow-up for automatic board cleanup', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const { service } = createService(query);

    await (service as any).finishAttemptSuccess(
      'tenant_11_alpha',
      {
        id: 81,
        lead_id: 9,
        source_type: 'lead-outreach',
        provider: 'SMTP',
        payload: {
          sequenceType: 'FollowUp1',
          lead: { payload: { stage: 'Visit' } },
        },
      },
      91,
      'provider-message-81',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("'postVisitFollowUpSentAt'"),
      [9, true, true],
    );
  });
});
