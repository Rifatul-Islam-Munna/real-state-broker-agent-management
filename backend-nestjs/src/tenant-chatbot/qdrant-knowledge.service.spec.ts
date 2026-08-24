import { QdrantKnowledgeService } from './qdrant-knowledge.service';

describe('QdrantKnowledgeService', () => {
  const vector = Array.from({ length: 384 }, () => 0.01);
  const config = {
    url: 'http://qdrant:6333',
    apiKey: 'secret-key',
    collection: 'tenant_knowledge',
  };

  it('creates a cosine collection with exactly 384 dimensions', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    const service = new QdrantKnowledgeService(config, fetchMock as any);

    await service.ensureCollection();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://qdrant:6333/collections/tenant_knowledge',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          vectors: { size: 384, distance: 'Cosine' },
        }),
      }),
    );
  });

  it('filters tenant and audience before search and excludes other properties', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          points: [
            {
              id: 'point-1',
              score: 0.93,
              payload: {
                knowledgeId: '91',
                scope: 'PROPERTY',
                tenantId: 42,
                audience: 'LEAD',
                propertyId: 41,
                sourceType: 'PROPERTY_FIELD',
                sourceHash: 'abc',
                priority: 80,
                active: true,
              },
            },
          ],
        },
      }),
    }));
    const service = new QdrantKnowledgeService(config, fetchMock as any);

    const matches = await service.search({
      scope: 'TENANT',
      tenantId: 42,
      audience: 'LEAD',
      propertyId: 41,
      vector,
      limit: 5,
    });

    expect(matches[0]).toMatchObject({
      pointId: 'point-1',
      knowledgeId: '91',
      score: 0.93,
      tenantId: 42,
      audience: 'LEAD',
      propertyId: 41,
    });
    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.query).toHaveLength(384);
    expect(body.filter.must).toEqual(
      expect.arrayContaining([
        { key: 'tenantId', match: { value: 42 } },
        { key: 'audience', match: { value: 'LEAD' } },
        { key: 'active', match: { value: true } },
        { key: 'scope', match: { any: ['TENANT', 'PROPERTY'] } },
      ]),
    );
    expect(body.filter.should).toEqual([
      { key: 'propertyId', match: { value: 41 } },
      { is_empty: { key: 'propertyId' } },
    ]);
  });

  it('uses a separate platform scope and never adds a tenant filter', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: { points: [] } }),
    }));
    const service = new QdrantKnowledgeService(config, fetchMock as any);

    await service.search({
      scope: 'PLATFORM',
      audience: 'REALTOR',
      vector,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.filter.must).toEqual(
      expect.arrayContaining([
        { key: 'scope', match: { value: 'PLATFORM' } },
        { key: 'audience', match: { value: 'REALTOR' } },
      ]),
    );
    expect(
      body.filter.must.some((condition: any) => condition.key === 'tenantId'),
    ).toBe(false);
  });

  it('rejects a tenant query without a valid tenant id', async () => {
    const service = new QdrantKnowledgeService(config, jest.fn() as any);

    await expect(
      service.search({
        scope: 'TENANT',
        audience: 'LEAD',
        vector,
      }),
    ).rejects.toThrow('tenantId');
  });

  it('upserts only safe routing metadata and never source text', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: { status: 'completed' } }),
    }));
    const service = new QdrantKnowledgeService(config, fetchMock as any);

    await service.upsert([
      {
        pointId: 'point-2',
        vector,
        metadata: {
          scope: 'TENANT',
          tenantId: 42,
          audience: 'LEAD',
          propertyId: null,
          knowledgeId: '92',
          sourceType: 'MANUAL',
          sourceHash: 'safe-hash',
          priority: 50,
          active: true,
        },
        sourceText: 'owner secret should never be sent',
      } as any,
    ]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.points[0].payload).toEqual({
      scope: 'TENANT',
      tenantId: 42,
      audience: 'LEAD',
      propertyId: null,
      knowledgeId: '92',
      sourceType: 'MANUAL',
      sourceHash: 'safe-hash',
      priority: 50,
      active: true,
    });
    expect(JSON.stringify(body)).not.toContain('owner secret');
  });
});
