import { PlatformChatbotLearningService } from './platform-chatbot-learning.service';

const tenant = {
  id: 42,
  slug: 'alpha-realty',
  businessName: 'Alpha Realty',
  databaseName: 'tenant_42_alpha',
};

function harness(overrides: Record<string, any> = {}) {
  const repository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((value) => ({ id: 'candidate-1', ...value })),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
    ...overrides.repository,
  };
  const tenants = {
    findOne: jest.fn().mockResolvedValue(tenant),
    find: jest.fn().mockResolvedValue([tenant]),
    ...overrides.tenants,
  };
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("source_type = 'AI_APPROVED'")) return { rows: [] };
    if (sql.includes('INSERT INTO tenant_chatbot_knowledge')) return { rows: [{ id: '88' }] };
    return { rows: [] };
  });
  const databases = {
    withTenantClient: jest.fn(async (_name: string, callback: any) => callback({ query })),
    ...overrides.databases,
  };
  const embeddings = {
    embed: jest.fn().mockResolvedValue(Array.from({ length: 384 }, () => 0.01)),
    modelSignature: jest.fn(() => 'arctic-signature'),
    ...overrides.embeddings,
  };
  const vectors = {
    isConfigured: jest.fn(() => true),
    upsert: jest.fn().mockResolvedValue(undefined),
    deleteBySource: jest.fn().mockResolvedValue(undefined),
    searchLearning: jest.fn().mockResolvedValue([]),
    ...overrides.vectors,
  };
  const platform = {
    getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue({ reviewLearningEnabled: true }),
    ...overrides.platform,
  };
  const service = new PlatformChatbotLearningService(
    repository as any,
    tenants as any,
    databases as any,
    embeddings as any,
    vectors as any,
    platform as any,
  );
  return { service, repository, tenants, databases, query, embeddings, vectors, platform };
}

