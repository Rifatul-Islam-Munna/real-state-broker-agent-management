import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicSaasController } from '../src/saas-admin/public-saas.controller';
import { SaasAdminService } from '../src/saas-admin/saas-admin.service';
import { StripeCheckoutService } from '../src/saas-admin/stripe-checkout.service';
import { PlatformDomainService } from '../src/platform-domain/platform-domain.service';

describe('Public SaaS checkout (e2e)', () => {
  let app: INestApplication;
  const service = { listActivePublicPlans: jest.fn() };
  const platformDomain = { getPrimaryDomain: jest.fn(() => 'example.com') };
  const stripe = {
    createPurchaseSession: jest.fn(),
    confirm: jest.fn(),
    handleWebhook: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicSaasController],
      providers: [
        { provide: SaasAdminService, useValue: service },
        { provide: StripeCheckoutService, useValue: stripe },
        { provide: PlatformDomainService, useValue: platformDomain },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('returns active plans publicly without authentication', async () => {
    const plans = [
      {
        id: 1,
        name: 'Complete',
        price: '99.00',
        billingDays: 30,
        dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'],
        isActive: true,
      },
    ];
    service.listActivePublicPlans.mockResolvedValue(plans);

    await request(app.getHttpServer()).get('/api/public-saas/plans').expect(200).expect(plans);
    expect(service.listActivePublicPlans).toHaveBeenCalledTimes(1);
  });

  it('starts Stripe Checkout instead of trusting a browser purchase reference', async () => {
    const payload = {
      businessName: 'Blue Horizon Realty',
      planId: 1,
      firstName: 'Asha',
      lastName: 'Rahman',
      email: 'asha@example.com',
      password: 'StrongPass123!',
    };
    stripe.createPurchaseSession.mockResolvedValue({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/c/pay/cs_test_123',
    });

    await request(app.getHttpServer())
      .post('/api/public-saas/checkout-session')
      .send(payload)
      .expect(201)
      .expect({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' });

    expect(stripe.createPurchaseSession).toHaveBeenCalledWith(payload);
  });

  it('confirms a paid Stripe session through the server-side verifier', async () => {
    stripe.confirm.mockResolvedValue({ completed: true, kind: 'purchase', tenantId: 22 });

    await request(app.getHttpServer())
      .post('/api/public-saas/checkout-confirm')
      .send({ sessionId: 'cs_test_123' })
      .expect(200)
      .expect({ completed: true, kind: 'purchase', tenantId: 22 });

    expect(stripe.confirm).toHaveBeenCalledWith('cs_test_123');
  });
});
