import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { SaasAdminAuditLog } from '../saas-admin/entities/saas-admin-audit-log.entity';
import { PlatformDomainSetting } from './platform-domain-setting.entity';

export type StripeRuntimeSettings = {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
  currency: string;
};

@Injectable()
export class PlatformDomainService implements OnModuleInit {
  private primaryDomain: string;

  constructor(
    @InjectRepository(PlatformDomainSetting)
    private readonly settings: Repository<PlatformDomainSetting>,
    @InjectRepository(SaasAdminAuditLog)
    private readonly audits: Repository<SaasAdminAuditLog>,
    private readonly config: ConfigService,
  ) {
    this.primaryDomain = this.normalize(config.get<string>('PRIMARY_DOMAIN') ?? 'localhost');
  }

  async onModuleInit() {
    const row = await this.settings.findOne({ where: { id: 1 } });
    if (row?.primaryDomain) this.primaryDomain = this.normalize(row.primaryDomain);
  }

  getPrimaryDomain() {
    return this.primaryDomain || 'localhost';
  }

  getMainFrontendUrl(path = '') {
    return this.frontendUrl(path);
  }

  getTenantFrontendUrl(subdomain: string, path = '') {
    const cleanSubdomain = this.normalizeSubdomain(subdomain);
    return this.frontendUrl(path, cleanSubdomain);
  }

  async getSettings() {
    const row = await this.settings.findOne({ where: { id: 1 } });
    if (row?.primaryDomain) this.primaryDomain = this.normalize(row.primaryDomain);
    return {
      primaryDomain: this.getPrimaryDomain(),
      frontendOrigin: this.frontendUrl(),
      updatedAt: row?.updatedAt ?? null,
      updatedByUserId: row?.updatedByUserId ?? null,
    };
  }

  async updatePrimaryDomain(rawDomain: string, actorUserId: number) {
    const primaryDomain = this.normalize(rawDomain);
    this.validate(primaryDomain);
    const row = await this.getOrCreateRow();
    row.primaryDomain = primaryDomain;
    row.updatedByUserId = actorUserId;
    const saved = await this.settings.save(row);
    this.primaryDomain = primaryDomain;
    await this.audit(
      'platform.domain.update',
      actorUserId,
      `Updated primary SaaS domain to ${primaryDomain}`,
      { primaryDomain },
    );
    return {
      primaryDomain,
      frontendOrigin: this.frontendUrl(),
      updatedAt: saved.updatedAt,
      updatedByUserId: saved.updatedByUserId,
    };
  }