describe('PlatformChatbotLearningService', () => {
  it('compacts the same grounded AI answer across different human phrasings and keeps examples', async () => {
    const state = harness();
    const input = {
      tenantId: 42,
      tenantName: 'Alpha Realty',
      propertyId: 9,
      propertyTitle: 'Lime Bay',
      audience: 'LEAD' as const,
      channel: 'WEB' as const,
      kind: 'ANSWER' as const,
      question: 'Do I pay water?',
      answer: 'Water is included.',
      evidenceKnowledgeIds: ['water'],
      provider: 'OpenRouter',
      model: 'free/a',
      confidence: 0.92,
    };
    state.repository.findOne.mockResolvedValueOnce(null);
    const first = await state.service.record(input);
    expect(first).toMatchObject({
      occurrences: 1,
      status: 'PENDING',
      structuredPayload: { questionExamples: ['Do I pay water?'] },
    });

    state.repository.findOne.mockResolvedValueOnce(first);
    const second = await state.service.record({
      ...input,
      question: 'is the water bill on me?',
      model: 'free/b',
    });
    expect(second).toMatchObject({
      id: 'candidate-1',
      occurrences: 2,
      answer: 'Water is included.',
      model: 'free/b',
      status: 'PENDING',
      structuredPayload: { questionExamples: ['Do I pay water?', 'is the water bill on me?'] },
    });
    expect(state.repository.create).toHaveBeenCalledTimes(1);
  });

  it('bulk approval publishes an answer into tenant knowledge and Qdrant', async () => {
    const row: any = {
      id: 'candidate-9',
      fingerprint: 'fp',
      tenantId: 42,
      tenantName: 'Alpha Realty',
      propertyId: 9,
      propertyTitle: 'Lime Bay',
      audience: 'LEAD',
      channel: 'EMAIL',
      kind: 'ANSWER',
      status: 'PENDING',
      question: 'What comes with the rent?',
      questionHash: 'qh',
      answer: 'Water and internet are included.',
      structuredPayload: null,
      evidenceKnowledgeIds: ['water', 'internet'],
      provider: 'OpenRouter',
      model: 'free/a',
      confidence: 0.95,
      occurrences: 7,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      reviewedByMasterUserId: null,
      reviewedAt: null,
      qdrantPointId: null,
      sourceHash: null,
    };
    const state = harness({
      repository: { find: jest.fn().mockResolvedValue([row]) },
    });

    const result = await state.service.review(['candidate-9'], 'APPROVED', 12);
    expect(result).toMatchObject({ requested: 1, succeeded: 1, failed: 0 });
    expect(row.status).toBe('APPROVED');
    expect(row.reviewedByMasterUserId).toBe(12);
    expect(state.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO tenant_chatbot_knowledge'))).toBe(true);
    expect(state.embeddings.embed).toHaveBeenCalledWith(
      'What comes with the rent?\nWater and internet are included.',
      'document',
    );
    expect(state.vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({
          scope: 'PROPERTY',
          tenantId: 42,
          propertyId: 9,
          sourceType: 'AI_APPROVED',
          knowledgeId: '88',
        }),
      }),
    ]);
  });

  it('permanently deletes rejected learning items after removing any published knowledge', async () => {
    const row: any = {
      id: 'reject-1', tenantId: 42, tenantName: 'Alpha Realty', propertyId: 9,
      propertyTitle: 'Lime Bay', audience: 'LEAD', channel: 'WEB', kind: 'ANSWER',
      status: 'APPROVED', question: 'wifi?', answer: 'Internet is included.',
      structuredPayload: { questionExamples: ['wifi?'] }, evidenceKnowledgeIds: ['internet'], provider: 'OpenRouter',
      model: 'free/a', confidence: 0.9, occurrences: 2, sourceHash: 'approved-hash',
      qdrantPointId: 'point-1', reviewedByMasterUserId: 7, reviewedAt: new Date(),
    };
    const state = harness({ repository: { find: jest.fn().mockResolvedValue([row]) } });

    const result = await state.service.review(['reject-1'], 'REJECTED', 12);

    expect(result).toMatchObject({ requested: 1, succeeded: 1, failed: 0 });
    expect(state.repository.remove).toHaveBeenCalledWith(row);
    expect(state.query.mock.calls.some(([sql]) => sql.includes("source_type = 'AI_APPROVED'"))).toBe(true);
    expect(state.repository.save).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'reject-1', status: 'REJECTED' }));
  });

  it('moves approved property-derived answers back to review when source property knowledge changes', async () => {
    const row: any = {
      id: 'stale-1', tenantId: 42, tenantName: 'Alpha Realty', propertyId: 9,
      propertyTitle: 'Lime Bay', audience: 'LEAD', channel: 'WEB', kind: 'ANSWER',
      status: 'APPROVED', question: 'wifi?', answer: 'Internet is included.',
      structuredPayload: { questionExamples: ['wifi?'] }, evidenceKnowledgeIds: ['internet'], provider: 'OpenRouter',
      model: 'free/a', confidence: 0.9, occurrences: 2, sourceHash: 'approved-hash',
      qdrantPointId: 'point-1', reviewedByMasterUserId: 7, reviewedAt: new Date(),
    };
    const find = jest.fn().mockResolvedValue([row]);
    const state = harness({ repository: { find } });
    await expect(state.service.invalidateApprovedAnswersForProperty(42, 9)).resolves.toEqual({ invalidated: 1 });
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 42, propertyId: 9, kind: 'ANSWER', status: 'APPROVED' }),
    }));
    expect(row.status).toBe('PENDING');
    expect(row.reviewedByMasterUserId).toBeNull();
    expect(row.structuredPayload).toMatchObject({ questionExamples: ['wifi?'], reviewReason: 'PROPERTY_KNOWLEDGE_CHANGED' });
    expect(state.repository.save).toHaveBeenCalledWith(row);
  });

  it('invalidates tenant-wide and property learned answers together when all tenant knowledge is rebuilt', async () => {
    const rows: any[] = [
      { id: 'tenant-answer', tenantId: 42, propertyId: null, kind: 'ANSWER', status: 'APPROVED', structuredPayload: null, sourceHash: null },
      { id: 'property-answer', tenantId: 42, propertyId: 9, kind: 'ANSWER', status: 'APPROVED', structuredPayload: null, sourceHash: null },
    ];
    const find = jest.fn().mockResolvedValue(rows);
    const state = harness({ repository: { find } });
    await expect(state.service.invalidateApprovedAnswersForProperty(42)).resolves.toEqual({ invalidated: 2 });
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 42, kind: 'ANSWER', status: 'APPROVED' },
    }));
    expect(rows.every((row) => row.status === 'PENDING')).toBe(true);
    expect(rows.every((row) => row.structuredPayload?.reviewReason === 'TENANT_KNOWLEDGE_CHANGED')).toBe(true);
  });

  it('uses exact approved role learning without vector lookup', async () => {
    const approved: any = {
      id: 'role-1',
      status: 'APPROVED',
      structuredPayload: { expected: 'role', role: 'LEAD' },
    };
    const state = harness({
      repository: { find: jest.fn().mockResolvedValue([approved]) },
    });
    await expect(state.service.approvedQualificationHint({
      tenantId: 42,
      audience: 'LEAD',
      expected: 'role',
      message: 'its just for me and my family',
    })).resolves.toMatchObject({ exact: true, score: 1, candidateId: 'role-1', role: 'LEAD' });
    expect(state.vectors.searchLearning).not.toHaveBeenCalled();
  });

  it('returns approved exact values and semantic role patterns without an AI call', async () => {
    const exactIncome: any = {
      id: 'income-exact',
      status: 'APPROVED',
      structuredPayload: { expected: 'monthlyEarning', monthlyEarning: 5417, period: 'BIWEEKLY' },
    };
    const semanticRole: any = {
      id: 'role-semantic',
      status: 'APPROVED',
      structuredPayload: { expected: 'role', role: 'REALTOR' },
    };
    const state = harness({
      repository: {
        find: jest.fn()
          .mockResolvedValueOnce([exactIncome])
          .mockResolvedValueOnce([]),
        findOne: jest.fn().mockResolvedValue(semanticRole),
      },
      vectors: {
        searchLearning: jest.fn().mockResolvedValue([{ score: 0.94, knowledgeId: 'role-semantic' }]),
      },
    });
    await expect(state.service.approvedQualificationHint({
      tenantId: 42,
      audience: 'LEAD',
      expected: 'monthlyEarning',
      message: 'i receive a couple and a half thousand every two weeks before tax',
    })).resolves.toMatchObject({ exact: true, monthlyEarning: 5417 });
    await expect(state.service.approvedQualificationHint({
      tenantId: 42,
      audience: 'LEAD',
      expected: 'role',
      message: 'handling this transaction for my purchaser',
    })).resolves.toMatchObject({ exact: false, role: 'REALTOR', score: 0.94 });
  });

  it('remaps a portable backup property by unique title when numeric IDs differ', async () => {
    const clientQuery = jest.fn(async (sql: string) => {
      if (sql.includes('id = $1 AND lower')) return { rows: [] };
      if (sql.includes('lower(trim(title))')) return { rows: [{ id: 77 }] };
      return { rows: [] };
    });
    const state = harness({
      databases: {
        withTenantClient: jest.fn(async (_name: string, callback: any) => callback({ query: clientQuery })),
      },
    });
    await expect((state.service as any).resolveImportedPropertyId(tenant, 9, 'Lime Bay')).resolves.toBe(77);
  });

  it('restores a compact v2 learning pack and re-indexes it as approved local knowledge', async () => {
    let candidate: any = null;
    const state = harness({
      repository: {
        create: jest.fn((value) => (candidate = { id: 'imported-1', ...value })),
        save: jest.fn(async (value) => value),
        find: jest.fn(async () => candidate ? [candidate] : []),
      },
    });
    const pack = {
      format: 'platform-chatbot-learning-pack-v2',
      v: 2,
      items: [{
        i: 42,
        t: 'alpha-realty',
        a: 'L',
        k: 'A',
        q: ['wifi?', 'does the rent include internet?'],
        r: 'Internet is included.',
      }],
    };

    await expect(state.service.importApproved(pack, 12)).resolves.toMatchObject({
      imported: 1,
      approved: 1,
      skipped: 0,
      total: 1,
    });
    expect(candidate).toMatchObject({
      tenantId: 42,
      audience: 'LEAD',
      kind: 'ANSWER',
      question: 'wifi?',
      answer: 'Internet is included.',
      provider: 'IMPORT',
      model: 'learning-pack-v2',
      structuredPayload: { questionExamples: ['wifi?', 'does the rent include internet?'] },
    });
    expect(state.vectors.upsert).toHaveBeenCalled();
  });
  it('exports only approved knowledge as a compact portable learning pack', async () => {
    const approved: any = {
      id: 'answer-1', tenantId: 42, tenantName: 'Alpha Realty', propertyId: null,
      propertyTitle: '', audience: 'LEAD', kind: 'ANSWER', status: 'APPROVED',
      question: 'wifi?', answer: 'Internet is included.',
      structuredPayload: { questionExamples: ['wifi?', 'does the rent include internet?'] },
      evidenceKnowledgeIds: ['internet'], provider: 'OpenRouter', model: 'free/model', updatedAt: new Date(),
    };
    const state = harness({ repository: { find: jest.fn().mockResolvedValue([approved]) } });
    const backup = await state.service.exportApproved();
    expect(backup).toMatchObject({
      format: 'platform-chatbot-learning-pack-v2',
      v: 2,
      items: [{
        i: 42,
        t: 'alpha-realty',
        a: 'L',
        k: 'A',
        q: ['wifi?', 'does the rent include internet?'],
        r: 'Internet is included.',
      }],
    });
    const serialized = JSON.stringify(backup);
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('OpenRouter');
    expect(serialized).not.toContain('free/model');
    expect(serialized).not.toContain('evidenceKnowledgeIds');
  });
});
