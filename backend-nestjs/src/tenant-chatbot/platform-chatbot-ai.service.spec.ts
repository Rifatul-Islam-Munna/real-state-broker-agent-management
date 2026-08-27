import { Logger } from '@nestjs/common';
import { PlatformChatbotAiService } from './platform-chatbot-ai.service';
import {
  setChatbotAiSdkRuntimeForTests,
  type AiSdkRuntime,
} from './chatbot-ai-sdk-model';

const baseConfig = {
  enabled: true,
  providerName: 'OpenRouter' as const,
  baseUrl: '',
  models: ['model-a:free', 'model-b:free'],
  temperature: 0.84,
  maxOutputTokens: 180,
  timeoutMs: 8000,
  maxConcurrency: 2,
  answerFallbackEnabled: true,
  qualificationFallbackEnabled: true,
  reviewLearningEnabled: true,
  denyDataCollection: true,
  apiKey: 'secret',
};

function runtimeWith(generate: (input: any) => Promise<any>) {
  const create = jest.fn((options: any) => (modelId: string) => ({ options, modelId }));
  const runtime: AiSdkRuntime = {
    generateText: jest.fn(generate),
    createOpenAI: create,
    createGoogle: create,
    createAnthropic: create,
    createOpenAICompatible: create,
    createOllama: create,
  };
  setChatbotAiSdkRuntimeForTests(runtime);
  return { runtime, create };
}

function jsonResult(value: unknown, modelId = 'model-a:free') {
  return { text: JSON.stringify(value), response: { modelId } };
}

