import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { Repository } from 'typeorm';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';

@Injectable()
export class TenantIntegrationOAuthService {
  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  getGmailConnectUrl(tenant: SaasTenant, input: any = {}) {
    const clientId = this.text(process.env.GOOGLE_CLIENT_ID);
    const redirectUri = this.redirectUri();
    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID and TENANT_GOOGLE_GMAIL_REDIRECT_URI are required.',
      );
    }
    const state = this.signState({
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
      returnTo: this.safeReturnPath(input?.returnTo),
      issuedAt: Date.now(),
      nonce: randomUUID(),
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
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

  async completeGmailConnect(code: string, signedState: string) {
    if (!code) throw new BadRequestException('Missing Gmail authorization code.');
    const state = this.verifyState(signedState);
    const tenant = await this.tenantRepository.findOne({
      where: { id: Number(state.tenantId) },
    });
    if (
      !tenant ||
      !tenant.databaseName ||
      tenant.databaseStatus !== 'ready' ||
      `${tenant.subdomain}` !== `${state.subdomain}`
    ) {
      throw new NotFoundException('Tenant workspace was not found.');
    }

    const clientId = this.text(process.env.GOOGLE_CLIENT_ID);
    const clientSecret = this.text(process.env.GOOGLE_CLIENT_SECRET);
    const redirectUri = this.redirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Tenant Gmail OAuth is not configured.');
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
    const token: any = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) {
      throw new BadRequestException(
        this.text(token?.error_description, 'Gmail connection failed.'),
      );
    }
    const accessToken = this.text(token.access_token);
    const refreshToken = this.text(token.refresh_token);
    if (!accessToken || !refreshToken) {
      throw new BadRequestException(
        'Gmail did not return a refresh token. Reconnect and grant offline access.',
      );
    }

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const profile: any = profileResponse.ok
      ? await profileResponse.json().catch(() => ({}))
      : {};
    const email = this.text(profile.email);
    if (!email) throw new BadRequestException('Gmail account email was not returned.');

    await this.databases.withTenantClient(tenant.databaseName, (client) =>
      client.query(
        `INSERT INTO tenant_setting(key, value)
         VALUES ('outreach_email_provider', $1::jsonb)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [
          JSON.stringify({
            providerName: 'Gmail',
            authType: 'gmail-oauth',
            host: 'smtp.gmail.com',
            port: 587,
            username: email,
            password: '',
            fromEmail: email,
            fromName: this.text(profile.name),
            useSsl: true,
            enableInboxSync: true,
            syncIntervalMinutes: 5,
            maxMessagesPerSync: 100,
            gmailEmail: email,
            gmailAccessToken: accessToken,
            gmailRefreshToken: refreshToken,
            gmailTokenExpiresAt: new Date(
              Date.now() + (Number(token.expires_in) || 3600) * 1000,
            ).toISOString(),
            gmailLabelIds: ['INBOX'],
            updatedAt: new Date().toISOString(),
          }),
        ],
      ),
    );

    return this.platformDomain.getTenantFrontendUrl(
      tenant.subdomain,
      `${state.returnTo}${state.returnTo.includes('?') ? '&' : '?'}gmail=connected`,
    );
  }

  private signState(payload: any) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret())
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyState(value: string) {
    const [encoded, signature] = `${value ?? ''}`.split('.');
    if (!encoded || !signature) throw new BadRequestException('Invalid OAuth state.');
    const expected = createHmac('sha256', this.stateSecret())
      .update(encoded)
      .digest('base64url');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid OAuth state signature.');
    }
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid OAuth state payload.');
    }
    if (Date.now() - Number(payload.issuedAt) > 15 * 60 * 1000) {
      throw new BadRequestException('OAuth state has expired.');
    }
    return payload;
  }

  private stateSecret() {
    const secret = this.text(
      process.env.TENANT_OAUTH_STATE_SECRET,
      process.env.JWT_SECRET ?? '',
    );
    if (secret.length < 32) {
      throw new BadRequestException(
        'TENANT_OAUTH_STATE_SECRET must contain at least 32 characters.',
      );
    }
    return secret;
  }

  private redirectUri() {
    return this.text(
      process.env.TENANT_GOOGLE_GMAIL_REDIRECT_URI,
      process.env.GOOGLE_GMAIL_REDIRECT_URI ?? '',
    );
  }

  private safeReturnPath(value: any) {
    const path = this.text(value, '/dashboard/settings');
    return path.startsWith('/') && !path.startsWith('//')
      ? path.slice(0, 1000)
      : '/dashboard/settings';
  }

  private text(value: any, fallback = '') {
    const normalized = `${value ?? ''}`.trim();
    return normalized || fallback;
  }
}
