import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { PublicAccess, PublicAccessDocument } from '../schemas/public-access.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PublicAccess.name) private readonly links: Model<PublicAccessDocument>,
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}

  async createCheckout(token: string, input: { successUrl: string; cancelUrl: string }) {
    const { link, record } = await this.resolve(token);
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secret) throw new BadRequestException('Stripe checkout is not configured.');
    if (!record.amount || record.amount <= 0) throw new BadRequestException('A positive billing amount is required.');
    if (record.status === 'Paid') throw new BadRequestException('This bill is already paid.');

    const paymentToken = randomUUID();
    const successUrl = this.withParams(input.successUrl, {
      session_id: '{CHECKOUT_SESSION_ID}',
      payment_token: paymentToken,
    });
    const cancelUrl = this.withParams(input.cancelUrl, { payment_cancelled: '1' });
    const currency = (this.config.get<string>('STRIPE_DEFAULT_CURRENCY') ?? 'usd').toLowerCase();
    const body = new URLSearchParams();
    body.append('mode', 'payment');
    body.append('success_url', successUrl);
    body.append('cancel_url', cancelUrl);
    body.append('line_items[0][price_data][currency]', currency);
    body.append('line_items[0][price_data][product_data][name]', record.title);
    body.append('line_items[0][price_data][product_data][description]', record.description ?? '');
    body.append('line_items[0][price_data][unit_amount]', String(Math.round(record.amount * 100)));
    body.append('line_items[0][quantity]', '1');
    if (link.recipientEmail) body.append('customer_email', link.recipientEmail);
    body.append('invoice_creation[enabled]', 'true');
    body.append('metadata[recordId]', String(record._id));
    body.append('metadata[publicAccessId]', String(link._id));
    body.append('metadata[source]', 'property_operations_qr');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const session = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException(String((session.error as any)?.message ?? 'Stripe checkout failed.'));

    link.paymentToken = paymentToken;
    link.stripeCheckoutSessionId = String(session.id ?? '');
    link.stripeCheckoutStatus = String(session.status ?? 'open');
    await link.save();
    record.payload = { ...record.payload, stripeCheckoutSessionId: link.stripeCheckoutSessionId, paymentMode: 'stripe_public_qr' };
    await record.save();
    await this.activity.add({ workspaceId: link.workspaceId, moduleKey: 'billing', action: 'public-checkout-created', entityType: 'Record', entityId: String(record._id), actorType: 'External', summary: `Checkout created for ${record.title}.`, metadata: { amount: record.amount, currency } });
    return { checkoutUrl: session.url, sessionId: session.id, paymentToken, recordId: String(record._id) };
  }

  async verifyCheckout(token: string, input: { sessionId: string; paymentToken: string }) {
    const { link, record } = await this.resolve(token, false);
    if (!link.paymentToken || link.paymentToken !== input.paymentToken) throw new BadRequestException('Payment token is invalid.');
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secret) throw new BadRequestException('Stripe checkout is not configured.');
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(input.sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const session = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException(String((session.error as any)?.message ?? 'Payment verification failed.'));

    link.stripeCheckoutStatus = String(session.status ?? link.stripeCheckoutStatus);
    link.stripeCheckoutSessionId = String(session.id ?? link.stripeCheckoutSessionId);
    link.stripePaymentIntentId = String(session.payment_intent ?? '');
    const paid = session.payment_status === 'paid';
    if (paid) {
      record.status = 'Paid';
      record.completedAt = new Date();
      record.payload = { ...record.payload, stripePaymentIntentId: link.stripePaymentIntentId, paidAt: new Date().toISOString() };
      link.status = 'Completed';
      link.completedAt = new Date();
      link.paymentVerifiedAt = new Date();
    }
    await Promise.all([link.save(), record.save()]);
    await this.activity.add({ workspaceId: link.workspaceId, moduleKey: 'billing', action: paid ? 'public-payment-verified' : 'public-payment-pending', entityType: 'Record', entityId: String(record._id), actorType: 'External', summary: paid ? `${record.title} payment verified.` : `${record.title} payment remains pending.`, metadata: { sessionId: input.sessionId, paymentStatus: session.payment_status } });
    return { paid, paymentStatus: session.payment_status ?? null, record: { id: String(record._id), title: record.title, amount: record.amount, status: record.status } };
  }

  private async resolve(token: string, requireActive = true) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await this.links.findOne({ tokenHash });
    if (!link) throw new NotFoundException('This payment link is invalid.');
    if (link.status === 'Revoked' || link.expiresAt.getTime() <= Date.now()) throw new GoneException('This payment link is no longer active.');
    if (requireActive && link.status === 'Completed') throw new GoneException('This payment has already been completed.');
    if (!link.recordId) throw new BadRequestException('This request is not linked to a billing record.');
    const record = await this.records.findById(link.recordId);
    if (!record) throw new NotFoundException('The linked billing record was not found.');
    if (!['billing', 'finance'].includes(record.moduleKey)) throw new BadRequestException('Only billing or finance records can be paid.');
    return { link, record };
  }

  private withParams(url: string, params: Record<string, string>) {
    const parsed = new URL(url);
    for (const [key, value] of Object.entries(params)) parsed.searchParams.set(key, value);
    return parsed.toString().replace(encodeURIComponent('{CHECKOUT_SESSION_ID}'), '{CHECKOUT_SESSION_ID}');
  }
}
