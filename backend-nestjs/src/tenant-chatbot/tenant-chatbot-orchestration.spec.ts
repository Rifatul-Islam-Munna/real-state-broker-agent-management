import { normalizeChatbotSettings } from './tenant-chatbot-policy';
import { TenantChatbotService } from './tenant-chatbot.service';

describe('Tenant chatbot message orchestration', () => {
  const tenant = {
    id: 42,
    databaseName: 'tenant_42',
    businessName: 'Alpha',
  } as any;
  const settings = normalizeChatbotSettings({
    enabled: true,
    channels: { web: true, email: true, sms: true },
    responseDelaySeconds: 30,
  });

  function build(query: jest.Mock, configured = true) {
    const database = {
      withTenantClient: jest.fn(async (_name: string, work: any) =>
        work({ query }),
      ),
    };
    const embeddings = { embed: jest.fn(async () => Array(384).fill(0.01)) };
    const vectors = {
      isConfigured: jest.fn(() => configured),
      search: jest
        .fn()
        .mockResolvedValueOnce([
          {
            pointId: 'p1',
            score: 0.94,
            scope: 'PROPERTY',
            tenantId: 42,
            audience: 'LEAD',
            propertyId: 9,
            knowledgeId: '81',
            sourceType: 'PROPERTY_FIELD',
            sourceHash: 'hash',
            priority: 90,
            active: true,
          },
        ])
        .mockResolvedValueOnce([]),
    };
    return {
      service: new TenantChatbotService(
        database as any,
        embeddings as any,
        vectors as any,
        { findActiveByIds: jest.fn(async () => []) } as any,
      ),
      vectors,
    };
  }

  it('persists one inbound message and schedules one evidence-backed reply', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: settings }] };
      if (sql.includes('FROM tenant_lead l'))
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: { creditScore: 720 },
              doNotContact: false,
            },
          ],
        };
      if (sql.includes('FROM tenant_property'))
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: { minimumCreditScore: 650 },
            },
          ],
        };
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      ) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_conversation')) {
        return { rows: [{ id: '31', status: 'ACTIVE', turnCount: 0 }] };
      }
      if (
        sql.includes('INSERT INTO tenant_chatbot_message') &&
        sql.includes("'LEAD'")
      ) {
        return { rows: [{ id: '100' }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge'))
        return {
          rows: [
            {
              id: '81',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Parking',
              answer: 'One assigned parking space is included.',
              priority: 90,
              active: true,
            },
          ],
        };
      if (sql.includes('INSERT INTO tenant_outreach_job'))
        return { rows: [{ id: 501 }] };
      return { rows: [] };
    });
    const { service } = build(query);

    await expect(
      service.handleMessage(tenant, {
        channel: 'SMS',
        leadId: 7,
        propertyId: 9,
        sessionId: 'sms-thread-1',
        idempotencyKey: 'provider-message-1',
        body: 'Is parking included?',
      }),
    ).resolves.toMatchObject({
      conversationId: '31',
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
      answer: 'One assigned parking space is included.',
      queued: true,
    });

    const enqueue = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_outreach_job'),
    );
    expect(enqueue?.[1]).toEqual(
      expect.arrayContaining([
        'tenant-chatbot',
        '31',
        'One assigned parking space is included.',
      ]),
    );
    expect(
      query.mock.calls.filter(([sql]) =>
        sql.includes('INSERT INTO tenant_outreach_job'),
      ),
    ).toHaveLength(1);
  });
  it('queues the tenant credit-rejection message once before stopping automation', async () => {
    const creditSettings = normalizeChatbotSettings({
      ...settings,
      creditRejectedMessage:
        'Your credit score does not meet this property requirement. I can help with another property.',
    });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: creditSettings }] };
      if (sql.includes('FROM tenant_lead l'))
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: { creditScore: 610 },
              doNotContact: false,
            },
          ],
        };
      if (sql.includes('FROM tenant_property'))
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: { minimumCreditScore: 680 },
            },
          ],
        };
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      )
        return { rows: [] };
      if (sql.includes('INSERT INTO tenant_chatbot_conversation')) {
        return { rows: [{ id: '41', status: 'ACTIVE', turnCount: 0 }] };
      }
      if (
        sql.includes('INSERT INTO tenant_chatbot_message') &&
        sql.includes("'LEAD'")
      ) {
        return { rows: [{ id: '101' }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge'))
        return {
          rows: [
            {
              id: '81',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Parking',
              answer: 'Parking is included.',
              priority: 90,
              active: true,
            },
          ],
        };
      if (sql.includes('INSERT INTO tenant_outreach_job'))
        return { rows: [{ id: 502 }] };
      return { rows: [] };
    });
    const { service } = build(query);

    await expect(
      service.handleMessage(tenant, {
        channel: 'SMS',
        leadId: 7,
        propertyId: 9,
        sessionId: 'sms-credit',
        idempotencyKey: 'credit-1',
        body: 'Is parking included?',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'CREDIT_BELOW_MINIMUM',
      queued: true,
      answer: creditSettings.creditRejectedMessage,
    });

    const enqueue = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_outreach_job'),
    );
    expect(enqueue?.[1]).toEqual(
      expect.arrayContaining([creditSettings.creditRejectedMessage]),
    );
    expect(
      query.mock.calls.filter(([sql]) =>
        sql.includes('INSERT INTO tenant_outreach_job'),
      ),
    ).toHaveLength(1);
  });
  it('does not expose realtor-only access data to an unverified lead', async () => {
    const protectedSettings = normalizeChatbotSettings({
      ...(settings as any),
      realtorVerificationMessage:
        'Private access information is available only to a verified realtor.',
    } as any);
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: protectedSettings }] };
      if (sql.includes('FROM tenant_lead l'))
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: {},
              doNotContact: false,
            },
          ],
        };
      if (sql.includes('FROM tenant_property'))
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: { lockboxCode: '8472' },
            },
          ],
        };
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      )
        return { rows: [] };
      if (sql.includes('INSERT INTO tenant_chatbot_conversation'))
        return { rows: [{ id: '51', status: 'ACTIVE', turnCount: 0 }] };
      if (
        sql.includes('INSERT INTO tenant_chatbot_message') &&
        sql.includes("'LEAD'")
      )
        return { rows: [{ id: '111' }] };
      if (sql.includes('INSERT INTO tenant_outreach_job'))
        return { rows: [{ id: 503 }] };
      return { rows: [] };
    });
    const { service, vectors } = build(query);

    await expect(
      service.handleMessage(tenant, {
        channel: 'EMAIL',
        leadId: 7,
        propertyId: 9,
        sessionId: 'mail-private',
        idempotencyKey: 'private-1',
        body: 'What is the lockbox code?',
        audience: 'LEAD',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'REALTOR_VERIFICATION_REQUIRED',
      answer:
        'Private access information is available only to a verified realtor.',
    });

    expect(vectors.search).not.toHaveBeenCalled();
  });
  it('fails closed before any reply when the vector service is unavailable', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: settings }] };
      return { rows: [] };
    });
    const { service } = build(query, false);

    await expect(
      service.handleMessage(tenant, {
        channel: 'EMAIL',
        leadId: 7,
        sessionId: 'mail-thread',
        idempotencyKey: 'email-1',
        body: 'Tell me about the property',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'SYSTEM_UNAVAILABLE',
      queued: false,
    });
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO tenant_outreach_job'),
      ),
    ).toBe(false);
  });

  it('does not create a showing request without explicit date/time confirmation', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: settings }] };
      if (sql.includes('FROM tenant_property'))
        return {
          rows: [
            { id: 9, title: 'Oak Home', status: 'published', payload: {} },
          ],
        };
      if (sql.includes('FROM tenant_chatbot_knowledge'))
        return {
          rows: [
            {
              id: '81',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Showing',
              answer: 'Showings are available.',
              priority: 90,
              active: true,
            },
          ],
        };
      if (sql.includes('FROM tenant_lead l'))
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: {},
              doNotContact: false,
            },
          ],
        };
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      )
        return { rows: [] };
      if (sql.includes('INSERT INTO tenant_chatbot_conversation'))
        return { rows: [{ id: '30', status: 'ACTIVE', turnCount: 0 }] };
      if (sql.includes('INSERT INTO tenant_chatbot_message'))
        return { rows: [{ id: '99' }] };
      return { rows: [] };
    });
    const { service } = build(query);

    await service.handleMessage(tenant, {
      channel: 'WEB',
      leadId: 7,
      propertyId: 9,
      sessionId: 'web-1',
      idempotencyKey: 'web-message-1',
      body: 'I want a showing',
      showing: { confirmed: false, preferredAt: '2026-09-01T10:00:00Z' },
    });
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO tenant_showing_request'),
      ),
    ).toBe(false);
  });

  it('creates one submitted showing request only after explicit confirmation', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: settings }] };
      if (
        sql.includes('FROM tenant_property') &&
        !sql.includes('tenant_chatbot_knowledge')
      ) {
        return {
          rows: [
            { id: 9, title: 'Oak Home', status: 'published', payload: {} },
          ],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge'))
        return {
          rows: [
            {
              id: '81',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Showing',
              answer: 'Showings are available.',
              priority: 90,
              active: true,
            },
          ],
        };
      if (sql.includes('FROM tenant_lead l'))
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: {},
              doNotContact: false,
            },
          ],
        };
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      )
        return { rows: [] };
      if (sql.includes('INSERT INTO tenant_chatbot_conversation'))
        return { rows: [{ id: '31', status: 'ACTIVE', turnCount: 0 }] };
      if (
        sql.includes('INSERT INTO tenant_chatbot_message') &&
        sql.includes("'LEAD'")
      )
        return { rows: [{ id: '100' }] };
      if (sql.includes('INSERT INTO tenant_showing_request'))
        return { rows: [{ id: 501 }] };
      return { rows: [] };
    });
    const { service } = build(query);

    await expect(
      service.handleMessage(tenant, {
        channel: 'WEB',
        leadId: 7,
        propertyId: 9,
        sessionId: 'web-2',
        idempotencyKey: 'web-message-2',
        body: 'Yes, please book it.',
        showing: { confirmed: true, preferredAt: '2026-09-01T10:00:00Z' },
      }),
    ).resolves.toMatchObject({
      decision: 'CREATE_SHOWING_REQUEST',
      reason: 'SHOWING_REQUESTED',
      conversationId: '31',
      queued: false,
    });

    const insert = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_showing_request'),
    );
    expect(insert?.[0]).toContain("'submitted', 'submitted'");
    expect(
      query.mock.calls.filter(([sql]) =>
        sql.includes('INSERT INTO tenant_showing_request'),
      ),
    ).toHaveLength(1);
    expect(
      query.mock.calls.some(([sql]) => sql.includes("'SHOWING_REQUESTED'")),
    ).toBe(true);
  });
});
