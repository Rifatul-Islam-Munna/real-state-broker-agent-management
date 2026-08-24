import { ChatbotAudience } from './tenant-chatbot.types';

export type KnowledgeScope = 'PLATFORM' | 'TENANT' | 'PROPERTY';

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
};

export type QdrantKnowledgeConfig = {
  url: string;
  apiKey?: string;
  collection: string;
};

type FetchLike = (input: string, init?: Record<string, any>) => Promise<any>;

export class QdrantKnowledgeService {
  private readonly config: QdrantKnowledgeConfig;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: QdrantKnowledgeConfig = environmentConfig(),
    fetchImpl: FetchLike = globalThis.fetch.bind(globalThis) as FetchLike,
  ) {
    this.config = {
      url: config.url.trim().replace(/\/+$/, ''),
      apiKey: config.apiKey?.trim(),
      collection: config.collection.trim(),
    };
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.config.url && this.config.collection);
  }

  async ensureCollection() {
    this.assertConfigured();
    const url = this.collectionUrl();
    const existing = await this.fetchImpl(url, {
      method: 'GET',
      headers: this.headers(),
    });
    if (existing.ok) return;
    if (existing.status !== 404) {
      throw await this.responseError(existing, 'inspect collection');
    }

    const created = await this.fetchImpl(url, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        vectors: { size: 384, distance: 'Cosine' },
      }),
    });
    if (!created.ok) {
      throw await this.responseError(created, 'create collection');
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
    const response = await this.fetchImpl(
      `${this.collectionUrl()}/points?wait=true`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({ points: safePoints }),
      },
    );
    if (!response.ok) {
      throw await this.responseError(response, 'upsert points');
    }
  }

  async search(input: QdrantSearchInput): Promise<QdrantKnowledgeMatch[]> {
    this.assertConfigured();
    const must: Array<Record<string, unknown>> = [
      { key: 'audience', match: { value: input.audience } },
      { key: 'active', match: { value: true } },
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

    const response = await this.fetchImpl(
      `${this.collectionUrl()}/points/query`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          query: this.vector(input.vector),
          filter,
          limit: clampInteger(input.limit, 8, 1, 30),
          with_payload: true,
          with_vector: false,
        }),
      },
    );
    if (!response.ok) {
      throw await this.responseError(response, 'search points');
    }

    const body = await response.json();
    const points = Array.isArray(body?.result?.points)
      ? body.result.points
      : [];
    return points
      .map((point: any) => this.match(point))
      .filter(
        (match: QdrantKnowledgeMatch | null): match is QdrantKnowledgeMatch =>
          Boolean(match),
      );
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
    const response = await this.fetchImpl(
      `${this.collectionUrl()}/points/delete?wait=true`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ filter: { must } }),
      },
    );
    if (!response.ok) {
      throw await this.responseError(response, 'delete points');
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

  private headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { 'api-key': this.config.apiKey } : {}),
    };
  }

  private collectionUrl() {
    return `${this.config.url}/collections/${encodeURIComponent(
      this.config.collection,
    )}`;
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new Error('Qdrant URL and collection must be configured.');
    }
  }

  private async responseError(response: any, operation: string) {
    const detail =
      typeof response?.text === 'function'
        ? String(await response.text()).slice(0, 500)
        : '';
    return new Error(
      `Qdrant failed to ${operation} (HTTP ${response?.status ?? 'unknown'})${
        detail ? `: ${detail}` : ''
      }`,
    );
  }
}

function environmentConfig(): QdrantKnowledgeConfig {
  return {
    url: process.env.QDRANT_URL ?? '',
    apiKey: process.env.QDRANT_API_KEY,
    collection: process.env.QDRANT_COLLECTION ?? 'real_estate_knowledge',
  };
}

function validScope(value: unknown): KnowledgeScope {
  if (value === 'PLATFORM' || value === 'TENANT' || value === 'PROPERTY') {
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
