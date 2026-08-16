import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantResolutionService } from './tenant-resolution.service';

describe('TenantResolutionService', () => {
  const readyTenant = {
    id: 1,
    businessName: 'Blue Realty',
    slug: 'blue-realty',
    subdomain: 'blue',
    databaseName: 'tenant_1_blue_realty',
    dashboardPermissions: ['normal-dashboard'],
    provisioningStatus: 'ready',
    databaseStatus: 'ready',
    isActive: true,
    isBlocked: false,
    subscriptionExpiresAt: new Date(Date.now() + 86400000),
  };

  function service(result: any, domainResult: any = null) {
    return new TenantResolutionService(
      { findOne: jest.fn(async () => result) } as any,
      { findOne: jest.fn(async () => domainResult) } as any,
      { getPrimaryDomain: () => `${process.env.PRIMARY_DOMAIN ?? 'localhost'}` } as any,
    );
  }

  beforeEach(() => { process.env.PRIMARY_DOMAIN = 'example.com'; });
  afterEach(() => { delete process.env.PRIMARY_DOMAIN; });

  it('keeps the primary domain separate and extracts one assigned subdomain', () => {
    const resolver = service(null);
    expect(resolver.isMainDomain('example.com:443')).toBe(true);
    expect(resolver.isMainDomain('www.example.com')).toBe(true);
    expect(resolver.extractSubdomain('blue.example.com')).toBe('blue');
    expect(resolver.extractSubdomain('nested.blue.example.com')).toBeNull();
  });

  it('supports local subdomains such as blue.localhost:3000', () => {
    process.env.PRIMARY_DOMAIN = 'localhost';
    const resolver = service(null);
    expect(resolver.extractSubdomain('blue.localhost:3000')).toBe('blue');
    expect(resolver.isMainDomain('localhost:3000')).toBe(true);
  });

  it('supports a delegated root such as test.mydomain.com', () => {
    process.env.PRIMARY_DOMAIN = 'test.mydomain.com';
    const resolver = service(null);
    expect(resolver.isMainDomain('test.mydomain.com')).toBe(true);
    expect(resolver.extractSubdomain('rifat.test.mydomain.com')).toBe('rifat');
    expect(resolver.extractSubdomain('nested.rifat.test.mydomain.com')).toBeNull();
  });

  it('resolves a ready tenant to its database registry record', async () => {
    await expect(service(readyTenant).resolveAssignedSubdomain('blue.example.com')).resolves.toMatchObject({
      id: 1,
      databaseName: 'tenant_1_blue_realty',
      subdomain: 'blue',
    });
  });

  it('routes a verified custom domain to the same tenant database as its assigned subdomain', async () => {
    const resolver = service(readyTenant, { tenantId: 1, hostname: 'www.blue-realty.com', type: 'custom', status: 'verified' });
    await expect(resolver.resolveHostname('www.blue-realty.com')).resolves.toMatchObject({
      id: 1,
      databaseName: 'tenant_1_blue_realty',
      subdomain: 'blue',
    });
    await expect(resolver.resolveHostname('blue.example.com')).resolves.toMatchObject({ databaseName: 'tenant_1_blue_realty' });
  });

  it('rejects unknown custom domains', async () => {
    await expect(service(readyTenant, null).resolveHostname('unknown-business.com')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects unknown, blocked, inactive, unavailable, and expired tenants', async () => {
    await expect(service(null).resolveAssignedSubdomain('missing.example.com')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service({ ...readyTenant, isBlocked: true }).resolveAssignedSubdomain('blue.example.com')).rejects.toThrow('blocked');
    await expect(service({ ...readyTenant, isActive: false }).resolveAssignedSubdomain('blue.example.com')).rejects.toThrow('inactive');
    await expect(service({ ...readyTenant, databaseStatus: 'failed' }).resolveAssignedSubdomain('blue.example.com')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service({ ...readyTenant, subscriptionExpiresAt: new Date(Date.now() - 1000) }).resolveAssignedSubdomain('blue.example.com')).rejects.toThrow('expired');
  });
});
