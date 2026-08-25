import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';

const AGENCY_KEY = 'agency_workspace_settings';
const SCHEDULING_KEY = 'workspace_scheduling';
const INTEGRATIONS_KEY = 'workspace_integrations';

@Injectable()
export class TenantWorkspaceSettingsService {
  constructor(
    private readonly databases: TenantDatabaseService,
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
  ) {}

  async getAgencySettings(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, AGENCY_KEY);
    const defaults = this.defaultAgencySettings(tenant);
    const stored = this.object(row?.value);
    return {
      ...defaults,
      ...stored,
      profile: {
        ...defaults.profile,
        ...this.object(stored.profile),
      },
      leadAutomation: {
        ...defaults.leadAutomation,
        ...this.object(stored.leadAutomation),
      },
      communicationTemplates: Array.isArray(stored.communicationTemplates)
        ? stored.communicationTemplates
        : defaults.communicationTemplates,
      updatedAt: row?.updatedAt ?? null,
    };
  }
  async updateAgencySettings(tenant: SaasTenant, input: any) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Agency settings payload is invalid');
    }
    const current: any = await this.getAgencySettings(tenant);
    const payload = {
      ...current,
      ...input,
      profile: {
        ...this.object(current.profile),
        ...this.object(input.profile),
      },
      leadAutomation: {
        ...this.object(current.leadAutomation),
        ...this.object(input.leadAutomation),
      },
      showingFeedbackAutomation: {
        ...this.object(current.showingFeedbackAutomation),
        ...this.object(input.showingFeedbackAutomation),
      },
      communicationTemplates: Array.isArray(input.communicationTemplates)
        ? input.communicationTemplates
        : current.communicationTemplates,
    };
    delete payload.updatedAt;
    const updatedAt = await this.setSetting(tenant, AGENCY_KEY, payload);
    return { ...payload, updatedAt };
  }

  async getScheduling(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, SCHEDULING_KEY);
    const value = this.object(row?.value);
    return {
      timeZone: this.text(value.timeZone) || 'UTC',
      morningOutreachHour: this.hour(value.morningOutreachHour),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async updateScheduling(tenant: SaasTenant, input: any) {
    const timeZone = this.text(input?.timeZone) || 'UTC';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch {
      throw new BadRequestException('Enter a valid IANA timezone');
    }
    const value = {
      timeZone,
      morningOutreachHour: this.hour(input?.morningOutreachHour),
    };
    const updatedAt = await this.setSetting(tenant, SCHEDULING_KEY, value);
    return { ...value, updatedAt };
  }
  async getIntegrations(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    const stored = this.object(row?.value);
    const communication = this.object(stored.communication);
    const smtp = this.object(stored.smtp);
    const aiProvider = this.object(stored.aiProvider);
    return {
      hasCommunicationConfig: this.communicationValid(communication),
      communicationUpdatedAt: stored.communicationUpdatedAt ?? null,
      communicationProviderName: communication.providerName ?? null,
      communicationSmsSyncEnabled: communication.enableSmsSync === true,
      communicationSmsSyncIntervalMinutes: communication.enableSmsSync
        ? (communication.syncIntervalMinutes ?? 5)
        : null,
      communicationConfig: Object.keys(communication).length
        ? this.sanitizeSecrets(communication, ['authToken', 'clientSecret'])
        : null,
      hasSmtpConfig: this.smtpValid(smtp),
      smtpUpdatedAt: stored.smtpUpdatedAt ?? null,
      smtpProviderName: smtp.providerName ?? null,
      mailboxSyncEnabled: smtp.enableInboxSync === true,
      mailboxSyncIntervalMinutes: smtp.enableInboxSync
        ? (smtp.syncIntervalMinutes ?? 10)
        : null,
      smtpConfig: Object.keys(smtp).length
        ? this.sanitizeSecrets(smtp, [
            'password',
            'imapPassword',
            'gmailAccessToken',
            'gmailRefreshToken',
          ])
        : null,
      hasAiProviderConfig: this.aiValid(aiProvider),
      aiProviderUpdatedAt: stored.aiProviderUpdatedAt ?? null,
      aiProviderName: aiProvider.providerName ?? null,
      aiProviderConfig: Object.keys(aiProvider).length
        ? this.sanitizeSecrets(aiProvider, ['apiKey'])
        : null,
      updatedAt: row?.updatedAt ?? null,
    };
  }
  async updateIntegrations(tenant: SaasTenant, input: any) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    const current = this.object(row?.value);
    const now = new Date().toISOString();
    const next = { ...current };

    if (input?.clearCommunication) {
      delete next.communication;
      next.communicationUpdatedAt = null;
    } else if (input?.communication) {
      const value = this.mergeSecrets(
        this.object(current.communication),
        input.communication,
        ['authToken', 'clientSecret'],
      );
      if (!this.communicationValid(value))
        throw new BadRequestException(
          `${this.text(value?.providerName).toLowerCase() === 'ringcentral' ? 'RingCentral client ID, client secret, JWT, and from number' : 'Account ID, auth token, and from number'} are required.`,
        );
      next.communication = value;
      next.communicationUpdatedAt = now;
    }

    if (input?.clearSmtp) {
      delete next.smtp;
      next.smtpUpdatedAt = null;
    } else if (input?.smtp) {
      const value = this.mergeSecrets(this.object(current.smtp), input.smtp, [
        'password',
        'imapPassword',
        'gmailAccessToken',
        'gmailRefreshToken',
      ]);
      if (value.enableInboxSync && !value.imapUsername)
        value.imapUsername = value.username;
      if (value.enableInboxSync && !value.imapPassword)
        value.imapPassword = value.password;
      value.localInboxRetentionDays = this.retentionDays(value.localInboxRetentionDays);
      value.leadTemplateTags = this.stringList(value.leadTemplateTags).slice(0, 25);
      value.mailboxTag = this.text(value.mailboxTag).slice(0, 500);
      if (!this.smtpValid(value))
        throw new BadRequestException(
          'SMTP host, username, password, and from email are required.',
        );
      next.smtp = value;
      next.smtpUpdatedAt = now;
    }
    if (input?.clearAiProvider) {
      delete next.aiProvider;
      next.aiProviderUpdatedAt = null;
    } else if (input?.aiProvider) {
      const value = this.mergeSecrets(
        this.object(current.aiProvider),
        input.aiProvider,
        ['apiKey'],
      );
      if (!this.aiValid(value))
        throw new BadRequestException(
          'AI base URL, model, and provider credentials are required.',
        );
      next.aiProvider = value;
      next.aiProviderUpdatedAt = now;
    }

    await this.setSetting(tenant, INTEGRATIONS_KEY, next);
    return this.getIntegrations(tenant);
  }

  async getRawSmtp(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    return this.decryptSecrets(this.object(this.object(row?.value).smtp), [
      'password',
      'imapPassword',
      'gmailAccessToken',
      'gmailRefreshToken',
    ]);
  }

  async getRawCommunication(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    return this.decryptSecrets(
      this.object(this.object(row?.value).communication),
      ['authToken', 'clientSecret'],
    );
  }

  async getRawAiProvider(tenant: SaasTenant) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    return this.decryptSecrets(
      this.object(this.object(row?.value).aiProvider),
      ['apiKey'],
    );
  }

  async saveRawSmtp(tenant: SaasTenant, smtp: any) {
    const row = await this.getSetting(tenant, INTEGRATIONS_KEY);
    const current = this.object(row?.value);
    const next = {
      ...current,
      smtp: this.encryptSecrets(this.object(smtp), [
        'password',
        'imapPassword',
        'gmailAccessToken',
        'gmailRefreshToken',
      ]),
      smtpUpdatedAt: new Date().toISOString(),
    };
    await this.setSetting(tenant, INTEGRATIONS_KEY, next);
  }

  async getGmailConnectUrl(tenant: SaasTenant, input: any = {}) {
    const clientId = this.text(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = this.tenantGmailRedirectUri();
    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID and GOOGLE_TENANT_GMAIL_REDIRECT_URI are required.',
      );
    }
    const state = this.signOauthState({
      version: 1,
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      returnTo: this.safeReturnTo(input?.returnTo),
      returnOrigin: this.safeTenantReturnOrigin(
        input?.returnOrigin,
        input?.requestTenantHost,
      ),
      mailboxTag: this.text(input?.mailboxTag),
      leadTemplateTags: this.stringList(input?.leadTemplateTags).slice(0, 25),
      localInboxRetentionDays: this.retentionDays(input?.localInboxRetentionDays),
      expiresAt: Date.now() + 10 * 60_000,
      nonce: randomBytes(16).toString('hex'),
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set(
      'scope',
      [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
      ].join(' '),
    );
    url.searchParams.set('state', state);
    return { url: url.toString() };
  }

  async completeGmailConnect(code: string, state: string) {
    const payload = this.verifyOauthState(state);
    const tenant = await this.tenants.findOne({
      where: {
        id: Number(payload.tenantId),
        subdomain: `${payload.subdomain}`,
      },
    });
    if (
      !tenant ||
      !tenant.databaseName ||
      tenant.databaseStatus !== 'ready' ||
      tenant.provisioningStatus !== 'ready' ||
      !tenant.isActive ||
      tenant.isBlocked
    ) {
      throw new BadRequestException('Tenant workspace is unavailable.');
    }
    const clientId = this.text(process.env.GOOGLE_CLIENT_ID);
    const clientSecret = this.text(process.env.GOOGLE_CLIENT_SECRET);
    const redirectUri = this.tenantGmailRedirectUri();
    if (!code || !clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Tenant Gmail OAuth configuration is incomplete.',
      );
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      throw new BadRequestException(
        `Tenant Gmail connection failed with status ${tokenResponse.status}.`,
      );
    }
    const token: any = await tokenResponse.json();
    const accessToken = this.text(token.access_token);
    const existing: any = await this.getRawSmtp(tenant);
    const refreshToken =
      this.text(token.refresh_token) || this.text(existing?.gmailRefreshToken);
    if (!accessToken || !refreshToken) {
      throw new BadRequestException(
        'Gmail did not return a refresh token. Reconnect and grant offline access.',
      );
    }
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const profile: any = profileResponse.ok ? await profileResponse.json() : {};
    const email =
      this.text(profile.email) ||
      this.text(existing?.gmailEmail) ||
      this.text(existing?.username);
    if (!email)
      throw new BadRequestException('Gmail account email was not returned.');
    await this.saveRawSmtp(tenant, {
      ...existing,
      providerName: 'Gmail',
      authType: 'gmail-oauth',
      host: 'smtp.gmail.com',
      port: 587,
      username: email,
      password: '',
      fromEmail: email,
      fromName: this.text(profile.name) || existing?.fromName || '',
      useSsl: true,
      enableInboxSync: true,
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapUsername: email,
      imapPassword: '',
      imapUseSsl: true,
      imapFolder: 'INBOX',
      mailboxTag: this.text(payload.mailboxTag),
      leadTemplateTags: this.stringList(payload.leadTemplateTags),
      duplicatePolicy: 'skip-exact-message',
      autoCreateLeads: existing?.autoCreateLeads !== false,
      syncIntervalMinutes: this.number(
        existing?.syncIntervalMinutes,
        5,
        1,
        120,
      ),
      maxMessagesPerSync: this.number(existing?.maxMessagesPerSync, 50, 5, 250),
      localInboxRetentionDays: this.retentionDays(
        payload.localInboxRetentionDays ?? existing?.localInboxRetentionDays,
      ),
      gmailEmail: email,
      gmailAccessToken: accessToken,
      gmailRefreshToken: refreshToken,
      gmailTokenExpiresAt: new Date(
        Date.now() + (Number(token.expires_in) || 3600) * 1000,
      ).toISOString(),
      gmailLabelIds: ['INBOX'],
    });
    return {
      tenant,
      returnTo: this.safeReturnTo(payload.returnTo),
      returnOrigin: this.safeSignedReturnOrigin(payload.returnOrigin),
      email,
    };
  }

  async getAgencyPhoneCountry(tenant: SaasTenant) {
    const settings = await this.getAgencySettings(tenant);
    return this.text(settings?.profile?.defaultPhoneCountry) || 'US';
  }
  private async getSetting(tenant: SaasTenant, key: string) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          'SELECT value, updated_at AS "updatedAt" FROM tenant_setting WHERE key = $1',
          [key],
        );
        return result.rows[0] ?? null;
      },
    );
  }

  private async setSetting(tenant: SaasTenant, key: string, value: unknown) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `INSERT INTO tenant_setting(key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
         RETURNING updated_at`,
          [key, JSON.stringify(value)],
        );
        return result.rows[0]?.updated_at ?? new Date();
      },
    );
  }

  private sanitizeIntegrationValue(input: any, secretKeys: string[]) {
    if (!input) return null;
    const safe = { ...input };
    for (const key of secretKeys) {
      const encrypted = this.text(safe[key]);
      safe[`has${key[0].toUpperCase()}${key.slice(1)}`] = Boolean(encrypted);
      delete safe[key];
    }
    return safe;
  }

  private mergeSecrets(
    existingEncrypted: any,
    incoming: any,
    secretKeys: string[],
  ) {
    const existing = this.decryptSecrets(existingEncrypted, secretKeys);
    const merged = { ...existing, ...this.object(incoming) };
    for (const key of secretKeys) {
      if (!this.text(incoming?.[key])) merged[key] = existing?.[key] ?? '';
    }
    return this.encryptSecrets(merged, secretKeys);
  }

  private sanitizeSecrets(value: any, secretKeys: string[]) {
    const safe = { ...this.object(value) };
    for (const key of secretKeys) {
      safe[`has${key[0].toUpperCase()}${key.slice(1)}`] = Boolean(
        this.text(safe[key]),
      );
      delete safe[key];
    }
    return safe;
  }

  private encryptSecrets(value: any, secretKeys: string[]) {
    const next = { ...this.object(value) };
    for (const key of secretKeys) {
      const secret = this.text(next[key]);
      next[key] = secret ? this.encrypt(secret) : '';
    }
    return next;
  }

  private decryptSecrets(value: any, secretKeys: string[]) {
    const next = { ...this.object(value) };
    for (const key of secretKeys) {
      const secret = this.text(next[key]);
      next[key] = secret ? this.decrypt(secret) : '';
    }
    return next;
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(value: string) {
    const [version, ivB64, tagB64, encryptedB64] = value.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !encryptedB64) return value;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private encryptionKey() {
    const secret =
      process.env.PLATFORM_SETTINGS_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'local-tenant-settings-key';
    return createHash('sha256').update(secret).digest();
  }

  private communicationValid(value: any) {
    if (this.text(value?.providerName).toLowerCase() === 'ringcentral') {
      return Boolean(
        value?.accountId &&
        value?.clientSecret &&
        value?.authToken &&
        value?.fromNumber
      );
    }
    return Boolean(
      value?.providerName &&
      value?.accountId &&
      value?.authToken &&
      value?.fromNumber,
    );
  }

  private smtpValid(value: any) {
    if (value?.authType === 'gmail-oauth')
      return Boolean(value?.gmailEmail && value?.gmailRefreshToken);
    return Boolean(
      value?.host && value?.username && value?.password && value?.fromEmail,
    );
  }

  private aiValid(value: any) {
    if (!value?.providerName || !value?.baseUrl || !value?.model) return false;
    return (
      this.text(value.providerName).toLowerCase() === 'ollama' ||
      Boolean(value.apiKey)
    );
  }

  private tenantGmailRedirectUri() {
    return this.text(
      process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI ||
        process.env.GOOGLE_GMAIL_REDIRECT_URI,
    );
  }

  private signOauthState(payload: Record<string, unknown>) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const signature = createHmac('sha256', this.encryptionKey())
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyOauthState(value: string): Record<string, any> {
    const [encoded, signature] = `${value ?? ''}`.split('.');
    if (!encoded || !signature) {
      throw new BadRequestException('Tenant Gmail OAuth state is invalid.');
    }
    const expected = createHmac('sha256', this.encryptionKey())
      .update(encoded)
      .digest();
    let supplied: Buffer;
    try {
      supplied = Buffer.from(signature, 'base64url');
    } catch {
      throw new BadRequestException('Tenant Gmail OAuth state is invalid.');
    }
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new BadRequestException(
        'Tenant Gmail OAuth state signature is invalid.',
      );
    }
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException(
        'Tenant Gmail OAuth state payload is invalid.',
      );
    }
    if (
      payload?.version !== 1 ||
      !Number.isInteger(Number(payload?.tenantId)) ||
      !this.text(payload?.subdomain) ||
      Number(payload?.expiresAt) < Date.now()
    ) {
      throw new BadRequestException(
        'Tenant Gmail OAuth state has expired or is invalid.',
      );
    }
    return payload;
  }

  private safeReturnTo(value: unknown) {
    const path = this.text(value) || '/dashboard/settings';
    if (!path.startsWith('/') || path.startsWith('//')) {
      return '/dashboard/settings';
    }
    return path.slice(0, 500);
  }

  private safeTenantReturnOrigin(value: unknown, requestTenantHost: unknown) {
    const expectedHost = this.normalizedHost(requestTenantHost);
    const raw = this.text(value);
    if (!raw || !expectedHost) return '';
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (this.normalizedHost(url.hostname) !== expectedHost) return '';
      return url.origin;
    } catch {
      return '';
    }
  }

  private safeSignedReturnOrigin(value: unknown) {
    const raw = this.text(value);
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
    } catch {
      return '';
    }
  }

  private normalizedHost(value: unknown) {
    return this.text(value)
      .toLowerCase()
      .split(',')[0]
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .replace(/\.$/, '');
  }

  private stringList(value: unknown) {
    return Array.isArray(value)
      ? [...new Set(value.map((item) => this.text(item)).filter(Boolean))]
      : [];
  }

  private number(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  private retentionDays(value: unknown) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(3650, Math.max(7, parsed));
  }

  private object(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  }

  private text(value: any) {
    return `${value ?? ''}`.trim();
  }

  private hour(value: any) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(23, Math.max(0, parsed)) : 9;
  }

  private mergeRequiredFollowUpTemplates(stored: any[], defaults: any[]) {
    const merged = [...stored];
    const required = defaults.filter((template: any) => {
      const sequence = this.text(template?.sequenceType);
      const audience = this.text(template?.audience) || 'Lead';
      return (audience === 'Lead' && ['FollowUp4', 'FollowUp5', 'FollowUp6'].includes(sequence)) ||
        (audience === 'Realtor' && /^FollowUp[1-6]$/.test(sequence));
    });
    for (const template of required) {
      const audience = this.text(template?.audience) || 'Lead';
      const sequence = this.text(template?.sequenceType);
      const exists = merged.some((item: any) => (this.text(item?.audience) || 'Lead') === audience && this.text(item?.sequenceType) === sequence);
      if (!exists) merged.push({ ...template, isActive: false });
    }
    return merged;
  }

  private defaultExtendedFollowUpTemplates(common: any) {
    const lead = [4, 5, 6].map((step) => ({
      ...common,
      isActive: false,
      id: `tenant-follow-up-${step}`,
      name: `Lead Follow-up ${step}`,
      subject: step === 6 ? 'Final check-in from {{agency_name}}' : `Follow-up ${step}: {{property_address}}`,
      body: step === 6
        ? 'Hi {{client_name}}, this is our final automatic check-in. Reply anytime if you would like us to continue helping.'
        : 'Hi {{client_name}}, checking in again about {{property_address}}. Reply with any question and our team will help.',
      channels: ['Email', 'SMS'],
      variableTokens: ['{{client_name}}', '{{property_address}}', '{{agency_name}}'],
      sequenceType: `FollowUp${step}`,
      gapDays: 7,
      audience: 'Lead',
    }));
    const realtor = [1, 2, 3, 4, 5, 6].map((step) => ({
      ...common,
      isActive: false,
      id: `tenant-realtor-follow-up-${step}`,
      name: `Realtor Follow-up ${step}`,
      subject: step === 6 ? 'Final realtor check-in: {{property_address}}' : `Realtor follow-up ${step}: {{property_address}}`,
      body: step === 6
        ? 'Hi {{agent_name}}, this is the final automatic follow-up for {{property_address}}. Reply anytime with an update.'
        : 'Hi {{agent_name}}, please share any update for {{client_name}} about {{property_address}} when available.',
      channels: ['Email', 'SMS'],
      variableTokens: ['{{agent_name}}', '{{client_name}}', '{{property_address}}'],
      sequenceType: `FollowUp${step}`,
      gapDays: step === 1 ? 1 : step === 2 ? 3 : 7,
      audience: 'Realtor',
    }));
    return [...lead, ...realtor];
  }

  private defaultAgencySettings(tenant: SaasTenant) {
    const common = {
      isActive: true,
      attachPropertyDocuments: false,
      attachmentMode: 'none',
      attachmentDocumentType: '',
      attachmentDocumentCategory: '',
      pdfTemplateId: '',
      audience: 'Lead',
    };
    return {
      profile: {
        agencyName: tenant.businessName,
        taxId: '',
        standardCommissionPercent: '3.0',
        logo: { objectName: null, url: '' },
        officeLocations: [],
        contactEmail: '',
        contactPhone: '',
        defaultPhoneCountry: 'US',
        socialLinks: [],
      },
      leadAutomation: {
        enabled: true,
        channels: ['Email'],
        directTemplateId: 'tenant-new-lead',
        leadShowingTemplateId: 'tenant-showing-confirmation',
        realtorShowingTemplateId: 'tenant-realtor-showing',
        followUpEnabled: true,
      },
      communicationTemplates: [
        {
          ...common,
          id: 'tenant-new-lead',
          name: 'New Lead Welcome',
          subject: `Welcome to ${tenant.businessName}, {{client_name}}`,
          body: 'Hello {{client_name}}, thank you for your interest in {{property_address}}. When is a good time to talk?',
          channels: ['Email', 'SMS'],
          variableTokens: [
            '{{client_name}}',
            '{{property_address}}',
            '{{agency_name}}',
          ],
          sequenceType: 'Direct',
          gapDays: 0,
        },
        {
          ...common,
          id: 'tenant-showing-confirmation',
          name: 'Lead Showing Confirmation',
          subject: 'Showing confirmed for {{property_address}}',
          body: 'Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reply here with any questions.',
          channels: ['Email', 'SMS'],
          variableTokens: [
            '{{client_name}}',
            '{{property_address}}',
            '{{showing_time}}',
            '{{agent_name}}',
          ],
          sequenceType: 'Direct',
          gapDays: 0,
          audience: 'LeadShowing',
        },
        {
          ...common,
          id: 'tenant-realtor-showing',
          name: 'Realtor Showing Assignment',
          subject: 'Showing assigned: {{property_address}}',
          body: 'Hi {{agent_name}}, you have been assigned a showing for {{property_address}} on {{showing_time}} for {{client_name}}.',
          channels: ['Email', 'SMS'],
          variableTokens: [
            '{{client_name}}',
            '{{property_address}}',
            '{{showing_time}}',
            '{{agent_name}}',
          ],
          sequenceType: 'Direct',
          gapDays: 0,
          audience: 'Realtor',
        },
        {
          ...common,
          id: 'tenant-follow-up-1',
          name: 'Lead Follow-up 1',
          subject: 'Following up about {{property_address}}',
          body: 'Hi {{client_name}}, are you still interested in {{property_address}}? Reply with any questions.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{property_address}}'],
          sequenceType: 'FollowUp1',
          gapDays: 1,
        },
        {
          ...common,
          id: 'tenant-follow-up-2',
          name: 'Lead Follow-up 2',
          subject: 'Can we help with your property search?',
          body: 'Hi {{client_name}}, {{agency_name}} can help you compare options and arrange a showing.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{agency_name}}'],
          sequenceType: 'FollowUp2',
          gapDays: 3,
        },
        {
          ...common,
          id: 'tenant-follow-up-3',
          name: 'Lead Follow-up 3',
          subject: 'Checking in again from {{agency_name}}',
          body: 'Hi {{client_name}}, checking in again. Reply anytime with questions or when you are ready for the next step.',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{client_name}}', '{{agency_name}}'],
          sequenceType: 'FollowUp3',
          gapDays: 7,
        },
        ...this.defaultExtendedFollowUpTemplates(common),
        {
          ...common,
          id: 'tenant-owner-feedback',
          name: 'Weekly Owner Feedback Summary',
          subject: 'Showing feedback for {{property_address}}',
          body: 'Positive feedback:\n{{positive_feedback}}\n\nNegative feedback:\n{{negative_feedback}}\n\nSummary:\n{{feedback_summary}}',
          channels: ['Email', 'SMS'],
          variableTokens: ['{{property_address}}', '{{positive_feedback}}', '{{negative_feedback}}', '{{feedback_summary}}'],
          audience: 'OwnerFeedback',
          sequenceType: 'Direct',
          gapDays: 0,
        },
      ],
    };
  }

  async integrationHealth(tenant: SaasTenant) {
    const status = await this.getIntegrations(tenant);
    const services = {
      communication: {
        configured: status.hasCommunicationConfig,
        ok: status.hasCommunicationConfig,
        message: status.hasCommunicationConfig
          ? 'Tenant communication credentials are configured.'
          : 'Not configured.',
      },
      email: {
        configured: status.hasSmtpConfig,
        ok: status.hasSmtpConfig,
        message: status.hasSmtpConfig
          ? 'Tenant email credentials are configured.'
          : 'Not configured.',
      },
      ai: {
        configured: status.hasAiProviderConfig,
        ok: status.hasAiProviderConfig,
        message: status.hasAiProviderConfig
          ? 'Tenant AI credentials are configured.'
          : 'Not configured.',
      },
    };
    const configured = Object.values(services).filter(
      (item) => item.configured,
    ).length;
    return {
      checkedAt: new Date().toISOString(),
      overall: configured ? 'healthy' : 'not_configured',
      services,
    };
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName)
      throw new BadRequestException('Tenant database is not ready');
    return tenant.databaseName;
  }
}
