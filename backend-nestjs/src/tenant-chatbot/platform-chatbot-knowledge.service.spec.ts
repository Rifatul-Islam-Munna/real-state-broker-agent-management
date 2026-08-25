import { PlatformChatbotKnowledgeService } from './platform-chatbot-knowledge.service';

describe('PlatformChatbotKnowledgeService', () => {
  it('indexes active platform knowledge without tenant metadata', async () => {
    const saved = {
      id: 'platform-1',
      audience: 'LEAD',
      title: 'Fair housing',
      answer: 'Applications are evaluated under the published criteria.',
      questionExamples: ['How are applications evaluated?'],
      priority: 80,
      active: true,
      sourceHash: 'hash',
      qdrantPointId: 'point-1',
      sourceType: 'PLATFORM_MANUAL',
      indexStatus: 'pending',
    };
    const repository = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => Object.assign(saved, input)),
      find: jest.fn(async () => [saved]),
      findOne: jest.fn(async () => saved),
      delete: jest.fn(async () => ({ affected: 1 })),
    };
    const embeddings = {
      embed: jest.fn(async () => Array(384).fill(0.01)),
    };
    const vectors = {
      ensureCollection: jest.fn(async () => undefined),
      upsert: jest.fn(async () => undefined),
      deleteBySource: jest.fn(async () => undefined),
    };
    const auditRepository = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
    };
    const service = new PlatformChatbotKnowledgeService(
      repository as any,
      auditRepository as any,
      embeddings as any,
      vectors as any,
    );

    await service.create({
      audience: 'LEAD',
      title: saved.title,
      answer: saved.answer,
      questionExamples: saved.questionExamples,
      priority: 80,
    }, 9);

    expect(vectors.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: expect.objectContaining({
          scope: 'PLATFORM',
          knowledgeId: 'platform-1',
          audience: 'LEAD',
        }),
      }),
    ]);
    const metadata = vectors.upsert.mock.calls[0][0][0].metadata;
    expect(metadata.tenantId).toBeUndefined();
    expect(auditRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'chatbot.knowledge.create',
        actorUserId: 9,
        metadata: expect.objectContaining({ knowledgeId: 'platform-1' }),
      }),
    );
    await expect(service.findActiveByIds(['platform-1'], 'LEAD'))
      .resolves.toHaveLength(1);
  });

  it('audits updates and deletes while removing disabled evidence from Qdrant', async () => {
    const current = {
      id: 'platform-2', audience: 'REALTOR', title: 'Showing access', answer: 'Use staff instructions.',
      questionExamples: [], priority: 70, active: true, sourceHash: 'old-hash',
      qdrantPointId: 'point-2', sourceType: 'PLATFORM_MANUAL', indexStatus: 'indexed', lastError: '',
    };
    const repository = {
      findOne: jest.fn(async () => current),
      save: jest.fn(async (input) => input),
      delete: jest.fn(async () => ({ affected: 1 })),
    };
    const auditRepository = { create: jest.fn((input) => input), save: jest.fn(async (input) => input) };
    const embeddings = { embed: jest.fn(async () => Array(384).fill(0.01)) };
    const vectors = {
      ensureCollection: jest.fn(async () => undefined),
      upsert: jest.fn(async () => undefined),
      deleteBySource: jest.fn(async () => undefined),
    };
    const service = new PlatformChatbotKnowledgeService(
      repository as any, auditRepository as any, embeddings as any, vectors as any,
    );

    await expect(service.update('platform-2', { active: false }, 11))
      .resolves.toMatchObject({ active: false, indexStatus: 'indexed' });
    expect(vectors.deleteBySource).toHaveBeenCalledWith('PLATFORM', 'old-hash');
    expect(vectors.upsert).not.toHaveBeenCalled();
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'chatbot.knowledge.update', actorUserId: 11,
    }));

    await expect(service.delete('platform-2', 12)).resolves.toEqual({ deleted: true, id: 'platform-2' });
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'chatbot.knowledge.delete', actorUserId: 12,
    }));
  });

  it('reindexes active platform knowledge and audits the operation', async () => {
    const items = [
      {
        id: 'platform-3', audience: 'LEAD', title: 'Applications', answer: 'Apply online.',
        questionExamples: [], priority: 60, active: true, sourceHash: 'hash-3',
        qdrantPointId: 'point-3', sourceType: 'PLATFORM_MANUAL', indexStatus: 'indexed', lastError: '',
      },
      {
        id: 'platform-4', audience: 'LEAD', title: 'Old policy', answer: 'Archived.',
        questionExamples: [], priority: 10, active: false, sourceHash: 'hash-4',
        qdrantPointId: 'point-4', sourceType: 'PLATFORM_MANUAL', indexStatus: 'indexed', lastError: '',
      },
    ];
    const repository = {
      find: jest.fn(async () => items),
      save: jest.fn(async (input) => input),
    };
    const auditRepository = { create: jest.fn((input) => input), save: jest.fn(async (input) => input) };
    const embeddings = { embed: jest.fn(async () => Array(384).fill(0.01)) };
    const vectors = {
      ensureCollection: jest.fn(async () => undefined),
      upsert: jest.fn(async () => undefined),
      deleteBySource: jest.fn(async () => undefined),
    };
    const service = new PlatformChatbotKnowledgeService(
      repository as any, auditRepository as any, embeddings as any, vectors as any,
    );

    await expect(service.reindex(13)).resolves.toEqual({ total: 2, indexed: 1 });
    expect(vectors.deleteBySource).toHaveBeenCalledWith('PLATFORM', 'hash-3');
    expect(vectors.deleteBySource).toHaveBeenCalledWith('PLATFORM', 'hash-4');
    expect(vectors.upsert).toHaveBeenCalledTimes(1);
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      action: 'chatbot.knowledge.reindex', actorUserId: 13,
    }));
  });
});
