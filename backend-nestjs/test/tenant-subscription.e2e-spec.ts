import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { TenantSubscriptionController } from '../src/saas-admin/tenant-subscription.controller';
import { TenantSubscriptionService } from '../src/saas-admin/tenant-subscription.service';

describe('Tenant subscription renewal (e2e)', () => {
  let app: INestApplication;
  const service = {
    getForOwner: jest.fn(),
    renewOrRepurchase: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantSubscriptionController],
      providers: [{ provide: TenantSubscriptionService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          context.switchToHttp().getRequest().user = { userId: 42, role: 'Agent', tenantRole: 'Owner' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('returns the existing tenant subscription and renews the same tenant', async () => {
    const subscription = {
      id: 7,
      ownerUserId: 42,
      databaseName: 'tenant_7_blue_realty',
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

    const renewed = {
      tenant: {
        ...subscription,
        planId: 2,
        subscriptionExpiresAt: '2026-09-29T00:00:00.000Z',
      },
      renewed: true,
      reactivated: false,
    };
    service.renewOrRepurchase.mockResolvedValue(renewed);

    const payload = { planId: 2, purchaseReference: 'PAY-RENEW-2026-1' };
    await request(app.getHttpServer())
      .post('/api/tenant-subscription/renew')
      .send(payload)
      .expect(201)
      .expect(renewed);

    expect(service.renewOrRepurchase).toHaveBeenCalledWith(42, payload);
  });
});
