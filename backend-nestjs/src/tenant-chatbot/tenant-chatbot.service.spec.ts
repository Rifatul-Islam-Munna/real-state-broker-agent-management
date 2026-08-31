import { Logger } from '@nestjs/common';
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
    ai?: any,
    learning?: any,
  ) {
    const databases = {
      withTenantClient: jest.fn(async (_name: string, callback: any) =>
        callback({ query }),
      ),
    };
    const embeddings = {
      embed: jest.fn(async () => vector),
      modelSignature: jest.fn(() => 'snowflake/snowflake-arctic-embed-xs|q8|384|cls|arctic-query-v1'),
    };
    const vectors = {
      isConfigured: jest.fn(() => true),
      healthCheck: jest.fn(async () => ({ configured: true, connected: true, error: null })),
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
        ai,
        learning,
      ),
      databases,
      embeddings,
      vectors,
      platform,
    };
  }

  it('lets AI interpret a hard role reply even when local heuristics do not recognize it', async () => {
    const query = jest.fn(async () => ({ rows: [] }));
    const ai = {
      interpretReply: jest.fn(async () => ({
        recognized: true,
        role: 'LEAD',
        creditScore: null,
        monthlyEarning: null,
        period: null,
        confidence: 0.93,
        provider: 'OpenRouter',
        model: 'test-model',
      })),
    };
    const state = serviceWith(query, {}, [], ai);

    await expect(state.service.interpretTestReply(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      channel: 'WEB',
      expected: 'role',
      message: 'im looking for get this property',
    })).resolves.toMatchObject({ recognized: true, source: 'AI', role: 'LEAD' });
    expect(ai.interpretReply).toHaveBeenCalledWith(expect.objectContaining({
      expected: 'role',
      message: 'im looking for get this property',
    }));
  });

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
    const auditSql = query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO tenant_audit_log'),
    )?.[0];
    expect(auditSql).toContain(
      'tenant_audit_log(action, actor_master_user_id, summary, metadata)',
    );
    expect(auditSql).not.toContain('resource_type');
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

  it('defaults identity-free test mode to lead-safe evidence without writes', async () => {
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
      question: 'Can I park an SUV there?',
    });

    expect(result).toMatchObject({
      answer: 'The property includes a private driveway.',
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
      confidence: 0.95,
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

  it('keeps lockbox knowledge blocked in safe test mode even for REALTOR audience', async () => {
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
              answer: 'The lockbox code is 8472.',
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
      decision: 'STOP',
      answer: 'I do not have enough verified information to answer that. A team member can help.',
      confidence: null,
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
        question: 'What is the monthly rent?',
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

  it('uses grounded AI only for low-confidence retrieved evidence and queues the answer for review', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: activeSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
        id: 'pet', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
        sourceType: 'MANUAL', title: 'Animal policy',
        answer: 'One cat is allowed with written approval.', priority: 80, active: true,
      }] };
      return { rows: [] };
    });
    const ai = {
      answerFromEvidence: jest.fn().mockResolvedValue({
        answer: 'Yes, one cat is allowed if you have written approval.',
        provider: 'OpenRouter',
        model: 'free/model',
        confidence: 0.94,
      }),
    };
    const learning = { recordAnswer: jest.fn().mockResolvedValue({ id: 'candidate-1' }) };
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'pet', score: 0.7, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'pet',
          sourceType: 'MANUAL', sourceHash: 'pet', priority: 80, active: true,
        }])
        .mockResolvedValueOnce([]),
    }, [], ai, learning);

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'Could my little furball stay with me?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'AI_GROUNDED_FALLBACK',
      answer: 'Yes, one cat is allowed if you have written approval.',
      confidence: 0.94,
    });
    expect(ai.answerFromEvidence).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 42,
      propertyId: 41,
      question: 'Could my little furball stay with me?',
      evidence: [expect.objectContaining({ answer: 'One cat is allowed with written approval.' })],
    }));
    expect(learning.recordAnswer).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 42,
      propertyTitle: 'Lime Bay',
      answer: 'Yes, one cat is allowed if you have written approval.',
      provider: 'OpenRouter',
    }));
  });

  it.each(['WEB', 'SMS', 'EMAIL'] as const)('uses grounded AI fallback below the tenant threshold on %s', async (channel) => {
    const tenantSettings = normalizeChatbotSettings({
      enabled: true,
      channels: { web: true, email: true, sms: true },
      minimumConfidence: 0.8,
    });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: tenantSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
        id: 'water', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
        sourceType: 'MANUAL', title: 'Utilities', answer: 'Water is included in rent.', priority: 80, active: true,
      }] };
      return { rows: [] };
    });
    const ai = { answerFromEvidence: jest.fn().mockResolvedValue({
      answer: 'Water is included in rent.', provider: 'OpenRouter', model: 'free/model', confidence: 0.91,
    }) };
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{ pointId: 'water', score: 0.54, scope: 'PROPERTY', tenantId: 42, audience: 'LEAD', propertyId: 41, knowledgeId: 'water', sourceType: 'MANUAL', sourceHash: 'water', priority: 80, active: true }])
        .mockResolvedValueOnce([]),
    }, [], ai);

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      channel,
      question: 'what about that wet utility thing?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'AI_GROUNDED_FALLBACK',
      ai: { provider: 'OpenRouter', model: 'free/model' },
    });
    expect(ai.answerFromEvidence).toHaveBeenCalledWith(expect.objectContaining({ channel }));
  });

  it('uses each tenant minimum confidence before deciding whether AI fallback is needed', async () => {
    const tenantSettings = normalizeChatbotSettings({
      enabled: true,
      channels: { web: true, email: true, sms: true },
      minimumConfidence: 0.65,
    });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: tenantSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
        id: 'pet', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
        sourceType: 'MANUAL', title: 'Animal policy',
        answer: 'One cat is allowed with written approval.', priority: 80, active: true,
      }] };
      return { rows: [] };
    });
    const ai = { answerFromEvidence: jest.fn() };
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'pet', score: 0.7, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'pet',
          sourceType: 'MANUAL', sourceHash: 'pet', priority: 80, active: true,
        }])
        .mockResolvedValueOnce([]),
    }, [], ai);

    const result = await state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'Could my little furball stay with me?',
    });
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'EVIDENCE_VERIFIED', confidence: 0.7 });
    expect(ai.answerFromEvidence).not.toHaveBeenCalled();
  });
  it('does not call unrelated words inside listing text conflicting evidence', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return {
          rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return {
          rows: [
            {
              id: 'credit', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD', title: 'Minimum credit score',
              answer: 'The minimum credit score is 720.', priority: 90, active: true,
            },
            {
              id: 'description', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD', title: 'Description',
              answer: 'No co-signers allowed. Smoking is not allowed.', priority: 80, active: true,
            },
          ],
        };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([
          {
            pointId: 'credit', score: 0.91, scope: 'PROPERTY', tenantId: 42,
            audience: 'LEAD', propertyId: 41, knowledgeId: 'credit',
            sourceType: 'PROPERTY_FIELD', sourceHash: 'credit', priority: 90, active: true,
          },
          {
            pointId: 'description', score: 0.89, scope: 'PROPERTY', tenantId: 42,
            audience: 'LEAD', propertyId: 41, knowledgeId: 'description',
            sourceType: 'PROPERTY_FIELD', sourceHash: 'description', priority: 80, active: true,
          },
        ])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'What is the minimum credit score?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: 'The minimum credit score is 720.',
    });
  });

  it('accepts a lexical field match when MiniLM scores a misspelled question weakly', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return {
          rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return {
          rows: [{
            id: 'credit', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
            sourceType: 'PROPERTY_FIELD', title: 'Minimum credit score',
            answer: 'Minimum credit score: 720', priority: 50, active: true,
          }],
        };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'credit', score: 0.5, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'credit',
          sourceType: 'PROPERTY_FIELD', sourceHash: 'credit', priority: 50, active: true,
        }])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'what will be minimum credeit score to get the property?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: 'The minimum credit score is 720.',
      confidence: 0.95,
    });
    expect(state.vectors.search).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'TENANT', limit: 24 }),
    );
  });

  it('does not emit retrieval or decision thinking logs for test-chat', async () => {
    const trace = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return { rows: [{
          id: 'credit', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
          sourceType: 'PROPERTY_FIELD', title: 'Minimum credit score',
          answer: 'Minimum credit score: 720', priority: 90, active: true,
        }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'credit', score: 0.9, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'credit',
          sourceType: 'PROPERTY_FIELD', sourceHash: 'credit', priority: 90, active: true,
        }])
        .mockResolvedValueOnce([]),
    });

    await state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'What is the minimum credit score?',
    });

    const output = trace.mock.calls.flat().join('\\n');
    expect(output).not.toContain('chatbot.test.start');
    expect(output).not.toContain('chatbot.test.decision');
    expect(output).not.toContain('knowledgeId');
    trace.mockRestore();
  });

  it('reranks an exact one-word fact above a higher vector-score overview', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return { rows: [
          {
            id: 'overview', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
            sourceType: 'PROPERTY_FIELD', title: 'Description',
            answer: 'A spacious condo near shopping and restaurants.', priority: 80, active: true,
          },
          {
            id: 'parking', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
            sourceType: 'PROPERTY_FIELD', title: 'Parking',
            answer: 'Parking: 1 assigned spot and 1 guest parking spot.', priority: 70, active: true,
          },
        ] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([
          {
            pointId: 'overview', score: 0.72, scope: 'PROPERTY', tenantId: 42,
            audience: 'LEAD', propertyId: 41, knowledgeId: 'overview',
            sourceType: 'PROPERTY_FIELD', sourceHash: 'overview', priority: 80, active: true,
          },
          {
            pointId: 'parking', score: 0.45, scope: 'PROPERTY', tenantId: 42,
            audience: 'LEAD', propertyId: 41, knowledgeId: 'parking',
            sourceType: 'PROPERTY_FIELD', sourceHash: 'parking', priority: 70, active: true,
          },
        ])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'Parking?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: 'Yes. This property includes 1 assigned parking spot and 1 guest parking spot.',
      confidence: 0.95,
    });
  });

  it.each([
    {
      question: 'is pet allwoed ?',
      score: 0.32,
      title: 'Pet policy',
      answer: "No, pets aren't allowed at this property.",
      storedAnswer: 'Pet policy: No.',
    },
    {
      question: 'is there any parking spot ?',
      score: 0.5,
      title: 'Parking',
      answer: 'Yes. This property includes 1 assigned parking spot and 1 guest parking spot.',
      storedAnswer: 'Parking: 1 assigned spot and 1 guest parking spot.',
    },
    {
      question: 'how mnay credit score need ?',
      score: 0.38,
      title: 'Minimum credit score',
      answer: 'The minimum credit score is 720.',
      storedAnswer: 'Minimum credit score: 720',
    },
  ])('answers short typo-heavy property question: $question', async ({
    question: userQuestion,
    score,
    title,
    answer,
    storedAnswer,
  }) => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      if (sql.includes('FROM tenant_property')) {
        return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return { rows: [{
          id: 'fact', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
          sourceType: 'PROPERTY_FIELD', title, answer: storedAnswer ?? answer, priority: 85, active: true,
        }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'fact', score, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'fact',
          sourceType: 'PROPERTY_FIELD', sourceHash: 'fact', priority: 85, active: true,
        }])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: userQuestion,
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer,
      confidence: 0.95,
    });
  });

  it('treats dog wording as pet-policy intent and answers naturally', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: activeSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
        id: 'pet', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
        sourceType: 'PROPERTY_FIELD', title: 'Lime Bay Ã¢â‚¬â€ Pet policy',
        answer: 'Pet policy: No.', priority: 85, active: true,
      }] };
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'pet', score: 0.31, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'pet',
          sourceType: 'PROPERTY_FIELD', sourceHash: 'pet', priority: 85, active: true,
        }])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'is my dog allow in here?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: "No, pets aren't allowed at this property.",
      confidence: 0.95,
    });
  });

  it('turns verified parking evidence into a human answer', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: activeSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
        id: 'parking', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
        sourceType: 'PROPERTY_FIELD', title: 'Lime Bay Ã¢â‚¬â€ Parking',
        answer: 'Parking: paking spot 1 and 1 guest parking', priority: 85, active: true,
      }] };
      return { rows: [] };
    });
    const state = serviceWith(query, {
      search: jest.fn()
        .mockResolvedValueOnce([{
          pointId: 'parking', score: 0.95, scope: 'PROPERTY', tenantId: 42,
          audience: 'LEAD', propertyId: 41, knowledgeId: 'parking',
          sourceType: 'PROPERTY_FIELD', sourceHash: 'parking', priority: 85, active: true,
        }])
        .mockResolvedValueOnce([]),
    });

    await expect(state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'is there any parking spot?',
    })).resolves.toMatchObject({
      decision: 'ANSWER',
      answer: 'Yes. This property includes 1 assigned parking spot and 1 guest parking spot.',
    });
  });

  it('throws a clear Qdrant error in tenant test mode without calling the model', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) {
        return { rows: [{ value: activeSettings }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, {
      isConfigured: jest.fn(() => false),
      healthCheck: jest.fn(async () => ({
        configured: false,
        connected: false,
        error: 'Qdrant URL and collection must be configured.',
      })),
    });

    await expect(
      state.service.testQuestion(tenant, {
        audience: 'LEAD',
        question: 'What is the rent?',
      }),
    ).rejects.toThrow('Qdrant unavailable');
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
      if (sql.includes('UPDATE tenant_lead')) return { rows: [{ id: 70 }] };
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
      expect.stringContaining('8472'),
      'document',
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
      if (sql.includes('UPDATE tenant_lead')) return { rows: [{ id: 70 }] };
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

  it('persists a lead-level manual chatbot stop even when no conversation exists yet', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('UPDATE tenant_lead') && sql.includes('chatbot_manually_stopped = true')) {
        return { rows: [{ id: 70 }] };
      }
      if (sql.includes('UPDATE tenant_chatbot_conversation')) return { rows: [] };
      return { rows: [] };
    });
    const state = serviceWith(query);

    await expect(state.service.stopLead(tenant, 70, 9)).resolves.toEqual({
      stopped: true,
      conversationIds: [],
    });
  });

  it('keeps a manually stopped lead silent before vector retrieval', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: activeSettings }] };
      if (sql.includes('SELECT chatbot_manually_stopped')) {
        return { rows: [{ chatbotManuallyStopped: true }] };
      }
      return { rows: [] };
    });
    const state = serviceWith(query, { search: jest.fn(async () => []) });

    await expect(state.service.handleMessage(tenant, {
      channel: 'SMS',
      audience: 'LEAD',
      leadId: 70,
      sessionId: 'sms:70',
      idempotencyKey: 'stopped-lead-1',
      body: 'Is this still available?',
    })).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'MANUAL_STOP',
      queued: false,
    });
    expect(state.vectors.search).not.toHaveBeenCalled();
  });

  it('lists only seven-day chatbot activity with lead and property context', async () => {
    const query = jest.fn(async () => ({ rows: [{ id: 'm1', leadName: 'Sam', propertyTitle: 'Oak Home' }] }));
    const state = serviceWith(query);

    await expect(state.service.listActivity(tenant)).resolves.toHaveLength(1);
    const sql = query.mock.calls[0]?.[0] ?? '';
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain('tenant_lead');
    expect(sql).toContain('tenant_property');
  });

  it('physically removes chatbot messages and events older than seven days', async () => {
    const query = jest.fn(async (sql: string) => ({ rows: [], rowCount: sql.includes('tenant_chatbot_message') ? 4 : 3 }));
    const state = serviceWith(query);

    await expect(state.service.cleanupExpiredActivity(tenant)).resolves.toEqual({ messagesDeleted: 4, eventsDeleted: 3 });
    expect(query.mock.calls.map(([sql]) => sql).join('\n')).toContain("interval '7 days'");
  });

  it('treats landlord and HOA income facts as complementary and answers noisy income phrasing', async () => {
    const rows = [
      { id: 'income3x', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'Income requirement', answer: 'Income requirement: Minimum 3x the rent', priority: 90, active: true },
      { id: 'monthly', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'Minimum monthly income', answer: 'Minimum monthly income: $4,650', priority: 90, active: true },
      { id: 'hoa', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'HOA income criteria', answer: 'HOA income criteria: $40,000 yearly', priority: 85, active: true },
      { id: 'dti', propertyId: 41, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'Debt to income ratio', answer: 'Debt to income ratio: must not exceed 40%', priority: 85, active: true },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: activeSettings }] };
      if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
      if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows };
      return { rows: [] };
    });
    const matches = rows.map((row, index) => ({
      pointId: row.id, score: 0.9 - index * 0.01, scope: 'PROPERTY', tenantId: 42,
      audience: 'LEAD', propertyId: 41, knowledgeId: row.id, sourceType: 'PROPERTY_FIELD',
      sourceHash: row.id, priority: row.priority, active: true,
    }));
    const state = serviceWith(query, {
      search: jest.fn().mockResolvedValueOnce(matches).mockResolvedValueOnce([]),
    });

    const result = await state.service.testQuestion(tenant, {
      propertyId: 41,
      audience: 'LEAD',
      question: 'what will be at last income for need for this propraty?',
    });

    expect(result.decision).toBe('ANSWER');
    expect(result.reason).toBe('EVIDENCE_VERIFIED');
    expect(result.answer).toContain('4,650');
    expect(result.answer).toContain('40,000');
    expect(result.answer).not.toContain('conflicting');
  });

});
