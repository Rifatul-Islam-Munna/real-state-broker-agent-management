import { normalizeChatbotSettings } from './tenant-chatbot-policy';
import { TenantChatbotService } from './tenant-chatbot.service';

describe('TenantChatbotService', () => {
  const tenant = {
    id: 42,
    databaseName: 'tenant_42_alpha',
    businessName: 'Alpha Realty',
  } as any;
  const vector = Array.from({ length: 384 }, () => 0.01);
  const activeSettings = normalizeChatbotSettings({
    enabled: true,
    channels: { web: true, email: true, sms: true },
  });

  function serviceWith(
    query: jest.Mock,
    vectorOverrides: Record<string, unknown> = {},
    platformRows: any[] = [],
  ) {
    const databases = {
      withTenantClient: jest.fn(async (_name: string, callback: any) =>
        callback({ query }),
      ),
    };
    const embeddings = {
      embed: jest.fn(async () => vector),
    };
    const vectors = {
      isConfigured: jest.fn(() => true),
      ensureCollection: jest.fn(async () => undefined),
      upsert: jest.fn(async () => undefined),
      deleteBySource: jest.fn(async () => undefined),
      search: jest.fn(async () => []),
      ...vectorOverrides,
    };
    const platform = {
      findActiveByIds: jest.fn(async () => platformRows),
    };
    return {
      service: new TenantChatbotService(
        databases as any,
        embeddings as any,
        vectors as any,
        platform as any,
      ),
      databases,
      embeddings,
      vectors,
      platform,
    };
  }

  it('returns fail-closed defaults and persists normalized settings', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(state.service.getSettings(tenant)).resolves.toMatchObject({
      enabled: false,
      channels: { web: false, email: false, sms: false },
    });

    const saved = await state.service.updateSettings(
      tenant,
      {
        enabled: true,
        channels: { web: true, email: false, sms: true },
        minimumConfidence: 5,
      },
      8,
    );

    expect(saved).toMatchObject({
      enabled: true,
      channels: { web: true, email: false, sms: true },
      minimumConfidence: 0.99,
    });
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO tenant_setting'),
      ),
    ).toBe(true);
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes('INSERT INTO tenant_audit_log'),
      ),
    ).toBe(true);
  });

  it('keeps chatbot settings isolated per tenant database', async () => {
    const values: Record<string, any> = {
      tenant_42_alpha: normalizeChatbotSettings({
        enabled: true,
        channels: { web: true, email: false, sms: true },
      }),
      tenant_43_beta: normalizeChatbotSettings({
        enabled: true,
        channels: { web: false, email: true, sms: false },
      }),
    };
    const databases = {
      withTenantClient: jest.fn(async (name: string, callback: any) =>
        callback({
          query: jest.fn(async (sql: string) =>
            sql.includes('SELECT value FROM tenant_setting')
              ? { rows: [{ value: values[name] }] }
              : { rows: [] },
          ),
        }),
      ),
    };
    const service = new TenantChatbotService(
      databases as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const alpha = await service.getSettings(tenant);
    const beta = await service.getSettings({
      ...tenant,
      id: 43,
      databaseName: 'tenant_43_beta',
    });
    expect(alpha.channels).toEqual({ web: true, email: false, sms: true });
    expect(beta.channels).toEqual({ web: false, email: true, sms: false });
  });

  it('answers in test mode from verified tenant evidence without writes', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return {
          rows: [
            {
              id: 41,
              title: 'Oak Street Home',
              status: 'published',
              payload: {},
            },
          ],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return {
          rows: [
            {
              id: '91',
              propertyId: 41,
              scope: 'PROPERTY',
              audience: 'LEAD',
              title: 'Parking',
              answer: 'The property includes a private driveway.',
              priority: 80,
              active: true,
            },
          ],
        };
      }
      throw new Error(`Unexpected SQL in side-effect-free test: ${sql}`);
    });
    const search = jest
      .fn()
      .mockResolvedValueOnce([
        {
          pointId: 'p-91',
          score: 0.93,
          scope: 'PROPERTY',
          tenantId: 42,
          audience: 'LEAD',
          propertyId: 41,
          knowledgeId: '91',
          sourceType: 'PROPERTY_FIELD',
          sourceHash: 'hash',
          priority: 80,
          active: true,
        },
      ])
      .mockResolvedValueOnce([]);
    const state = serviceWith(query, { search });

    const result = await state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'Can I park an SUV there?',
    });

    expect(result).toMatchObject({
      answer: 'The property includes a private driveway.',
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
      confidence: 0.93,
    });
    expect(result.evidence[0]).toMatchObject({
      knowledgeId: '91',
      title: 'Parking',
      scope: 'PROPERTY',
    });
    expect(search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        scope: 'TENANT',
        tenantId: 42,
        audience: 'LEAD',
        propertyId: 41,
      }),
    );
    expect(search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        scope: 'PLATFORM',
        audience: 'LEAD',
      }),
    );
    expect(
      query.mock.calls.some(([sql]) => /INSERT|UPDATE|DELETE/i.test(sql)),
    ).toBe(false);
  });

  it('returns realtor-only lockbox knowledge when the trusted audience is REALTOR', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: activeSettings }] };
      if (sql.includes('FROM tenant_property'))
        return {
          rows: [
            {
              id: 41,
              title: 'Oak',
              status: 'published',
              payload: { lockboxCode: '8472' },
            },
          ],
        };
      if (sql.includes('FROM tenant_chatbot_knowledge'))
        return {
          rows: [
            {
              id: '95',
              propertyId: 41,
              scope: 'PROPERTY',
              audience: 'REALTOR',
              title: 'Lockbox code',
              answer: 'Lockbox code: 8472',
              priority: 100,
              active: true,
              sourceType: 'PROPERTY_FIELD',
            },
          ],
        };
      return { rows: [] };
    });
    const search = jest
      .fn()
      .mockResolvedValueOnce([
        {
          pointId: 'lockbox-point',
          score: 0.97,
          scope: 'PROPERTY',
          tenantId: 42,
          audience: 'REALTOR',
          propertyId: 41,
          knowledgeId: '95',
          sourceType: 'PROPERTY_FIELD',
          sourceHash: 'lockbox-hash',
          priority: 100,
          active: true,
        },
      ])
      .mockResolvedValueOnce([]);
    const state = serviceWith(query, { search });

    await expect(
      state.service.testQuestion(tenant, {
        propertyId: 41,
        audience: 'REALTOR',
        question: 'What is the lockbox code?',
      }),
    ).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: 'Lockbox code: 8472',
      confidence: 0.97,
    });
    expect(search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tenantId: 42,
        audience: 'REALTOR',
        propertyId: 41,
      }),
    );
  });
  it('fails closed for low confidence and conflicting evidence', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return {
          rows: [{ id: 41, title: 'Oak', status: 'published', payload: {} }],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return {
          rows: [
            {
              id: '1',
              propertyId: 41,
              scope: 'PROPERTY',
              audience: 'LEAD',
              title: 'Pets one',
              answer: 'Pets are allowed.',
              priority: 80,
              active: true,
            },
            {
              id: '2',
              propertyId: 41,
              scope: 'PROPERTY',
              audience: 'LEAD',
              title: 'Pets two',
              answer: 'Pets are not allowed.',
              priority: 80,
              active: true,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const low = serviceWith(query, {
      search: jest
        .fn()
        .mockResolvedValueOnce([
          {
            pointId: 'low',
            score: 0.7,
            scope: 'PROPERTY',
            tenantId: 42,
            audience: 'LEAD',
            propertyId: 41,
            knowledgeId: '1',
            sourceType: 'MANUAL',
            sourceHash: 'low',
            priority: 80,
            active: true,
          },
        ])
        .mockResolvedValueOnce([]),
    });
    await expect(
      low.service.testQuestion(tenant, {
        propertyId: 41,
        audience: 'LEAD',
        question: 'Are pets allowed?',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'EVIDENCE_INSUFFICIENT',
      answer: activeSettings.fallbackMessage,
    });

    const conflict = serviceWith(query, {
      search: jest
        .fn()
        .mockResolvedValueOnce([
          {
            pointId: 'one',
            score: 0.91,
            scope: 'PROPERTY',
            tenantId: 42,
            audience: 'LEAD',
            propertyId: 41,
            knowledgeId: '1',
            sourceType: 'MANUAL',
            sourceHash: 'one',
            priority: 80,
            active: true,
          },
          {
            pointId: 'two',
            score: 0.9,
            scope: 'PROPERTY',
            tenantId: 42,
            audience: 'LEAD',
            propertyId: 41,
            knowledgeId: '2',
            sourceType: 'MANUAL',
            sourceHash: 'two',
            priority: 80,
            active: true,
          },
        ])
        .mockResolvedValueOnce([]),
    });
    await expect(
      conflict.service.testQuestion(tenant, {
        propertyId: 41,
        audience: 'LEAD',
        question: 'Are pets allowed?',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'EVIDENCE_CONFLICT',
    });
  });

  it('reports system unavailable without calling the model', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      isConfigured: jest.fn(() => false),
    });

    await expect(
      state.service.testQuestion(tenant, {
        audience: 'LEAD',
        question: 'What is the rent?',
      }),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'SYSTEM_UNAVAILABLE',
    });
    expect(state.embeddings.embed).not.toHaveBeenCalled();
  });

  it('stores source text in PostgreSQL but only safe metadata in Qdrant', async () => {
    const row = {
      id: '7',
      propertyId: null,
      scope: 'TENANT',
      audience: 'LEAD',
      sourceType: 'MANUAL',
      title: 'Office hours',
      answer: 'The office is open from 9 AM to 5 PM.',
      questionExamples: ['When are you open?'],
      priority: 60,
      active: true,
      sourceHash: 'stored-hash',
      qdrantPointId: 'point-7',
      indexStatus: 'pending',
      lastError: '',
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO tenant_chatbot_knowledge')) {
        return { rows: [row] };
      }
      if (sql.includes('UPDATE tenant_chatbot_knowledge')) {
        return { rows: [{ ...row, indexStatus: 'indexed' }] };
      }
      if (sql.includes('INSERT INTO tenant_audit_log')) return { rows: [] };
      return { rows: [] };
    });
    const state = serviceWith(query);

    const created = await state.service.createKnowledge(
      tenant,
      {
        title: 'Office hours',
        answer: 'The office is open from 9 AM to 5 PM.',
        questionExamples: ['When are you open?'],
        audience: 'LEAD',
        priority: 60,
      },
      8,
    );

    expect(created).toMatchObject({ id: '7', indexStatus: 'indexed' });
    expect(state.vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        vector,
        metadata: expect.objectContaining({
          tenantId: 42,
          knowledgeId: '7',
          audience: 'LEAD',
          sourceHash: 'stored-hash',
        }),
      }),
    ]);
    expect(JSON.stringify(state.vectors.upsert.mock.calls)).not.toContain(
      'The office is open',
    );
  });

  it('cancels a queued bot reply when a human intervenes before delivery', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_chatbot_conversation')) {
        return {
          rows: [
            {
              id: '31',
              leadId: 70,
              status: 'ACTIVE',
              stopReason: null,
              createdAt: new Date('2026-08-24T10:00:00Z'),
            },
          ],
        };
      }
      if (
        sql.includes('FROM tenant_outreach_job') &&
        sql.includes('created_by')
      ) {
        return { rows: [{ id: 901 }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(
      state.service.authorizeOutboundJob(tenant, {
        id: 500,
        lead_id: 70,
        source_type: 'tenant-chatbot',
        source_id: '31',
      } as any),
    ).resolves.toEqual({
      allowed: false,
      reason: 'HUMAN_INTERVENED',
    });

    expect(
      query.mock.calls.some(
        ([sql, values]) =>
          sql.includes('UPDATE tenant_outreach_job') && values?.[0] === 500,
      ),
    ).toBe(true);
  });

  it('allows one final rule message for the matching stopped reason while retaining pre-send checks', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_chatbot_conversation')) {
        return {
          rows: [
            {
              id: '31',
              leadId: 70,
              status: 'STOPPED',
              stopReason: 'CREDIT_BELOW_MINIMUM',
              createdAt: new Date('2026-08-24T10:00:00Z'),
            },
          ],
        };
      }
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(
      state.service.authorizeOutboundJob(tenant, {
        id: 501,
        lead_id: 70,
        source_type: 'tenant-chatbot-rule',
        source_id: '31',
        channel: 'SMS',
        payload: { finalRuleReason: 'CREDIT_BELOW_MINIMUM' },
      }),
    ).resolves.toEqual({ allowed: true, reason: 'READY' });
  });
  it('manually stops a lead and cancels only chatbot-owned queued jobs', async () => {
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('UPDATE tenant_chatbot_conversation') &&
        sql.includes('RETURNING')
      ) {
        return { rows: [{ id: '31', leadId: 70 }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(state.service.stopLead(tenant, 70, 9)).resolves.toEqual({
      stopped: true,
      conversationIds: ['31'],
    });

    const cancellation = query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE tenant_outreach_job'),
    );
    expect(cancellation?.[0]).toContain(
      "source_type IN ('tenant-chatbot', 'tenant-chatbot-rule')",
    );
    expect(cancellation?.[0]).toContain(
      "status IN ('scheduled', 'retrying', 'processing')",
    );
    expect(cancellation?.[1]).toEqual([['31']]);
  });

  it('updates tenant knowledge and replaces the old Qdrant source', async () => {
    const current = {
      id: '7',
      propertyId: null,
      scope: 'TENANT',
      audience: 'LEAD',
      sourceType: 'MANUAL',
      title: 'Office hours',
      answer: 'Open until 5 PM.',
      questionExamples: ['When are you open?'],
      priority: 60,
      active: true,
      sourceHash: 'old-hash',
      qdrantPointId: 'point-7',
      indexStatus: 'indexed',
      lastError: '',
    };
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('FROM tenant_chatbot_knowledge') &&
        sql.includes('WHERE id = $1')
      ) {
        return { rows: [current] };
      }
      if (
        sql.includes('UPDATE tenant_chatbot_knowledge') &&
        sql.includes('RETURNING')
      ) {
        return {
          rows: [
            {
              ...current,
              answer: 'Open until 6 PM.',
              sourceHash: 'new-hash',
              indexStatus: 'pending',
            },
          ],
        };
      }
      if (sql.includes("SET index_status = 'indexed'")) {
        return {
          rows: [
            {
              ...current,
              answer: 'Open until 6 PM.',
              sourceHash: 'new-hash',
              indexStatus: 'indexed',
            },
          ],
        };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(
      state.service.updateKnowledge(
        tenant,
        7,
        {
          answer: 'Open until 6 PM.',
        },
        8,
      ),
    ).resolves.toMatchObject({
      id: '7',
      answer: 'Open until 6 PM.',
      indexStatus: 'indexed',
    });
    expect(state.vectors.deleteBySource).toHaveBeenCalledWith(
      'TENANT',
      'old-hash',
      42,
    );
    expect(state.vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({
          tenantId: 42,
          knowledgeId: '7',
          sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    ]);
  });

  it('deletes tenant knowledge from PostgreSQL and Qdrant', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('DELETE FROM tenant_chatbot_knowledge')) {
        return { rows: [{ id: '7', sourceHash: 'old-hash', scope: 'TENANT' }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);
    await expect(state.service.deleteKnowledge(tenant, 7, 8)).resolves.toEqual({
      deleted: true,
      id: '7',
    });
    expect(state.vectors.deleteBySource).toHaveBeenCalledWith(
      'TENANT',
      'old-hash',
      42,
    );
  });

  it('reindexes only the edited property and includes realtor-only lockbox knowledge', async () => {
    let knowledgeId = 900;
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('FROM tenant_property') &&
        sql.includes('WHERE id = $1')
      ) {
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: {
                description: 'Updated public description',
                lockboxCode: '8472',
              },
            },
          ],
        };
      }
      if (
        sql.includes('SELECT source_hash') &&
        sql.includes('property_id = $1')
      ) {
        return {
          rows: [{ sourceHash: 'old-public' }, { sourceHash: 'old-private' }],
        };
      }
      if (sql.includes('DELETE FROM tenant_chatbot_knowledge'))
        return { rows: [] };
      if (sql.includes('INSERT INTO tenant_chatbot_knowledge')) {
        knowledgeId += 1;
        return { rows: [{ id: String(knowledgeId) }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(
      (state.service as any).reindexProperty(tenant, 9),
    ).resolves.toMatchObject({
      propertyId: 9,
      indexed: expect.any(Number),
    });

    expect(state.vectors.deleteBySource).toHaveBeenCalledWith(
      'PROPERTY',
      'old-public',
      42,
    );
    expect(state.vectors.deleteBySource).toHaveBeenCalledWith(
      'PROPERTY',
      'old-private',
      42,
    );
    expect(state.vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({
          propertyId: 9,
          tenantId: 42,
          audience: 'REALTOR',
        }),
      }),
    ]);
    expect(state.embeddings.embed).toHaveBeenCalledWith(
      expect.stringContaining('Lockbox code: 8472'),
    );
  });
  it('reindexes property fields with tenant and audience metadata', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_property')) {
        return {
          rows: [
            {
              id: 9,
              title: 'Oak Home',
              status: 'published',
              payload: { parking: 'Garage' },
            },
          ],
        };
      }
      if (
        sql.includes('SELECT source_hash') ||
        sql.includes('DELETE FROM tenant_chatbot_knowledge')
      ) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_knowledge')) {
        return { rows: [{ id: '81' }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);
    await expect(state.service.reindexKnowledge(tenant)).resolves.toMatchObject(
      {
        properties: 1,
        indexed: expect.any(Number),
      },
    );
    expect(state.vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({ tenantId: 42, scope: 'PROPERTY' }),
      }),
    ]);
  });

  it('resumes only a manually stopped lead conversation', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('UPDATE tenant_chatbot_conversation')) {
        return { rows: [{ id: '31' }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(state.service.resumeLead(tenant, 70, 9)).resolves.toEqual({
      resumed: true,
      conversationId: '31',
    });
    expect(
      query.mock.calls.find(([sql]) =>
        sql.includes('UPDATE tenant_chatbot_conversation'),
      )?.[0],
    ).toContain("stop_reason = 'MANUAL_STOP'");
  });
});
