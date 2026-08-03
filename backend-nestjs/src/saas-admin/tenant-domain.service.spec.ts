jest.mock('node:dns', () => ({ promises: { resolveTxt: jest.fn() } }));

import { promises as dns } from 'node:dns';
import { TenantDomainService } from './tenant-domain.service';

function repo<T extends Record<string, any>>(rows: T[] = []) {
  return {
    rows,
    findOne: jest.fn(async ({ where }: any) => rows.find((row: any) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null),
    create: jest.fn((value: any) => ({ ...value })),
    save: jest.fn(async (value: any) => {
      if (!value.id) value.id = rows.length ? Math.max(...rows.map((row: any) => row.id ?? 0)) + 1 : 1;
      const index = rows.findIndex((row: any) => row.id === value.id);
      if (index >= 0) rows[index] = value; else rows.push(value);
      return value;
    }),
    remove: jest.fn(async (value: any) => {
      const index = rows.indexOf(value);
      if (index >= 0) rows.splice(index, 1);
      return value;
    }),
  };
}

describe('TenantDomainService', () => {
  const tenant = {
    id: 7,
    ownerUserId: 42,
    businessName: 'Blue Realty',
    subdomain: 'blue',
    slug: 'blue-realty',
    databaseName: 'tenant_7_blue_realty',
    databaseStatus: 'ready',
    provisioningStatus: 'ready',
    isActive: true,
    isBlocked: false,
    dashboardPermissions: ['normal-dashboard'],
    subscriptionExpiresAt: new Date(Date.now() + 86400000),
  };

  beforeEach(() => {
    process.env.PRIMARY_DOMAIN = 'example.com';
    jest.clearAllMocks();
  });

  afterEach(() => delete process.env.PRIMARY_DOMAIN);

  function service(domainRows: any[] = [], tenants = [tenant]) {
    const tenantRepo = repo<any>(tenants);
    const domainRepo = repo<any>(domainRows);
    const auditRepo = repo<any>();
    return { service: new TenantDomainService(tenantRepo as any, domainRepo as any, auditRepo as any), tenantRepo, domainRepo, auditRepo };
  }

  it('adds a pending custom domain and returns TXT/CNAME DNS instructions', async () => {
    const setup = service();
    const result = await setup.service.addOrReplace(42, 'https://www.blue-realty.com/path');

    expect(result.customDomain).toMatchObject({ tenantId: 7, hostname: 'www.blue-realty.com', status: 'pending', type: 'custom' });
    expect(result.instructions.verification).toMatchObject({ type: 'TXT', name: '_estateblue-verification.www.blue-realty.com' });
    expect(result.instructions.routing).toEqual({ type: 'CNAME', name: 'www.blue-realty.com', value: 'blue.example.com' });
    expect(result.customDomain.verificationToken).toMatch(/^estateblue-[a-f0-9]{48}$/);
  });

  it('verifies ownership only when DNS TXT contains the exact generated token', async () => {
    const domain = { id: 1, tenantId: 7, hostname: 'www.blue-realty.com', type: 'custom', status: 'pending', verificationToken: 'estateblue-token', verifiedAt: null, lastCheckedAt: null };
    const setup = service([domain]);
    (dns.resolveTxt as jest.Mock).mockResolvedValue([['estateblue-token']]);

    const result = await setup.service.verify(42);

    expect(result.customDomain.status).toBe('verified');
    expect(result.customDomain.verifiedAt).toBeInstanceOf(Date);
    expect(dns.resolveTxt).toHaveBeenCalledWith('_estateblue-verification.www.blue-realty.com');
  });

  it('rejects missing or mismatched DNS ownership records', async () => {
    const domain = { id: 1, tenantId: 7, hostname: 'www.blue-realty.com', type: 'custom', status: 'pending', verificationToken: 'estateblue-token' };
    (dns.resolveTxt as jest.Mock).mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(service([domain]).service.verify(42)).rejects.toThrow('not found');

    (dns.resolveTxt as jest.Mock).mockResolvedValueOnce([['wrong-token']]);
    await expect(service([{ ...domain }]).service.verify(42)).rejects.toThrow('does not match');
  });

  it('prevents cross-tenant domain reuse and non-owner management', async () => {
    await expect(service([{ id: 1, tenantId: 99, hostname: 'www.blue-realty.com', type: 'custom', status: 'verified' }]).service.addOrReplace(42, 'www.blue-realty.com')).rejects.toThrow('another tenant');
    await expect(service([], [{ ...tenant, ownerUserId: 500 }]).service.addOrReplace(42, 'www.blue-realty.com')).rejects.toThrow('tenant owner');
  });

  it('replaces safely by resetting verification and supports removal without disabling the assigned subdomain', async () => {
    const existing = { id: 1, tenantId: 7, hostname: 'old.blue-realty.com', type: 'custom', status: 'verified', verificationToken: 'old', verifiedAt: new Date() };
    const setup = service([existing]);

    const replaced = await setup.service.addOrReplace(42, 'new.blue-realty.com');
    expect(replaced.customDomain).toMatchObject({ id: 1, hostname: 'new.blue-realty.com', status: 'pending', verifiedAt: null });
    expect(tenant.subdomain).toBe('blue');

    await expect(setup.service.remove(42)).resolves.toEqual({ message: 'Custom domain removed successfully' });
    expect(setup.domainRepo.rows).toHaveLength(0);
  });

  it('resolves only verified domains to the owning tenant database', async () => {
    const verified = { id: 1, tenantId: 7, hostname: 'www.blue-realty.com', type: 'custom', status: 'verified' };
    const pending = { id: 2, tenantId: 7, hostname: 'pending.blue-realty.com', type: 'custom', status: 'pending' };
    const setup = service([verified, pending]);

    await expect(setup.service.resolveVerifiedHostname('www.blue-realty.com')).resolves.toMatchObject({ id: 7, databaseName: 'tenant_7_blue_realty' });
    await expect(setup.service.resolveVerifiedHostname('pending.blue-realty.com')).resolves.toBeNull();
  });

  it('rejects invalid, primary-domain, localhost, and IP hostnames', async () => {
    const setup = service();
    for (const hostname of ['localhost', '127.0.0.1', 'bad_domain.com', 'blue.example.com']) {
      await expect(setup.service.addOrReplace(42, hostname)).rejects.toThrow();
    }
  });
});
