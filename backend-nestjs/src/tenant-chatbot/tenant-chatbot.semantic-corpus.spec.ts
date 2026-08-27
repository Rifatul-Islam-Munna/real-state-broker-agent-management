import { Logger } from '@nestjs/common';
import { LIME_BAY_INTENTS, variantsFor } from './lime-bay-chatbot-corpus';
import { normalizeChatbotSettings } from './tenant-chatbot-policy';
import { TenantChatbotService } from './tenant-chatbot.service';

jest.setTimeout(30_000);

describe('Lime Bay chatbot semantic corpus', () => {
  const tenant = { id: 42, databaseName: 'tenant_42_alpha', businessName: 'Alpha Realty' } as any;
  const settings = normalizeChatbotSettings({ enabled: true, channels: { web: true, email: true, sms: true } });
  const vector = Array.from({ length: 384 }, () => 0.01);

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('contains at least 50 intents with exactly 20 unique variants each', () => {
    expect(LIME_BAY_INTENTS.length).toBeGreaterThanOrEqual(50);
    for (const intent of LIME_BAY_INTENTS) {
      const variants = variantsFor(intent);
      expect(variants).toHaveLength(20);
      expect(new Set(variants).size).toBe(20);
    }
  });
  it('answers every Lime Bay wording variant from the verified fact', async () => {
    const failures: Array<Record<string, unknown>> = [];
    for (const [index, intent] of LIME_BAY_INTENTS.entries()) {
      const query = jest.fn(async (sql: string) => {
        if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: settings }] };
        if (sql.includes('FROM tenant_property')) return { rows: [{ id: 41, title: 'Lime Bay', status: 'published', payload: {} }] };
        if (sql.includes('FROM tenant_chatbot_knowledge')) return { rows: [{
          id: String(index + 1), propertyId: 41, scope: 'PROPERTY', audience: 'LEAD',
          sourceType: 'PROPERTY_FIELD', title: intent.title,
          answer: intent.storedAnswer, priority: 85, active: true,
        }] };
        return { rows: [] };
      });
      const match = {
        pointId: `fact-${index}`, score: 0.31, scope: 'PROPERTY', tenantId: 42,
        audience: 'LEAD', propertyId: 41, knowledgeId: String(index + 1),
        sourceType: 'PROPERTY_FIELD', sourceHash: `fact-${index}`, priority: 85, active: true,
      };
      const vectors = {
        isConfigured: jest.fn(() => true), healthCheck: jest.fn(async () => ({ configured: true, connected: true, error: null })),
        ensureCollection: jest.fn(), upsert: jest.fn(), deleteBySource: jest.fn(),
        search: jest.fn(async (input: any) => input.scope === 'TENANT' ? [match] : []),
      };
      const service = new TenantChatbotService(
        { withTenantClient: jest.fn(async (_name: string, work: any) => work({ query })) } as any,
        { embed: jest.fn(async () => vector), modelSignature: jest.fn(() => 'Snowflake/snowflake-arctic-embed-xs|q8|cls|384') } as any,
        vectors as any,
        { findActiveByIds: jest.fn(async () => []) } as any,
      );

      for (const question of variantsFor(intent)) {
        const result = await service.testQuestion(tenant, { propertyId: 41, audience: 'LEAD', question });
        const missing = intent.expectIncludes.filter(
          (expected) => !result.answer.toLowerCase().includes(expected.toLowerCase()),
        );
        const rawStyle = /^[A-Za-z0-9 +()/-]{2,40}:\s/.test(result.answer);
        if (
          result.decision !== 'ANSWER' ||
          (result.confidence ?? 0) < settings.minimumConfidence ||
          missing.length > 0 ||
          rawStyle
        ) {
          failures.push({
            intent: intent.id,
            question,
            decision: result.decision,
            confidence: result.confidence,
            answer: result.answer,
            missing,
            rawStyle,
          });
        }
      }
    }
    if (failures.length) {
      throw new Error(`Corpus failures: ${failures.length}\n${JSON.stringify(failures.slice(0, 80), null, 2)}`);
    }
  });
});
