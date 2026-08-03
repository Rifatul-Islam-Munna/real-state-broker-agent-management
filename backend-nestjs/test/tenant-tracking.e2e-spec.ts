import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { TenantTrackingController } from '../src/saas-admin/tenant-tracking.controller';
import { TenantTrackingService } from '../src/saas-admin/tenant-tracking.service';

describe('Tenant GTM settings (e2e)', () => {
  let app: INestApplication;
  const service = { getForOwner: jest.fn(), save: jest.fn(), setEnabled: jest.fn(), remove: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantTrackingController],
      providers: [{ provide: TenantTrackingService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate(context: any) { context.switchToHttp().getRequest().user = { userId: 42, role: 'Agent', tenantRole: 'Owner' }; return true; } })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('covers read, save, toggle, and remove endpoints for the tenant owner', async () => {
    service.getForOwner.mockResolvedValue({ tenant: { id: 7 }, gtm: { containerId: null, enabled: false } });
    await request(app.getHttpServer()).get('/api/tenant-tracking').expect(200);
    expect(service.getForOwner).toHaveBeenCalledWith(42);

    service.save.mockResolvedValue({ gtm: { containerId: 'GTM-ABC1234', enabled: true } });
    await request(app.getHttpServer()).put('/api/tenant-tracking').send({ containerId: 'GTM-ABC1234', enabled: true }).expect(200);
    expect(service.save).toHaveBeenCalledWith(42, { containerId: 'GTM-ABC1234', enabled: true });

    service.setEnabled.mockResolvedValue({ gtm: { containerId: 'GTM-ABC1234', enabled: false } });
    await request(app.getHttpServer()).patch('/api/tenant-tracking/status').send({ enabled: false }).expect(200);
    expect(service.setEnabled).toHaveBeenCalledWith(42, false);

    service.remove.mockResolvedValue({ message: 'GTM container removed successfully' });
    await request(app.getHttpServer()).delete('/api/tenant-tracking').expect(200);
    expect(service.remove).toHaveBeenCalledWith(42);
  });
});
