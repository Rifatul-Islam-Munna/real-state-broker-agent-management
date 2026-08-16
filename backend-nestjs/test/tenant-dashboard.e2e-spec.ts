import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { SaasTenant } from '../src/saas-admin/entities/saas-tenant.entity';
import { TenantContextService } from '../src/tenant-database/tenant-context.service';
import { TenantDatabaseService } from '../src/tenant-database/tenant-database.service';
import { AuthenticatedTenantGuard } from '../src/tenant-dashboard/authenticated-tenant.guard';
import { TenantDashboardController } from '../src/tenant-dashboard/tenant-dashboard.controller';
import { TenantDashboardService } from '../src/tenant-dashboard/tenant-dashboard.service';
import { TenantPlanPermissionGuard } from '../src/tenant-dashboard/tenant-plan-permission.guard';
import { TenantRealtorWorkflowService } from '../src/tenant-dashboard/tenant-realtor-workflow.service';

describe('Tenant dashboard access control (e2e)', () => {
  let app: INestApplication;
  let tenant: any;
  const dashboard = {
    context: jest.fn((value) => ({ tenant: value })),
    overview: jest.fn(async () => ({ metrics: {} })),
    profile: jest.fn(), updateProfile: jest.fn(), updateSubdomain: jest.fn(),
    listProperties: jest.fn(async () => []), createProperty: jest.fn(),
    listLeads: jest.fn(async () => []), createLead: jest.fn(),
  };
  const workflows = {
    listOwnerReports: jest.fn(async () => []), ownerReport: jest.fn(), sendOwnerReport: jest.fn(),
    listShowingTemplates: jest.fn(async () => []), createShowingTemplate: jest.fn(),
    listShowingRequests: jest.fn(async () => []), showingRequest: jest.fn(), createShowingRequest: jest.fn(),
    approveShowingRequest: jest.fn(), rejectShowingRequest: jest.fn(), listShowings: jest.fn(async () => []),
  };
  const repository = { findOne: jest.fn(async () => tenant) };
  const databases = { healthCheck: jest.fn(async () => true) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantDashboardController],
      providers: [
        AuthenticatedTenantGuard,
        TenantPlanPermissionGuard,
        Reflector,
        { provide: TenantDashboardService, useValue: dashboard },
        { provide: TenantRealtorWorkflowService, useValue: workflows },
        { provide: getRepositoryToken(SaasTenant), useValue: repository },
        { provide: TenantDatabaseService, useValue: databases },
        { provide: TenantContextService, useValue: { enter: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate(context: any) { context.switchToHttp().getRequest().user = { id: 42, userId: 42, tenantId: 7, role: 'Agent', email: 'owner@example.com', fullName: 'Tenant Owner' }; return true; } })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tenant = {
      id: 7, ownerUserId: 42, businessName: 'Blue Realty', databaseName: 'tenant_7_blue',
      databaseStatus: 'ready', provisioningStatus: 'ready', isActive: true, isBlocked: false,
      subscriptionExpiresAt: new Date(Date.now() + 86400000), dashboardPermissions: ['normal-dashboard'],
    };
  });
  afterAll(async () => { if (app) await app.close(); });

  it('resolves main-domain authenticated users to their own tenant context', async () => {
    await request(app.getHttpServer()).get('/api/tenant-dashboard/context').expect(200);
    expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
    expect(databases.healthCheck).toHaveBeenCalledWith('tenant_7_blue');
  });

  it('enforces plan permissions in the backend, not only in the UI', async () => {
    tenant.dashboardPermissions = [];
    await request(app.getHttpServer()).get('/api/tenant-dashboard/properties').expect(403);
    tenant.dashboardPermissions = ['normal-dashboard'];
    await request(app.getHttpServer()).get('/api/tenant-dashboard/properties').expect(200).expect([]);
  });

  it('rejects blocked and expired tenant access with clear messages', async () => {
    tenant.isBlocked = true;
    await request(app.getHttpServer()).get('/api/tenant-dashboard/context').expect(403).expect(({ body }) => {
      expect(body.message).toContain('blocked');
    });
    tenant.isBlocked = false;
    tenant.subscriptionExpiresAt = new Date(Date.now() - 1000);
    await request(app.getHttpServer()).get('/api/tenant-dashboard/context').expect(403).expect(({ body }) => {
      expect(body.message).toContain('expired');
    });
  });
});
