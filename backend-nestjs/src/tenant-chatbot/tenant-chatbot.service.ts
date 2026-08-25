import { createHash, randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';
import { mapPropertyKnowledge } from './property-knowledge.mapper';
import {
  QdrantKnowledgeMatch,
  QdrantKnowledgeService,
} from './qdrant-knowledge.service';
import {
  evaluateChatbotPolicy,
  normalizeChatbotSettings,
} from './tenant-chatbot-policy';
import {
  ChatbotAudience,
  ChatbotChannel,
  ChatbotPolicyDecision,
  ChatbotSettings,
} from './tenant-chatbot.types';

export const PLATFORM_KNOWLEDGE_READER = 'PLATFORM_KNOWLEDGE_READER';

type TenantReference = Pick<SaasTenant, 'id' | 'databaseName' | 'businessName'>;

export type ChatbotSettingsPatch = Omit<
  Partial<ChatbotSettings>,
  'channels' | 'stopRules'
> & {
  channels?: Partial<ChatbotSettings['channels']>;
  stopRules?: Partial<ChatbotSettings['stopRules']>;
};

export type CreateTenantKnowledgeInput = {
  propertyId?: number | null;
  audience: ChatbotAudience;
  title: string;
  answer: string;
  questionExamples?: string[];
  priority?: number;
};

export type UpdateTenantKnowledgeInput = Partial<CreateTenantKnowledgeInput> & {
  active?: boolean;
};

export type TestChatbotQuestionInput = {
  propertyId?: number | null;
  audience: ChatbotAudience;
  question: string;
  channel?: ChatbotChannel;
};

export type HandleChatbotMessageInput = {
  channel: ChatbotChannel;
  leadId: number;
  propertyId?: number | null;
  sessionId: string;
  idempotencyKey: string;
  body: string;
  audience?: ChatbotAudience;
  leadCreditScore?: number | null;
  showing?: { confirmed: boolean; preferredAt?: string | null };
};

export type ChatbotLiveResponse = ChatbotTestResult & {
  conversationId: string | null;
  queued: boolean;
  outreachJobId?: number | null;
};

export type PublicChatbotMessageInput = {
  accessToken: string;
  sessionId: string;
  idempotencyKey: string;
  body: string;
  showing?: HandleChatbotMessageInput['showing'];
};

export type PlatformKnowledgeRecord = {
  id: string;
  propertyId?: number | null;
  scope: 'PLATFORM';
  audience: ChatbotAudience;
  sourceType: string;
  title: string;
  answer: string;
  priority: number;
  active: boolean;
  sourceHash?: string;
};

export interface PlatformKnowledgeReader {
  findActiveByIds(
    ids: string[],
    audience: ChatbotAudience,
  ): Promise<PlatformKnowledgeRecord[]>;
}

type KnowledgeRecord = Omit<PlatformKnowledgeRecord, 'scope'> & {
  scope: 'PLATFORM' | 'TENANT' | 'PROPERTY';
  qdrantPointId?: string;
  indexStatus?: string;
  lastError?: string;
};

type HydratedMatch = {
  match: QdrantKnowledgeMatch;
  record: KnowledgeRecord;
};

export type ChatbotTestEvidence = {
  knowledgeId: string;
  title: string;
  scope: KnowledgeRecord['scope'];
  sourceType: string;
  score: number;
};

export type ChatbotTestResult = {
  answer: string;
  decision: ChatbotPolicyDecision['action'];
  reason: ChatbotPolicyDecision['reason'];
  confidence: number | null;
  evidence: ChatbotTestEvidence[];
};

const KNOWLEDGE_RETURNING = [
  'RETURNING id::text AS id, property_id AS "propertyId",',
  'scope, audience, source_type AS "sourceType", title, answer,',
  'question_examples AS "questionExamples", priority, active,',
  'source_hash AS "sourceHash", qdrant_point_id AS "qdrantPointId",',
  'index_status AS "indexStatus", last_error AS "lastError"',
].join(' ');

@Injectable()
export class TenantChatbotService {
  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly embeddings: MiniLmEmbeddingService,
    private readonly vectors: QdrantKnowledgeService,
    @Inject(PLATFORM_KNOWLEDGE_READER)
    private readonly platform: PlatformKnowledgeReader,
  ) {}

  async getInfrastructureStatus() {
    return { qdrant: await this.vectors.healthCheck() };
  }

  async getSettings(tenant: TenantReference): Promise<ChatbotSettings> {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          'SELECT value FROM tenant_setting WHERE key = $1 LIMIT 1',
          ['chatbot_settings'],
        );
        return normalizeChatbotSettings(parseSettings(result.rows[0]?.value));
      },
    );
  }

  async updateSettings(
    tenant: TenantReference,
    patch: ChatbotSettingsPatch,
    actorMasterUserId?: number | null,
  ): Promise<ChatbotSettings> {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const currentResult = await client.query(
          'SELECT value FROM tenant_setting WHERE key = $1 LIMIT 1',
          ['chatbot_settings'],
        );
        const current = normalizeChatbotSettings(
          parseSettings(currentResult.rows[0]?.value),
        );
        const settings = normalizeChatbotSettings({
          ...current,
          ...patch,
          channels: { ...current.channels, ...patch.channels },
          stopRules: { ...current.stopRules, ...patch.stopRules },
        } as Partial<ChatbotSettings>);

        await client.query(
          [
            'INSERT INTO tenant_setting(key, value, updated_at)',
            'VALUES ($1, $2::jsonb, now())',
            'ON CONFLICT (key) DO UPDATE',
            'SET value = EXCLUDED.value, updated_at = now()',
          ].join(' '),
          ['chatbot_settings', JSON.stringify(settings)],
        );
        await this.audit(
          client,
          'chatbot.settings.updated',
          actorMasterUserId,
          'Tenant chatbot settings updated',
          { enabled: settings.enabled, channels: settings.channels },
        );
        return settings;
      },
    );
  }

  async listKnowledge(tenant: TenantReference) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          [
            'SELECT id::text AS id, property_id AS "propertyId", scope, audience,',
            'source_type AS "sourceType", title, answer,',
            'question_examples AS "questionExamples", priority, active,',
            'index_status AS "indexStatus", last_error AS "lastError",',
            'created_at AS "createdAt", updated_at AS "updatedAt"',
            'FROM tenant_chatbot_knowledge',
            'ORDER BY active DESC, priority DESC, updated_at DESC',
          ].join(' '),
        );
        return result.rows;
      },
    );
  }

  async createKnowledge(
    tenant: TenantReference,
    input: CreateTenantKnowledgeInput,
    actorMasterUserId?: number | null,
  ) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const title = requiredText(input.title, 'title', 240);
        const answer = requiredText(input.answer, 'answer', 10_000);
        const examples = (input.questionExamples ?? [])
          .map((value) => String(value).trim())
          .filter(Boolean)
          .slice(0, 20);
        const sourceHash = createHash('sha256')
          .update(
            JSON.stringify({
              propertyId: positiveInteger(input.propertyId),
              audience: input.audience,
              title,
              answer,
              examples,
            }),
          )
          .digest('hex');
        const pointId = randomUUID();
        const inserted = await client.query(
          [
            'INSERT INTO tenant_chatbot_knowledge(',
            'property_id, scope, audience, source_type, title, answer,',
            'question_examples, priority, source_hash, qdrant_point_id,',
            'created_by_master_user_id)',
            'VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11)',
            KNOWLEDGE_RETURNING,
          ].join(' '),
          [
            positiveInteger(input.propertyId),
            positiveInteger(input.propertyId) ? 'PROPERTY' : 'TENANT',
            validAudience(input.audience),
            'MANUAL',
            title,
            answer,
            JSON.stringify(examples),
            clampInteger(input.priority, 50, 0, 100),
            sourceHash,
            pointId,
            positiveInteger(actorMasterUserId),
          ],
        );
        const row = inserted.rows[0] as KnowledgeRecord;
        try {
          await this.vectors.ensureCollection();
          const vector = await this.embeddings.embed(
            [title, ...examples, answer].join('\n'),
          );
          await this.vectors.upsert([
            {
              pointId,
              vector,
              metadata: {
                scope: row.scope,
                tenantId: tenant.id,
                audience: row.audience,
                propertyId: row.propertyId,
                knowledgeId: row.id,
                sourceType: row.sourceType,
                sourceHash: row.sourceHash ?? sourceHash,
                priority: row.priority,
                active: row.active,
              },
            },
          ]);
          const updated = await client.query(
            [
              'UPDATE tenant_chatbot_knowledge',
              "SET index_status = 'indexed', last_error = '', updated_at = now()",
              'WHERE id = $1',
              KNOWLEDGE_RETURNING,
            ].join(' '),
            [row.id],
          );
          await this.audit(
            client,
            'chatbot.knowledge.created',
            actorMasterUserId,
            'Tenant chatbot knowledge created',
            { knowledgeId: row.id, audience: row.audience },
          );
          return updated.rows[0] ?? { ...row, indexStatus: 'indexed' };
        } catch (error) {
          await client.query(
            [
              'UPDATE tenant_chatbot_knowledge',
              "SET index_status = 'failed', last_error = $2, updated_at = now()",
              'WHERE id = $1',
            ].join(' '),
            [row.id, errorMessage(error)],
          );
          throw error;
        }
      },
    );
  }

  async updateKnowledge(
    tenant: TenantReference,
    knowledgeIdValue: number,
    patch: UpdateTenantKnowledgeInput,
    actorMasterUserId?: number | null,
  ) {
    const knowledgeId = positiveInteger(knowledgeIdValue);
    if (!knowledgeId) throw new Error('A valid knowledge item is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const currentResult = await client.query(
          [
            'SELECT id::text AS id, property_id AS "propertyId", scope, audience,',
            'source_type AS "sourceType", title, answer,',
            'question_examples AS "questionExamples", priority, active,',
            'source_hash AS "sourceHash", qdrant_point_id AS "qdrantPointId",',
            'index_status AS "indexStatus", last_error AS "lastError"',
            'FROM tenant_chatbot_knowledge',
            "WHERE id = $1 AND source_type = 'MANUAL' LIMIT 1",
          ].join(' '),
          [knowledgeId],
        );
        const current = currentResult.rows[0] as KnowledgeRecord | undefined;
        if (!current)
          throw new NotFoundException('Tenant knowledge was not found.');

        const propertyId =
          patch.propertyId === undefined
            ? positiveInteger(current.propertyId)
            : positiveInteger(patch.propertyId);
        const audience =
          patch.audience === undefined
            ? validAudience(current.audience)
            : validAudience(patch.audience);
        const title =
          patch.title === undefined
            ? requiredText(current.title, 'title', 240)
            : requiredText(patch.title, 'title', 240);
        const answer =
          patch.answer === undefined
            ? requiredText(current.answer, 'answer', 10_000)
            : requiredText(patch.answer, 'answer', 10_000);
        const examples =
          patch.questionExamples === undefined
            ? ((current as any).questionExamples ?? [])
            : patch.questionExamples
                .map((value) => String(value).trim())
                .filter(Boolean)
                .slice(0, 20);
        const priority =
          patch.priority === undefined
            ? clampInteger(current.priority, 50, 0, 100)
            : clampInteger(patch.priority, 50, 0, 100);
        const active =
          patch.active === undefined ? current.active : Boolean(patch.active);
        const scope = propertyId ? 'PROPERTY' : 'TENANT';
        const sourceHash = createHash('sha256')
          .update(
            JSON.stringify({
              propertyId,
              audience,
              title,
              answer,
              examples,
            }),
          )
          .digest('hex');
        const pointId = current.qdrantPointId || randomUUID();

        const updated = await client.query(
          [
            'UPDATE tenant_chatbot_knowledge SET property_id = $2, scope = $3,',
            'audience = $4, title = $5, answer = $6, question_examples = $7::jsonb,',
            'priority = $8, active = $9, source_hash = $10, qdrant_point_id = $11,',
            "index_status = 'pending', last_error = '', updated_at = now()",
            "WHERE id = $1 AND source_type = 'MANUAL'",
            KNOWLEDGE_RETURNING,
          ].join(' '),
          [
            knowledgeId,
            propertyId,
            scope,
            audience,
            title,
            answer,
            JSON.stringify(examples),
            priority,
            active,
            sourceHash,
            pointId,
          ],
        );
        const row = (updated.rows[0] ?? {
          ...current,
          propertyId,
          scope,
          audience,
          title,
          answer,
          questionExamples: examples,
          priority,
          active,
          sourceHash,
          qdrantPointId: pointId,
        }) as KnowledgeRecord;
        try {
          if (current.sourceHash && this.vectors.isConfigured()) {
            await this.vectors.deleteBySource(
              current.scope,
              current.sourceHash,
              tenant.id,
            );
          }
          if (active) {
            await this.vectors.ensureCollection();
            const vector = await this.embeddings.embed(
              [title, ...examples, answer].join('\n'),
            );
            await this.vectors.upsert([
              {
                pointId,
                vector,
                metadata: {
                  scope,
                  tenantId: tenant.id,
                  audience,
                  propertyId,
                  knowledgeId: String(knowledgeId),
                  sourceType: 'MANUAL',
                  sourceHash,
                  priority,
                  active,
                },
              },
            ]);
          }
          await client.query(
            "UPDATE tenant_chatbot_knowledge SET index_status = 'indexed', last_error = '', updated_at = now() WHERE id = $1",
            [knowledgeId],
          );
          await this.audit(
            client,
            'chatbot.knowledge.updated',
            actorMasterUserId,
            'Tenant chatbot knowledge updated',
            { knowledgeId: String(knowledgeId), audience },
          );
          return { ...row, indexStatus: 'indexed', lastError: '' };
        } catch (error) {
          await client.query(
            "UPDATE tenant_chatbot_knowledge SET index_status = 'failed', last_error = $2, updated_at = now() WHERE id = $1",
            [knowledgeId, errorMessage(error)],
          );
          throw error;
        }
      },
    );
  }

  async reindexProperty(tenant: TenantReference, propertyIdValue: number) {
    if (!this.vectors.isConfigured())
      throw new Error('Qdrant is not configured.');
    const propertyId = positiveInteger(propertyIdValue);
    if (!propertyId) throw new Error('A valid property is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const property = (
          await client.query(
            'SELECT id, title, status, payload FROM tenant_property WHERE id = $1 LIMIT 1',
            [propertyId],
          )
        ).rows[0];
        if (!property) throw new NotFoundException('Property not found.');

        const previous = await client.query(
          [
            'SELECT source_hash AS "sourceHash" FROM tenant_chatbot_knowledge',
            "WHERE source_type = 'PROPERTY_FIELD' AND property_id = $1",
          ].join(' '),
          [propertyId],
        );
        for (const row of previous.rows) {
          if (row.sourceHash) {
            await this.vectors.deleteBySource(
              'PROPERTY',
              row.sourceHash,
              tenant.id,
            );
          }
        }
        await client.query(
          "DELETE FROM tenant_chatbot_knowledge WHERE source_type = 'PROPERTY_FIELD' AND property_id = $1",
          [propertyId],
        );
        await this.vectors.ensureCollection();

        let indexed = 0;
        for (const chunk of mapPropertyKnowledge(property)) {
          const pointId = randomUUID();
          const inserted = await client.query(
            [
              'INSERT INTO tenant_chatbot_knowledge(',
              'property_id, scope, audience, source_type, title, answer, priority,',
              'source_hash, qdrant_point_id, index_status)',
              "VALUES ($1, 'PROPERTY', $2, 'PROPERTY_FIELD', $3, $4, $5, $6, $7, 'pending')",
              'RETURNING id::text AS id',
            ].join(' '),
            [
              chunk.propertyId,
              chunk.audience,
              chunk.title,
              chunk.content,
              chunk.priority,
              chunk.sourceHash,
              pointId,
            ],
          );
          const knowledgeId = String(inserted.rows[0]?.id);
          const vector = await this.embeddings.embed(
            `${chunk.title}\n${chunk.content}`,
          );
          await this.vectors.upsert([
            {
              pointId,
              vector,
              metadata: {
                scope: 'PROPERTY',
                tenantId: tenant.id,
                audience: chunk.audience,
                propertyId: chunk.propertyId,
                knowledgeId,
                sourceType: 'PROPERTY_FIELD',
                sourceHash: chunk.sourceHash,
                priority: chunk.priority,
                active: true,
              },
            },
          ]);
          await client.query(
            "UPDATE tenant_chatbot_knowledge SET index_status = 'indexed', updated_at = now() WHERE id = $1",
            [knowledgeId],
          );
          indexed += 1;
        }
        return { propertyId, indexed };
      },
    );
  }
  async reindexKnowledge(tenant: TenantReference) {
    if (!this.vectors.isConfigured())
      throw new Error('Qdrant is not configured.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const properties = (
          await client.query(
            'SELECT id, title, status, payload FROM tenant_property ORDER BY id',
          )
        ).rows;
        const previous = await client.query(
          [
            'SELECT source_hash AS "sourceHash" FROM tenant_chatbot_knowledge',
            "WHERE source_type = 'PROPERTY_FIELD'",
          ].join(' '),
        );
        for (const row of previous.rows) {
          if (row.sourceHash) {
            await this.vectors.deleteBySource(
              'PROPERTY',
              row.sourceHash,
              tenant.id,
            );
          }
        }
        await client.query(
          "DELETE FROM tenant_chatbot_knowledge WHERE source_type = 'PROPERTY_FIELD'",
        );
        await this.vectors.ensureCollection();
        let indexed = 0;
        for (const property of properties) {
          for (const chunk of mapPropertyKnowledge(property)) {
            const pointId = randomUUID();
            const inserted = await client.query(
              [
                'INSERT INTO tenant_chatbot_knowledge(',
                'property_id, scope, audience, source_type, title, answer, priority,',
                'source_hash, qdrant_point_id, index_status)',
                "VALUES ($1, 'PROPERTY', $2, 'PROPERTY_FIELD', $3, $4, $5, $6, $7, 'pending')",
                'RETURNING id::text AS id',
              ].join(' '),
              [
                chunk.propertyId,
                chunk.audience,
                chunk.title,
                chunk.content,
                chunk.priority,
                chunk.sourceHash,
                pointId,
              ],
            );
            const knowledgeId = String(inserted.rows[0]?.id);
            const vector = await this.embeddings.embed(
              `${chunk.title}\n${chunk.content}`,
            );
            await this.vectors.upsert([
              {
                pointId,
                vector,
                metadata: {
                  scope: 'PROPERTY',
                  tenantId: tenant.id,
                  audience: chunk.audience,
                  propertyId: chunk.propertyId,
                  knowledgeId,
                  sourceType: 'PROPERTY_FIELD',
                  sourceHash: chunk.sourceHash,
                  priority: chunk.priority,
                  active: true,
                },
              },
            ]);
            await client.query(
              "UPDATE tenant_chatbot_knowledge SET index_status = 'indexed', updated_at = now() WHERE id = $1",
              [knowledgeId],
            );
            indexed += 1;
          }
        }
        return { properties: properties.length, indexed };
      },
    );
  }

  async deleteKnowledge(
    tenant: TenantReference,
    knowledgeIdValue: number,
    actorMasterUserId?: number | null,
  ) {
    const knowledgeId = positiveInteger(knowledgeIdValue);
    if (!knowledgeId) throw new Error('A valid knowledge item is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const deleted = await client.query(
          [
            'DELETE FROM tenant_chatbot_knowledge WHERE id = $1',
            'RETURNING id::text AS id, scope, source_hash AS "sourceHash"',
          ].join(' '),
          [knowledgeId],
        );
        const row = deleted.rows[0];
        if (!row) return { deleted: false, id: String(knowledgeId) };
        if (this.vectors.isConfigured() && row.sourceHash) {
          await this.vectors.deleteBySource(
            row.scope,
            row.sourceHash,
            tenant.id,
          );
        }
        await this.audit(
          client,
          'chatbot.knowledge.deleted',
          actorMasterUserId,
          'Tenant chatbot knowledge deleted',
          { knowledgeId: row.id },
        );
        return { deleted: true, id: String(row.id) };
      },
    );
  }

  async testQuestion(
    tenant: TenantReference,
    input: TestChatbotQuestionInput,
  ): Promise<ChatbotTestResult> {
    const settings = await this.getSettings(tenant);
    const channel = input.channel ?? 'WEB';
    const propertyId = positiveInteger(input.propertyId);
    const question = requiredText(input.question, 'question', 2_000);
    const audience = input.audience ? validAudience(input.audience) : 'LEAD';
    const qdrant = await this.vectors.healthCheck();
    if (!qdrant.connected) {
      throw new ServiceUnavailableException(
        `Qdrant unavailable: ${qdrant.error ?? 'connection failed'}`,
      );
    }

    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        let propertyStatus: string | null = null;
        if (propertyId) {
          const property = await client.query(
            'SELECT id, title, status, payload FROM tenant_property WHERE id = $1 LIMIT 1',
            [propertyId],
          );
          propertyStatus = property.rows[0]?.status ?? 'unavailable';
        }
        const initial = evaluateChatbotPolicy({
          settings,
          channel,
          conversationStatus: 'ACTIVE',
          propertyStatus,
          infrastructureReady: true,
        });
        if (initial.action !== 'ALLOW_RETRIEVAL') {
          return stopped(settings, initial.reason);
        }

        let matches: QdrantKnowledgeMatch[];
        try {
          const vector = await this.embeddings.embed(question);
          const [tenantMatches, platformMatches] = await Promise.all([
            this.vectors.search({
              scope: 'TENANT',
              tenantId: tenant.id,
              audience,
              propertyId,
              vector,
            }),
            this.vectors.search({
              scope: 'PLATFORM',
              audience,
              vector,
            }),
          ]);
          matches = [...tenantMatches, ...platformMatches]
            .filter(
              (match) =>
                !propertyId ||
                !match.propertyId ||
                match.propertyId === propertyId,
            )
            .sort((left, right) => right.score - left.score);
        } catch {
          return stopped(settings, 'SYSTEM_UNAVAILABLE');
        }

        const hydrated = await this.hydrateMatches(client, matches, audience);
        const topScore = hydrated[0]?.match.score ?? null;
        const conflict = hasEvidenceConflict(hydrated);
        const decision = evaluateChatbotPolicy({
          settings,
          channel,
          conversationStatus: 'ACTIVE',
          propertyStatus,
          infrastructureReady: true,
          hasEvidence: hydrated.length > 0,
          evidenceConflict: conflict,
          confidence: topScore,
        });
        if (decision.action !== 'ANSWER') {
          return stopped(settings, decision.reason, topScore, hydrated);
        }

        return {
          answer: hydrated[0].record.answer,
          decision: 'ANSWER',
          reason: 'EVIDENCE_VERIFIED',
          confidence: topScore,
          evidence: evidenceFrom(hydrated),
        };
      },
    );
  }

  async handlePublicMessage(
    tenant: TenantReference,
    input: PublicChatbotMessageInput,
  ): Promise<ChatbotLiveResponse> {
    const token = requiredText(input.accessToken, 'access token', 200);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) =>
        (
          await client.query(
            [
              'SELECT lead_id AS "leadId", property_id AS "propertyId"',
              'FROM tenant_chatbot_web_session',
              'WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()',
              'LIMIT 1',
            ].join(' '),
            [tokenHash],
          )
        ).rows[0],
    );
    if (!session) throw new NotFoundException('Chat session was not found.');
    return this.handleMessage(tenant, {
      channel: 'WEB',
      audience: 'LEAD',
      leadId: Number(session.leadId),
      propertyId: Number(session.propertyId) || null,
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
      body: input.body,
      showing: input.showing,
    });
  }

  async handleMessage(
    tenant: TenantReference,
    input: HandleChatbotMessageInput,
  ): Promise<ChatbotLiveResponse> {
    const settings = await this.getSettings(tenant);
    if (input.leadId) {
      const control = await this.databases.withTenantClient(
        this.databaseName(tenant),
        async (client) => client.query(
          'SELECT chatbot_manually_stopped AS "chatbotManuallyStopped" FROM tenant_lead WHERE id = $1 LIMIT 1',
          [input.leadId],
        ),
      );
      if (control.rows[0]?.chatbotManuallyStopped === true) {
        return liveStopped(settings, 'MANUAL_STOP');
      }
    }
    const baseDecision = evaluateChatbotPolicy({
      settings,
      channel: input.channel,
      conversationStatus: 'ACTIVE',
      infrastructureReady: this.vectors.isConfigured(),
    });
    if (baseDecision.action !== 'ALLOW_RETRIEVAL') {
      return liveStopped(settings, baseDecision.reason);
    }
    const audience = input.audience ?? 'LEAD';
    if (audience !== 'REALTOR' && isSensitiveRealtorQuestion(input.body)) {
      return this.persistLiveResponse(
        tenant,
        input,
        settings,
        stopped(settings, 'REALTOR_VERIFICATION_REQUIRED'),
      );
    }
    const result = await this.testQuestion(tenant, {
      propertyId: input.propertyId,
      audience,
      question: input.body,
      channel: input.channel,
    });
    return this.persistLiveResponse(tenant, input, settings, result);
  }

  async listActivity(tenant: TenantReference) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query([
        "SELECT 'message' AS kind, m.id::text AS id, m.role AS type, m.decision AS reason,",
        'm.body, m.direction, m.confidence, m.created_at AS "createdAt", c.id::text AS "conversationId",',
        'c.lead_id AS "leadId", c.property_id AS "propertyId", c.channel, c.audience, c.status AS "conversationStatus",',
        "COALESCE(l.full_name, l.email, l.phone, 'Unknown lead') AS \"leadName\", p.title AS \"propertyTitle\"",
        'FROM tenant_chatbot_message m JOIN tenant_chatbot_conversation c ON c.id = m.conversation_id',
        'LEFT JOIN tenant_lead l ON l.id = c.lead_id LEFT JOIN tenant_property p ON p.id = c.property_id',
        "WHERE m.created_at >= now() - interval '7 days' UNION ALL",
        "SELECT 'event' AS kind, e.id::text AS id, e.event_type AS type, e.reason, NULL::text AS body,",
        'NULL::varchar AS direction, NULL::numeric AS confidence, e.created_at AS "createdAt", c.id::text AS "conversationId",',
        'c.lead_id AS "leadId", c.property_id AS "propertyId", c.channel, c.audience, c.status AS "conversationStatus",',
        "COALESCE(l.full_name, l.email, l.phone, 'Unknown lead') AS \"leadName\", p.title AS \"propertyTitle\"",
        'FROM tenant_chatbot_event e JOIN tenant_chatbot_conversation c ON c.id = e.conversation_id',
        'LEFT JOIN tenant_lead l ON l.id = c.lead_id LEFT JOIN tenant_property p ON p.id = c.property_id',
        'WHERE e.created_at >= now() - interval \'7 days\' ORDER BY "createdAt" DESC LIMIT 500',
      ].join(' '));
      return result.rows;
    });
  }

  async cleanupExpiredActivity(tenant: TenantReference) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const messages = await client.query("DELETE FROM tenant_chatbot_message WHERE created_at < now() - interval '7 days'");
      const events = await client.query("DELETE FROM tenant_chatbot_event WHERE created_at < now() - interval '7 days'");
      return { messagesDeleted: messages.rowCount ?? 0, eventsDeleted: events.rowCount ?? 0 };
    });
  }

  async listLeadActivity(tenant: TenantReference, leadIdValue: number) {
    const leadId = positiveInteger(leadIdValue);
    if (!leadId) throw new Error('A valid lead is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          [
            "SELECT 'event' AS kind, e.id::text AS id, e.event_type AS type,",
            'e.reason, e.metadata, e.created_at AS "createdAt",',
            'e.conversation_id::text AS "conversationId", NULL::text AS body,',
            'NULL::varchar AS direction, NULL::numeric AS confidence',
            'FROM tenant_chatbot_event e WHERE e.lead_id = $1',
            'UNION ALL',
            "SELECT 'message' AS kind, m.id::text AS id, m.role AS type,",
            "m.decision AS reason, jsonb_build_object('evidence', m.evidence) AS metadata,",
            'm.created_at AS "createdAt", m.conversation_id::text AS "conversationId",',
            'm.body, m.direction, m.confidence',
            'FROM tenant_chatbot_message m',
            'JOIN tenant_chatbot_conversation c ON c.id = m.conversation_id',
            'WHERE c.lead_id = $1',
            'ORDER BY "createdAt" DESC LIMIT 250',
          ].join(' '),
          [leadId],
        );
        return result.rows;
      },
    );
  }

  async stopLead(
    tenant: TenantReference,
    leadIdValue: number,
    actorMasterUserId?: number | null,
  ) {
    const leadId = positiveInteger(leadIdValue);
    if (!leadId) throw new Error('A valid lead is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const leadControl = await client.query(
            `UPDATE tenant_lead
             SET chatbot_manually_stopped = true, chatbot_control_updated_at = now(), updated_at = now()
             WHERE id = $1 RETURNING id`,
            [leadId],
          );
          if (!leadControl.rows.length) throw new Error('Lead was not found.');
          const stopped = await client.query(
            [
              'UPDATE tenant_chatbot_conversation',
              "SET status = 'STOPPED', stop_reason = 'MANUAL_STOP',",
              'stopped_by_master_user_id = $2, stopped_at = now(), updated_at = now()',
              "WHERE lead_id = $1 AND status = 'ACTIVE'",
              'RETURNING id::text AS id, lead_id AS "leadId"',
            ].join(' '),
            [leadId, positiveInteger(actorMasterUserId)],
          );
          const conversationIds = stopped.rows.map((row: any) =>
            String(row.id),
          );
          if (conversationIds.length) {
            await client.query(
              [
                'UPDATE tenant_outreach_job',
                "SET status = 'cancelled', last_error = 'Chatbot stopped manually',",
                'locked_at = NULL, locked_by = NULL, updated_at = now()',
                "WHERE source_type IN ('tenant-chatbot', 'tenant-chatbot-rule')",
                'AND source_id = ANY($1::text[])',
                "AND status IN ('scheduled', 'retrying', 'processing')",
              ].join(' '),
              [conversationIds],
            );
            for (const conversationId of conversationIds) {
              await client.query(
                [
                  'INSERT INTO tenant_chatbot_event(',
                  'conversation_id, lead_id, event_type, reason, actor_master_user_id)',
                  "VALUES ($1, $2, 'STOPPED', 'MANUAL_STOP', $3)",
                ].join(' '),
                [conversationId, leadId, positiveInteger(actorMasterUserId)],
              );
            }
          }
          await client.query('COMMIT');
          return { stopped: true, conversationIds };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  async resumeLead(
    tenant: TenantReference,
    leadIdValue: number,
    actorMasterUserId?: number | null,
  ) {
    const leadId = positiveInteger(leadIdValue);
    if (!leadId) throw new Error('A valid lead is required.');
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const leadControl = await client.query(
          `UPDATE tenant_lead
           SET chatbot_manually_stopped = false, chatbot_control_updated_at = now(), updated_at = now()
           WHERE id = $1 RETURNING id`,
          [leadId],
        );
        if (!leadControl.rows.length) throw new Error('Lead was not found.');
        const resumed = await client.query(
          [
            'UPDATE tenant_chatbot_conversation',
            "SET status = 'ACTIVE', stop_reason = NULL, stopped_at = NULL,",
            'stopped_by_master_user_id = NULL, updated_at = now()',
            'WHERE id = (SELECT id FROM tenant_chatbot_conversation',
            "WHERE lead_id = $1 AND status = 'STOPPED'",
            "AND stop_reason = 'MANUAL_STOP'",
            'ORDER BY updated_at DESC LIMIT 1)',
            'RETURNING id::text AS id',
          ].join(' '),
          [leadId],
        );
        const conversationId = resumed.rows[0]?.id
          ? String(resumed.rows[0].id)
          : null;
        if (conversationId) {
          await client.query(
            [
              'INSERT INTO tenant_chatbot_event(',
              'conversation_id, lead_id, event_type, reason, actor_master_user_id)',
              "VALUES ($1, $2, 'RESUMED', 'MANUAL_STOP', $3)",
            ].join(' '),
            [conversationId, leadId, positiveInteger(actorMasterUserId)],
          );
        }
        return { resumed: Boolean(conversationId), conversationId };
      },
    );
  }

  async authorizeOutboundJob(
    tenant: TenantReference,
    job: {
      id: number;
      lead_id?: number | null;
      source_type?: string;
      source_id?: string;
      channel?: string;
      payload?: Record<string, unknown> | null;
    },
  ): Promise<{
    allowed: boolean;
    reason: ChatbotPolicyDecision['reason'] | 'NOT_CHATBOT';
  }> {
    const isRuleJob = job.source_type === 'tenant-chatbot-rule';
    if (job.source_type !== 'tenant-chatbot' && !isRuleJob) {
      return { allowed: true, reason: 'NOT_CHATBOT' };
    }
    const conversationId = positiveInteger(job.source_id);
    if (!conversationId) {
      return { allowed: false, reason: 'SYSTEM_UNAVAILABLE' };
    }
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const result = await client.query(
            [
              'SELECT id::text AS id, lead_id AS "leadId", status,',
              'stop_reason AS "stopReason", created_at AS "createdAt"',
              'FROM tenant_chatbot_conversation WHERE id = $1 FOR UPDATE',
            ].join(' '),
            [conversationId],
          );
          const conversation = result.rows[0];
          const expectedRuleReason = String(job.payload?.finalRuleReason ?? '');
          const ruleStopMatches =
            isRuleJob &&
            conversation?.status === 'STOPPED' &&
            expectedRuleReason &&
            conversation?.stopReason === expectedRuleReason;
          if (
            !conversation ||
            (conversation.status !== 'ACTIVE' && !ruleStopMatches)
          ) {
            await this.cancelOutboundJob(
              client,
              job.id,
              conversation?.stopReason ?? 'MANUAL_STOP',
            );
            await client.query('COMMIT');
            return {
              allowed: false,
              reason: conversation?.stopReason ?? 'MANUAL_STOP',
            };
          }
          const leadId = positiveInteger(conversation.leadId ?? job.lead_id);
          const currentSettingsRow = await client.query(
            'SELECT value FROM tenant_setting WHERE key = $1 LIMIT 1',
            ['chatbot_settings'],
          );
          const currentSettings = normalizeChatbotSettings(
            parseSettings(currentSettingsRow.rows[0]?.value),
          );
          const outboundChannel =
            String(job.channel ?? '').toUpperCase() === 'SMS' ? 'SMS' : 'EMAIL';
          const channelAllowed =
            outboundChannel === 'SMS'
              ? currentSettings.channels.sms
              : currentSettings.channels.email;
          if (!currentSettings.enabled || !channelAllowed) {
            const reason: ChatbotPolicyDecision['reason'] =
              currentSettings.enabled ? 'CHANNEL_DISABLED' : 'BOT_DISABLED';
            await this.cancelOutboundJob(client, job.id, reason);
            await client.query('COMMIT');
            return { allowed: false, reason };
          }
          const doNotContact = leadId
            ? await client.query(
                [
                  'SELECT id FROM tenant_lead',
                  'WHERE id = $1',
                  "AND COALESCE((payload->>'doNotContact')::boolean, false) = true",
                  'LIMIT 1',
                ].join(' '),
                [leadId],
              )
            : { rows: [] };
          if (doNotContact.rows.length) {
            await client.query(
              [
                'UPDATE tenant_chatbot_conversation',
                "SET status = 'STOPPED', stop_reason = 'DO_NOT_CONTACT',",
                'stopped_at = now(), updated_at = now()',
                'WHERE id = $1',
              ].join(' '),
              [conversationId],
            );
            await this.cancelOutboundJob(client, job.id, 'DO_NOT_CONTACT');
            await client.query('COMMIT');
            return { allowed: false, reason: 'DO_NOT_CONTACT' };
          }
          const human = leadId
            ? await client.query(
                [
                  'SELECT id FROM tenant_outreach_job',
                  "WHERE lead_id = $1 AND direction = 'Outgoing'",
                  "AND source_type <> 'tenant-chatbot'",
                  "AND created_by NOT IN ('chatbot', 'tenant-chatbot')",
                  'AND COALESCE(occurred_at, completed_at, created_at) >= $2',
                  'LIMIT 1',
                ].join(' '),
                [leadId, conversation.createdAt],
              )
            : { rows: [] };
          if (human.rows.length) {
            await client.query(
              [
                'UPDATE tenant_chatbot_conversation',
                "SET status = 'HANDOFF', stop_reason = 'HUMAN_INTERVENED',",
                'human_intervened_at = now(), stopped_at = now(), updated_at = now()',
                'WHERE id = $1',
              ].join(' '),
              [conversationId],
            );
            await this.cancelOutboundJob(client, job.id, 'HUMAN_INTERVENED');
            await client.query(
              [
                'INSERT INTO tenant_chatbot_event(',
                'conversation_id, lead_id, event_type, reason, metadata)',
                "VALUES ($1, $2, 'STOPPED', 'HUMAN_INTERVENED', $3::jsonb)",
              ].join(' '),
              [
                conversationId,
                leadId,
                JSON.stringify({ outreachJobId: job.id }),
              ],
            );
            await client.query('COMMIT');
            return { allowed: false, reason: 'HUMAN_INTERVENED' };
          }
          await client.query('COMMIT');
          return { allowed: true, reason: 'READY' };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  private async persistLiveResponse(
    tenant: TenantReference,
    input: HandleChatbotMessageInput,
    settings: ChatbotSettings,
    result: ChatbotTestResult,
  ): Promise<ChatbotLiveResponse> {
    const leadId = positiveInteger(input.leadId);
    if (!leadId) throw new Error('A valid lead is required.');
    const propertyId = positiveInteger(input.propertyId);
    const sessionId = requiredText(input.sessionId, 'session id', 120);
    const idempotencyKey = requiredText(
      input.idempotencyKey,
      'idempotency key',
      180,
    );
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const leadResult = await client.query(
            [
              'SELECT l.id, l.full_name AS "fullName", l.email, l.phone, l.payload,',
              'COALESCE((l.payload->>\'doNotContact\')::boolean, false) AS "doNotContact"',
              'FROM tenant_lead l WHERE l.id = $1 LIMIT 1',
            ].join(' '),
            [leadId],
          );
          const lead = leadResult.rows[0];
          if (!lead) throw new Error('Lead was not found.');
          const propertyResult = propertyId
            ? await client.query(
                'SELECT id, title, status, payload FROM tenant_property WHERE id = $1 LIMIT 1',
                [propertyId],
              )
            : { rows: [] };
          const property = propertyResult.rows[0];
          let conversation = (
            await client.query(
              [
                'SELECT id::text AS id, status, stop_reason AS "stopReason",',
                'turn_count AS "turnCount" FROM tenant_chatbot_conversation',
                'WHERE session_id = $1 AND channel = $2 ORDER BY updated_at DESC LIMIT 1',
              ].join(' '),
              [sessionId, input.channel],
            )
          ).rows[0];
          if (!conversation) {
            conversation = (
              await client.query(
                [
                  'INSERT INTO tenant_chatbot_conversation(',
                  'lead_id, property_id, channel, audience, session_id)',
                  'VALUES ($1, $2, $3, $4, $5)',
                  'RETURNING id::text AS id, status, turn_count AS "turnCount"',
                ].join(' '),
                [
                  leadId,
                  propertyId,
                  input.channel,
                  input.audience ?? 'LEAD',
                  sessionId,
                ],
              )
            ).rows[0];
          }
          const conversationId = String(conversation.id);
          const incoming = await client.query(
            [
              'INSERT INTO tenant_chatbot_message(',
              'conversation_id, role, direction, body, decision, idempotency_key)',
              "VALUES ($1, 'LEAD', 'INCOMING', $2, 'RECEIVED', $3)",
              'ON CONFLICT (conversation_id, idempotency_key) DO NOTHING RETURNING id',
            ].join(' '),
            [
              conversationId,
              requiredText(input.body, 'message', 4_000),
              `incoming:${idempotencyKey}`,
            ],
          );
          if (!incoming.rows.length) {
            await client.query('COMMIT');
            return { ...result, conversationId, queued: false };
          }
          const liveDecision = evaluateChatbotPolicy({
            settings,
            channel: input.channel,
            conversationStatus: conversation.status ?? 'ACTIVE',
            conversationStopReason: conversation.stopReason,
            doNotContact: Boolean(lead.doNotContact),
            propertyStatus: propertyId
              ? (property?.status ?? 'unavailable')
              : null,
            minimumCreditScore:
              property?.payload?.minimumCreditScore ??
              property?.payload?.minCreditScore,
            leadCreditScore: input.leadCreditScore ?? lead.payload?.creditScore,
            turnCount: Number(conversation.turnCount ?? 0),
            infrastructureReady: true,
          });
          if (liveDecision.action !== 'ALLOW_RETRIEVAL') {
            const response = await this.persistRuleDecision(client, {
              input,
              settings,
              result: stopped(settings, liveDecision.reason),
              conversationId,
              leadId,
              lead,
              property,
              idempotencyKey,
              terminal: liveDecision.terminal,
            });
            await client.query('COMMIT');
            return response;
          }
          if (result.decision !== 'ANSWER') {
            const response = await this.persistRuleDecision(client, {
              input,
              settings,
              result,
              conversationId,
              leadId,
              lead,
              property,
              idempotencyKey,
              terminal: isTerminalRuleReason(result.reason),
            });
            await client.query('COMMIT');
            return response;
          }
          const preferredAt = confirmedShowingAt(input.showing);
          if (preferredAt && propertyId) {
            const request = await client.query(
              [
                'INSERT INTO tenant_showing_request(',
                'access_token, lead_id, property_id, requested_property_id, title, message,',
                'recipient_name, recipient_email, recipient_phone, status, delivery_status,',
                'expires_at, preferred_showing_at, submitted_at)',
                "VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, 'submitted', 'submitted',",
                "now() + interval '7 days', $9, now()) RETURNING id",
              ].join(' '),
              [
                randomUUID(),
                leadId,
                propertyId,
                `Showing request - ${property?.title ?? 'Property'}`,
                'Confirmed through the tenant chatbot.',
                lead.fullName,
                lead.email ?? '',
                lead.phone ?? '',
                preferredAt,
              ],
            );
            await client.query(
              [
                'UPDATE tenant_chatbot_conversation',
                "SET status = 'COMPLETED', stop_reason = 'SHOWING_REQUESTED', stopped_at = now(), updated_at = now()",
                'WHERE id = $1',
              ].join(' '),
              [conversationId],
            );
            await client.query(
              [
                'INSERT INTO tenant_chatbot_event(conversation_id, lead_id, event_type, reason, metadata)',
                "VALUES ($1, $2, 'SHOWING_REQUESTED', 'SHOWING_REQUESTED', $3::jsonb)",
              ].join(' '),
              [
                conversationId,
                leadId,
                JSON.stringify({ showingRequestId: request.rows[0]?.id }),
              ],
            );
            await client.query('COMMIT');
            return {
              answer:
                'Your showing request was submitted for staff confirmation.',
              decision: 'CREATE_SHOWING_REQUEST',
              reason: 'SHOWING_REQUESTED',
              confidence: null,
              evidence: [],
              conversationId,
              queued: false,
            };
          }
          let outreachJobId: number | null = null;
          if (input.channel !== 'WEB') {
            const channel = input.channel === 'EMAIL' ? 'Email' : 'SMS';
            const scheduledAt = new Date(
              Date.now() + settings.responseDelaySeconds * 1_000,
            );
            const queued = await client.query(
              [
                'INSERT INTO tenant_outreach_job(',
                'idempotency_key, lead_id, source_type, source_id, channel, direction, status,',
                'recipient_name, recipient_email, recipient_phone, title, body, created_by,',
                'scheduled_at, next_attempt_at, payload)',
                "VALUES ($1, $2, $3, $4, $5, 'Scheduled', 'scheduled', $6, $7, $8, $9, $10,",
                "'tenant-chatbot', $11, $11, $12::jsonb)",
                'ON CONFLICT (idempotency_key) DO NOTHING RETURNING id',
              ].join(' '),
              [
                `chatbot:${conversationId}:${idempotencyKey}`.slice(0, 200),
                leadId,
                'tenant-chatbot',
                conversationId,
                channel,
                lead.fullName ?? '',
                lead.email ?? '',
                lead.phone ?? '',
                input.channel === 'EMAIL'
                  ? `Re: ${property?.title ?? 'Your inquiry'}`
                  : 'Chatbot reply',
                result.answer,
                scheduledAt,
                JSON.stringify({
                  chatbotConversationId: conversationId,
                  evidence: result.evidence,
                }),
              ],
            );
            outreachJobId = queued.rows[0]?.id
              ? Number(queued.rows[0].id)
              : null;
          }
          await client.query(
            [
              'INSERT INTO tenant_chatbot_message(',
              'conversation_id, outreach_job_id, role, direction, body, evidence,',
              'confidence, decision, idempotency_key)',
              "VALUES ($1, $2, 'BOT', 'OUTGOING', $3, $4::jsonb, $5, $6, $7)",
              'ON CONFLICT (conversation_id, idempotency_key) DO NOTHING',
            ].join(' '),
            [
              conversationId,
              outreachJobId,
              result.answer,
              JSON.stringify(result.evidence),
              result.confidence,
              result.reason,
              `outgoing:${idempotencyKey}`,
            ],
          );
          await client.query(
            [
              'UPDATE tenant_chatbot_conversation',
              'SET turn_count = turn_count + 1, last_message_at = now(), updated_at = now()',
              'WHERE id = $1',
            ].join(' '),
            [conversationId],
          );
          await client.query(
            [
              'INSERT INTO tenant_chatbot_event(conversation_id, lead_id, event_type, reason, metadata)',
              "VALUES ($1, $2, 'REPLY_DECIDED', $3, $4::jsonb)",
            ].join(' '),
            [
              conversationId,
              leadId,
              result.reason,
              JSON.stringify({ outreachJobId, channel: input.channel }),
            ],
          );
          await client.query('COMMIT');
          return {
            ...result,
            conversationId,
            queued: input.channel === 'WEB' || Boolean(outreachJobId),
            outreachJobId,
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  private async persistRuleDecision(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    context: {
      input: HandleChatbotMessageInput;
      settings: ChatbotSettings;
      result: ChatbotTestResult;
      conversationId: string;
      leadId: number;
      lead: any;
      property: any;
      idempotencyKey: string;
      terminal: boolean;
    },
  ): Promise<ChatbotLiveResponse> {
    const {
      input,
      settings,
      result,
      conversationId,
      leadId,
      lead,
      property,
      idempotencyKey,
      terminal,
    } = context;

    if (terminal) {
      await client.query(
        [
          'UPDATE tenant_chatbot_conversation',
          "SET status = 'STOPPED', stop_reason = $2, stopped_at = now(), updated_at = now()",
          'WHERE id = $1',
        ].join(' '),
        [conversationId, result.reason],
      );
    }

    const sendMessage = shouldSendRuleMessage(result.reason);
    let outreachJobId: number | null = null;
    if (sendMessage && input.channel !== 'WEB') {
      const channel = input.channel === 'EMAIL' ? 'Email' : 'SMS';
      const scheduledAt = new Date(
        Date.now() + settings.responseDelaySeconds * 1_000,
      );
      const queued = await client.query(
        [
          'INSERT INTO tenant_outreach_job(',
          'idempotency_key, lead_id, source_type, source_id, channel, direction, status,',
          'recipient_name, recipient_email, recipient_phone, title, body, created_by,',
          'scheduled_at, next_attempt_at, payload)',
          "VALUES ($1, $2, 'tenant-chatbot-rule', $3, $4, 'Scheduled', 'scheduled',",
          "$5, $6, $7, $8, $9, 'tenant-chatbot', $10, $10, $11::jsonb)",
          'ON CONFLICT (idempotency_key) DO NOTHING RETURNING id',
        ].join(' '),
        [
          `chatbot-rule:${conversationId}:${idempotencyKey}:${result.reason}`.slice(
            0,
            200,
          ),
          leadId,
          conversationId,
          channel,
          lead.fullName ?? '',
          lead.email ?? '',
          lead.phone ?? '',
          input.channel === 'EMAIL'
            ? `Re: ${property?.title ?? 'Your inquiry'}`
            : 'Chatbot reply',
          result.answer,
          scheduledAt,
          JSON.stringify({
            chatbotConversationId: conversationId,
            finalRuleReason: result.reason,
          }),
        ],
      );
      outreachJobId = queued.rows[0]?.id ? Number(queued.rows[0].id) : null;
    }

    if (sendMessage) {
      await client.query(
        [
          'INSERT INTO tenant_chatbot_message(',
          'conversation_id, outreach_job_id, role, direction, body, evidence,',
          'confidence, decision, idempotency_key)',
          "VALUES ($1, $2, 'BOT', 'OUTGOING', $3, $4::jsonb, $5, $6, $7)",
          'ON CONFLICT (conversation_id, idempotency_key) DO NOTHING',
        ].join(' '),
        [
          conversationId,
          outreachJobId,
          result.answer,
          JSON.stringify(result.evidence),
          result.confidence,
          result.reason,
          `outgoing:${idempotencyKey}`,
        ],
      );
      await client.query(
        [
          'UPDATE tenant_chatbot_conversation',
          'SET turn_count = turn_count + 1, last_message_at = now(), updated_at = now()',
          'WHERE id = $1',
        ].join(' '),
        [conversationId],
      );
    }

    await client.query(
      [
        'INSERT INTO tenant_chatbot_event(conversation_id, lead_id, event_type, reason, metadata)',
        'VALUES ($1, $2, $3, $4, $5::jsonb)',
      ].join(' '),
      [
        conversationId,
        leadId,
        terminal ? 'STOPPED' : 'RULE_MESSAGE',
        result.reason,
        JSON.stringify({
          outreachJobId,
          channel: input.channel,
          messageSent: sendMessage,
        }),
      ],
    );

    return {
      ...result,
      conversationId,
      queued: input.channel === 'WEB' ? false : Boolean(outreachJobId),
      outreachJobId,
    };
  }
  private async cancelOutboundJob(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    jobId: number,
    reason: string,
  ) {
    await client.query(
      [
        'UPDATE tenant_outreach_job',
        "SET status = 'cancelled', last_error = $2,",
        'locked_at = NULL, locked_by = NULL, updated_at = now()',
        'WHERE id = $1',
      ].join(' '),
      [jobId, `Chatbot stopped: ${reason}`],
    );
  }

  private async hydrateMatches(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    matches: QdrantKnowledgeMatch[],
    audience: ChatbotAudience,
  ): Promise<HydratedMatch[]> {
    const tenantIds = matches
      .filter((match) => match.scope !== 'PLATFORM')
      .map((match) => match.knowledgeId);
    const platformIds = matches
      .filter((match) => match.scope === 'PLATFORM')
      .map((match) => match.knowledgeId);
    const tenantRows = tenantIds.length
      ? (
          await client.query(
            [
              'SELECT id::text AS id, property_id AS "propertyId", scope, audience,',
              'source_type AS "sourceType", title, answer, priority, active,',
              'source_hash AS "sourceHash" FROM tenant_chatbot_knowledge',
              'WHERE id::text = ANY($1::text[]) AND active = true AND audience = $2',
            ].join(' '),
            [tenantIds, audience],
          )
        ).rows
      : [];
    const platformRows = platformIds.length
      ? await this.platform.findActiveByIds(platformIds, audience)
      : [];
    const records = new Map<string, KnowledgeRecord>(
      [...tenantRows, ...platformRows].map((row) => [String(row.id), row]),
    );
    return matches
      .map((match) => {
        const record = records.get(String(match.knowledgeId));
        return record ? { match, record } : null;
      })
      .filter((value): value is HydratedMatch => Boolean(value));
  }

  private async audit(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    action: string,
    actorMasterUserId: number | null | undefined,
    summary: string,
    metadata: Record<string, unknown>,
  ) {
    await client.query(
      [
        'INSERT INTO tenant_audit_log(',
        'actor_master_user_id, action, resource_type, summary, metadata)',
        "VALUES ($1, $2, 'chatbot', $3, $4::jsonb)",
      ].join(' '),
      [
        positiveInteger(actorMasterUserId),
        action,
        summary,
        JSON.stringify(metadata),
      ],
    );
  }

  private databaseName(tenant: TenantReference) {
    const name = String(tenant.databaseName ?? '');
    if (!name) throw new Error('Tenant database is not ready.');
    return name;
  }
}

function parseSettings(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value && typeof value === 'object'
    ? (value as Partial<ChatbotSettings>)
    : undefined;
}

function validAudience(value: unknown): ChatbotAudience {
  if (value === 'LEAD' || value === 'REALTOR') return value;
  throw new Error('Chatbot audience must be LEAD or REALTOR.');
}

function requiredText(value: unknown, field: string, maximum: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`Chatbot ${field} is required.`);
  return text.slice(0, maximum);
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

function stopped(
  settings: ChatbotSettings,
  reason: ChatbotPolicyDecision['reason'],
  confidence: number | null = null,
  hydrated: HydratedMatch[] = [],
): ChatbotTestResult {
  return {
    answer: messageForReason(settings, reason),
    decision: 'STOP',
    reason,
    confidence,
    evidence: evidenceFrom(hydrated),
  };
}

function shouldSendRuleMessage(reason: ChatbotPolicyDecision['reason']) {
  return [
    'CREDIT_REQUIRED',
    'CREDIT_BELOW_MINIMUM',
    'PROPERTY_UNAVAILABLE',
    'EVIDENCE_INSUFFICIENT',
    'EVIDENCE_CONFLICT',
    'TURN_LIMIT',
    'REALTOR_VERIFICATION_REQUIRED',
  ].includes(reason);
}

function isTerminalRuleReason(reason: ChatbotPolicyDecision['reason']) {
  return [
    'CREDIT_BELOW_MINIMUM',
    'PROPERTY_UNAVAILABLE',
    'EVIDENCE_INSUFFICIENT',
    'EVIDENCE_CONFLICT',
    'TURN_LIMIT',
    'SYSTEM_UNAVAILABLE',
  ].includes(reason);
}
function messageForReason(
  settings: ChatbotSettings,
  reason: ChatbotPolicyDecision['reason'],
) {
  if (reason === 'CREDIT_REQUIRED') return settings.creditRequiredMessage;
  if (reason === 'CREDIT_BELOW_MINIMUM') return settings.creditRejectedMessage;
  if (reason === 'PROPERTY_UNAVAILABLE')
    return settings.propertyUnavailableMessage;
  if (reason === 'EVIDENCE_CONFLICT') return settings.evidenceConflictMessage;
  if (reason === 'TURN_LIMIT') return settings.turnLimitMessage;
  if (reason === 'REALTOR_VERIFICATION_REQUIRED')
    return settings.realtorVerificationMessage;
  return settings.fallbackMessage;
}
function evidenceFrom(hydrated: HydratedMatch[]): ChatbotTestEvidence[] {
  return hydrated.map(({ match, record }) => ({
    knowledgeId: String(record.id),
    title: record.title,
    scope: record.scope,
    sourceType: record.sourceType,
    score: match.score,
  }));
}

function hasEvidenceConflict(hydrated: HydratedMatch[]) {
  if (hydrated.length < 2) return false;
  const significant = hydrated.filter(
    ({ match }) => match.score >= hydrated[0].match.score - 0.05,
  );
  const normalized = significant.map(({ record }) =>
    record.answer
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim(),
  );
  return (
    normalized.some((answer, index) =>
      normalized.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          (answer.includes(`not ${other}`) || other.includes(`not ${answer}`)),
      ),
    ) ||
    (normalized.some((answer) =>
      /\b(no|not|never|prohibited|disallowed)\b/.test(answer),
    ) &&
      normalized.some((answer) =>
        /\b(yes|allowed|available|included)\b/.test(answer),
      ))
  );
}

function liveStopped(
  settings: ChatbotSettings,
  reason: ChatbotPolicyDecision['reason'],
): ChatbotLiveResponse {
  return {
    ...stopped(settings, reason),
    conversationId: null,
    queued: false,
  };
}

function isSensitiveRealtorQuestion(value: unknown) {
  const text = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  return [
    'lockbox',
    'lock box',
    'access code',
    'entry instruction',
    'entry code',
    'owner email',
    'owner phone',
    'owner contact',
    'commission',
    'internal remark',
    'internal note',
    'realtor showing instruction',
    'private showing instruction',
  ].some((phrase) => text.includes(phrase));
}
function confirmedShowingAt(
  showing?: HandleChatbotMessageInput['showing'],
): Date | null {
  if (showing?.confirmed !== true || !showing.preferredAt) return null;
  const preferredAt = new Date(showing.preferredAt);
  return Number.isFinite(preferredAt.getTime()) &&
    preferredAt.getTime() > Date.now()
    ? preferredAt
    : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : 'Unknown indexing error';
}
