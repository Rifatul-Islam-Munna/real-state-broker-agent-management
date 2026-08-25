import { createHash, randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SaasAdminAuditLog } from '../saas-admin/entities/saas-admin-audit-log.entity';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';
import { PlatformChatbotKnowledge } from './platform-chatbot-knowledge.entity';
import { QdrantKnowledgeService } from './qdrant-knowledge.service';
import { ChatbotAudience } from './tenant-chatbot.types';

export type PlatformKnowledgeInput = {
  audience: ChatbotAudience;
  title: string;
  answer: string;
  questionExamples?: string[];
  priority?: number;
  active?: boolean;
};

@Injectable()
export class PlatformChatbotKnowledgeService {
  constructor(
    @InjectRepository(PlatformChatbotKnowledge)
    private readonly repository: Repository<PlatformChatbotKnowledge>,
    @InjectRepository(SaasAdminAuditLog)
    private readonly auditRepository: Repository<SaasAdminAuditLog>,
    private readonly embeddings: MiniLmEmbeddingService,
    private readonly vectors: QdrantKnowledgeService,
  ) {}
  list() {
    return this.repository.find({ order: { active: 'DESC', priority: 'DESC', updatedAt: 'DESC' } });
  }

  findActiveByIds(ids: string[], audience: ChatbotAudience) {
    if (!ids.length) return Promise.resolve([]);
    return this.repository.find({
      where: { id: In(ids), audience, active: true },
    });
  }

  async create(input: PlatformKnowledgeInput, actorId?: number | null) {
    const normalized = this.normalize(input);
    const entity = this.repository.create({
      ...normalized,
      sourceHash: this.hash(normalized),
      qdrantPointId: randomUUID(),
      sourceType: 'PLATFORM_MANUAL',
      indexStatus: 'pending',
      lastError: '',
      createdByMasterUserId: positiveId(actorId),
    });
    const saved = await this.repository.save(entity);
    const indexed = await this.index(saved);
    await this.audit(
      'chatbot.knowledge.create',
      actorId,
      `Created platform chatbot knowledge ${indexed.title}`,
      { knowledgeId: indexed.id, audience: indexed.audience },
    );
    return indexed;
  }
  async update(
    id: string,
    patch: Partial<PlatformKnowledgeInput>,
    actorId?: number | null,
  ) {
    const current = await this.repository.findOne({ where: { id } });
    if (!current) throw new NotFoundException('Platform knowledge was not found.');
    const normalized = this.normalize({ ...current, ...patch });
    const oldHash = current.sourceHash;
    Object.assign(current, normalized, {
      sourceHash: this.hash(normalized),
      indexStatus: 'pending',
      lastError: '',
    });
    if (oldHash) await this.vectors.deleteBySource('PLATFORM', oldHash);
    const saved = await this.repository.save(current);
    let result: PlatformChatbotKnowledge;
    if (!saved.active) {
      saved.indexStatus = 'indexed';
      result = await this.repository.save(saved);
    } else {
      result = await this.index(saved);
    }
    await this.audit(
      'chatbot.knowledge.update',
      actorId,
      `Updated platform chatbot knowledge ${result.title}`,
      { knowledgeId: result.id, audience: result.audience, active: result.active },
    );
    return result;
  }

  async delete(id: string, actorId?: number | null) {
    const current = await this.repository.findOne({ where: { id } });
    if (!current) return { deleted: false, id };
    if (current.sourceHash) {
      await this.vectors.deleteBySource('PLATFORM', current.sourceHash);
    }
    await this.repository.delete(id);
    await this.audit(
      'chatbot.knowledge.delete',
      actorId,
      `Deleted platform chatbot knowledge ${current.title}`,
      { knowledgeId: current.id, audience: current.audience },
    );
    return { deleted: true, id };
  }

  async reindex(actorId?: number | null) {
    const items = await this.repository.find({
      order: { active: 'DESC', priority: 'DESC', updatedAt: 'DESC' },
    });
    let indexed = 0;
    for (const item of items) {
      if (item.sourceHash) {
        await this.vectors.deleteBySource('PLATFORM', item.sourceHash);
      }
      if (!item.active) {
        item.indexStatus = 'indexed';
        item.lastError = '';
        await this.repository.save(item);
        continue;
      }
      await this.index(item);
      indexed += 1;
    }
    await this.audit(
      'chatbot.knowledge.reindex',
      actorId,
      'Reindexed platform chatbot knowledge',
      { total: items.length, indexed },
    );
    return { total: items.length, indexed };
  }

  private async index(item: PlatformChatbotKnowledge) {
    await this.vectors.ensureCollection();
    const vector = await this.embeddings.embed(
      [item.title, ...(item.questionExamples ?? []), item.answer].join('\n'),
    );
    await this.vectors.upsert([{
      pointId: item.qdrantPointId,
      vector,
      metadata: {
        scope: 'PLATFORM',
        audience: item.audience,
        knowledgeId: item.id,
        sourceType: item.sourceType,
        sourceHash: item.sourceHash,
        priority: item.priority,
        active: item.active,
      },
    }]);
    item.indexStatus = 'indexed';
    item.lastError = '';
    return this.repository.save(item);
  }

  private normalize(input: PlatformKnowledgeInput) {
    const title = text(input.title, 240);
    const answer = text(input.answer, 10_000);
    if (!title || !answer) throw new Error('Title and answer are required.');
    if (input.audience !== 'LEAD' && input.audience !== 'REALTOR') {
      throw new Error('Audience must be LEAD or REALTOR.');
    }
    return {
      audience: input.audience,
      title,
      answer,
      questionExamples: (input.questionExamples ?? []).map((value) => text(value, 500))
        .filter(Boolean).slice(0, 20),
      priority: Math.max(0, Math.min(100, Math.round(Number(input.priority ?? 50)))),
      active: input.active !== false,
    };
  }

  private hash(value: object) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private async audit(
    action: string,
    actorId: number | null | undefined,
    summary: string,
    metadata: Record<string, unknown>,
  ) {
    await this.auditRepository.save(this.auditRepository.create({
      action,
      entityType: 'platform_chatbot_knowledge',
      entityId: null,
      actorUserId: positiveId(actorId),
      summary,
      metadata,
    }));
  }
}

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}
function positiveId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
