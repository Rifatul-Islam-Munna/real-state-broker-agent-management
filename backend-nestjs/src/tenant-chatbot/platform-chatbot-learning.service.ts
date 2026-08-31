import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';
import {
  PlatformChatbotLearningCandidate,
  type ChatbotLearningKind,
  type ChatbotLearningStatus,
} from './platform-chatbot-learning.entity';
import { QdrantKnowledgeService } from './qdrant-knowledge.service';
import type { ChatbotAudience, ChatbotChannel } from './tenant-chatbot.types';
import { normalizeChatbotHumanText } from './chatbot-human-language';

export type LearningRecordInput = {
  tenantId: number;
  tenantName?: string;
  propertyId?: number | null;
  propertyTitle?: string;
  audience: ChatbotAudience;
  channel: ChatbotChannel;
  kind: ChatbotLearningKind;
  question: string;
  answer: string;
  structuredPayload?: Record<string, unknown> | null;
  evidenceKnowledgeIds?: string[];
  provider?: string;
  model?: string;
  confidence?: number | null;
  force?: boolean;
};

type QualificationExpected = 'role' | 'creditScore' | 'monthlyEarning';

@Injectable()
export class PlatformChatbotLearningService {
  constructor(
    @InjectRepository(PlatformChatbotLearningCandidate)
    private readonly repository: Repository<PlatformChatbotLearningCandidate>,
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly embeddings: MiniLmEmbeddingService,
    private readonly vectors: QdrantKnowledgeService,
    private readonly platform: PlatformDomainService,
  ) {}

