import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { TenantDomainController } from '../src/saas-admin/tenant-domain.controller';
import { TenantDomainService } from '../src/saas-admin/tenant-domain.service';

describe('Tenant custom-domain management (e2e)', () => {
  let app: INestApplication;
  const service = {
    getForOwner: jest.fn(),
    addOrReplace: jest.fn(),
    verify: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantDomainController],
      providers: [{ provide: TenantDomainService, useValue: service }],
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

  it('covers read, add/replace, verify, and remove endpoints for the signed-in tenant owner', async () => {
    const settings = {
      tenant: { id: 7, businessName: 'Blue Realty', subdomain: 'blue' },
      customDomain: null,
      instructions: null,
    };
    service.getForOwner.mockResolvedValue(settings);
    await request(app.getHttpServer()).get('/api/tenant-domain').expect(200).expect(settings);
    expect(service.getForOwner).toHaveBeenCalledWith(42);

    const pending = {
      customDomain: { id: 1, hostname: 'www.blue-realty.com', status: 'pending' },
      instructions: {
        verification: { type: 'TXT', name: '_estateblue-verification.www.blue-realty.com', value: 'estateblue-token' },
        routing: { type: 'CNAME', name: 'www.blue-realty.com', value: 'blue.example.com' },
      },
    };
    service.addOrReplace.mockResolvedValue(pending);
    await request(app.getHttpServer())
      .put('/api/tenant-domain')
      .send({ hostname: 'www.blue-realty.com' })
      .expect(200)
      .expect(pending);
    expect(service.addOrReplace).toHaveBeenCalledWith(42, 'www.blue-realty.com');

    const verified = { ...pending, customDomain: { ...pending.customDomain, status: 'verified' } };
    service.verify.mockResolvedValue(verified);
    await request(app.getHttpServer()).post('/api/tenant-domain/verify').expect(201).expect(verified);
    expect(service.verify).toHaveBeenCalledWith(42);

    service.remove.mockResolvedValue({ message: 'Custom domain removed successfully' });
    await request(app.getHttpServer())
      .delete('/api/tenant-domain')
      .expect(200)
      .expect({ message: 'Custom domain removed successfully' });
    expect(service.remove).toHaveBeenCalledWith(42);
  });
});
