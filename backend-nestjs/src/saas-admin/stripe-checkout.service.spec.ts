import { BadRequestException } from '@nestjs/common';
import { StripeCheckoutService } from './stripe-checkout.service';

function setup(status: 'paid' | 'unpaid' = 'paid', recordStatus: 'pending' | 'completed' = 'pending') {
  const record: any = {
    id: 'record-1',
    kind: 'purchase',
    status: recordStatus,
    planId: 2,
    tenantId: recordStatus === 'completed' ? 99 : null,
    amountCents: 2500,
    currency: 'usd',
    payload: { businessName: 'Blue Realty', email: 'owner@example.com', passwordHash: '$2b$10$abcdefghijklmnopqrstuv' },
    stripeSessionId: 'cs_test_123',
    stripePaymentIntentId: null,
    failureReason: null,
    expiresAt: new Date(Date.now() + 60000),
    completedAt: null,
  };
  const records: any = {
    findOne: jest.fn(async () => record),
    save: jest.fn(async (value: any) => value),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    })),
  };
  const provisioning: any = { provisionAfterSuccessfulPurchase: jest.fn(async () => ({ tenant: { id: 99 } })) };
  const platformSettings = {
    getStripeRuntimeSettings: jest.fn(async () => ({
      secretKey: 'sk_test_example',
      webhookSecret: 'whsec_test_example',
      publishableKey: 'pk_test_example',
      currency: 'usd',
    })),
    getMainFrontendUrl: jest.fn((path: string) => `http://localhost:3000${path}`),
    getTenantFrontendUrl: jest.fn((subdomain: string, path: string) => `http://${subdomain}.localhost:3000${path}`),
  };
  const service = new StripeCheckoutService(
    { query: jest.fn() } as any,
    records,
    {} as any,
    {} as any,
    provisioning,
    { renewByTenantId: jest.fn() } as any,
    platformSettings as any,
  );
  const paidSession = {
    id: 'cs_test_123',
    status: 'complete',
    payment_status: status,
    amount_total: 2500,
    currency: 'usd',
    metadata: { checkoutRecordId: 'record-1', kind: 'purchase', planId: '2' },
    client_reference_id: 'record-1',
    payment_intent: 'pi_test_123',
  };
  (service as any).stripeClient = jest.fn(() => ({
    checkout: {
      sessions: {
        retrieve: jest.fn(async () => paidSession),
      },
    },
    webhooks: {
      constructEvent: jest.fn(() => ({
        type: 'checkout.session.completed',
        data: { object: paidSession },
      })),
    },
  }));
  return { service, records, provisioning, record };
}

describe('StripeCheckoutService', () => {
  it('provisions only after Stripe reports a paid completed session', async () => {
    const { service, provisioning, record } = setup();
    await expect(service.confirm('cs_test_123')).resolves.toEqual({ completed: true, kind: 'purchase', tenantId: 99 });
    expect(provisioning.provisionAfterSuccessfulPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ planId: 2, purchaseReference: 'cs_test_123' }),
    );
    expect(record.status).toBe('completed');
    expect(record.stripePaymentIntentId).toBe('pi_test_123');
  });

  it('rejects an unpaid Stripe session', async () => {
    const { service, provisioning } = setup('unpaid');
    await expect(service.confirm('cs_test_123')).rejects.toBeInstanceOf(BadRequestException);
    expect(provisioning.provisionAfterSuccessfulPurchase).not.toHaveBeenCalled();
  });

  it('returns the previous result without provisioning a completed checkout twice', async () => {
    const { service, provisioning } = setup('paid', 'completed');
    await expect(service.confirm('cs_test_123')).resolves.toEqual({ completed: true, kind: 'purchase', tenantId: 99 });
    expect(provisioning.provisionAfterSuccessfulPurchase).not.toHaveBeenCalled();
  });

  it('automatically provisions from a verified Stripe webhook', async () => {
    const { service, provisioning } = setup();
    await expect(service.handleWebhook(Buffer.from('{}'), 'valid-signature')).resolves.toEqual({ received: true });
    expect(provisioning.provisionAfterSuccessfulPurchase).toHaveBeenCalledTimes(1);
  });
});
