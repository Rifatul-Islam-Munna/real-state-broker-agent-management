import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';

@Injectable()
export class IntegrationWorkspaceService {
  constructor(
    @InjectRepository(AgencyIntegrationSettings)
    private readonly repository: Repository<AgencyIntegrationSettings>,
  ) {}

  async getStatus() {
    const row = await this.repository.findOne({ where: { id: 1 } });
    const communication = this.parse(row?.twilioPayload);
    const smtp = this.parse(row?.smtpPayload);
    const ai = this.parse(row?.aiProviderPayload);
    const payment = this.parse(row?.gatewayPayload);

    return {
      hasCommunicationConfig: this.communicationValid(communication),
      communicationUpdatedAt: row?.twilioUpdatedAt ?? null,
      communicationProviderName: communication?.providerName ?? null,
      communicationSmsSyncEnabled: !!communication?.enableSmsSync,
      communicationSmsSyncIntervalMinutes: communication?.enableSmsSync
        ? communication.syncIntervalMinutes ?? 5
        : null,
      communicationConfig: communication
        ? this.withSecretFlags(communication, ['authToken'])
        : null,
      hasSmtpConfig: this.smtpValid(smtp),
      smtpUpdatedAt: row?.smtpUpdatedAt ?? null,
      smtpProviderName: smtp?.providerName ?? null,
      mailboxSyncEnabled: !!smtp?.enableInboxSync,
      mailboxSyncIntervalMinutes: smtp?.enableInboxSync
        ? smtp.syncIntervalMinutes ?? 10
        : null,
      smtpConfig: smtp
        ? this.withSecretFlags(smtp, ['password', 'imapPassword', 'gmailAccessToken', 'gmailRefreshToken'])
        : null,
      hasAiProviderConfig: this.aiValid(ai),
      aiProviderUpdatedAt: row?.aiProviderUpdatedAt ?? null,
      aiProviderName: ai?.providerName ?? null,
      aiProviderConfig: ai ? this.withSecretFlags(ai, ['apiKey']) : null,
      hasPaymentConfig: this.paymentValid(payment),
      paymentUpdatedAt: row?.gatewayUpdatedAt ?? null,
      paymentProviderName: payment?.providerName ?? null,
      paymentConfig: payment
        ? this.withSecretFlags(payment, ['apiKey', 'secretKey', 'token'])
        : null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async update(input: any) {
    let row = await this.repository.findOne({ where: { id: 1 } });
    if (!row) row = this.repository.create({ id: 1 });
    const now = new Date();

    if (input?.clearCommunication) {
      row.twilioPayload = null;
      row.twilioUpdatedAt = null;
    } else if (input?.communication) {
      const value = this.merge(
        this.parse(row.twilioPayload),
        input.communication,
        ['authToken'],
      );
      if (!this.communicationValid(value)) {
        throw new BadRequestException(
          'Account ID, auth token, and from number are required.',
        );
      }
      row.twilioPayload = JSON.stringify(value);
      row.twilioUpdatedAt = now;
    }

    if (input?.clearSmtp) {
      row.smtpPayload = null;
      row.smtpUpdatedAt = null;
    } else if (input?.smtp) {
      const value = this.merge(this.parse(row.smtpPayload), input.smtp, [
        'password',
        'imapPassword',
        'gmailAccessToken',
        'gmailRefreshToken',
      ]);
      if (value.enableInboxSync) {
        value.imapUsername = value.imapUsername || value.username;
        value.imapPassword = value.imapPassword || value.password;
      }
      if (!this.smtpValid(value)) {
        throw new BadRequestException(
          'SMTP host, username, password, and from email are required.',
        );
      }
      if (
        value.enableInboxSync &&
        value.authType !== 'gmail-oauth' &&
        (!value.imapHost || !value.imapUsername || !value.imapPassword)
      ) {
        throw new BadRequestException(
          'IMAP host, username, and password are required for inbox sync.',
        );
      }
      row.smtpPayload = JSON.stringify(value);
      row.smtpUpdatedAt = now;
    }

    if (input?.clearAiProvider) {
      row.aiProviderPayload = null;
      row.aiProviderUpdatedAt = null;
    } else if (input?.aiProvider) {
      const existing = this.parse(row.aiProviderPayload);
      const value = this.normalizeAiProvider(this.mergeAiProvider(existing, input.aiProvider));
      if (!this.aiValid(value)) {
        throw new BadRequestException(
          'AI provider, model, and provider credentials are required.',
        );
      }
      row.aiProviderPayload = JSON.stringify(value);
      row.aiProviderUpdatedAt = now;
    }

    if (input?.clearPayment) {
      row.gatewayPayload = null;
      row.gatewayUpdatedAt = null;
    } else if (input?.payment) {
      const value = this.merge(this.parse(row.gatewayPayload), input.payment, [
        'apiKey',
        'secretKey',
        'token',
      ]);
      if (!this.paymentValid(value)) {
        throw new BadRequestException(
          'Payment provider name, checkout URL, and verification URL are required.',
        );
      }
      row.gatewayPayload = JSON.stringify(value);
      row.gatewayUpdatedAt = now;
    }

    await this.repository.save(row);
    return this.getStatus();
  }

  private merge(existing: any, incoming: any, secretKeys: string[]) {
    const merged = { ...(existing ?? {}), ...(incoming ?? {}) };
    for (const key of secretKeys) {
      if (!`${incoming?.[key] ?? ''}`.trim()) {
        merged[key] = existing?.[key] ?? '';
      }
    }
    return merged;
  }

  private withSecretFlags(value: any, secretKeys: string[]) {
    const safe = { ...value };
    for (const key of secretKeys) {
      safe[`has${key[0].toUpperCase()}${key.slice(1)}`] = !!value[key];
      delete safe[key];
    }
    return safe;
  }

  private communicationValid(value: any) {
    return !!(
      value?.providerName &&
      value?.accountId &&
      value?.authToken &&
      value?.fromNumber
    );
  }

  private smtpValid(value: any) {
    if (value?.authType === 'gmail-oauth') return !!(value?.gmailEmail && value?.gmailRefreshToken);
    return !!(
      value?.host &&
      value?.username &&
      value?.password &&
      value?.fromEmail
    );
  }

  private aiValid(value: any) {
    if (!value?.providerName || !value?.model) return false;
    const provider = this.aiProviderKey(value.providerName);
    if (provider === 'custom' && !value?.baseUrl) return false;
    return provider === 'ollama' || !!value.apiKey;
  }

  private mergeAiProvider(existing: any, incoming: any) {
    const sameProvider = this.aiProviderKey(existing?.providerName) === this.aiProviderKey(incoming?.providerName);
    const merged = { ...(existing ?? {}), ...(incoming ?? {}) };
    if (!`${incoming?.apiKey ?? ''}`.trim()) {
      merged.apiKey = sameProvider ? existing?.apiKey ?? '' : '';
    }
    return merged;
  }

  private normalizeAiProvider(value: any) {
    const providerName = `${value?.providerName ?? ''}`.trim();
    const provider = this.aiProviderKey(providerName);
    const defaults: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
      claude: 'https://api.anthropic.com/v1',
      openrouter: 'https://openrouter.ai/api/v1',
      ollama: 'http://localhost:11434',
    };
    return {
      ...value,
      providerName,
      model: `${value?.model ?? ''}`.trim(),
      baseUrl: `${value?.baseUrl ?? defaults[provider] ?? ''}`.trim().replace(/\/+$/, ''),
      apiKey: `${value?.apiKey ?? ''}`.trim(),
    };
  }

  private aiProviderKey(value: unknown) {
    const provider = `${value ?? ''}`.trim().toLowerCase();
    if (provider === 'google' || provider.includes('gemini')) return 'gemini';
    if (provider === 'anthropic' || provider.includes('claude')) return 'claude';
    if (provider.includes('openrouter')) return 'openrouter';
    if (provider.includes('openai')) return 'openai';
    if (provider.includes('ollama')) return 'ollama';
    return 'custom';
  }

  private paymentValid(value: any) {
    return !!(
      value?.providerName &&
      (value?.createUrl || value?.checkoutUrl || value?.apiUrl) &&
      (value?.verifyUrl || value?.statusUrl)
    );
  }

  private parse(value?: string | null) {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
}
