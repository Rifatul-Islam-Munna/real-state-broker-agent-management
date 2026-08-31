import type { PlatformChatbotAiRuntimeSettings } from '../platform-domain/platform-domain.service';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type AiSdkRuntime = {
  generateText: (input: any) => Promise<any>;
  createOpenAI: (input: any) => (modelId: string) => any;
  createGoogle: (input: any) => (modelId: string) => any;
  createAnthropic: (input: any) => (modelId: string) => any;
  createOpenAICompatible: (input: any) => (modelId: string) => any;
  createOllama: (input?: any) => (modelId: string) => any;
};

let runtimePromise: Promise<AiSdkRuntime> | null = null;

export function setChatbotAiSdkRuntimeForTests(runtime: AiSdkRuntime | null) {
  runtimePromise = runtime ? Promise.resolve(runtime) : null;
}

export async function generateChatbotAiText(
  config: PlatformChatbotAiRuntimeSettings,
  modelId: string,
  messages: ChatMessage[],
  maxOutputTokens: number,
) {
  const sdk = await runtime();
  const instructions = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
    .trim();
  const conversationMessages = messages.filter((message) => message.role !== 'system');
  const result = await sdk.generateText({
    model: createModel(sdk, config, modelId),
    ...(instructions ? { instructions } : {}),
    messages: conversationMessages,
    temperature: config.temperature,
    maxOutputTokens: effectiveMaxOutputTokens(config, maxOutputTokens),
    maxRetries: config.providerName === 'OpenRouter' ? 0 : 1,
    timeout: effectiveTimeoutMs(config),
  });
  return {
    text: String(result?.text ?? '').trim(),
    model: String(result?.response?.modelId ?? modelId).trim() || modelId,
  };
}

function effectiveTimeoutMs(config: PlatformChatbotAiRuntimeSettings) {
  if (config.providerName !== 'OpenRouter') return config.timeoutMs;
  const hasFreeModel = config.models.some((model) => model.toLowerCase().includes(':free'));
  return hasFreeModel ? Math.max(config.timeoutMs, 20_000) : config.timeoutMs;
}

function effectiveMaxOutputTokens(config: PlatformChatbotAiRuntimeSettings, requested: number) {
  if (config.providerName !== 'OpenRouter') return requested;
  const hasFreeModel = config.models.some((model) => model.toLowerCase().includes(':free'));
  return hasFreeModel ? Math.max(requested, 320) : requested;
}

export function chatbotAiConfigured(config: PlatformChatbotAiRuntimeSettings) {
  if (!config.models.length) return false;
  if (config.providerName === 'Ollama') return true;
  if (!config.apiKey.trim()) return false;
  return config.providerName !== 'Custom' || Boolean(config.baseUrl.trim());
}

function createModel(sdk: AiSdkRuntime, config: PlatformChatbotAiRuntimeSettings, modelId: string) {
  const apiKey = config.apiKey.trim();
  const baseURL = config.baseUrl.trim().replace(/\/+$/, '');
  if (config.providerName === 'OpenAI') {
    return sdk.createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
  }
  if (config.providerName === 'Gemini') {
    return sdk.createGoogle({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
  }
  if (config.providerName === 'Claude') {
    return sdk.createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) })(modelId);
  }
  if (config.providerName === 'Ollama') {
    return sdk.createOllama({ ...(baseURL ? { baseURL } : {}), ...(apiKey ? { apiKey } : {}) })(modelId);
  }
  if (config.providerName === 'Custom' && !baseURL) throw new Error('Custom AI provider requires a base URL.');

  const models = config.models.slice(0, 20);
  return sdk.createOpenAICompatible({
    name: config.providerName === 'OpenRouter' ? 'openrouter' : 'custom',
    apiKey: apiKey || undefined,
    baseURL: baseURL || OPENROUTER_BASE_URL,
    transformRequestBody: config.providerName === 'OpenRouter'
      ? (body: Record<string, any>) => {
          const { model: _model, ...rest } = body;
          return {
            ...rest,
            ...(models.length > 1 ? { models } : { model: models[0] || modelId }),
            provider: {
              allow_fallbacks: true,
              ...(config.denyDataCollection ? { data_collection: 'deny', zdr: true } : {}),
            },
            reasoning: { effort: 'none', exclude: true },
            include_reasoning: false,
          };
        }
      : undefined,
  })(modelId);
}

async function runtime(): Promise<AiSdkRuntime> {
  runtimePromise ??= Promise.all([
    nativeImport('ai'),
    nativeImport('@ai-sdk/openai'),
    nativeImport('@ai-sdk/google'),
    nativeImport('@ai-sdk/anthropic'),
    nativeImport('@ai-sdk/openai-compatible'),
    nativeImport('ai-sdk-ollama'),
  ]).then(([ai, openai, google, anthropic, compatible, ollama]) => ({
    generateText: ai.generateText,
    createOpenAI: openai.createOpenAI,
    createGoogle: google.createGoogle,
    createAnthropic: anthropic.createAnthropic,
    createOpenAICompatible: compatible.createOpenAICompatible,
    createOllama: ollama.createOllama,
  }));
  return runtimePromise;
}

function nativeImport(specifier: string): Promise<any> {
  const load = new Function('specifier', 'return import(specifier)') as (value: string) => Promise<any>;
  return load(specifier);
}
