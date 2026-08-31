import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ChatbotAudience } from './tenant-chatbot.types';

export type KnowledgeScope = 'PLATFORM' | 'TENANT' | 'PROPERTY' | 'LEARNING';

export type QdrantKnowledgeMetadata = {
  scope: KnowledgeScope;
  tenantId?: number | null;
  audience: ChatbotAudience;
  propertyId?: number | null;
  knowledgeId: string;
  sourceType: string;
  sourceHash: string;
  priority: number;
  active: boolean;
  embeddingModelSignature: string;
};

export type QdrantKnowledgePoint = {
  pointId: string;
  vector: number[];
  metadata: QdrantKnowledgeMetadata;
};

export type QdrantKnowledgeMatch = QdrantKnowledgeMetadata & {
  pointId: string;
  score: number;
};

export type QdrantSearchInput = {
  scope: 'PLATFORM' | 'TENANT';
  tenantId?: number;
  audience: ChatbotAudience;
  propertyId?: number | null;
  vector: number[];
  limit?: number;
  modelSignature: string;
};

export type QdrantLearningSearchInput = {
  tenantId: number;
  audience: ChatbotAudience;
  propertyId?: number | null;
  vector: number[];
  limit?: number;
  modelSignature: string;
  sourceType?: string;
};

export type QdrantKnowledgeConfig = {
  url: string;
  apiKey?: string;
  collection: string;
};

type QdrantSdkClient = {
  getCollection(name: string): Promise<any>;
  createCollection(name: string, args: any): Promise<any>;
  upsert(name: string, args: any): Promise<any>;
  query(name: string, args: any): Promise<any>;
  delete(name: string, args: any): Promise<any>;
};