  async list(input: {
    status?: ChatbotLearningStatus;
    kind?: ChatbotLearningKind;
    tenantId?: number;
    page?: number;
    pageSize?: number;
  } = {}) {
    const page = clampInteger(input.page, 1, 1, 100_000);
    const pageSize = clampInteger(input.pageSize, 50, 1, 200);
    const where: Record<string, unknown> = {};
    if (isStatus(input.status)) where.status = input.status;
    if (isKind(input.kind)) where.kind = input.kind;
    if (positiveInteger(input.tenantId)) where.tenantId = positiveInteger(input.tenantId);
    const [items, total] = await this.repository.findAndCount({
      where,
      order: { status: 'ASC', lastSeenAt: 'DESC', updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const counts = await Promise.all([
      this.repository.count({ where: { status: 'PENDING' } }),
      this.repository.count({ where: { status: 'APPROVED' } }),
      this.repository.count({ where: { status: 'REJECTED' } }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      counts: { pending: counts[0], approved: counts[1], rejected: counts[2] },
    };
  }

  async record(input: LearningRecordInput) {
    const config = await this.platform.getChatbotAiRuntimeSettings();
    if (!config.reviewLearningEnabled && input.force !== true) return null;
    const tenantId = positiveInteger(input.tenantId);
    if (!tenantId) return null;
    const question = clean(input.question, 2_000);
    const answer = clean(input.answer, 4_000);
    if (!question || !answer || !isKind(input.kind)) return null;
    const audience = input.audience === 'REALTOR' ? 'REALTOR' : 'LEAD';
    const channel = validChannel(input.channel);
    const propertyId = positiveInteger(input.propertyId);
    const normalizedQuestion = normalizeChatbotHumanText(question) || question.toLowerCase();
    const questionHash = hash(normalizedQuestion);
    const evidenceKnowledgeIds = compactIds(input.evidenceKnowledgeIds);
    const payload = compactObject(input.structuredPayload);
    const expected = input.kind === 'QUALIFICATION'
      ? String(payload?.expected ?? '')
      : '';
    const fingerprint = input.kind === 'ANSWER'
      ? hash([
          tenantId,
          propertyId ?? 0,
          audience,
          input.kind,
          hash(normalizeChatbotHumanText(answer) || answer.toLowerCase()),
        ].join('|'))
      : hash([
          tenantId,
          propertyId ?? 0,
          audience,
          input.kind,
          expected,
          questionHash,
        ].join('|'));
    const existing = await this.repository.findOne({ where: { fingerprint } });
    if (existing) {
      existing.occurrences = Math.min(2_147_483_647, Number(existing.occurrences || 0) + 1);
      existing.lastSeenAt = new Date();
      existing.channel = channel;
      existing.confidence = boundedConfidence(input.confidence);
      existing.provider = clean(input.provider, 40);
      existing.model = clean(input.model, 180);
      existing.evidenceKnowledgeIds = evidenceKnowledgeIds;
      if (existing.status === 'PENDING') {
        existing.answer = answer;
        existing.structuredPayload = input.kind === 'ANSWER'
          ? mergeAnswerExamples(existing.structuredPayload, question)
          : payload;
      }
      return this.repository.save(existing);
    }
    const entity = this.repository.create({
      fingerprint,
      tenantId,
      tenantName: clean(input.tenantName, 240),
      propertyId,
      propertyTitle: clean(input.propertyTitle, 300),
      audience,
      channel,
      kind: input.kind,
      status: 'PENDING',
      question,
      questionHash,
      answer,
      structuredPayload: input.kind === 'ANSWER' ? mergeAnswerExamples(payload, question) : payload,
      evidenceKnowledgeIds,
      provider: clean(input.provider, 40),
      model: clean(input.model, 180),
      confidence: boundedConfidence(input.confidence),
      occurrences: 1,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      reviewedByMasterUserId: null,
      reviewedAt: null,
      qdrantPointId: null,
      sourceHash: null,
    });
    return this.repository.save(entity);
  }

  recordAnswer(input: Omit<LearningRecordInput, 'kind' | 'structuredPayload'>) {
    return this.record({ ...input, kind: 'ANSWER', structuredPayload: null });
  }

  recordQualification(input: Omit<LearningRecordInput, 'kind'>) {
    return this.record({ ...input, kind: 'QUALIFICATION' });
  }

  async review(ids: string[], status: 'APPROVED' | 'REJECTED', actorId: number) {
    const safeIds = [...new Set((ids ?? []).map((id) => clean(id, 80)).filter(Boolean))].slice(0, 500);
    if (!safeIds.length) throw new BadRequestException('Select at least one learning item.');
    const rows = await this.repository.find({ where: { id: In(safeIds) } });
    const found = new Map(rows.map((row) => [row.id, row]));
    const results: Array<{ id: string; status: ChatbotLearningStatus; ok: boolean; error?: string }> = [];
    for (const id of safeIds) {
      const row = found.get(id);
      if (!row) {
        results.push({ id, status, ok: false, error: 'Learning item not found.' });
        continue;
      }
      try {
        if (status === 'REJECTED') {
          await this.unpublish(row);
          await this.repository.remove(row);
          results.push({ id, status, ok: true });
          continue;
        }
        row.reviewedByMasterUserId = positiveInteger(actorId);
        row.reviewedAt = new Date();
        await this.publish(row);
        row.status = status;
        await this.repository.save(row);
        results.push({ id, status, ok: true });
      } catch (error) {
        results.push({ id, status: row.status, ok: false, error: errorMessage(error) });
      }
    }
    return {
      requested: safeIds.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };
  }

  async invalidateApprovedAnswersForProperty(
    tenantIdValue: number,
    propertyIdValue?: number | null,
  ) {
    const tenantId = positiveInteger(tenantIdValue);
    if (!tenantId) return { invalidated: 0 };
    const propertyId = positiveInteger(propertyIdValue);
    const where: any = {
      tenantId,
      kind: 'ANSWER',
      status: 'APPROVED',
    };
    if (propertyId) where.propertyId = propertyId;
    const rows = await this.repository.find({ where, take: 10_000 });
    let invalidated = 0;
    for (const row of rows) {
      try {
        await this.unpublish(row);
        row.status = 'PENDING';
        row.reviewedByMasterUserId = null;
        row.reviewedAt = null;
        row.structuredPayload = {
          ...(compactObject(row.structuredPayload) ?? {}),
          reviewReason: propertyId ? 'PROPERTY_KNOWLEDGE_CHANGED' : 'TENANT_KNOWLEDGE_CHANGED',
          invalidatedAt: new Date().toISOString(),
        };
        await this.repository.save(row);
        invalidated += 1;
      } catch {
        // Reindexing source-of-truth property knowledge must continue even when
        // one learned derivative cannot be removed; it remains reviewable.
      }
    }
    return { invalidated };
  }

  async approvedQualificationHint(input: {
    tenantId: number;
    propertyId?: number | null;
    audience: ChatbotAudience;
    expected: QualificationExpected;
    message: string;
  }) {
    const tenantId = positiveInteger(input.tenantId);
    if (!tenantId) return null;
    const normalized = normalizeChatbotHumanText(input.message);
    if (!normalized) return null;
    const questionHash = hash(normalized);
    const exact = await this.repository.find({
      where: {
        tenantId,
        audience: input.audience,
        kind: 'QUALIFICATION',
        status: 'APPROVED',
        questionHash,
      },
      take: 10,
      order: { updatedAt: 'DESC' },
    });
    const exactExpected = exact.find((item) => payloadExpected(item.structuredPayload) === input.expected);
    if (exactExpected) {
      return {
        exact: true,
        score: 1,
        candidateId: exactExpected.id,
        role: input.expected === 'role' ? payloadRole(exactExpected.structuredPayload) : null,
        creditScore: input.expected === 'creditScore' ? payloadNumber(exactExpected.structuredPayload, 'creditScore') : null,
        monthlyEarning: input.expected === 'monthlyEarning' ? payloadNumber(exactExpected.structuredPayload, 'monthlyEarning') : null,
      };
    }
    if (!this.vectors.isConfigured()) return null;
    try {
      const vector = await this.embeddings.embed(normalized, 'query');
      const matches = await this.vectors.searchLearning({
        tenantId,
        audience: input.audience,
        propertyId: positiveInteger(input.propertyId),
        vector,
        modelSignature: this.embeddings.modelSignature(),
        sourceType: qualificationSourceType(input.expected),
        limit: 3,
      });
      const match = matches.find((item) => item.score >= 0.9);
      if (!match) return null;
      const candidate = await this.repository.findOne({ where: { id: match.knowledgeId } });
      if (!candidate || candidate.status !== 'APPROVED' || payloadExpected(candidate.structuredPayload) !== input.expected) return null;
      return {
        exact: false,
        score: match.score,
        candidateId: candidate.id,
        role: input.expected === 'role' ? payloadRole(candidate.structuredPayload) : null,
        creditScore: null,
        monthlyEarning: null,
      };
    } catch {
      return null;
    }
  }

  async exportApproved() {
    const rows = await this.repository.find({
      where: { status: 'APPROVED' },
      order: { tenantId: 'ASC', updatedAt: 'ASC' },
    });
    const tenantIds = [...new Set(rows.map((row) => row.tenantId))];
    const tenants = tenantIds.length ? await this.tenants.find({ where: { id: In(tenantIds) } }) : [];
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    return {
      format: 'platform-chatbot-learning-pack-v2',
      v: 2,
      at: new Date().toISOString(),
      items: rows.map((row) => ({
        i: row.tenantId,
        t: tenantMap.get(row.tenantId)?.slug ?? '',
        ...(row.propertyId ? { pi: row.propertyId } : {}),
        ...(row.propertyTitle ? { p: row.propertyTitle } : {}),
        a: row.audience === 'REALTOR' ? 'R' : 'L',
        k: row.kind === 'QUALIFICATION' ? 'Q' : 'A',
        q: row.kind === 'ANSWER' ? answerExamples(row) : [row.question],
        r: row.answer,
        ...(row.kind === 'QUALIFICATION' && row.structuredPayload
          ? { x: compactObject(row.structuredPayload) }
          : {}),
      })),
    };
  }

  async importApproved(payload: unknown, actorId: number) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    const compactPack = source.format === 'platform-chatbot-learning-pack-v2';
    const legacyPack = source.format === 'platform-chatbot-learning-v1';
    if ((!compactPack && !legacyPack) || !Array.isArray(source.items)) {
      throw new BadRequestException('Learning backup format is invalid.');
    }
    const items = source.items.slice(0, 20_000) as Array<Record<string, unknown>>;
    const tenantRows = await this.tenants.find();
    const byId = new Map(tenantRows.map((tenant) => [tenant.id, tenant]));
    const bySlug = new Map(tenantRows.map((tenant) => [tenant.slug, tenant]));
    let imported = 0;
    let skipped = 0;
    const approveIds: string[] = [];
    for (const item of items) {
      const tenant = byId.get(Number(compactPack ? item.i : item.tenantId))
        ?? bySlug.get(clean(compactPack ? item.t : item.tenantSlug, 100));
      const audience = compactPack
        ? item.a === 'R' ? 'REALTOR' : item.a === 'L' ? 'LEAD' : null
        : item.audience === 'REALTOR' || item.audience === 'LEAD' ? item.audience : null;
      const kind = compactPack
        ? item.k === 'Q' ? 'QUALIFICATION' : item.k === 'A' ? 'ANSWER' : null
        : isKind(item.kind) ? item.kind : null;
      if (!tenant || !audience || !kind) {
        skipped += 1;
        continue;
      }
      const questions = compactPack && Array.isArray(item.q)
        ? item.q.map((value) => clean(value, 320)).filter(Boolean).slice(0, 8)
        : [clean(item.question, 2_000)].filter(Boolean);
      const question = questions[0] ?? '';
      const answer = clean(compactPack ? item.r : item.answer, 4_000);
      if (!question || !answer) {
        skipped += 1;
        continue;
      }
      const propertyTitle = clean(compactPack ? item.p : item.propertyTitle, 300);
      const importedPropertyId = positiveInteger(compactPack ? item.pi : item.propertyId);
      const propertySpecific = Boolean(importedPropertyId || propertyTitle);
      const propertyId = propertySpecific
        ? await this.resolveImportedPropertyId(tenant, importedPropertyId, propertyTitle)
        : null;
      if (propertySpecific && !propertyId) {
        skipped += 1;
        continue;
      }
      const structuredPayload = kind === 'QUALIFICATION'
        ? compactObject(compactPack ? item.x : item.structuredPayload)
        : compactObject({ questionExamples: questions });
      const saved = await this.record({
        tenantId: tenant.id,
        tenantName: tenant.businessName,
        propertyId,
        propertyTitle,
        audience,
        channel: 'WEB',
        kind,
        question,
        answer,
        structuredPayload,
        evidenceKnowledgeIds: compactPack ? [] : compactIds(item.evidenceKnowledgeIds as string[]),
        provider: 'IMPORT',
        model: compactPack ? 'learning-pack-v2' : 'backup-v1',
        confidence: 1,
        force: true,
      });
      if (!saved) {
        skipped += 1;
        continue;
      }
      imported += 1;
      if (saved.status !== 'APPROVED') approveIds.push(saved.id);
    }
    let approved = 0;
    for (let index = 0; index < approveIds.length; index += 500) {
      const result = await this.review(approveIds.slice(index, index + 500), 'APPROVED', actorId);
      approved += result.succeeded;
    }
    return { imported, approved, skipped, total: items.length };
  }

  private async resolveImportedPropertyId(
    tenant: SaasTenant,
    importedId: number | null,
    title: string,
  ) {
    if (!tenant.databaseName) return null;
    try {
      return await this.databases.withTenantClient(tenant.databaseName, async (client) => {
        if (importedId && title) {
          const exact = await client.query(
            'SELECT id FROM tenant_property WHERE id = $1 AND lower(trim(title)) = lower(trim($2)) LIMIT 1',
            [importedId, title],
          );
          if (exact.rows[0]?.id) return positiveInteger(exact.rows[0].id);
        } else if (importedId) {
          const exact = await client.query(
            'SELECT id FROM tenant_property WHERE id = $1 LIMIT 1',
            [importedId],
          );
          if (exact.rows[0]?.id) return positiveInteger(exact.rows[0].id);
        }
        if (!title) return null;
        const byTitle = await client.query(
          'SELECT id FROM tenant_property WHERE lower(trim(title)) = lower(trim($1)) ORDER BY id LIMIT 2',
          [title],
        );
        return byTitle.rows.length === 1 ? positiveInteger(byTitle.rows[0].id) : null;
      });
    } catch {
      return null;
    }
  }

  private async publish(candidate: PlatformChatbotLearningCandidate) {
    const tenant = await this.tenant(candidate.tenantId);
    if (candidate.kind === 'ANSWER') return this.publishAnswer(candidate, tenant);
    return this.publishQualification(candidate, tenant);
  }

  private async publishAnswer(candidate: PlatformChatbotLearningCandidate, tenant: SaasTenant) {
    if (!this.vectors.isConfigured()) throw new Error('Qdrant is not configured.');
    const databaseName = tenant.databaseName;
    if (!databaseName) throw new Error('Tenant database is not ready.');
    const scope = candidate.propertyId ? 'PROPERTY' as const : 'TENANT' as const;
    const sourceHash = hash(`AI_APPROVED|${candidate.id}|${candidate.question}|${candidate.answer}`);
    const pointId = candidate.qdrantPointId || randomUUID();
    const title = `Learned answer: ${candidate.question}`.slice(0, 240);
    const questionExamples = answerExamples(candidate);
    let knowledgeId = '';
    await this.databases.withTenantClient(databaseName, async (client) => {
      const old = await client.query(
        "SELECT id::text AS id, scope, source_hash AS \"sourceHash\" FROM tenant_chatbot_knowledge WHERE source_type = 'AI_APPROVED' AND source_hash = $1",
        [sourceHash],
      );
      if (old.rows[0]) {
        knowledgeId = String(old.rows[0].id);
        return;
      }
      const inserted = await client.query([
        'INSERT INTO tenant_chatbot_knowledge(',
        'property_id, scope, audience, source_type, title, answer, question_examples, priority, active,',
        'source_hash, qdrant_point_id, index_status, created_by_master_user_id)',
        "VALUES ($1, $2, $3, 'AI_APPROVED', $4, $5, $6::jsonb, 85, true, $7, $8, 'pending', $9)",
        'RETURNING id::text AS id',
      ].join(' '), [
        candidate.propertyId,
        scope,
        candidate.audience,
        title,
        candidate.answer,
        JSON.stringify(questionExamples),
        sourceHash,
        pointId,
        candidate.reviewedByMasterUserId,
      ]);
      knowledgeId = String(inserted.rows[0]?.id ?? '');
    });
    if (!knowledgeId) throw new Error('Approved knowledge could not be created.');
    const vector = await this.embeddings.embed(
      [...questionExamples, candidate.answer].join('\n'),
      'document',
    );
    await this.vectors.upsert([{
      pointId,
      vector,
      metadata: {
        scope,
        tenantId: tenant.id,
        audience: candidate.audience,
        propertyId: candidate.propertyId,
        knowledgeId,
        sourceType: 'AI_APPROVED',
        sourceHash,
        priority: 85,
        active: true,
        embeddingModelSignature: this.embeddings.modelSignature(),
      },
    }]);
    await this.databases.withTenantClient(databaseName, (client) => client.query(
      "UPDATE tenant_chatbot_knowledge SET qdrant_point_id = $2, index_status = 'indexed', last_error = '', updated_at = now() WHERE id = $1",
      [knowledgeId, pointId],
    ));
    candidate.qdrantPointId = pointId;
    candidate.sourceHash = sourceHash;
  }

  private async publishQualification(candidate: PlatformChatbotLearningCandidate, tenant: SaasTenant) {
    if (!this.vectors.isConfigured()) throw new Error('Qdrant is not configured.');
    const expected = payloadExpected(candidate.structuredPayload);
    if (!expected) throw new Error('Qualification learning is missing the expected field.');
    const sourceHash = hash(`AI_QUALIFICATION|${candidate.id}|${candidate.question}|${stableJson(candidate.structuredPayload)}`);
    if (candidate.sourceHash) {
      await this.vectors.deleteBySource('LEARNING', candidate.sourceHash, tenant.id).catch(() => undefined);
    }
    const pointId = candidate.qdrantPointId || randomUUID();
    const vector = await this.embeddings.embed(candidate.question, 'document');
    await this.vectors.upsert([{
      pointId,
      vector,
      metadata: {
        scope: 'LEARNING',
        tenantId: tenant.id,
        audience: candidate.audience,
        propertyId: candidate.propertyId,
        knowledgeId: candidate.id,
        sourceType: qualificationSourceType(expected),
        sourceHash,
        priority: 90,
        active: true,
        embeddingModelSignature: this.embeddings.modelSignature(),
      },
    }]);
    candidate.qdrantPointId = pointId;
    candidate.sourceHash = sourceHash;
  }

  private async unpublish(candidate: PlatformChatbotLearningCandidate) {
    const tenant = await this.tenant(candidate.tenantId);
    if (candidate.kind === 'QUALIFICATION') {
      if (candidate.sourceHash && this.vectors.isConfigured()) {
        await this.vectors.deleteBySource('LEARNING', candidate.sourceHash, tenant.id).catch(() => undefined);
      }
      candidate.qdrantPointId = null;
      candidate.sourceHash = null;
      return;
    }
    if (!tenant.databaseName || !candidate.sourceHash) return;
    const sourceHash = candidate.sourceHash;
    const deleted: any = await this.databases.withTenantClient(tenant.databaseName, (client) => client.query(
      "DELETE FROM tenant_chatbot_knowledge WHERE source_type = 'AI_APPROVED' AND source_hash = $1 RETURNING scope",
      [sourceHash],
    ));
    if (deleted.rows.length && this.vectors.isConfigured()) {
      await this.vectors.deleteBySource(deleted.rows[0].scope, sourceHash, tenant.id).catch(() => undefined);
    }
    candidate.qdrantPointId = null;
    candidate.sourceHash = null;
  }

  private async tenant(id: number) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant for this learning item was not found.');
    return tenant;
  }
}

function qualificationSourceType(expected: QualificationExpected) {
  if (expected === 'role') return 'AI_QUALIFICATION_ROLE';
  if (expected === 'creditScore') return 'AI_QUALIFICATION_CREDIT';
  return 'AI_QUALIFICATION_INCOME';
}
function payloadExpected(value: Record<string, unknown> | null | undefined): QualificationExpected | null {
  const expected = value?.expected;
  return expected === 'role' || expected === 'creditScore' || expected === 'monthlyEarning' ? expected : null;
}
function payloadRole(value: Record<string, unknown> | null | undefined): ChatbotAudience | null {
  return value?.role === 'LEAD' || value?.role === 'REALTOR' ? value.role : null;
}
function payloadNumber(value: Record<string, unknown> | null | undefined, key: 'creditScore' | 'monthlyEarning') {
  const parsed = Number(value?.[key]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}
function mergeAnswerExamples(value: Record<string, unknown> | null | undefined, question: string) {
  const current = compactObject(value) ?? {};
  const existing = Array.isArray(current.questionExamples)
    ? current.questionExamples.map((item) => clean(item, 320)).filter(Boolean)
    : [];
  const normalized = new Set(existing.map((item) => normalizeChatbotHumanText(item) || item.toLowerCase()));
  const key = normalizeChatbotHumanText(question) || question.toLowerCase();
  const examples = normalized.has(key) ? existing : [...existing, clean(question, 320)];
  return compactObject({ ...current, questionExamples: examples.slice(0, 8) });
}
function answerExamples(candidate: PlatformChatbotLearningCandidate) {
  const payload = compactObject(candidate.structuredPayload);
  const stored = Array.isArray(payload?.questionExamples)
    ? payload.questionExamples.map((item) => clean(item, 320)).filter(Boolean)
    : [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of [candidate.question, ...stored]) {
    const item = clean(value, 320);
    if (!item) continue;
    const key = normalizeChatbotHumanText(item) || item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 8) break;
  }
  return unique;
}
function compactObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 4_000) return null;
    return JSON.parse(serialized) as Record<string, unknown>;
  } catch {
    return null;
  }
}
function compactIds(value: string[] | undefined) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => clean(item, 120)).filter(Boolean))].slice(0, 12);
}
function clean(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}
function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
function stableJson(value: unknown) {
  if (!value || typeof value !== 'object') return JSON.stringify(value ?? null);
  const source = value as Record<string, unknown>;
  return JSON.stringify(Object.keys(source).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = source[key];
    return result;
  }, {}));
}
function boundedConfidence(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null;
}
function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}
function isStatus(value: unknown): value is ChatbotLearningStatus {
  return value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED';
}
function isKind(value: unknown): value is ChatbotLearningKind {
  return value === 'ANSWER' || value === 'QUALIFICATION';
}
function validChannel(value: unknown): ChatbotChannel {
  return value === 'EMAIL' || value === 'SMS' ? value : 'WEB';
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