  async getPaymentSettings() {
    const row = await this.settings.findOne({ where: { id: 1 } });
    const envSecret = this.clean(this.config.get<string>('STRIPE_SECRET_KEY'));
    const envWebhook = this.clean(this.config.get<string>('STRIPE_WEBHOOK_SECRET'));
    const envPublishable = this.clean(
      this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ??
        this.config.get<string>('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    );
    return {
      stripeSecretKeyConfigured: Boolean(row?.stripeSecretKeyEncrypted || envSecret),
      stripeSecretKeySource: row?.stripeSecretKeyEncrypted ? 'database' : envSecret ? 'environment' : 'none',
      stripeWebhookSecretConfigured: Boolean(row?.stripeWebhookSecretEncrypted || envWebhook),
      stripeWebhookSecretSource: row?.stripeWebhookSecretEncrypted ? 'database' : envWebhook ? 'environment' : 'none',
      stripePublishableKey: row?.stripePublishableKey || envPublishable,
      stripeCurrency: (row?.stripeCurrency || this.config.get<string>('STRIPE_CURRENCY') || 'usd').toLowerCase(),
    };
  }

  async updatePaymentSettings(dto: any, actorUserId: number) {
    const row = await this.getOrCreateRow();
    const secretKey = this.clean(dto?.stripeSecretKey);
    const webhookSecret = this.clean(dto?.stripeWebhookSecret);
    const publishableKey = this.clean(dto?.stripePublishableKey);
    const currency = this.clean(dto?.stripeCurrency || row.stripeCurrency || 'usd').toLowerCase();

    if (dto?.clearStripeSecretKey === true) row.stripeSecretKeyEncrypted = null;
    else if (secretKey) {
      if (!secretKey.startsWith('sk_')) throw new BadRequestException('Stripe secret key must start with sk_');
      row.stripeSecretKeyEncrypted = this.encrypt(secretKey);
    }

    if (dto?.clearStripeWebhookSecret === true) row.stripeWebhookSecretEncrypted = null;
    else if (webhookSecret) {
      if (!webhookSecret.startsWith('whsec_')) throw new BadRequestException('Stripe webhook signing secret must start with whsec_');
      row.stripeWebhookSecretEncrypted = this.encrypt(webhookSecret);
    }

    if (publishableKey) {
      if (!publishableKey.startsWith('pk_')) throw new BadRequestException('Stripe publishable key must start with pk_');
      row.stripePublishableKey = publishableKey;
    }
    if (!/^[a-z]{3}$/.test(currency)) throw new BadRequestException('Stripe currency must be a 3-letter code');
    row.stripeCurrency = currency;
    row.updatedByUserId = actorUserId;
    await this.settings.save(row);
    await this.audit(
      'platform.stripe.update',
      actorUserId,
      'Updated Stripe platform settings',
      {
        secretConfigured: Boolean(row.stripeSecretKeyEncrypted),
        webhookConfigured: Boolean(row.stripeWebhookSecretEncrypted),
        publishableConfigured: Boolean(row.stripePublishableKey),
        currency: row.stripeCurrency,
      },
    );
    return this.getPaymentSettings();
  }

  async getStripeRuntimeSettings(): Promise<StripeRuntimeSettings> {
    const row = await this.settings.findOne({ where: { id: 1 } });
    const secretKey = row?.stripeSecretKeyEncrypted
      ? this.decrypt(row.stripeSecretKeyEncrypted)
      : this.clean(this.config.get<string>('STRIPE_SECRET_KEY'));
    const webhookSecret = row?.stripeWebhookSecretEncrypted
      ? this.decrypt(row.stripeWebhookSecretEncrypted)
      : this.clean(this.config.get<string>('STRIPE_WEBHOOK_SECRET'));
    const publishableKey = row?.stripePublishableKey || this.clean(
      this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ??
        this.config.get<string>('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
    );
    const currency = (row?.stripeCurrency || this.clean(this.config.get<string>('STRIPE_CURRENCY')) || 'usd').toLowerCase();
    if (!secretKey) throw new ServiceUnavailableException('Stripe secret key is not configured');
    return { secretKey, webhookSecret, publishableKey, currency };
  }

  private async getOrCreateRow() {
    let row = await this.settings.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.settings.create({
        id: 1,
        primaryDomain: this.getPrimaryDomain(),
        stripeCurrency: 'usd',
        updatedByUserId: null,
      });
      row = await this.settings.save(row);
    }
    return row;
  }

  private encryptionKey() {
    const secret = this.clean(this.config.get<string>('PLATFORM_SETTINGS_ENCRYPTION_KEY')) || this.clean(this.config.get<string>('JWT_SECRET'));
    if (secret.length < 16) throw new ServiceUnavailableException('Configure PLATFORM_SETTINGS_ENCRYPTION_KEY or a strong JWT_SECRET');
    return createHash('sha256').update(secret).digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(value: string) {
    const [version, ivB64, tagB64, encryptedB64] = value.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !encryptedB64) {
      throw new ServiceUnavailableException('Stored platform secret is invalid');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private normalize(value: string) {
    return `${value ?? ''}`.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  }

  private clean(value: unknown) {
    return `${value ?? ''}`.trim();
  }
  private normalizeSubdomain(value: string) {
    const subdomain = this.clean(value).toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      throw new BadRequestException('Invalid tenant subdomain');
    }
    return subdomain;
  }

  private frontendUrl(path = '', subdomain?: string) {
    const configured = this.clean(
      this.config.get<string>('FRONTEND_URL') ??
        this.config.get<string>('APP_URL') ??
        'http://localhost:3000',
    );
    const url = new URL(configured);
    const primary = this.getPrimaryDomain();
    if (primary !== 'localhost' && this.config.get<string>('NODE_ENV') === 'production') {
      url.protocol = 'https:';
      url.port = '';
    }
    url.hostname = subdomain
      ? primary === 'localhost'
        ? `${subdomain}.localhost`
        : `${subdomain}.${primary}`
      : primary;
    url.pathname = path.startsWith('/') ? path : `/${path}`;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, path ? '' : '/');
  }
  private validate(hostname: string) {
    if (hostname === 'localhost') return;
    if (!hostname || hostname.length > 253 || /^[0-9.]+$/.test(hostname)) {
      throw new BadRequestException('Enter a valid primary domain');
    }
    const labels = hostname.split('.');
    if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
      throw new BadRequestException('Enter a valid primary domain such as example.com or test.example.com');
    }
  }

  private async audit(
    action: string,
    actorUserId: number,
    summary: string,
    metadata: Record<string, unknown>,
  ) {
    await this.audits.save(this.audits.create({
      action,
      entityType: 'platform-setting',
      entityId: 1,
      actorUserId,
      summary,
      metadata,
    }));
  }
}
