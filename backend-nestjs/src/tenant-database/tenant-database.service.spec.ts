import { TenantDatabaseService } from './tenant-database.service';

describe('TenantDatabaseService', () => {
  function createService(tenants: any[] = []) {
    const dataSource: any = {
      options: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'secret',
        database: 'master_db',
      },
    };
    const tenantRepo: any = { find: jest.fn(async () => tenants) };
    return new TenantDatabaseService(dataSource, tenantRepo);
  }

  it('creates deterministic isolated database names and rejects unsafe identifiers', () => {
    const service = createService();
    expect(service.databaseNameForTenant(42, 'Blue Horizon Realty')).toBe(
      'tenant_42_blue_horizon_realty',
    );
    expect(() => service.getPool('tenant_42_blue_horizon')).not.toThrow();
    expect(() => service.getPool('tenant-42;DROP DATABASE master')).toThrow(
      'Invalid tenant database name',
    );
  });

  it('runs unapplied migrations inside a transaction and records the version', async () => {
    const service = createService();
    const calls: Array<{ sql: string; params?: any[] }> = [];
    const pool: any = {
      query: jest.fn(async (sql: string, params?: any[]) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT version')) return { rows: [] };
        return { rows: [], rowCount: 0 };
      }),
    };

    await service.runMigrations(pool);

    expect(calls[0].sql).toBe('BEGIN');
    expect(
      calls.some((call) =>
        call.sql.includes('CREATE TABLE IF NOT EXISTS tenant_property'),
      ),
    ).toBe(true);
    expect(
      calls.some((call) =>
        call.sql.startsWith('INSERT INTO tenant_schema_migration'),
      ),
    ).toBe(true);
    expect(calls.at(-1)?.sql).toBe('COMMIT');
  });

  it('skips applied migrations, runs only new versions, and rolls back failures', async () => {
    const service = createService();
    const appliedPool: any = {
      query: jest.fn(async (sql: string) => {
        if (sql.startsWith('SELECT version')) {
          return {
            rows: [
              { version: 1 },
              { version: 2 },
              { version: 3 },
              { version: 4 },
              { version: 5 },
              { version: 6 },
            ],
          };
        }
        return { rows: [] };
      }),
    };
    await service.runMigrations(appliedPool);
    expect(
      appliedPool.query.mock.calls.some(([sql]: [string]) =>
        sql.startsWith('INSERT INTO tenant_schema_migration'),
      ),
    ).toBe(false);

    const versionOnePool: any = {
      query: jest.fn(async (sql: string) => {
        if (sql.startsWith('SELECT version')) return { rows: [{ version: 1 }] };
        return { rows: [] };
      }),
    };
    await service.runMigrations(versionOnePool);
    expect(versionOnePool.query).toHaveBeenCalledWith(
      'INSERT INTO tenant_schema_migration(version, name) VALUES ($1, $2)',
      [2, 'tenant_realtor_workflows'],
    );
    expect(
      versionOnePool.query.mock.calls.some(([sql]: [string]) =>
        sql.includes('CREATE TABLE IF NOT EXISTS tenant_showing_request'),
      ),
    ).toBe(true);

    const failingPool: any = {
      query: jest.fn(async (sql: string) => {
        if (sql.startsWith('SELECT version')) return { rows: [] };
        if (sql.includes('tenant_setting')) throw new Error('migration failed');
        return { rows: [] };
      }),
    };
    await expect(service.runMigrations(failingPool)).rejects.toThrow(
      'migration failed',
    );
    expect(failingPool.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('reuses tenant connection pools and releases checked-out clients', async () => {
    const service = createService();
    const first = service.getPool('tenant_1_alpha');
    const second = service.getPool('tenant_1_alpha');
    expect(second).toBe(first);

    const release = jest.fn();
    const fakePool: any = {
      connect: jest.fn(async () => ({ query: jest.fn(), release })),
    };
    jest.spyOn(service, 'getPool').mockReturnValue(fakePool);
    await service.withTenantClient('tenant_1_alpha', async () => 'ok');
    expect(release).toHaveBeenCalledTimes(1);

    await first.end();
  });

  it('migrates every ready tenant independently and reports failures without stopping the fleet', async () => {
    const service = createService([
      { id: 1, databaseName: 'tenant_1_alpha', databaseStatus: 'ready' },
      { id: 2, databaseName: 'tenant_2_beta', databaseStatus: 'ready' },
    ]);
    jest.spyOn(service, 'ensureTenantDatabaseRole').mockResolvedValue();
    jest
      .spyOn(service, 'getPool')
      .mockImplementation((name: string) => ({ databaseName: name }) as any);
    jest
      .spyOn(service, 'runMigrations')
      .mockImplementation(async (pool: any) => {
        if (pool.databaseName === 'tenant_2_beta')
          throw new Error('beta failed');
      });

    const result = await service.migrateAllTenantDatabases();
    expect(result).toEqual([
      { tenantId: 1, databaseName: 'tenant_1_alpha', success: true },
      {
        tenantId: 2,
        databaseName: 'tenant_2_beta',
        success: false,
        error: 'beta failed',
      },
    ]);
  });

  it('drops a newly created database when migration or seeding fails', async () => {
    const service = createService();
    jest.spyOn(service, 'createDatabase').mockResolvedValue(undefined);
    jest.spyOn(service, 'ensureTenantDatabaseRole').mockResolvedValue();
    jest.spyOn(service, 'getPool').mockReturnValue({ query: jest.fn() } as any);
    jest
      .spyOn(service, 'runMigrations')
      .mockRejectedValue(new Error('schema failed'));
    const drop = jest
      .spyOn(service, 'dropDatabase')
      .mockResolvedValue(undefined);

    await expect(
      service.provisionDatabase('tenant_5_failure', {
        tenantId: 5,
        businessName: 'Failure Realty',
        owner: {
          id: 10,
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          role: 'Agent',
        },
      }),
    ).rejects.toThrow('schema failed');
    expect(drop).toHaveBeenCalledWith('tenant_5_failure');
  });
});