export class QdrantKnowledgeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QdrantKnowledgeService.name);
  private readonly config: QdrantKnowledgeConfig;
  private client?: QdrantSdkClient;

  constructor(
    config: QdrantKnowledgeConfig = environmentConfig(),
    client?: QdrantSdkClient,
  ) {
    this.config = {
      url: config.url.trim().replace(/\/+$/, ''),
      apiKey: config.apiKey?.trim() || undefined,
      collection: config.collection.trim(),
    };
    this.client = client;
  }

  isConfigured() {
    return Boolean(this.config.url && this.config.collection);
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        error: 'Qdrant URL and collection must be configured.',
      };
    }
    try {
      await this.ensureCollection();
      return { configured: true, connected: true, error: null };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        error: errorMessage(error),
      };
    }
  }

  async onApplicationBootstrap() {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Qdrant is not configured; chatbot vector retrieval will fail closed.',
      );
      return;
    }
    try {
      await this.ensureCollection();
      this.logger.log(`Qdrant collection ${this.config.collection} is ready.`);
    } catch (error) {
      this.logger.error(`Qdrant startup check failed: ${errorMessage(error)}`);
    }
  }
  async ensureCollection() {
    this.assertConfigured();
    const client = this.sdk();
    try {
      const info = await client.getCollection(this.config.collection);
      this.assertCompatibleCollection(info);
      return;
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw new Error(
          `Qdrant failed to inspect collection: ${errorMessage(error)}`,
        );
      }
    }

    try {
      await client.createCollection(this.config.collection, {
        vectors: { size: 384, distance: 'Cosine' },
      });
    } catch (error) {
      throw new Error(
        `Qdrant failed to create collection: ${errorMessage(error)}`,
      );
    }
  }

  async upsert(points: QdrantKnowledgePoint[]) {
    this.assertConfigured();
    if (!points.length) return;

    const safePoints = points.map((point) => ({
      id: point.pointId,
      vector: this.vector(point.vector),
      payload: this.safeMetadata(point.metadata),
    }));

    try {
      await this.sdk().upsert(this.config.collection, {
        wait: true,
        points: safePoints,
      });
    } catch (error) {
      throw new Error(`Qdrant failed to upsert points: ${errorMessage(error)}`);
    }
  }

  async search(input: QdrantSearchInput): Promise<QdrantKnowledgeMatch[]> {
    this.assertConfigured();
    const must: Array<Record<string, unknown>> = [
      { key: 'audience', match: { value: input.audience } },
      { key: 'active', match: { value: true } },
      { key: 'embeddingModelSignature', match: { value: requiredSignature(input.modelSignature) } },
    ];

    if (input.scope === 'PLATFORM') {
      must.push({ key: 'scope', match: { value: 'PLATFORM' } });
    } else {
      const tenantId = positiveInteger(input.tenantId);
      if (!tenantId) {
        throw new Error('A valid tenantId is required for tenant search.');
      }
      must.push(
        { key: 'tenantId', match: { value: tenantId } },
        { key: 'scope', match: { any: ['TENANT', 'PROPERTY'] } },
      );
    }

    const filter: Record<string, unknown> = { must };
    const propertyId = positiveInteger(input.propertyId);
    if (input.scope === 'TENANT' && propertyId) {
      filter.should = [
        { key: 'propertyId', match: { value: propertyId } },
        { is_empty: { key: 'propertyId' } },
      ];
    }

    let result: any;
    try {
      result = await this.sdk().query(this.config.collection, {
        query: this.vector(input.vector),
        filter,
        limit: clampInteger(input.limit, 8, 1, 30),
        with_payload: true,
        with_vector: false,
      });
    } catch (error) {
      throw new Error(`Qdrant failed to search points: ${errorMessage(error)}`);
    }

    const points = Array.isArray(result?.points) ? result.points : [];
    return points
      .map((point: any) => this.match(point))
      .filter(
        (match: QdrantKnowledgeMatch | null): match is QdrantKnowledgeMatch =>
          Boolean(match),
      );
  }

  async searchLearning(input: QdrantLearningSearchInput): Promise<QdrantKnowledgeMatch[]> {
    this.assertConfigured();
    const tenantId = positiveInteger(input.tenantId);
    if (!tenantId) throw new Error('A valid tenantId is required for learning search.');
    const must: Array<Record<string, unknown>> = [
      { key: 'scope', match: { value: 'LEARNING' } },
      { key: 'tenantId', match: { value: tenantId } },
      { key: 'audience', match: { value: input.audience } },
      { key: 'active', match: { value: true } },
      { key: 'embeddingModelSignature', match: { value: requiredSignature(input.modelSignature) } },
    ];
    if (input.sourceType) {
      must.push({
        key: 'sourceType',
        match: { value: String(input.sourceType).slice(0, 80) },
      });
    }
    const filter: Record<string, unknown> = { must };
    const propertyId = positiveInteger(input.propertyId);
    if (propertyId) {
      filter.should = [
        { key: 'propertyId', match: { value: propertyId } },
        { is_empty: { key: 'propertyId' } },
      ];
    }
    try {
      const result = await this.sdk().query(this.config.collection, {
        query: this.vector(input.vector),
        filter,
        limit: clampInteger(input.limit, 4, 1, 12),
        with_payload: true,
        with_vector: false,
      });
      const points = Array.isArray(result?.points) ? result.points : [];
      return points
        .map((point: any) => this.match(point))
        .filter(
          (match: QdrantKnowledgeMatch | null): match is QdrantKnowledgeMatch =>
            Boolean(match),
        );
    } catch (error) {
      throw new Error(
        `Qdrant failed to search learned replies: ${errorMessage(error)}`,
      );
    }
  }

  async deleteBySource(
    scope: KnowledgeScope,
    sourceHash: string,
    tenantId?: number,
  ) {
    this.assertConfigured();
    const must: Array<Record<string, unknown>> = [
      { key: 'scope', match: { value: scope } },
      { key: 'sourceHash', match: { value: sourceHash } },
    ];
    if (scope !== 'PLATFORM') {
      const safeTenantId = positiveInteger(tenantId);
      if (!safeTenantId) {
        throw new Error('A valid tenantId is required for tenant deletion.');
      }
      must.push({ key: 'tenantId', match: { value: safeTenantId } });
    }

    try {
      await this.sdk().delete(this.config.collection, {
        wait: true,
        filter: { must },
      });
    } catch (error) {
      throw new Error(`Qdrant failed to delete points: ${errorMessage(error)}`);
    }
  }

  private match(point: any): QdrantKnowledgeMatch | null {
    const payload = point?.payload;
    if (!payload || typeof payload !== 'object') return null;
    const metadata = this.safeMetadata(payload);
    const score = Number(point.score);
    if (!Number.isFinite(score)) return null;
    return {
      pointId: String(point.id),
      score,
      ...metadata,
    };
  }

  private safeMetadata(
    metadata: QdrantKnowledgeMetadata,
  ): QdrantKnowledgeMetadata {
    const scope = validScope(metadata.scope);
    const tenantId =
      scope === 'PLATFORM' ? null : positiveInteger(metadata.tenantId);
    if (scope !== 'PLATFORM' && !tenantId) {
      throw new Error('Tenant Qdrant metadata requires tenantId.');
    }
    if (metadata.audience !== 'LEAD' && metadata.audience !== 'REALTOR') {
      throw new Error('Qdrant metadata audience is invalid.');
    }
    return {
      scope,
      tenantId,
      audience: metadata.audience,
      propertyId: positiveInteger(metadata.propertyId),
      knowledgeId: String(metadata.knowledgeId).slice(0, 120),
      sourceType: String(metadata.sourceType).slice(0, 80),
      sourceHash: String(metadata.sourceHash).slice(0, 64),
      priority: clampInteger(metadata.priority, 50, 0, 100),
      active: metadata.active === true,
      embeddingModelSignature: requiredSignature(metadata.embeddingModelSignature),
    };
  }

  private vector(value: number[]) {
    if (
      !Array.isArray(value) ||
      value.length !== 384 ||
      !value.every((item) => Number.isFinite(item))
    ) {
      throw new Error('Qdrant vectors must contain 384 finite numbers.');
    }
    return value;
  }

  private sdk(): QdrantSdkClient {
    this.assertConfigured();
    this.client ??= new QdrantClient({
      url: this.config.url,
      apiKey: this.config.apiKey,
    }) as QdrantSdkClient;
    return this.client;
  }

  private assertCompatibleCollection(info: any) {
    const vectors = info?.config?.params?.vectors;
    const params =
      vectors && typeof vectors === 'object' && 'size' in vectors
        ? vectors
        : null;
    if (
      !params ||
      Number(params.size) !== 384 ||
      String(params.distance ?? '').toLowerCase() !== 'cosine'
    ) {
      throw new Error(
        `Qdrant collection ${this.config.collection} must use a 384-dimensional Cosine vector.`,
      );
    }
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Qdrant URL and collection must be configured.');
    }
  }
}

function environmentConfig(): QdrantKnowledgeConfig {
  return {
    url: process.env.QDRANT_URL ?? '',
    apiKey: process.env.QDRANT_API_KEY,
    collection: process.env.QDRANT_COLLECTION ?? 'real_estate_knowledge',
  };
}

function isNotFoundError(error: unknown) {
  return Number((error as { status?: unknown })?.status) === 404;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'string' && data.trim()) return data.slice(0, 500);
    try {
      return JSON.stringify(error).slice(0, 500);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function validScope(value: unknown): KnowledgeScope {
  if (
    value === 'PLATFORM' ||
    value === 'TENANT' ||
    value === 'PROPERTY' ||
    value === 'LEARNING'
  ) {
    return value;
  }
  throw new Error('Qdrant metadata scope is invalid.');
}

function positiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function requiredSignature(value: unknown) {
  const signature = String(value ?? '').trim();
  if (!signature) throw new Error('Embedding model signature is required.');
  return signature.slice(0, 160);
}
