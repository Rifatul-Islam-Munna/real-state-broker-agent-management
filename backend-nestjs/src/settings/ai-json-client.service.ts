import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class AiJsonClientService {
  constructor(private readonly settings: SettingsService) {}

  async call(messages: Array<{ role: string; content: string }>) {
    const config = await this.settings.getAiProviderConfig();
    const provider = `${config?.providerName ?? ''}`.toLowerCase();
    if (!config?.model || (!config?.apiKey && provider !== 'ollama')) return null;
    const base = `${config.baseUrl ?? (provider.includes('openai') ? 'https://api.openai.com/v1' : '')}`.replace(/\/+$/, '');
    if (!base) return null;
    if (provider === 'ollama') {
      const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, messages, format: 'json', stream: false }) });
      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
      const data: any = await response.json();
      return { provider: config.providerName, value: JSON.parse(data?.message?.content ?? '{}') };
    }
    const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, messages, response_format: { type: 'json_object' }, temperature: 0 }) });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
    const data: any = await response.json();
    return { provider: config.providerName, value: JSON.parse(data?.choices?.[0]?.message?.content ?? '{}') };
  }
}