describe('PlatformChatbotAiService', () => {
  afterEach(() => {
    setChatbotAiSdkRuntimeForTests(null);
    jest.restoreAllMocks();
  });

  it('uses the AI SDK once for OpenRouter and keeps ordered model fallbacks in the transformed request', async () => {
    const { runtime } = runtimeWith(async () => jsonResult({
      supported: true,
      answer: 'Water is included in rent.',
      confidence: 0.96,
    }, 'model-b:free'));
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new PlatformChatbotAiService(platform as any);

    await expect(service.answerFromEvidence({
      tenantId: 42,
      propertyId: 9,
      audience: 'LEAD',
      channel: 'SMS',
      question: 'do i gotta pay water?',
      evidence: [{ knowledgeId: 'water', title: 'Water', answer: 'Water is included in rent.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toEqual({
      answer: 'Water is included in rent.',
      provider: 'OpenRouter',
      model: 'model-b:free',
      confidence: 0.96,
    });

    expect(runtime.generateText).toHaveBeenCalledTimes(1);
    const call = (runtime.generateText as jest.Mock).mock.calls[0][0];
    expect(call.temperature).toBe(0.84);
    expect(call.maxOutputTokens).toBe(320);
    expect(call.timeout).toBe(20000);
    expect(call.instructions).toContain('Use ONLY the EVIDENCE');
    expect(call.messages).toHaveLength(1);
    expect(call.messages[0].content).toContain('Water is included in rent.');
    expect(call.messages.some((message: any) => message.role === 'system')).toBe(false);
    const transformed = call.model.options.transformRequestBody({
      model: 'model-a:free',
      messages: call.messages,
      temperature: 0.84,
      max_tokens: 180,
    });
    expect(transformed.models).toEqual(['model-a:free', 'model-b:free']);
    expect(transformed.model).toBeUndefined();
    expect(transformed.provider).toEqual({ allow_fallbacks: true, data_collection: 'deny', zdr: true });
    expect(transformed.reasoning).toEqual({ effort: 'none', exclude: true });
    expect(transformed.include_reasoning).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"event":"chatbot.ai_answer"'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"channel":"SMS"'));
  });

  it('accepts plain text, markdown, and repairable JSON from free fallback models', async () => {
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    runtimeWith(async () => ({ text: '**Water is included in rent.**', response: { modelId: 'model-a:free' } }));
    const plain = new PlatformChatbotAiService(platform as any);
    await expect(plain.answerFromEvidence({
      tenantId: 42, audience: 'LEAD', channel: 'WEB', question: 'Is water included?',
      evidence: [{ knowledgeId: 'water', title: 'Water', answer: 'Water is included in rent.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({ answer: 'Water is included in rent.', model: 'model-a:free' });

    runtimeWith(async () => ({ text: "```json\n{supported:true, answer:'Water is included in rent.', confidence:.9}\n```", response: { modelId: 'model-b:free' } }));
    const repaired = new PlatformChatbotAiService(platform as any);
    await expect(repaired.answerFromEvidence({
      tenantId: 42, audience: 'LEAD', channel: 'EMAIL', question: 'Is water included?',
      evidence: [{ knowledgeId: 'water', title: 'Water', answer: 'Water is included in rent.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({ answer: 'Water is included in rent.', model: 'model-b:free' });
  });

  it('strips visible reasoning and returns only the final user-facing answer', async () => {
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    runtimeWith(async () => ({
      text: "Here's a thinking process:\n\n1. **Analyze User Input:**\n- User question: family of 4\n\n2. **Analyze Evidence:**\n- The property has 2 bedrooms.\n\nFinal Answer:\nThe property has 2 bedrooms. The verified information does not specify a maximum occupancy.",
      response: { modelId: 'model-a:free' },
    }));
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'Will a family of 4 fit?',
      evidence: [{ knowledgeId: 'bedrooms', title: 'Bedrooms', answer: 'The property has 2 bedrooms.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({
      answer: "The property has 2 bedrooms, so it may work for a household of 4. I don't have a verified maximum occupancy listed for this property.",
    });
  });

  it('turns a bare layout answer into a useful cautious household-fit answer', async () => {
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    runtimeWith(async () => ({ text: '2 bedrooms, 2 bathrooms.', response: { modelId: 'model-a:free' } }));
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'we had 4 member of family will it fit?',
      evidence: [{ knowledgeId: 'layout', title: 'Layout', answer: '2 bedrooms, 2 bathrooms.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({
      answer: "The property has 2 bedrooms and 2 bathrooms, so it may work for a household of 4. I don't have a verified maximum occupancy listed for this property.",
    });
  });

  it('continues to the next OpenRouter model batch when a successful model says unsupported', async () => {
    const config = { ...baseConfig, models: ['model-a:free', 'model-b:free', 'model-c:free', 'model-d:free', 'model-e:free', 'model-f:free'] };
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(config) };
    const { runtime } = runtimeWith(async (input) => input.model.modelId === 'model-a:free'
      ? { text: '__NO_VERIFIED_ANSWER__', response: { modelId: 'model-b:free' } }
      : { text: 'The property has 2 bedrooms and 2 bathrooms, so it may work for a household of 4. I do not have a verified maximum occupancy listed.', response: { modelId: 'model-e:free' } });
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'we had 4 member of family will it fit?',
      evidence: [{ knowledgeId: 'layout', title: 'Layout', answer: '2 bedrooms, 2 bathrooms.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({ model: 'model-e:free', answer: expect.stringContaining('2 bedrooms and 2 bathrooms') });
    expect(runtime.generateText).toHaveBeenCalledTimes(2);
  });

  it('uses a safe deterministic grounded answer when every AI batch refuses a useful layout fact', async () => {
    const config = { ...baseConfig, models: ['model-a:free', 'model-b:free', 'model-c:free', 'model-d:free'] };
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(config) };
    const { runtime } = runtimeWith(async (input) => ({ text: '__NO_VERIFIED_ANSWER__', response: { modelId: input.model.modelId } }));
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'we had 4 member of family will it fit?',
      evidence: [{ knowledgeId: 'layout', title: 'Layout', answer: '2 bedrooms, 2 bathrooms.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({
      answer: "The property has 2 bedrooms and 2 bathrooms, so it may work for a household of 4. I don't have a verified maximum occupancy listed for this property.",
    });
    expect(runtime.generateText).toHaveBeenCalledTimes(2);
  });

  it('never shows reasoning-only output and safely answers from verified layout facts instead', async () => {
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    runtimeWith(async () => ({
      text: '3. **Determine What "fit" means in context:**',
      response: { modelId: 'model-a:free' },
    }));
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'we had 4 member of family will it fit?',
      evidence: [{ knowledgeId: 'bedrooms', title: 'Bedrooms', answer: 'The property has 2 bedrooms.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toMatchObject({
      answer: "The property has 2 bedrooms, so it may work for a household of 4. I don't have a verified maximum occupancy listed for this property.",
    });
  });

  it('fails back to the deterministic bot when the provider errors or refuses unsupported evidence', async () => {
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    runtimeWith(async () => { throw new Error('rate limited'); });
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'unknown?',
      evidence: [{ knowledgeId: '1', title: 'Parking', answer: 'One parking spot.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toBeNull();

    runtimeWith(async () => jsonResult({ supported: false, answer: '', confidence: 0.2 }));
    const second = new PlatformChatbotAiService(platform as any);
    await expect(second.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'what school district?',
      evidence: [{ knowledgeId: '1', title: 'Parking', answer: 'One parking spot.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toBeNull();
  });

  it('rejects an AI answer that invents a number not present in the question or evidence', async () => {
    runtimeWith(async () => jsonResult({ supported: true, answer: 'Water costs $99 per month.', confidence: 0.99 }));
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'WEB',
      question: 'Is water included?',
      evidence: [{ knowledgeId: 'water', title: 'Water', answer: 'Water is included in rent.', sourceType: 'PROPERTY_FIELD' }],
    })).resolves.toBeNull();
  });

  it('uses AI only as a structured interpreter for hard human qualification replies', async () => {
    runtimeWith(async () => jsonResult({
      recognized: true,
      role: null,
      creditScore: null,
      amount: 1200,
      period: 'WEEKLY',
      confidence: 0.91,
    }));
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(baseConfig) };
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.interpretReply({
      tenantId: 42,
      audience: 'LEAD',
      channel: 'EMAIL',
      expected: 'monthlyEarning',
      message: 'i get twelve hundred each week before tax',
    })).resolves.toMatchObject({
      recognized: true,
      monthlyEarning: 5200,
      period: 'WEEKLY',
      provider: 'OpenRouter',
    });
  });

  it('bounds concurrent AI SDK calls so traffic bursts queue instead of opening every request at once', async () => {
    let active = 0;
    let peak = 0;
    runtimeWith(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 8));
      active -= 1;
      return jsonResult({ supported: true, answer: 'Water is included.', confidence: 0.9 });
    });
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue({ ...baseConfig, maxConcurrency: 2 }) };
    const service = new PlatformChatbotAiService(platform as any);
    const request = () => service.answerFromEvidence({
      tenantId: 42,
      audience: 'LEAD' as const,
      channel: 'WEB' as const,
      question: 'water?',
      evidence: [{ knowledgeId: 'water', title: 'Water', answer: 'Water is included.', sourceType: 'PROPERTY_FIELD' }],
    });
    const results = await Promise.all(Array.from({ length: 8 }, request));
    expect(results.every(Boolean)).toBe(true);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('splits long OpenRouter fallback chains into batches of at most three models', async () => {
    const { runtime } = runtimeWith(async (input) => {
      const options = input.model.options;
      const transformed = options.transformRequestBody({ model: input.model.modelId, messages: input.messages });
      if (transformed.models?.[0] === 'model-1:free') throw new Error('first OpenRouter batch unavailable');
      return jsonResult({ ok: true, message: 'connected' }, 'model-5:free');
    });
    const config = {
      ...baseConfig,
      enabled: false,
      models: [
        'model-1:free', 'model-2:free', 'model-3:free',
        'model-4:free', 'model-5:free', 'model-6:free',
      ],
    };
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue(config) };
    const service = new PlatformChatbotAiService(platform as any);

    await expect(service.testConnection()).resolves.toMatchObject({ ok: true, model: 'model-5:free' });
    expect(runtime.generateText).toHaveBeenCalledTimes(2);
    const first = (runtime.generateText as jest.Mock).mock.calls[0][0];
    const second = (runtime.generateText as jest.Mock).mock.calls[1][0];
    expect(first.model.options.transformRequestBody({ model: 'x' }).models).toEqual([
      'model-1:free', 'model-2:free', 'model-3:free',
    ]);
    expect(second.model.options.transformRequestBody({ model: 'x' }).models).toEqual([
      'model-4:free', 'model-5:free', 'model-6:free',
    ]);
  });

  it('can test a configured provider through the AI SDK even while runtime fallback is disabled', async () => {
    runtimeWith(async () => jsonResult({ ok: true, message: 'connected' }));
    const platform = { getChatbotAiRuntimeSettings: jest.fn().mockResolvedValue({ ...baseConfig, enabled: false }) };
    const service = new PlatformChatbotAiService(platform as any);
    await expect(service.testConnection()).resolves.toMatchObject({ ok: true, provider: 'OpenRouter', model: 'model-a:free' });
  });
});
