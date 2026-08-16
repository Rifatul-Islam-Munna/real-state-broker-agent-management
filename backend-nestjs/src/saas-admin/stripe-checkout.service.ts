import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { DataSource, Repository } from 'typeorm';
import { sanitizePlainText } from '../security/input-sanitizer';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { SaasTenant } from './entities/saas-tenant.entity';
import { StripeCheckoutRecord } from './entities/stripe-checkout-record.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantSubscriptionService } from './tenant-subscription.service';

@Injectable()
export class StripeCheckoutService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StripeCheckoutRecord)
    private readonly records: Repository<StripeCheckoutRecord>,
    @InjectRepository(SubscriptionPlan)
    private readonly plans: Repository<SubscriptionPlan>,
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
    private readonly provisioning: TenantProvisioningService,
    private readonly subscriptions: TenantSubscriptionService,
    private readonly platformSettings: PlatformDomainService,
  ) {}

  async onModuleInit() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS saas_stripe_checkout_record (
        id varchar(36) PRIMARY KEY,
        kind varchar(20) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        plan_id integer NOT NULL,
        tenant_id integer NULL,
        amount_cents integer NOT NULL,
        currency varchar(3) NOT NULL,
        payload text NOT NULL,
        stripe_session_id varchar(255) NULL,
        stripe_payment_intent_id varchar(255) NULL,
        failure_reason text NULL,
        expires_at timestamptz NOT NULL,
        completed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_saas_stripe_checkout_session UNIQUE (stripe_session_id)
      )
    `);
  }

  async createPurchaseSession(dto: any) {
    const runtime = await this.platformSettings.getStripeRuntimeSettings();
    const stripe = this.stripeClient(runtime.secretKey);
    const plan = await this.requirePlan(dto.planId);
    const payload = await this.normalizePurchase(dto);
    const amountCents = this.toCents(plan.price);
    const record = await this.records.save(
      this.records.create({
        id: randomUUID(),
        kind: 'purchase',
        status: 'pending',
        planId: plan.id,
        tenantId: null,
        amountCents,
        currency: runtime.currency,
        payload,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        failureReason: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        completedAt: null,
      }),
    );

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: String(payload.email),
        client_reference_id: record.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: runtime.currency,
              unit_amount: amountCents,
              product_data: {
                name: `${plan.name} tenant subscription`,
                description: `${plan.billingDays} days of SaaS access`,
              },
            },
          },
        ],
        metadata: { checkoutRecordId: record.id, kind: 'purchase', planId: String(plan.id) },
        success_url: `${this.platformSettings.getMainFrontendUrl('/checkout/success')}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.platformSettings.getMainFrontendUrl('/register')}?plan=${plan.id}&checkout=cancelled`,
      });
      record.stripeSessionId = session.id;
      await this.records.save(record);
      return { sessionId: session.id, url: session.url };
    } catch (error) {
      record.status = 'failed';
      record.failureReason = error instanceof Error ? error.message : 'Stripe checkout creation failed';
      await this.records.save(record);
      throw error;
    }
  }

  async createRenewalSession(userId: number, planIdInput: unknown) {
    const runtime = await this.platformSettings.getStripeRuntimeSettings();
    const stripe = this.stripeClient(runtime.secretKey);
    const tenant = await this.tenants.findOne({ where: { ownerUserId: userId } });
    if (!tenant) throw new NotFoundException('Tenant account was not found');
    if (!tenant.databaseName || tenant.databaseStatus !== 'ready') {
      throw new ConflictException('Tenant database is not ready');
    }
    const plan = await this.requirePlan(planIdInput ?? tenant.planId);
    const amountCents = this.toCents(plan.price);
    const record = await this.records.save(
      this.records.create({
        id: randomUUID(),
        kind: 'renewal',
        status: 'pending',
        planId: plan.id,
        tenantId: tenant.id,
        amountCents,
        currency: runtime.currency,
        payload: { ownerUserId: userId },
        stripeSessionId: null,
        stripePaymentIntentId: null,
        failureReason: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        completedAt: null,
      }),
    );

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: record.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: runtime.currency,
              unit_amount: amountCents,
              product_data: {
                name: `${plan.name} subscription renewal`,
                description: `${plan.billingDays} days added to the tenant subscription`,
              },
            },
          },
        ],
        metadata: {
          checkoutRecordId: record.id,
          kind: 'renewal',
          planId: String(plan.id),
          tenantId: String(tenant.id),
        },
        success_url: `${this.platformSettings.getTenantFrontendUrl(tenant.subdomain, '/checkout/success')}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.platformSettings.getTenantFrontendUrl(tenant.subdomain, '/dashboard/subscription')}?checkout=cancelled`,
      });
      record.stripeSessionId = session.id;
      await this.records.save(record);
      return { sessionId: session.id, url: session.url };
    } catch (error) {
      record.status = 'failed';
      record.failureReason = error instanceof Error ? error.message : 'Stripe checkout creation failed';
      await this.records.save(record);
      throw error;
    }
  }

  async confirm(sessionIdInput: unknown) {
    const runtime = await this.platformSettings.getStripeRuntimeSettings();
    const stripe = this.stripeClient(runtime.secretKey);
    const sessionId = sanitizePlainText(sessionIdInput, 'Stripe session', 255, { required: true });
    if (!sessionId.startsWith('cs_')) throw new BadRequestException('Invalid Stripe checkout session');
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return this.processPaidSession(session);
  }

  async handleWebhook(rawBody: Buffer, signatureInput: unknown) {
    const runtime = await this.platformSettings.getStripeRuntimeSettings();
    if (!runtime.webhookSecret) throw new ServiceUnavailableException('Stripe webhook is not configured');
    const stripe = this.stripeClient(runtime.secretKey);
    const signature = sanitizePlainText(signatureInput, 'Stripe signature', 1000, { required: true });
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, runtime.webhookSecret);
    } catch {
      throw new BadRequestException('Stripe webhook signature is invalid');
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processPaidSession(session);
    }
    return { received: true };
  }

  private async processPaidSession(session: Stripe.Checkout.Session) {
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      throw new BadRequestException('Stripe payment has not completed');
    }

    const recordId = session.metadata?.checkoutRecordId || session.client_reference_id;
    if (!recordId) throw new BadRequestException('Stripe checkout metadata is missing');
    const record = await this.records.findOne({ where: { id: recordId } });
    if (!record || record.stripeSessionId !== session.id) {
      throw new BadRequestException('Stripe checkout does not match this application');
    }
    if (record.expiresAt.getTime() <= Date.now() && record.status !== 'completed') {
      throw new BadRequestException('Stripe checkout session has expired');
    }
    if (session.amount_total !== record.amountCents || session.currency?.toLowerCase() !== record.currency) {
      throw new BadRequestException('Stripe payment amount or currency does not match the selected plan');
    }
    if (Number(session.metadata?.planId) !== record.planId || session.metadata?.kind !== record.kind) {
      throw new BadRequestException('Stripe checkout metadata does not match the pending purchase');
    }

    if (record.status === 'completed') {
      return { completed: true, kind: record.kind, tenantId: record.tenantId };
    }

    const claimed = await this.records
      .createQueryBuilder()
      .update(StripeCheckoutRecord)
      .set({ status: 'processing', failureReason: null })
      .where('id = :id AND status IN (:...statuses)', { id: record.id, statuses: ['pending', 'failed'] })
      .execute();
    if (!claimed.affected) throw new ConflictException('Stripe checkout is already being processed');

    try {
      let tenantId: number;
      if (record.kind === 'purchase') {
        const result = await this.provisioning.provisionAfterSuccessfulPurchase({
          ...(record.payload as any),
          planId: record.planId,
          purchaseReference: session.id,
        });
        tenantId = result.tenant.id;
      } else {
        if (!record.tenantId) throw new BadRequestException('Renewal tenant is missing');
        const result = await this.subscriptions.renewByTenantId(record.tenantId, {
          planId: record.planId,
          purchaseReference: session.id,
        });
        tenantId = result.tenant.id;
      }

      record.status = 'completed';
      record.tenantId = tenantId;
      record.stripePaymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
      record.completedAt = new Date();
      record.failureReason = null;
      await this.records.save(record);
      return { completed: true, kind: record.kind, tenantId };
    } catch (error) {
      record.status = 'failed';
      record.failureReason = error instanceof Error ? error.message : 'Provisioning failed';
      await this.records.save(record);
      throw error;
    }
  }

  private async normalizePurchase(dto: any) {
    const businessName = sanitizePlainText(dto.businessName, 'Business name', 160, { required: true });
    const requestedSubdomain = sanitizePlainText(dto.requestedSubdomain, 'Subdomain', 63).toLowerCase() || null;
    const firstName = sanitizePlainText(dto.firstName, 'Owner first name', 60, { required: true });
    const lastName = sanitizePlainText(dto.lastName, 'Owner last name', 60, { required: true });
    const email = sanitizePlainText(dto.email, 'Email', 150, { required: true }).toLowerCase();
    const phone = sanitizePlainText(dto.phone, 'Phone', 30) || null;
    const password = `${dto.password ?? ''}`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address');
    if (password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    return {
      businessName,
      requestedSubdomain,
      firstName,
      lastName,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
    };
  }

  private async requirePlan(input: unknown) {
    const planId = Number(input);
    if (!Number.isInteger(planId) || planId < 1) throw new BadRequestException('Select a valid plan');
    const plan = await this.plans.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Selected subscription plan is unavailable');
    return plan;
  }

  private stripeClient(secretKey: string) {
    return new Stripe(secretKey);
  }

  private toCents(price: string) {
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Selected plan has an invalid price');
    return Math.round(amount * 100);
  }
}
