import { createHash, randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';
import { mapPropertyKnowledge } from './property-knowledge.mapper';
import { composeVerifiedAnswer } from './verified-answer-composer';
import {
  hasTopicEvidenceConflict,
  selectAnswerEvidence,
} from './evidence-selection';
import { normalizeChatbotHumanText } from './chatbot-human-language';
import {
  chatbotConversationReply,
  parseChatbotRole,
  parseQualificationReply,
  parseQualificationValues,
  parseQualificationWithApprovedHint,
  parseShowingIntent,
  qualificationClarificationPrompt,
  qualificationResult,
  readPropertyQualification,
  type QualificationValues,
} from './chatbot-conversation-intent';
import {
  augmentPropertyQuestion,
  detectPropertyIntents,
  strongestSharedPropertyIntent,
} from './property-question-intent';
import { PlatformChatbotAiService } from './platform-chatbot-ai.service';
import { PlatformChatbotLearningService } from './platform-chatbot-learning.service';
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
  allowSensitiveRealtorEvidence?: boolean;
};

export type TestChatbotReplyInterpretInput = {
  propertyId?: number | null;
  audience?: ChatbotAudience;
  channel?: ChatbotChannel;
  expected: 'role' | 'creditScore' | 'monthlyEarning';
  message: string;
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
  realtorVerified?: boolean;
  requireRoleConfirmation?: boolean;
  workflowStateUpdate?: string;
  audienceUpdate?: ChatbotAudience;
  qualificationUpdates?: QualificationValues;
  showingEligible?: boolean;
  followUpPrompt?: string;
  showing?: { confirmed: boolean; preferredAt?: string | null };
};

