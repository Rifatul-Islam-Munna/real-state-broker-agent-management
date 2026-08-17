import { Injectable } from '@nestjs/common';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
import { SettingsService } from './settings.service';

type AiProviderConfig = {
  providerName?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
};

type AiMessage = {
  role: string;
  content: string;
};

@Injectable()
export class AiJsonClientService {
  constructor(private readonly settings: SettingsService) {}

  async call(messages: AiMessage[]) {
    const config = await this.settings.getAiProviderConfig();
    if (!this.isUsable(config)) return null;

    const result = await generateText({
      model: this.createModel(config),
      messages: messages
        .filter((message) => message?.content?.trim())
        .map((message) => ({
          role: this.role(message.role),
          content: message.content,
        })) as any,
      maxRetries: 2,
    });

    return {
      provider: config.providerName,
      value: this.parseJson(result.text),
    };
  }

  private createModel(config: AiProviderConfig) {
    const provider = this.providerKey(config.providerName);
    const apiKey = `${config.apiKey ?? ''}`.trim();
    const model = `${config.model ?? ''}`.trim();
    const baseURL = this.baseUrl(config, provider);

    if (provider === 'openai') {
      return createOpenAI({ apiKey, baseURL })(model);
    }
    if (provider === 'gemini') {
      return createGoogle({ apiKey, baseURL })(model);
    }
    if (provider === 'claude') {
      return createAnthropic({ apiKey, baseURL })(model);
    }
    if (provider === 'ollama') {
      return createOllama({
        baseURL,
        ...(apiKey ? { apiKey } : {}),
      })(model);
    }

    return createOpenAICompatible({
      name: provider === 'openrouter' ? 'openrouter' : 'custom',
      apiKey: apiKey || undefined,
      baseURL,
    })(model);
  }

  private isUsable(config: AiProviderConfig | null | undefined) {
    const provider = this.providerKey(config?.providerName);
    if (!config?.providerName || !`${config.model ?? ''}`.trim()) return false;
    if (provider === 'ollama') return true;
    if (!`${config.apiKey ?? ''}`.trim()) return false;
    return provider !== 'custom' || !!`${config.baseUrl ?? ''}`.trim();
  }

  private baseUrl(config: AiProviderConfig, provider: string) {
    const configured = `${config.baseUrl ?? ''}`.trim().replace(/\/+$/, '');
    if (configured) return configured;
    if (provider === 'openai') return 'https://api.openai.com/v1';
    if (provider === 'gemini')
      return 'https://generativelanguage.googleapis.com/v1beta';
    if (provider === 'claude') return 'https://api.anthropic.com/v1';
    if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
    if (provider === 'ollama') return 'http://localhost:11434';
    if (provider === 'custom')
      throw new Error('Custom AI provider requires a base URL.');
    throw new Error(
      `Unsupported AI provider: ${config.providerName ?? 'unknown'}.`,
    );
  }

  private providerKey(value: unknown) {
    const provider = `${value ?? ''}`.trim().toLowerCase();
    if (provider === 'google' || provider.includes('gemini')) return 'gemini';
    if (provider === 'anthropic' || provider.includes('claude'))
      return 'claude';
    if (provider.includes('openrouter')) return 'openrouter';
    if (provider.includes('openai')) return 'openai';
    if (provider.includes('ollama')) return 'ollama';
    return 'custom';
  }

  private role(value: unknown): 'system' | 'user' | 'assistant' {
    const role = `${value ?? ''}`.toLowerCase();
    return role === 'system' || role === 'assistant' ? role : 'user';
  }

  private parseJson(text: string) {
    const clean = `${text ?? ''}`
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(clean || '{}');
    } catch {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start >= 0 && end > start)
        return JSON.parse(clean.slice(start, end + 1));
      throw new Error('AI provider returned invalid JSON.');
    }
  }
}
