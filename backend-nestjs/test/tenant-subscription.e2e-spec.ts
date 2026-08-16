import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { TenantSubscriptionController } from '../src/saas-admin/tenant-subscription.controller';
import { TenantSubscriptionService } from '../src/saas-admin/tenant-subscription.service';
import { StripeCheckoutService } from '../src/saas-admin/stripe-checkout.service';
import { TenantRoleGuard } from '../src/security/tenant-role.guard';

describe('Tenant subscription renewal (e2e)', () => {
  let app: INestApplication;
  const service = { getForOwner: jest.fn() };
  const stripe = { createRenewalSession: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantSubscriptionController],
      providers: [
        { provide: TenantSubscriptionService, useValue: service },
        { provide: StripeCheckoutService, useValue: stripe },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          context.switchToHttp().getRequest().user = {
            userId: 42,
            role: 'Agent',
            tenantId: 7,
            tenantRole: 'Owner',
          };
          return true;
        },
      })
      .overrideGuard(TenantRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('returns the existing tenant subscription and starts Stripe renewal for the same owner', async () => {
    const subscription = {
      id: 7,
      ownerUserId: 42,
      planId: 1,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: '2026-08-30T00:00:00.000Z',
    };
    service.getForOwner.mockResolvedValue(subscription);

    await request(app.getHttpServer())
      .get('/api/tenant-subscription')
      .expect(200)
      .expect(subscription);
    expect(service.getForOwner).toHaveBeenCalledWith(42);

    stripe.createRenewalSession.mockResolvedValue({
      sessionId: 'cs_test_renewal',
      url: 'https://checkout.stripe.com/c/pay/cs_test_renewal',
    });

    await request(app.getHttpServer())
      .post('/api/tenant-subscription/checkout-session')
      .send({ planId: 2 })
      .expect(201)
      .expect({
        sessionId: 'cs_test_renewal',
        url: 'https://checkout.stripe.com/c/pay/cs_test_renewal',
      });

    expect(stripe.createRenewalSession).toHaveBeenCalledWith(42, 2);
  });
});