export type ChatbotLiveResponse = ChatbotTestResult & {
  conversationId: string | null;
  queued: boolean;
  outreachJobId?: number | null;
  showingEligible?: boolean;
  realtorVerified?: boolean;
  terminal?: boolean;
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
  ai?: {
    provider: string;
    model: string | null;
    status?:
      | 'ANSWERED'
      | 'UNSUPPORTED'
      | 'INVALID_OUTPUT'
      | 'FAILED'
      | 'DISABLED';
  } | null;
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
    @Optional() private readonly ai?: PlatformChatbotAiService,
    @Optional() private readonly learning?: PlatformChatbotLearningService,
  ) {}

  async getInfrastructureStatus() {
    return { qdrant: await this.vectors.healthCheck() };
  }

  async interpretTestReply(
    tenant: TenantReference,
    input: TestChatbotReplyInterpretInput,
  ) {
    const expected = input.expected;
    const audience = input.audience === 'REALTOR' ? 'REALTOR' : 'LEAD';
    const channel =
      input.channel === 'EMAIL' || input.channel === 'SMS'
        ? input.channel
        : 'WEB';
    const propertyId = positiveInteger(input.propertyId);
    const message = requiredText(input.message, 'message', 2_000);
    if (expected === 'role') {
      const localRole = parseChatbotRole(message);
      if (localRole)
        return {
          recognized: true,
          source: 'LOCAL',
          role: localRole,
          creditScore: null,
          monthlyEarning: null,
        };
      if (!looksLikeRoleReplyCandidate(message))
        return {
          recognized: false,
          source: 'NONE',
          role: null,
          creditScore: null,
          monthlyEarning: null,
        };
      const learned = await this.learning?.approvedQualificationHint({
        tenantId: tenant.id,
        propertyId,
        audience,
        expected,
        message,
      });
      if (learned?.role)
        return {
          recognized: true,
          source: 'LEARNED',
          role: learned.role,
          creditScore: null,
          monthlyEarning: null,
        };
      const ai = await this.ai?.interpretReply({
        tenantId: tenant.id,
        propertyId,
        audience,
        channel,
        expected,
        message,
      });
      return ai?.role
        ? {
            recognized: true,
            source: 'AI',
            role: ai.role,
            creditScore: null,
            monthlyEarning: null,
            provider: ai.provider,
            model: ai.model,
            confidence: ai.confidence,
          }
        : {
            recognized: false,
            source: 'NONE',
            role: null,
            creditScore: null,
            monthlyEarning: null,
          };
    }
    const local = parseQualificationReply(message, expected);
    if (
      (expected === 'creditScore' && validStoredCredit(local.creditScore)) ||
      (expected === 'monthlyEarning' && validStoredIncome(local.monthlyEarning))
    ) {
      return {
        recognized: true,
        source: 'LOCAL',
        role: null,
        creditScore: local.creditScore ?? null,
        monthlyEarning: local.monthlyEarning ?? null,
      };
    }
    const clarification = qualificationClarificationPrompt(message, expected);
    if (!looksLikeQualificationReplyCandidate(message, expected)) {
      return clarification
        ? {
            recognized: false,
            source: 'LOCAL',
            role: null,
            creditScore: null,
            monthlyEarning: null,
            clarification,
          }
        : {
            recognized: false,
            source: 'NONE',
            role: null,
            creditScore: null,
            monthlyEarning: null,
          };
    }
    const learned = await this.learning?.approvedQualificationHint({
      tenantId: tenant.id,
      propertyId,
      audience,
      expected,
      message,
    });
    if (learned) {
      if (
        learned.exact &&
        expected === 'creditScore' &&
        validStoredCredit(learned.creditScore)
      ) {
        return {
          recognized: true,
          source: 'LEARNED',
          role: null,
          creditScore: Math.round(Number(learned.creditScore)),
          monthlyEarning: null,
        };
      }
      if (
        learned.exact &&
        expected === 'monthlyEarning' &&
        validStoredIncome(learned.monthlyEarning)
      ) {
        return {
          recognized: true,
          source: 'LEARNED',
          role: null,
          creditScore: null,
          monthlyEarning: Math.round(Number(learned.monthlyEarning)),
        };
      }
      const parsed = parseQualificationWithApprovedHint(message, expected);
      if (
        (expected === 'creditScore' && validStoredCredit(parsed.creditScore)) ||
        (expected === 'monthlyEarning' &&
          validStoredIncome(parsed.monthlyEarning))
      ) {
        return {
          recognized: true,
          source: 'LEARNED',
          role: null,
          creditScore: parsed.creditScore ?? null,
          monthlyEarning: parsed.monthlyEarning ?? null,
        };
      }
    }
    const ai = await this.ai?.interpretReply({
      tenantId: tenant.id,
      propertyId,
      audience,
      channel,
      expected,
      message,
    });
    if (ai) {
      const validCredit =
        expected === 'creditScore' && validStoredCredit(ai.creditScore)
          ? Math.round(Number(ai.creditScore))
          : null;
      const validIncome =
        expected === 'monthlyEarning' && validStoredIncome(ai.monthlyEarning)
          ? Math.round(Number(ai.monthlyEarning))
          : null;
      if (validCredit !== null || validIncome !== null) {
        return {
          recognized: true,
          source: 'AI',
          role: null,
          creditScore: validCredit,
          monthlyEarning: validIncome,
          provider: ai.provider,
          model: ai.model,
          confidence: ai.confidence,
        };
      }
    }
    return clarification
      ? {
          recognized: false,
          source: 'LOCAL',
          role: null,
          creditScore: null,
          monthlyEarning: null,
          clarification,
        }
      : {
          recognized: false,
          source: ai ? 'AI' : 'NONE',
          role: null,
          creditScore: null,
          monthlyEarning: null,
        };
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
            'document',
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
                embeddingModelSignature: this.embeddings.modelSignature(),
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
              'document',
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
                  embeddingModelSignature: this.embeddings.modelSignature(),
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
    await this.learning
      ?.invalidateApprovedAnswersForProperty(tenant.id, propertyId)
      .catch(() => undefined);
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
            'document',
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
                embeddingModelSignature: this.embeddings.modelSignature(),
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
    await this.learning
      ?.invalidateApprovedAnswersForProperty(tenant.id)
      .catch(() => undefined);
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
              'document',
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
                  embeddingModelSignature: this.embeddings.modelSignature(),
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
        let propertyTitle = '';
        if (propertyId) {
          const property = await client.query(
            'SELECT id, title, status, payload FROM tenant_property WHERE id = $1 LIMIT 1',
            [propertyId],
          );
          propertyStatus = property.rows[0]?.status ?? 'unavailable';
          propertyTitle = String(property.rows[0]?.title ?? '');
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
          const vector = await this.embeddings.embed(
            augmentPropertyQuestion(question),
            'query',
          );
          const [tenantMatches, platformMatches] = await Promise.all([
            this.vectors.search({
              scope: 'TENANT',
              tenantId: tenant.id,
              audience,
              propertyId,
              vector,
              modelSignature: this.embeddings.modelSignature(),
              limit: propertyId ? 24 : 12,
            }),
            this.vectors.search({
              scope: 'PLATFORM',
              audience,
              vector,
              modelSignature: this.embeddings.modelSignature(),
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

        const hydratedMatches = await this.hydrateMatches(
          client,
          matches,
          audience,
        );
        const hydrated = hydratedMatches.filter(
          ({ record }) =>
            audience !== 'REALTOR' ||
            input.allowSensitiveRealtorEvidence === true ||
            !isSensitiveRealtorRecord(record),
        );
        const ranked = hydrated
          .map((item) => ({
            item,
            confidence: relevanceConfidence(question, item),
          }))
          .sort(
            (left, right) =>
              right.confidence - left.confidence ||
              right.item.match.score - left.item.match.score,
          );
        const rankedHydrated = ranked.map(({ item }) => item);
        const answerEvidence = selectAnswerEvidence(question, rankedHydrated);
        const topScore = answerEvidence[0]?.match.score ?? null;
        const policyConfidence = answerEvidence[0]
          ? relevanceConfidence(question, answerEvidence[0])
          : null;
        const conflict = hasTopicEvidenceConflict(question, answerEvidence);
        const decision = evaluateChatbotPolicy({
          settings,
          channel,
          conversationStatus: 'ACTIVE',
          propertyStatus,
          infrastructureReady: true,
          hasEvidence: answerEvidence.length > 0,
          evidenceConflict: conflict,
          confidence: policyConfidence,
        });
        if (decision.action !== 'ANSWER') {
          const aiEvidence = uniqueHydratedMatches([
            ...answerEvidence,
            ...rankedHydrated,
          ]).slice(0, 6);
          if (
            decision.reason === 'EVIDENCE_INSUFFICIENT' &&
            !conflict &&
            aiEvidence.length > 0 &&
            (policyConfidence === null ||
              policyConfidence < settings.minimumConfidence) &&
            this.ai
          ) {
            const aiInput = {
              tenantId: tenant.id,
              propertyId,
              audience,
              channel,
              question,
              evidence: aiEvidence.map(({ record }) => ({
                knowledgeId: String(record.id),
                title: record.title,
                answer: record.answer,
                sourceType: record.sourceType,
              })),
            };
            const detailed = (this.ai as any).answerFromEvidenceDetailed;
            const attempt =
              typeof detailed === 'function'
                ? await detailed.call(this.ai, aiInput)
                : (() => undefined)();
            const resolvedAttempt =
              attempt ??
              (await this.ai.answerFromEvidence(aiInput).then((answer) => ({
                answer,
                attempted: true,
                provider: answer?.provider ?? null,
                model: answer?.model ?? null,
                status: answer ? ('ANSWERED' as const) : ('FAILED' as const),
              })));
            const aiAnswer = resolvedAttempt.answer;
            if (aiAnswer) {
              if (this.learning) {
                await this.learning
                  .recordAnswer({
                    tenantId: tenant.id,
                    tenantName: tenant.businessName,
                    propertyId,
                    propertyTitle,
                    audience,
                    channel,
                    question,
                    answer: aiAnswer.answer,
                    evidenceKnowledgeIds: aiEvidence.map(({ record }) =>
                      String(record.id),
                    ),
                    provider: aiAnswer.provider,
                    model: aiAnswer.model,
                    confidence: aiAnswer.confidence,
                  })
                  .catch(() => undefined);
              }
              return {
                answer: aiAnswer.answer,
                decision: 'ANSWER',
                reason: 'AI_GROUNDED_FALLBACK',
                confidence: aiAnswer.confidence ?? policyConfidence,
                evidence: evidenceFrom(aiEvidence),
                ai: {
                  provider: aiAnswer.provider,
                  model: aiAnswer.model,
                  status: 'ANSWERED',
                },
              };
            }
            const fallback = stopped(
              settings,
              decision.reason,
              topScore,
              rankedHydrated,
            );
            return {
              ...fallback,
              ai: resolvedAttempt.attempted
                ? {
                    provider: resolvedAttempt.provider ?? 'Unknown',
                    model: resolvedAttempt.model,
                    status: resolvedAttempt.status,
                  }
                : null,
            };
          }
          return stopped(settings, decision.reason, topScore, rankedHydrated);
        }

        return {
          answer:
            composeVerifiedAnswer(
              question,
              answerEvidence.map(({ record }) => ({
                title: record.title,
                answer: record.answer,
              })),
            ) ?? humanizeVerifiedAnswer(answerEvidence[0].record),
          decision: 'ANSWER',
          reason: 'EVIDENCE_VERIFIED',
          confidence: policyConfidence,
          evidence: evidenceFrom(answerEvidence),
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
      realtorVerified: false,
      requireRoleConfirmation: true,
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
        async (client) =>
          client.query(
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
    const workflow = await this.prepareLiveWorkflow(tenant, input);
    const liveInput = workflow.input;
    if (workflow.result) {
      return this.persistLiveResponse(
        tenant,
        liveInput,
        settings,
        workflow.result,
      );
    }
    if (
      isSensitiveRealtorQuestion(liveInput.body) &&
      !(liveInput.audience === 'REALTOR' && liveInput.realtorVerified === true)
    ) {
      return this.persistLiveResponse(
        tenant,
        liveInput,
        settings,
        appendConversationalFollowUp(
          stopped(settings, 'REALTOR_VERIFICATION_REQUIRED'),
          liveInput.followUpPrompt,
        ),
      );
    }
    const result = liveInput.showing?.confirmed
      ? verifiedWorkflowResult(
          'Showing confirmation received.',
          'ANSWER',
          'EVIDENCE_VERIFIED',
        )
      : await this.testQuestion(tenant, {
          propertyId: liveInput.propertyId,
          audience: liveInput.audience ?? 'LEAD',
          question: liveInput.body,
          channel: liveInput.channel,
          allowSensitiveRealtorEvidence: liveInput.realtorVerified === true,
        });
    return this.persistLiveResponse(
      tenant,
      liveInput,
      settings,
      appendConversationalFollowUp(result, liveInput.followUpPrompt),
    );
  }

  async listActivity(tenant: TenantReference) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          [
            "SELECT 'message' AS kind, m.id::text AS id, m.role AS type, m.decision AS reason,",
            'm.body, m.direction, m.confidence, m.created_at AS "createdAt", c.id::text AS "conversationId",',
            'c.lead_id AS "leadId", c.property_id AS "propertyId", c.channel, c.audience, c.status AS "conversationStatus",',
            'COALESCE(l.full_name, l.email, l.phone, \'Unknown lead\') AS "leadName", p.title AS "propertyTitle"',
            'FROM tenant_chatbot_message m JOIN tenant_chatbot_conversation c ON c.id = m.conversation_id',
            'LEFT JOIN tenant_lead l ON l.id = c.lead_id LEFT JOIN tenant_property p ON p.id = c.property_id',
            "WHERE m.created_at >= now() - interval '7 days' UNION ALL",
            "SELECT 'event' AS kind, e.id::text AS id, e.event_type AS type, e.reason, NULL::text AS body,",
            'NULL::varchar AS direction, NULL::numeric AS confidence, e.created_at AS "createdAt", c.id::text AS "conversationId",',
            'c.lead_id AS "leadId", c.property_id AS "propertyId", c.channel, c.audience, c.status AS "conversationStatus",',
            'COALESCE(l.full_name, l.email, l.phone, \'Unknown lead\') AS "leadName", p.title AS "propertyTitle"',
            'FROM tenant_chatbot_event e JOIN tenant_chatbot_conversation c ON c.id = e.conversation_id',
            'LEFT JOIN tenant_lead l ON l.id = c.lead_id LEFT JOIN tenant_property p ON p.id = c.property_id',
            'WHERE e.created_at >= now() - interval \'7 days\' ORDER BY "createdAt" DESC LIMIT 500',
          ].join(' '),
        );
        return result.rows;
      },
    );
  }

  async cleanupExpiredActivity(tenant: TenantReference) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const messages = await client.query(
          "DELETE FROM tenant_chatbot_message WHERE created_at < now() - interval '7 days'",
        );
        const events = await client.query(
          "DELETE FROM tenant_chatbot_event WHERE created_at < now() - interval '7 days'",
        );
        return {
          messagesDeleted: messages.rowCount ?? 0,
          eventsDeleted: events.rowCount ?? 0,
        };
      },
    );
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

  private async prepareLiveWorkflow(
    tenant: TenantReference,
    input: HandleChatbotMessageInput,
  ): Promise<{
    input: HandleChatbotMessageInput;
    result: ChatbotTestResult | null;
  }> {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const current = (
          await client.query(
            [
              'SELECT audience, workflow_state AS "workflowState" FROM tenant_chatbot_conversation',
              'WHERE session_id = $1 AND channel = $2 ORDER BY updated_at DESC LIMIT 1',
            ].join(' '),
            [input.sessionId, input.channel],
          )
        ).rows[0];
        const lead = (
          await client.query(
            'SELECT id, payload FROM tenant_lead WHERE id = $1 LIMIT 1',
            [input.leadId],
          )
        ).rows[0];
        const property = input.propertyId
          ? (
              await client.query(
                'SELECT id, title, status, payload FROM tenant_property WHERE id = $1 LIMIT 1',
                [input.propertyId],
              )
            ).rows[0]
          : null;
        const leadPayload = isRecordValue(lead?.payload) ? lead.payload : {};
        const state = String(
          current?.workflowState ??
            (input.requireRoleConfirmation ? 'ASK_ROLE' : 'ANSWERING'),
        );
        let audience: ChatbotAudience =
          current?.audience === 'REALTOR'
            ? 'REALTOR'
            : input.audience === 'REALTOR'
              ? 'REALTOR'
              : 'LEAD';
        let realtorVerified = input.realtorVerified === true;
        const wantsShowing = parseShowingIntent(input.body);
        const suppliedQualification = parseQualificationValues(input.body);
        if (
          validStoredCredit(suppliedQualification.creditScore) ||
          validStoredIncome(suppliedQualification.monthlyEarning)
        ) {
          input = {
            ...input,
            qualificationUpdates: {
              ...(input.qualificationUpdates ?? {}),
              ...suppliedQualification,
            },
          };
        }

        const conversationReply = chatbotConversationReply(input.body);
        if (conversationReply) {
          if (state === 'ASK_ROLE') {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_ROLE',
                showingEligible: false,
              },
              result: verifiedWorkflowResult(
                `${conversationReply}\n\n${roleFollowUpPrompt()}`,
                'ASK_ROLE',
                'ROLE_REQUIRED',
              ),
            };
          }
          if (audience === 'LEAD' && state === 'ASK_CREDIT') {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_CREDIT',
                showingEligible: false,
              },
              result: verifiedWorkflowResult(
                `${conversationReply}\n\n${creditFollowUpPrompt()}`,
                'ASK_CREDIT',
                'CREDIT_REQUIRED',
              ),
            };
          }
          if (audience === 'LEAD' && state === 'ASK_INCOME') {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_INCOME',
                showingEligible: false,
              },
              result: verifiedWorkflowResult(
                `${conversationReply}\n\n${incomeFollowUpPrompt()}`,
                'ASK_INCOME',
                'INCOME_REQUIRED',
              ),
            };
          }
          return {
            input: {
              ...input,
              audience,
              realtorVerified,
              showingEligible: state === 'QUALIFIED',
            },
            result: verifiedWorkflowResult(
              `${conversationReply}\n\nWhat would you like to know about the property?`,
              'ANSWER',
              'CONVERSATION_REPLY',
            ),
          };
        }

        if (state === 'ASK_ROLE') {
          const role = await this.resolveRoleReply(
            tenant,
            input,
            property,
            audience,
          );
          if (!role) {
            if (wantsShowing) {
              return {
                input: {
                  ...input,
                  audience,
                  realtorVerified: false,
                  workflowStateUpdate: 'ASK_ROLE',
                  showingEligible: false,
                },
                result: verifiedWorkflowResult(
                  `Absolutely — I can help you request a showing. First, are you looking to rent the property yourself, or are you a Realtor?`,
                  'ASK_ROLE',
                  'ROLE_REQUIRED',
                ),
              };
            }
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_ROLE',
                followUpPrompt: roleFollowUpPrompt(),
              },
              result: null,
            };
          }
          audience = role;
          realtorVerified =
            role === 'REALTOR' &&
            (input.realtorVerified === true ||
              (await this.isVerifiedRealtor(client, input.leadId)));
          if (role === 'REALTOR') {
            return {
              input: {
                ...input,
                audience,
                audienceUpdate: audience,
                realtorVerified,
                workflowStateUpdate: 'ANSWERING',
              },
              result: verifiedWorkflowResult(
                realtorVerified
                  ? 'Thanks. I found you in the verified Realtor directory. I can answer Realtor-only property questions, including verified access details.'
                  : 'Thanks. I will use the Realtor information for this property. I can answer Realtor-only property context, but lockbox codes, entry instructions, owner contacts, internal remarks, commission details, and private showing instructions stay hidden until your Realtor contact is verified.',
                'ANSWER',
                'ROLE_CAPTURED',
              ),
            };
          }
          const values = {
            ...qualificationValuesFromPayload(leadPayload),
            ...(input.qualificationUpdates ?? {}),
          };
          const propertyQuestion = detectPropertyIntents(input.body).length > 0;
          if (!validStoredCredit(values.creditScore)) {
            return {
              input: {
                ...input,
                audience,
                audienceUpdate: audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_CREDIT',
                ...(propertyQuestion
                  ? { followUpPrompt: creditFollowUpPrompt() }
                  : {}),
              },
              result: propertyQuestion ? null : creditPromptResult(),
            };
          }
          if (!validStoredIncome(values.monthlyEarning)) {
            return {
              input: {
                ...input,
                audience,
                audienceUpdate: audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_INCOME',
                ...(propertyQuestion
                  ? { followUpPrompt: incomeFollowUpPrompt() }
                  : {}),
              },
              result: propertyQuestion ? null : incomePromptResult(),
            };
          }
          return this.finishLeadQualification(
            client,
            {
              ...input,
              audience,
              audienceUpdate: audience,
              realtorVerified: false,
            },
            property,
            values,
          );
        }

        if (audience === 'REALTOR') {
          realtorVerified =
            realtorVerified ||
            (await this.isVerifiedRealtor(client, input.leadId));
          return {
            input: { ...input, audience, realtorVerified },
            result: null,
          };
        }

        const values = {
          ...qualificationValuesFromPayload(leadPayload),
          ...(input.qualificationUpdates ?? {}),
        };
        if (wantsShowing && state === 'QUALIFIED') {
          return {
            input: {
              ...input,
              audience,
              realtorVerified: false,
              showingEligible: true,
            },
            result: verifiedWorkflowResult(
              `You're already qualified on the two basic checks. The showing form is ready below — choose a date and time, then confirm it.`,
              'ANSWER',
              'QUALIFIED',
            ),
          };
        }
        if (wantsShowing && state === 'ANSWERING') {
          if (!validStoredCredit(values.creditScore)) {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_CREDIT',
                showingEligible: false,
              },
              result: verifiedWorkflowResult(
                `Absolutely — I can help with a showing. Before I unlock the form, what's your approximate credit score?`,
                'ASK_CREDIT',
                'CREDIT_REQUIRED',
              ),
            };
          }
          if (!validStoredIncome(values.monthlyEarning)) {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_INCOME',
                showingEligible: false,
              },
              result: verifiedWorkflowResult(
                `Thanks. One last basic check before I unlock the showing form: about how much is your monthly income before taxes?`,
                'ASK_INCOME',
                'INCOME_REQUIRED',
              ),
            };
          }
          return this.finishLeadQualification(
            client,
            { ...input, audience, realtorVerified: false },
            property,
            values,
          );
        }
        if (state === 'ASK_CREDIT') {
          let parsed = parseQualificationReply(input.body, 'creditScore');
          const creditClarification = qualificationClarificationPrompt(
            input.body,
            'creditScore',
          );
          const propertyQuestionWhileWaitingForCredit =
            !validStoredCredit(parsed.creditScore) &&
            !creditClarification &&
            detectPropertyIntents(input.body).length > 0;
          if (propertyQuestionWhileWaitingForCredit) {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_CREDIT',
                followUpPrompt: creditFollowUpPrompt(),
              },
              result: null,
            };
          }
          if (!validStoredCredit(parsed.creditScore)) {
            parsed = await this.resolveQualificationReply(
              tenant,
              input,
              property,
              audience,
              'creditScore',
            );
          }
          if (!validStoredCredit(parsed.creditScore)) {
            const clarification = qualificationClarificationPrompt(
              input.body,
              'creditScore',
            );
            if (clarification) {
              return {
                input: {
                  ...input,
                  audience,
                  realtorVerified: false,
                  workflowStateUpdate: 'ASK_CREDIT',
                  showingEligible: false,
                },
                result: verifiedWorkflowResult(
                  clarification,
                  'ASK_CREDIT',
                  'CREDIT_REQUIRED',
                ),
              };
            }
            if (wantsShowing) {
              return {
                input: {
                  ...input,
                  audience,
                  realtorVerified: false,
                  workflowStateUpdate: 'ASK_CREDIT',
                  showingEligible: false,
                },
                result: verifiedWorkflowResult(
                  `I can help with that. I just need your approximate credit score first so I can make sure this property is a fit before opening the showing form.`,
                  'ASK_CREDIT',
                  'CREDIT_REQUIRED',
                ),
              };
            }
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_CREDIT',
                followUpPrompt: creditFollowUpPrompt(),
              },
              result: null,
            };
          }
          values.creditScore = parsed.creditScore;
          const qualificationUpdates = {
            ...(input.qualificationUpdates ?? {}),
            creditScore: parsed.creditScore,
          };
          if (!validStoredIncome(values.monthlyEarning)) {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                qualificationUpdates,
                workflowStateUpdate: 'ASK_INCOME',
              },
              result: incomePromptResult(),
            };
          }
          return this.finishLeadQualification(
            client,
            {
              ...input,
              audience,
              realtorVerified: false,
              qualificationUpdates,
            },
            property,
            values,
          );
        }

        if (state === 'ASK_INCOME') {
          let parsed = parseQualificationReply(input.body, 'monthlyEarning');
          const incomeClarification = qualificationClarificationPrompt(
            input.body,
            'monthlyEarning',
          );
          const propertyQuestionWhileWaitingForIncome =
            !validStoredIncome(parsed.monthlyEarning) &&
            !incomeClarification &&
            detectPropertyIntents(input.body).length > 0;
          if (propertyQuestionWhileWaitingForIncome) {
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_INCOME',
                followUpPrompt: incomeFollowUpPrompt(),
              },
              result: null,
            };
          }
          if (!validStoredIncome(parsed.monthlyEarning)) {
            parsed = await this.resolveQualificationReply(
              tenant,
              input,
              property,
              audience,
              'monthlyEarning',
            );
          }
          if (!validStoredIncome(parsed.monthlyEarning)) {
            const clarification = qualificationClarificationPrompt(
              input.body,
              'monthlyEarning',
            );
            if (clarification) {
              return {
                input: {
                  ...input,
                  audience,
                  realtorVerified: false,
                  workflowStateUpdate: 'ASK_INCOME',
                  showingEligible: false,
                },
                result: verifiedWorkflowResult(
                  clarification,
                  'ASK_INCOME',
                  'INCOME_REQUIRED',
                ),
              };
            }
            if (wantsShowing) {
              return {
                input: {
                  ...input,
                  audience,
                  realtorVerified: false,
                  workflowStateUpdate: 'ASK_INCOME',
                  showingEligible: false,
                },
                result: verifiedWorkflowResult(
                  `Almost there — I still need your approximate monthly income before taxes. Once that basic check passes, I'll unlock the showing form.`,
                  'ASK_INCOME',
                  'INCOME_REQUIRED',
                ),
              };
            }
            return {
              input: {
                ...input,
                audience,
                realtorVerified: false,
                workflowStateUpdate: 'ASK_INCOME',
                followUpPrompt: incomeFollowUpPrompt(),
              },
              result: null,
            };
          }
          values.monthlyEarning = parsed.monthlyEarning;
          return this.finishLeadQualification(
            client,
            {
              ...input,
              audience,
              realtorVerified: false,
              qualificationUpdates: {
                ...(input.qualificationUpdates ?? {}),
                monthlyEarning: parsed.monthlyEarning,
              },
            },
            property,
            values,
          );
        }

        return {
          input: {
            ...input,
            audience,
            realtorVerified: false,
            showingEligible: state === 'QUALIFIED',
          },
          result: null,
        };
      },
    );
  }

  private async resolveRoleReply(
    tenant: TenantReference,
    input: HandleChatbotMessageInput,
    property: any,
    audience: ChatbotAudience,
  ): Promise<ChatbotAudience | null> {
    const local = parseChatbotRole(input.body);
    if (local) return local;
    if (!looksLikeRoleReplyCandidate(input.body)) return null;
    const learned = await this.learning?.approvedQualificationHint({
      tenantId: tenant.id,
      propertyId: positiveInteger(property?.id),
      audience,
      expected: 'role',
      message: input.body,
    });
    if (learned?.role) return learned.role;
    if (!this.ai) return null;
    const interpreted = await this.ai.interpretReply({
      tenantId: tenant.id,
      propertyId: positiveInteger(property?.id),
      audience,
      channel: input.channel,
      expected: 'role',
      message: input.body,
    });
    if (!interpreted?.role) return null;
    await this.learning
      ?.recordQualification({
        tenantId: tenant.id,
        tenantName: tenant.businessName,
        propertyId: positiveInteger(property?.id),
        propertyTitle: String(property?.title ?? ''),
        audience,
        channel: input.channel,
        question: input.body,
        answer: `Detected role: ${interpreted.role}`,
        structuredPayload: { expected: 'role', role: interpreted.role },
        evidenceKnowledgeIds: [],
        provider: interpreted.provider,
        model: interpreted.model,
        confidence: interpreted.confidence,
      })
      .catch(() => undefined);
    return interpreted.role;
  }

  private async resolveQualificationReply(
    tenant: TenantReference,
    input: HandleChatbotMessageInput,
    property: any,
    audience: ChatbotAudience,
    expected: 'creditScore' | 'monthlyEarning',
  ): Promise<QualificationValues> {
    if (!looksLikeQualificationReplyCandidate(input.body, expected)) return {};
    const learned = await this.learning?.approvedQualificationHint({
      tenantId: tenant.id,
      propertyId: positiveInteger(property?.id),
      audience,
      expected,
      message: input.body,
    });
    if (learned) {
      if (
        learned.exact &&
        expected === 'creditScore' &&
        validStoredCredit(learned.creditScore)
      ) {
        return { creditScore: Math.round(Number(learned.creditScore)) };
      }
      if (
        learned.exact &&
        expected === 'monthlyEarning' &&
        validStoredIncome(learned.monthlyEarning)
      ) {
        return { monthlyEarning: Math.round(Number(learned.monthlyEarning)) };
      }
      const hinted = parseQualificationWithApprovedHint(input.body, expected);
      if (
        (expected === 'creditScore' && validStoredCredit(hinted.creditScore)) ||
        (expected === 'monthlyEarning' &&
          validStoredIncome(hinted.monthlyEarning))
      ) {
        return hinted;
      }
    }
    if (!this.ai) return {};
    const interpreted = await this.ai.interpretReply({
      tenantId: tenant.id,
      propertyId: positiveInteger(property?.id),
      audience,
      channel: input.channel,
      expected,
      message: input.body,
    });
    if (!interpreted) return {};
    const parsed: QualificationValues = {};
    if (
      expected === 'creditScore' &&
      validStoredCredit(interpreted.creditScore)
    ) {
      parsed.creditScore = Math.round(Number(interpreted.creditScore));
    }
    if (
      expected === 'monthlyEarning' &&
      validStoredIncome(interpreted.monthlyEarning)
    ) {
      parsed.monthlyEarning = Math.round(Number(interpreted.monthlyEarning));
    }
    if (
      !validStoredCredit(parsed.creditScore) &&
      !validStoredIncome(parsed.monthlyEarning)
    ) {
      return {};
    }
    await this.learning
      ?.recordQualification({
        tenantId: tenant.id,
        tenantName: tenant.businessName,
        propertyId: positiveInteger(property?.id),
        propertyTitle: String(property?.title ?? ''),
        audience,
        channel: input.channel,
        question: input.body,
        answer:
          expected === 'creditScore'
            ? `Credit score: ${parsed.creditScore}`
            : `Monthly income: ${parsed.monthlyEarning}`,
        structuredPayload: {
          expected,
          creditScore: parsed.creditScore ?? null,
          monthlyEarning: parsed.monthlyEarning ?? null,
          period: interpreted.period,
        },
        evidenceKnowledgeIds: [],
        provider: interpreted.provider,
        model: interpreted.model,
        confidence: interpreted.confidence,
      })
      .catch(() => undefined);
    return parsed;
  }

  private async finishLeadQualification(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    input: HandleChatbotMessageInput,
    property: any,
    values: QualificationValues,
  ): Promise<{ input: HandleChatbotMessageInput; result: ChatbotTestResult }> {
    const requirements = readPropertyQualification(
      isRecordValue(property?.payload) ? property.payload : {},
    );
    const outcome = qualificationResult(values, requirements);
    if (outcome.missing === 'creditScore') {
      return {
        input: {
          ...input,
          workflowStateUpdate: 'ASK_CREDIT',
          showingEligible: false,
        },
        result: creditPromptResult(),
      };
    }
    if (outcome.missing === 'monthlyEarning') {
      return {
        input: {
          ...input,
          workflowStateUpdate: 'ASK_INCOME',
          showingEligible: false,
        },
        result: incomePromptResult(),
      };
    }
    if (outcome.failed) {
      const alternatives = await this.compatibleProperties(
        client,
        positiveInteger(property?.id),
        values,
      );
      const isCredit = outcome.failed === 'creditScore';
      const required = isCredit
        ? requirements.minimumCreditScore
        : requirements.minimumMonthlyIncome;
      const label = isCredit ? 'credit score' : 'monthly income';
      const suggestions = alternatives.length
        ? ` Other available properties that match these two basic checks: ${alternatives.join('; ')}.`
        : ' A team member can help you look for another available property.';
      return {
        input: {
          ...input,
          workflowStateUpdate: 'ANSWERING',
          showingEligible: false,
        },
        result: verifiedWorkflowResult(
          `Thanks. This property requires a minimum ${label} of ${formatQualificationNumber(required, isCredit)}. Based on the information you provided, this property may not be a match.${suggestions}`,
          'ANSWER',
          isCredit ? 'CREDIT_BELOW_MINIMUM' : 'INCOME_BELOW_MINIMUM',
        ),
      };
    }
    return {
      input: {
        ...input,
        workflowStateUpdate: 'QUALIFIED',
        showingEligible: true,
      },
      result: verifiedWorkflowResult(
        "Thanks. Your credit score and monthly income meet this property's basic qualification requirements. You can keep asking questions or request a showing.",
        'ANSWER',
        'QUALIFIED',
      ),
    };
  }

  private async compatibleProperties(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    propertyId: number | null,
    values: QualificationValues,
  ) {
    const rows = (
      await client.query(
        [
          'SELECT id, title, status, payload FROM tenant_property',
          "WHERE status = 'published' AND ($1::bigint IS NULL OR id <> $1)",
          'ORDER BY updated_at DESC LIMIT 80',
        ].join(' '),
        [propertyId],
      )
    ).rows;
    return rows
      .filter(
        (row: any) =>
          qualificationResult(
            values,
            readPropertyQualification(
              isRecordValue(row.payload) ? row.payload : {},
            ),
          ).qualified,
      )
      .slice(0, 3)
      .map((row: any) => alternativePropertyLabel(row));
  }

  private async isVerifiedRealtor(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    leadIdValue: number,
  ) {
    const verified = await client.query(
      [
        'SELECT 1 FROM tenant_lead lead',
        "JOIN tenant_legacy_resource realtor ON realtor.resource = 'realtors'",
        'WHERE lead.id = $1 AND (',
        "(COALESCE(lead.email, '') <> '' AND LOWER(COALESCE(realtor.payload->>'email', '')) = LOWER(lead.email))",
        "OR (regexp_replace(COALESCE(lead.phone, ''), '[^0-9]', '', 'g') <> ''",
        "AND regexp_replace(COALESCE(realtor.payload->>'phone', ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(lead.phone, ''), '[^0-9]', '', 'g'))",
        ') LIMIT 1',
      ].join(' '),
      [leadIdValue],
    );
    return verified.rows.length > 0;
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
                'SELECT id::text AS id, status, stop_reason AS "stopReason", audience,',
                'workflow_state AS "workflowState", turn_count AS "turnCount" FROM tenant_chatbot_conversation',
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
                  'lead_id, property_id, channel, audience, session_id, workflow_state)',
                  'VALUES ($1, $2, $3, $4, $5, $6)',
                  'RETURNING id::text AS id, status, audience, workflow_state AS "workflowState", turn_count AS "turnCount"',
                ].join(' '),
                [
                  leadId,
                  propertyId,
                  input.channel,
                  input.audienceUpdate ?? input.audience ?? 'LEAD',
                  sessionId,
                  input.workflowStateUpdate ??
                    (input.requireRoleConfirmation ? 'ASK_ROLE' : 'ANSWERING'),
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
            return {
              ...result,
              conversationId,
              queued: false,
              showingEligible: input.showingEligible === true,
              realtorVerified: input.realtorVerified === true,
              terminal: false,
            };
          }
          if (input.audienceUpdate || input.workflowStateUpdate) {
            const nextAudience =
              input.audienceUpdate ??
              input.audience ??
              conversation.audience ??
              'LEAD';
            const nextWorkflow =
              input.workflowStateUpdate ??
              conversation.workflowState ??
              'ANSWERING';
            await client.query(
              [
                'UPDATE tenant_chatbot_conversation',
                'SET audience = $2, workflow_state = $3, updated_at = now()',
                'WHERE id = $1',
              ].join(' '),
              [conversationId, nextAudience, nextWorkflow],
            );
            conversation.audience = nextAudience;
            conversation.workflowState = nextWorkflow;
          }
          if (validStoredCredit(input.qualificationUpdates?.creditScore)) {
            await client.query(
              [
                'UPDATE tenant_lead SET payload = jsonb_set(',
                "COALESCE(payload, '{}'::jsonb), '{creditScore}', to_jsonb($2::text), true),",
                'updated_at = now() WHERE id = $1 RETURNING id',
              ].join(' '),
              [leadId, String(input.qualificationUpdates?.creditScore)],
            );
            lead.payload = {
              ...(isRecordValue(lead.payload) ? lead.payload : {}),
              creditScore: String(input.qualificationUpdates?.creditScore),
            };
          }
          if (validStoredIncome(input.qualificationUpdates?.monthlyEarning)) {
            await client.query(
              [
                'UPDATE tenant_lead SET payload = jsonb_set(',
                "COALESCE(payload, '{}'::jsonb), '{monthlyEarning}', to_jsonb($2::text), true),",
                'updated_at = now() WHERE id = $1 RETURNING id',
              ].join(' '),
              [leadId, String(input.qualificationUpdates?.monthlyEarning)],
            );
            lead.payload = {
              ...(isRecordValue(lead.payload) ? lead.payload : {}),
              monthlyEarning: String(
                input.qualificationUpdates?.monthlyEarning,
              ),
            };
          }
          if (isWorkflowResultReason(result.reason)) {
            const response = await this.persistRuleDecision(client, {
              input,
              settings,
              result,
              conversationId,
              leadId,
              lead,
              property,
              idempotencyKey,
              terminal: false,
            });
            await client.query('COMMIT');
            return {
              ...response,
              showingEligible: input.showingEligible === true,
              realtorVerified: input.realtorVerified === true,
              terminal: false,
            };
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
            return {
              ...response,
              showingEligible: input.showingEligible === true,
              realtorVerified: input.realtorVerified === true,
              terminal: liveDecision.terminal,
            };
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
            const terminal = isTerminalRuleReason(result.reason);
            await client.query('COMMIT');
            return {
              ...response,
              showingEligible: input.showingEligible === true,
              realtorVerified: input.realtorVerified === true,
              terminal,
            };
          }
          const preferredAt = confirmedShowingAt(input.showing);
          const showingValues = qualificationValuesFromPayload(
            isRecordValue(lead.payload) ? lead.payload : {},
          );
          const showingOutcome = qualificationResult(
            showingValues,
            readPropertyQualification(
              isRecordValue(property?.payload) ? property.payload : {},
            ),
          );
          const showingQualified =
            input.audience === 'LEAD' &&
            validStoredCredit(showingValues.creditScore) &&
            validStoredIncome(showingValues.monthlyEarning) &&
            showingOutcome.qualified;
          if (preferredAt && !showingQualified) {
            const block = !validStoredCredit(showingValues.creditScore)
              ? creditPromptResult()
              : !validStoredIncome(showingValues.monthlyEarning)
                ? incomePromptResult()
                : verifiedWorkflowResult(
                    'This property does not pass the saved qualification checks, so I cannot submit a showing request for it. I can help with another available property.',
                    'ANSWER',
                    showingOutcome.failed === 'creditScore'
                      ? 'CREDIT_BELOW_MINIMUM'
                      : 'INCOME_BELOW_MINIMUM',
                  );
            const response = await this.persistRuleDecision(client, {
              input,
              settings,
              result: block,
              conversationId,
              leadId,
              lead,
              property,
              idempotencyKey,
              terminal: false,
            });
            await client.query('COMMIT');
            return {
              ...response,
              showingEligible: false,
              realtorVerified: input.realtorVerified === true,
              terminal: false,
            };
          }
          if (
            preferredAt &&
            propertyId &&
            property &&
            hasShowingContact(lead)
          ) {
            const copy = await this.showingRequestCopy(
              client,
              tenant,
              settings,
              lead,
              property,
              preferredAt,
            );
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
                copy.title,
                copy.message,
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
              showingEligible: false,
              realtorVerified: input.realtorVerified === true,
              terminal: true,
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
              JSON.stringify({
                outreachJobId,
                channel: input.channel,
                ...(result.ai ? { ai: result.ai } : {}),
              }),
            ],
          );
          await client.query('COMMIT');
          return {
            ...result,
            conversationId,
            queued: input.channel === 'WEB' ? false : Boolean(outreachJobId),
            outreachJobId,
            showingEligible: input.showingEligible === true,
            realtorVerified: input.realtorVerified === true,
            terminal: false,
          };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  private async showingRequestCopy(
    client: { query: (sql: string, values?: unknown[]) => Promise<any> },
    tenant: TenantReference,
    settings: ChatbotSettings,
    lead: any,
    property: any,
    preferredAt: Date,
  ) {
    const fallback = {
      title: `Showing request - ${property.title ?? 'Property'}`,
      message: 'Confirmed through the tenant chatbot.',
    };
    if (!settings.showingRequestTemplateId) return fallback;

    const result = await client.query(
      'SELECT value FROM tenant_setting WHERE key = $1 LIMIT 1',
      ['agency_workspace_settings'],
    );
    const agency = (parseSettings(result.rows[0]?.value) ?? {}) as any;
    const templates = Array.isArray(agency.communicationTemplates)
      ? agency.communicationTemplates
      : [];
    const template = templates.find(
      (item: any) =>
        item &&
        String(item.id ?? '') === settings.showingRequestTemplateId &&
        item.audience === 'LeadShowing' &&
        item.isActive !== false,
    );
    if (!template) return fallback;

    const agencyName = cleanTemplateValue(
      agency.profile?.agencyName ?? tenant.businessName,
    );
    const propertyAddress = cleanTemplateValue(
      property.payload?.exactLocation ??
        property.payload?.location ??
        property.payload?.address ??
        property.title,
    );
    const values: Record<string, string> = {
      '{{client_name}}': cleanTemplateValue(
        lead.fullName ?? lead.email ?? lead.phone,
      ),
      '{{property_address}}': propertyAddress,
      '{{showing_time}}': preferredAt.toISOString(),
      '{{agent_name}}': agencyName,
      '{{agency_name}}': agencyName,
    };
    const title = renderShowingTemplate(template.subject, values);
    const message = renderShowingTemplate(template.body, values);
    return {
      title: (title || fallback.title).slice(0, 240),
      message: (message || fallback.message).slice(0, 4_000),
    };
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
      'INSERT INTO tenant_audit_log(action, actor_master_user_id, summary, metadata) VALUES ($1, $2, $3, $4::jsonb)',
      [
        action,
        positiveInteger(actorMasterUserId),
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

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function qualificationValuesFromPayload(
  payload: Record<string, unknown>,
): QualificationValues {
  return {
    creditScore: numericValue(payload.creditScore),
    monthlyEarning: numericValue(payload.monthlyEarning),
  };
}

function numericValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function validStoredCredit(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 300 && score <= 850;
}

function validStoredIncome(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

function verifiedWorkflowResult(
  answer: string,
  decision: ChatbotPolicyDecision['action'],
  reason: ChatbotPolicyDecision['reason'],
): ChatbotTestResult {
  return { answer, decision, reason, confidence: null, evidence: [] };
}

function roleFollowUpPrompt() {
  return 'Quick question so I point you the right way: is this place for you, or are you a Realtor helping a client?';
}

function creditFollowUpPrompt() {
  return 'If you want, I can quickly check the two basic requirements. Could you share your approximate credit score? A rough number is completely fine.';
}

function incomeFollowUpPrompt() {
  return "Thanks. The second basic check is income. If you don't mind, about how much do you make per month before taxes? A rough estimate is completely fine.";
}

function appendConversationalFollowUp(
  result: ChatbotTestResult,
  followUp?: string,
): ChatbotTestResult {
  const prompt = String(followUp ?? '').trim();
  if (!prompt) return result;
  const answer = String(result.answer ?? '').trim();
  return { ...result, answer: answer ? `${answer}\n\n${prompt}` : prompt };
}

function creditPromptResult() {
  return verifiedWorkflowResult(
    creditFollowUpPrompt(),
    'ASK_CREDIT',
    'CREDIT_REQUIRED',
  );
}

function incomePromptResult() {
  return verifiedWorkflowResult(
    incomeFollowUpPrompt(),
    'ASK_INCOME',
    'INCOME_REQUIRED',
  );
}

function isWorkflowResultReason(reason: ChatbotPolicyDecision['reason']) {
  return [
    'ROLE_REQUIRED',
    'ROLE_CAPTURED',
    'CREDIT_REQUIRED',
    'INCOME_REQUIRED',
    'CREDIT_BELOW_MINIMUM',
    'INCOME_BELOW_MINIMUM',
    'QUALIFIED',
  ].includes(reason);
}

function alternativePropertyLabel(row: any) {
  const payload = isRecordValue(row?.payload) ? row.payload : {};
  const location = String(
    payload.exactLocation ?? payload.location ?? payload.address ?? '',
  ).trim();
  const rent = String(payload.monthlyRent ?? payload.price ?? '').trim();
  return [String(row?.title ?? 'Available property').trim(), location, rent]
    .filter(Boolean)
    .join(' — ');
}

function formatQualificationNumber(value: number | null, credit: boolean) {
  if (!Number.isFinite(value)) {
    return credit ? 'the published score' : 'the published income';
  }
  const rounded = Math.round(Number(value));
  return credit ? String(rounded) : `$${rounded.toLocaleString('en-US')}/month`;
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
    'ROLE_REQUIRED',
    'ROLE_CAPTURED',
    'CREDIT_REQUIRED',
    'INCOME_REQUIRED',
    'CREDIT_BELOW_MINIMUM',
    'INCOME_BELOW_MINIMUM',
    'QUALIFIED',
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

function uniqueHydratedMatches(items: HydratedMatch[]) {
  const seen = new Set<string>();
  return items.filter(({ record }) => {
    const key = `${record.scope}:${record.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function relevanceConfidence(question: string, hydrated: HydratedMatch) {
  const semantic = hydrated.match.score;
  const sharedIntent = strongestSharedPropertyIntent(
    question,
    `${hydrated.record.title} ${hydrated.record.answer}`,
  );
  if (sharedIntent && sharedIntent.weight >= 3) {
    return Math.max(semantic, 0.95);
  }
  const queryTokens = meaningfulTokens(question);
  if (queryTokens.length === 0) return semantic;
  if (queryTokens.length === 1) {
    const titleTokens = tokens(hydrated.record.title);
    return titleTokens.some((titleToken) =>
      fuzzyTokenMatch(queryTokens[0], titleToken),
    )
      ? Math.max(semantic, 0.95)
      : semantic;
  }
  const evidenceTokens = tokens(
    `${hydrated.record.title} ${hydrated.record.answer}`,
  );
  const matched = queryTokens.filter((queryToken) =>
    evidenceTokens.some((evidenceToken) =>
      fuzzyTokenMatch(queryToken, evidenceToken),
    ),
  ).length;
  const coverage = matched / queryTokens.length;
  if (coverage >= 0.75) return Math.max(semantic, 0.95);
  if (coverage >= 0.6) return Math.max(semantic, 0.85);
  return semantic;
}

const QUESTION_STOP_WORDS = new Set([
  'a',
  'about',
  'allow',
  'allowed',
  'any',
  'are',
  'be',
  'can',
  'do',
  'does',
  'for',
  'get',
  'has',
  'have',
  'here',
  'how',
  'i',
  'in',
  'is',
  'it',
  'many',
  'me',
  'my',
  'need',
  'of',
  'please',
  'property',
  'tell',
  'the',
  'there',
  'this',
  'to',
  'what',
  'when',
  'where',
  'who',
  'why',
  'will',
  'would',
  'your',
]);

function meaningfulTokens(value: string) {
  return tokens(value).filter((token) => !isQuestionStopWord(token));
}

function isQuestionStopWord(token: string) {
  if (QUESTION_STOP_WORDS.has(token)) return true;
  return [...QUESTION_STOP_WORDS].some((word) => fuzzyTokenMatch(token, word));
}

function tokens(value: string) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(canonicalToken);
}

function canonicalToken(value: string) {
  let token = value;
  if (token.length > 6 && token.endsWith('ing')) token = token.slice(0, -3);
  if (token.length > 4 && token.endsWith('s')) token = token.slice(0, -1);
  if (['dog', 'puppy', 'cat', 'kitten', 'animal'].includes(token)) return 'pet';
  return token;
}

function fuzzyTokenMatch(left: string, right: string) {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4) return false;
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const mismatches: number[] = [];
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches.push(index);
      if (mismatches.length > 2) return false;
    }
    if (mismatches.length <= 1) return true;
    const [first, second] = mismatches;
    return (
      second === first + 1 &&
      left[first] === right[second] &&
      left[second] === right[first]
    );
  }
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return (
    edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1
  );
}

function humanizeVerifiedAnswer(record: KnowledgeRecord) {
  const raw = String(record.answer ?? '')
    .trim()
    .replace(/\bpaking\b/gi, 'parking');
  const colon = raw.indexOf(':');
  if (colon <= 0) return sentence(raw);
  const label = raw.slice(0, colon).trim().toLowerCase();
  const value = raw.slice(colon + 1).trim();
  const lowerValue = value.toLowerCase().replace(/[.!]+$/, '');

  if (label === 'pet policy' && lowerValue === 'no')
    return "No, pets aren't allowed at this property.";
  if (label === 'parking') {
    if (
      /spot\s*1\s+and\s+1\s+guest\s+parking/i.test(value) ||
      /1\s+assigned\s+(?:parking\s+)?spot\s+and\s+1\s+guest\s+parking\s+spot/i.test(
        value,
      )
    ) {
      return 'Yes. This property includes 1 assigned parking spot and 1 guest parking spot.';
    }
    return `Parking is available: ${sentence(value)}`;
  }
  if (label === 'guest parking')
    return `There is ${sentence(value).replace(/^There is\s+/i, '')}`;
  if (label === 'monthly rent') return `The monthly rent is ${sentence(value)}`;
  if (label === 'available from')
    return `The property is available from ${sentence(value)}`;
  if (label === 'bedrooms') return `The property has ${value} bedrooms.`;
  if (label === 'bathrooms') return `The property has ${value} bathrooms.`;
  if (label === 'address')
    return `The property is located at ${sentence(value)}`;
  if (label === 'community') return `The property is in the ${sentence(value)}`;
  if (label === 'age requirement')
    return `This property is in a ${sentence(value)}`;
  if (label === 'floor') return `The unit is on the ${sentence(value)}`;
  if (label.startsWith('nearby '))
    return `Nearby options include ${sentence(value)}`;
  if (label === 'highway access') return `The property has ${sentence(value)}`;
  if (label === 'nearby cities')
    return `Nearby cities include ${sentence(value)}`;
  if (label === 'move-in costs') return `Move-in costs are ${sentence(value)}`;
  if (label === 'first month' || label === 'last month')
    return `The ${label} is ${sentence(value.toLowerCase())}`;
  if (label === 'security deposit')
    return `The security deposit is ${sentence(value)}`;
  if (label === 'utilities') return sentence(value);
  if (label === 'application instructions')
    return sentence(
      value.replace(/^apply online at\s+/i, 'You can apply online at '),
    );
  if (label === 'minimum credit score')
    return `The minimum credit score is ${sentence(value)}`;
  if (label === 'income requirement')
    return `The income requirement is ${sentence(value)}`;
  if (label === 'minimum monthly income')
    return `The minimum monthly income is ${sentence(value)}`;
  if (label === 'applicant history')
    return `Applicants must have ${sentence(value.toLowerCase())}`;
  if (label === 'co-signers')
    return /no co-signers/i.test(value)
      ? "No, co-signers aren't allowed."
      : sentence(value);
  if (label === 'tenant insurance') return sentence(value);
  if (
    label === 'insurance additional interest' ||
    label === 'additional interest'
  )
    return `Add ${value} as the additional interest on the insurance policy.`;
  if (label === 'insurance mailing address')
    return `Use ${value} as the insurance mailing address.`;
  if (label === 'application fee')
    return `The application fee is ${sentence(value)}`;
  if (label === 'application turnaround')
    return `Application processing takes ${sentence(value)}`;
  if (label === 'association')
    return lowerValue === 'yes'
      ? 'Yes, this property has an HOA/association.'
      : sentence(value);
  if (label === 'debt to income ratio')
    return `The debt-to-income ratio ${sentence(value)}`;
  if (label === 'hoa income criteria')
    return `The HOA income requirement is ${sentence(value)}`;
  if (label === 'proof of income')
    return lowerValue === 'required'
      ? 'Yes, proof of income is required.'
      : sentence(value);
  if (label === 'income documents') return `You will need ${sentence(value)}`;
  if (label === 'hoa approval time')
    return `HOA approval takes ${sentence(value)}`;
  if (label === 'hoa application fee')
    return `The HOA application fee is ${sentence(value)}`;
  if (label === 'married hoa fee')
    return `For married applicants, the HOA application fee is ${sentence(value)}`;
  if (label === 'marriage certificate')
    return `Married applicants need a marriage certificate; it is ${sentence(value)}`;
  if (label === 'hoa payment method')
    return `The HOA application must be paid by ${sentence(value)}`;
  if (label === 'hoa security deposit')
    return `The HOA security deposit is ${sentence(value)}`;
  if (label === 'minimum lease duration')
    return `The minimum lease term is ${sentence(value)}`;
  if (label === 'smoking')
    return /no smoking/i.test(value)
      ? "No, smoking isn't allowed inside the property."
      : sentence(value);
  if (label === 'listing contact')
    return `You can contact the listing at ${sentence(value)}`;
  if (label === 'application documentation') return sentence(value);
  if (label === 'description detail') return sentence(value);
  return `The ${label} is ${sentence(value)}`;
}

function sentence(value: string) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
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

function isSensitiveRealtorRecord(record: KnowledgeRecord) {
  return isSensitiveRealtorQuestion(`${record.title} ${record.answer}`);
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

function hasShowingContact(lead: any) {
  return Boolean(
    String(lead?.email ?? '').trim() || String(lead?.phone ?? '').trim(),
  );
}

function cleanTemplateValue(value: unknown) {
  return String(value ?? '').trim();
}

function renderShowingTemplate(
  source: unknown,
  values: Record<string, string>,
) {
  let result = cleanTemplateValue(source);
  for (const [token, value] of Object.entries(values)) {
    result = result.split(token).join(value);
  }
  return result;
}

function looksLikeRoleReplyCandidate(value: unknown) {
  const text = normalizeChatbotHumanText(value);
  if (!text || text.length > 320) return false;
  if (
    /^(?:what|when|where|how|why|is|are|does|do|can|could)\b/i.test(text) &&
    !/\b(i am|we are|for me|for us|myself|ourselves|my client|our client|my buyer|our buyer)\b/i.test(
      text,
    )
  )
    return false;
  const directRoleLanguage =
    /\b(i|we|me|my|mine|us|our|ours|myself|ourselves|client|customer|buyer|purchaser|tenant|renter|realtor|broker|agent|representative)\b/i.test(
      text,
    ) &&
    /\b(rent|lease|move|live|buy|purchase|represent|representative|client|customer|buyer|purchaser|tenant|renter|realtor|broker|agent|myself|ourselves|family|household|spouse|wife|husband|partner|own)\b/i.test(
      text,
    );
  const naturalInterestReply =
    /\b(i|we|me|us)\b.{0,45}\b(look(?:ing)?|interested|want|wanna|trying|try|need|hope|plan|planning)\b.{0,55}\b(get|rent|lease|buy|move|live|take|have|property|place|home|house|apartment|apt|unit|this|it)\b/i.test(
      text,
    );
  const possessionReply =
    /\b(i|we)\b.{0,35}\b(want|wanna|need|trying|looking)\b.{0,35}\b(this|it|the property|the place|the home|the unit)\b/i.test(
      text,
    );
  return directRoleLanguage || naturalInterestReply || possessionReply;
}

function looksLikeQualificationReplyCandidate(
  value: unknown,
  expected: 'creditScore' | 'monthlyEarning',
) {
  const text = normalizeChatbotHumanText(value).replace(/,/g, '');
  if (!text || text.length > 320) return false;
  if (expected === 'creditScore') {
    const selfCredit =
      /\b(my|our|mine|ours|i|we)\b.{0,24}\b(credit|fico|score|rating)\b|\b(credit|fico|score|rating)\b.{0,24}\b(is|was|around|about|at|sitting|roughly|mine|ours)\b/i.test(
        text,
      );
    const humanNumber =
      /\b\d{3,5}\b|\b(?:six|seven|eight)\s+(?:hundred|oh|zero|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/i.test(
        text,
      );
    const requirementQuestion =
      /\b(minimum|required|requirement|need|needed|must have|what score|how much credit|qualify)\b/i.test(
        text,
      ) && !selfCredit;
    if (requirementQuestion) return false;
    return (
      selfCredit ||
      (humanNumber &&
        /\b(about|around|roughly|maybe|probably|like|ish|think|guess|low|mid|middle|high|checked|score|fico|credit|not great|not good|decent)\b/i.test(
          text,
        ))
    );
  }
  const selfIncome =
    /\b(my|our|mine|ours|i|we)\b.{0,30}\b(income|salary|pay|earn|earnings|make|get|receive|bring|gross|net|clear|take home)\b|\b(income|salary|earnings|pay)\b.{0,24}\b(is|was|around|about|at|roughly|mine|ours)\b/i.test(
      text,
    );
  const humanAmount =
    /(?:\$\s*)?\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:\s+and\s+a\s+half)?\s+(?:grand|thousand)\b/i.test(
      text,
    );
  const requirementQuestion =
    /\b(minimum|required|requirement|need to make|must make|what income|how much income|qualify)\b/i.test(
      text,
    ) && !selfIncome;
  if (requirementQuestion) return false;
  return (
    selfIncome ||
    (humanAmount &&
      /\b(about|around|roughly|maybe|probably|like|ish|month|monthly|week|weekly|year|annual|grand|thousand|not much|not a lot|somewhere)\b/i.test(
        text,
      ))
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : 'Unknown indexing error';
}
