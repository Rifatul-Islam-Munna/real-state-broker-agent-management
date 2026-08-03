import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicSaasController } from '../src/saas-admin/public-saas.controller';
import { SaasAdminService } from '../src/saas-admin/saas-admin.service';
import { TenantProvisioningService } from '../src/saas-admin/tenant-provisioning.service';
import { IdempotencyService } from '../src/security/idempotency.service';

describe('Public SaaS plans (e2e)', () => {
  let app: INestApplication;
  const service = { listActivePublicPlans: jest.fn() };
  const provisioning = { provisionAfterSuccessfulPurchase: jest.fn() };
  const idempotency = { execute: jest.fn(async (_scope: string, _key: string, _payload: unknown, work: () => Promise<any>) => work()) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicSaasController],
      providers: [
        { provide: SaasAdminService, useValue: service },
        { provide: TenantProvisioningService, useValue: provisioning },
        { provide: IdempotencyService, useValue: idempotency },
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

    await request(app.getHttpServer())
      .get('/api/public-saas/plans')
      .expect(200)
      .expect(plans);

    expect(service.listActivePublicPlans).toHaveBeenCalledTimes(1);
  });

  it('creates a tenant only through the successful purchase provisioning flow', async () => {
    const result = {
      tenant: {
        id: 22,
        businessName: 'Blue Horizon Realty',
        slug: 'blue-horizon-realty',
        subdomain: 'blue-horizon-realty',
        planId: 1,
        dashboardPermissions: ['normal-dashboard'],
        subscriptionStartsAt: '2026-07-31T00:00:00.000Z',
        subscriptionExpiresAt: '2026-08-30T00:00:00.000Z',
        databaseName: 'tenant_22_blue_horizon_realty',
      },
      owner: { id: 11 },
    };
    provisioning.provisionAfterSuccessfulPurchase.mockResolvedValue(result);
    const payload = {
      businessName: 'Blue Horizon Realty',
      planId: 1,
      firstName: 'Asha',
      lastName: 'Rahman',
      email: 'asha@example.com',
      password: 'StrongPass123',
      purchaseReference: 'PAY-2026-001',
    };

    const response = await request(app.getHttpServer())
      .post('/api/public-saas/purchase')
      .set('Idempotency-Key', 'PAY-2026-001')
      .send(payload)
      .expect(201);

    expect(response.body.tenant).toMatchObject({
      id: 22,
      businessName: 'Blue Horizon Realty',
      slug: 'blue-horizon-realty',
      subdomain: 'blue-horizon-realty',
      planId: 1,
    });
    expect(response.body.tenant).not.toHaveProperty('databaseName');
    expect(idempotency.execute).toHaveBeenCalledWith('tenant-purchase', 'PAY-2026-001', payload, expect.any(Function));
    expect(provisioning.provisionAfterSuccessfulPurchase).toHaveBeenCalledWith(payload);
  });
});
