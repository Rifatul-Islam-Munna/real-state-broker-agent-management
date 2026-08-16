import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SaasAdminController } from '../src/saas-admin/saas-admin.controller';
import { SaasAdminService } from '../src/saas-admin/saas-admin.service';
import { TenantProvisioningService } from '../src/saas-admin/tenant-provisioning.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PlatformDomainService } from '../src/platform-domain/platform-domain.service';

describe('SaaS Super Admin management endpoints (e2e)', () => {
  let app: INestApplication;

  const provisioning = { provisionManually: jest.fn() };
  const platformDomain = {
    getSettings: jest.fn(),
    updatePrimaryDomain: jest.fn(),
    getPaymentSettings: jest.fn(),
    updatePaymentSettings: jest.fn(),
  };

  const service = {
    listPlans: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    setPlanActive: jest.fn(),
    deletePlan: jest.fn(),
    listTenants: jest.fn(),
    setTenantBlocked: jest.fn(),
    extendTenantSubscription: jest.fn(),
    listAuditLogs: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SaasAdminController],
      providers: [
        { provide: SaasAdminService, useValue: service },
        { provide: TenantProvisioningService, useValue: provisioning },
        { provide: PlatformDomainService, useValue: platformDomain },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: any) {
          context.switchToHttp().getRequest().user = { userId: 77, role: 'Admin' };
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

  it('covers plan list, create, edit, activate/deactivate, and delete endpoints', async () => {
    const plan = {
      id: 1,
      name: 'Growth',
      price: '49.00',
      billingDays: 30,
      dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'],
      isActive: true,
    };
    service.listPlans.mockResolvedValue([plan]);
    service.createPlan.mockResolvedValue(plan);
    service.updatePlan.mockResolvedValue({ ...plan, name: 'Growth Plus' });
    service.setPlanActive.mockResolvedValue({ ...plan, isActive: false });
    service.deletePlan.mockResolvedValue({ message: 'Plan deleted successfully' });

    await request(app.getHttpServer()).get('/api/super-admin-management/plans').expect(200).expect([plan]);

    await request(app.getHttpServer())
      .post('/api/super-admin-management/plans')
      .send({
        name: 'Growth',
        price: 49,
        billingDays: 30,
        dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'],
      })
      .expect(201)
      .expect(plan);

    expect(service.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Growth',
        dashboardPermissions: ['normal-dashboard', 'property-management-dashboard'],
      }),
      77,
    );

    const updatedResponse = await request(app.getHttpServer())
      .patch('/api/super-admin-management/plans/1')
      .send({ ...plan, name: 'Growth Plus' })
      .expect(200);
    expect(updatedResponse.body).toMatchObject({ name: 'Growth Plus' });

    const statusResponse = await request(app.getHttpServer())
      .patch('/api/super-admin-management/plans/1/status')
      .send({ isActive: false })
      .expect(200);
    expect(statusResponse.body).toMatchObject({ isActive: false });

    await request(app.getHttpServer())
      .delete('/api/super-admin-management/plans/1')
      .expect(200)
      .expect({ message: 'Plan deleted successfully' });

    expect(service.updatePlan).toHaveBeenCalledWith(1, expect.any(Object), 77);
    expect(service.setPlanActive).toHaveBeenCalledWith(1, false, 77);
    expect(service.deletePlan).toHaveBeenCalledWith(1, 77);
  });

  it('covers tenant listing, subscription visibility, block/unblock, and extension endpoints', async () => {
    const tenant = {
      id: 4,
      businessName: 'Blue Homes',
      slug: 'blue-homes',
      isBlocked: false,
      isActive: true,
      subscriptionStartsAt: '2026-07-01T00:00:00.000Z',
      subscriptionExpiresAt: '2026-08-01T00:00:00.000Z',
      plan: { id: 1, name: 'Growth' },
    };
    service.listTenants.mockResolvedValue([tenant]);
    service.setTenantBlocked.mockResolvedValue({ ...tenant, isBlocked: true, isActive: false });
    service.extendTenantSubscription.mockResolvedValue({
      ...tenant,
      subscriptionExpiresAt: '2026-08-31T00:00:00.000Z',
    });

    const list = await request(app.getHttpServer())
      .get('/api/super-admin-management/tenants')
      .expect(200);

    expect(list.body[0]).toMatchObject({
      businessName: 'Blue Homes',
      subscriptionStartsAt: tenant.subscriptionStartsAt,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt,
      plan: { name: 'Growth' },
    });

    const blockedResponse = await request(app.getHttpServer())
      .patch('/api/super-admin-management/tenants/4/block')
      .send({ isBlocked: true })
      .expect(200);
    expect(blockedResponse.body).toMatchObject({ isBlocked: true, isActive: false });

    await request(app.getHttpServer())
      .patch('/api/super-admin-management/tenants/4/block')
      .send({ isBlocked: false })
      .expect(200);

    const extensionResponse = await request(app.getHttpServer())
      .patch('/api/super-admin-management/tenants/4/extend')
      .send({ days: 30 })
      .expect(200);
    expect(extensionResponse.body).toMatchObject({ subscriptionExpiresAt: '2026-08-31T00:00:00.000Z' });

    expect(service.setTenantBlocked).toHaveBeenNthCalledWith(1, 4, true, 77);
    expect(service.setTenantBlocked).toHaveBeenNthCalledWith(2, 4, false, 77);
    expect(service.extendTenantSubscription).toHaveBeenCalledWith(4, 30, 77);
  });

  it('covers platform domain and Stripe settings endpoints without exposing secrets', async () => {
    platformDomain.getSettings.mockResolvedValue({ primaryDomain: 'test.mydomain.com' });
    platformDomain.getPaymentSettings.mockResolvedValue({
      stripeSecretKeyConfigured: true,
      stripeSecretKeySource: 'database',
      stripeWebhookSecretConfigured: true,
      stripeWebhookSecretSource: 'database',
      stripePublishableKey: 'pk_test_public',
      stripeCurrency: 'usd',
    });
    platformDomain.updatePaymentSettings.mockResolvedValue({ stripeSecretKeyConfigured: true, stripeCurrency: 'usd' });

    await request(app.getHttpServer())
      .get('/api/super-admin-management/platform-domain')
      .expect(200)
      .expect({ primaryDomain: 'test.mydomain.com' });

    const payment = await request(app.getHttpServer())
      .get('/api/super-admin-management/payment-settings')
      .expect(200);
    expect(payment.body).not.toHaveProperty('stripeSecretKey');
    expect(payment.body).not.toHaveProperty('stripeWebhookSecret');

    await request(app.getHttpServer())
      .patch('/api/super-admin-management/payment-settings')
      .send({ stripeSecretKey: 'sk_test_new', stripeWebhookSecret: 'whsec_new', stripeCurrency: 'usd' })
      .expect(200);
    expect(platformDomain.updatePaymentSettings).toHaveBeenCalledWith(expect.objectContaining({ stripeSecretKey: 'sk_test_new' }), 77);
  });

  it('covers the administrative audit-log endpoint', async () => {
    const logs = [
      {
        id: 9,
        action: 'tenant.subscription.extend',
        entityType: 'tenant',
        entityId: 4,
        actorUserId: 77,
        summary: 'Extended Blue Homes subscription by 30 days',
      },
    ];
    service.listAuditLogs.mockResolvedValue(logs);

    await request(app.getHttpServer())
      .get('/api/super-admin-management/audit-logs')
      .expect(200)
      .expect(logs);
  });
});
