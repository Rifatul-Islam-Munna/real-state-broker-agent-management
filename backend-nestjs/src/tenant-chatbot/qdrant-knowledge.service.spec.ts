import { Test } from '@nestjs/testing';
import { QdrantKnowledgeService } from './qdrant-knowledge.service';

describe('QdrantKnowledgeService', () => {
  const vector = Array.from({ length: 384 }, () => 0.01);
  const config = {
    url: 'http://qdrant:6333',
    apiKey: 'secret-key',
    collection: 'tenant_knowledge',
  };

  it('uses the Qdrant SDK to create a cosine collection with exactly 384 dimensions', async () => {
    const client = {
      getCollection: jest.fn().mockRejectedValue({ status: 404 }),
      createCollection: jest.fn().mockResolvedValue(true),
    };
    const service = new QdrantKnowledgeService(config, client as any);

    await service.ensureCollection();

    expect(client.getCollection).toHaveBeenCalledWith('tenant_knowledge');
    expect(client.createCollection).toHaveBeenCalledWith('tenant_knowledge', {
      vectors: { size: 384, distance: 'Cosine' },
    });
  });

  it('rejects an existing collection with the wrong vector configuration', async () => {
    const client = {
      getCollection: jest.fn().mockResolvedValue({
        config: { params: { vectors: { size: 768, distance: 'Cosine' } } },
      }),
    };
    const service = new QdrantKnowledgeService(config, client as any);

    await expect(service.ensureCollection()).rejects.toThrow(
      '384-dimensional Cosine',
    );
  });

  it('filters tenant and audience before search and excludes other properties', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({
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
      }),
    };
    const service = new QdrantKnowledgeService(config, client as any);

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
    const [, request] = client.query.mock.calls[0];
    expect(request.query).toHaveLength(384);
    expect(request.filter.must).toEqual(
      expect.arrayContaining([
        { key: 'tenantId', match: { value: 42 } },
        { key: 'audience', match: { value: 'LEAD' } },
        { key: 'active', match: { value: true } },
        { key: 'scope', match: { any: ['TENANT', 'PROPERTY'] } },
      ]),
    );
    expect(request.filter.should).toEqual([
      { key: 'propertyId', match: { value: 41 } },
      { is_empty: { key: 'propertyId' } },
    ]);
  });

  it('uses a separate platform scope and never adds a tenant filter', async () => {
    const client = { query: jest.fn().mockResolvedValue({ points: [] }) };
    const service = new QdrantKnowledgeService(config, client as any);

    await service.search({ scope: 'PLATFORM', audience: 'REALTOR', vector });

    const request = client.query.mock.calls[0][1];
    expect(request.filter.must).toEqual(
      expect.arrayContaining([
        { key: 'scope', match: { value: 'PLATFORM' } },
        { key: 'audience', match: { value: 'REALTOR' } },
      ]),
    );
    expect(
      request.filter.must.some(
        (condition: any) => condition.key === 'tenantId',
      ),
    ).toBe(false);
  });

  it('rejects a tenant query without a valid tenant id', async () => {
    const service = new QdrantKnowledgeService(config, {
      query: jest.fn(),
    } as any);

    await expect(
      service.search({
        scope: 'TENANT',
        audience: 'LEAD',
        vector,
      }),
    ).rejects.toThrow('tenantId');
  });

  it('upserts only safe routing metadata and never source text', async () => {
    const client = {
      upsert: jest.fn().mockResolvedValue({ status: 'completed' }),
    };
    const service = new QdrantKnowledgeService(config, client as any);

    await service.upsert([
      {
        pointId: 'aee6f192-fda3-4e1e-a59c-f1f15006eb15',
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

    const request = client.upsert.mock.calls[0][1];
    expect(request.wait).toBe(true);
    expect(request.points[0].payload).toEqual({
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
    expect(JSON.stringify(request)).not.toContain('owner secret');
  });

  it('checks Qdrant collection during Nest application bootstrap', async () => {
    const client = {
      getCollection: jest.fn().mockResolvedValue({
        config: { params: { vectors: { size: 384, distance: 'Cosine' } } },
      }),
      createCollection: jest.fn(),
    };
    const service = new QdrantKnowledgeService(config, client as any);

    await service.onApplicationBootstrap();

    expect(client.getCollection).toHaveBeenCalledWith('tenant_knowledge');
    expect(client.createCollection).not.toHaveBeenCalled();
  });
  it('can be instantiated by Nest without requiring a config injection token', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [QdrantKnowledgeService],
    }).compile();
    expect(moduleRef.get(QdrantKnowledgeService)).toBeInstanceOf(
      QdrantKnowledgeService,
    );
    await moduleRef.close();
  });
});
