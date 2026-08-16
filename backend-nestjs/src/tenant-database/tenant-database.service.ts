import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ReliabilityMonitorService } from '../security/reliability-monitor.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pool, PoolConfig } from 'pg';
import { createHmac } from 'node:crypto';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TENANT_DATABASE_MIGRATIONS } from './tenant-database.migrations';

@Injectable()
export class TenantDatabaseService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly pools = new Map<string, Pool>();
  private readonly poolLastUsedAt = new Map<string, number>();
  private readonly healthCache = new Map<
    string,
    { healthy: boolean; expiresAt: number }
  >();

  constructor(
    private readonly masterDataSource: DataSource,
    @InjectRepository(SaasTenant)
    private readonly tenantRepo: Repository<SaasTenant>,
    @Optional() private readonly monitor?: ReliabilityMonitorService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.TENANT_DB_AUTO_MIGRATE === 'false') return;
    const results = await this.migrateAllTenantDatabases();
    const failed = results.filter((result) => !result.success);
    if (failed.length) {
      this.logger.error(
        `Tenant database migrations failed for ${failed.length} tenant(s): ${failed
          .map((result) => result.databaseName)
          .join(', ')}`,
      );
    }
  }

  databaseNameForTenant(tenantId: number, slug: string) {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
    const name = `tenant_${tenantId}_${cleanSlug || 'workspace'}`.slice(0, 63);
    this.assertDatabaseName(name);
    return name;
  }

  async provisionDatabase(
    databaseName: string,
    seed: {
      tenantId: number;
      businessName: string;
      owner: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
    },
  ) {
    this.assertDatabaseName(databaseName);
    let created = false;
    try {
      await this.createDatabase(databaseName);
      created = true;
      await this.ensureTenantDatabaseRole(databaseName);
      const pool = this.getPool(databaseName);
      await this.runMigrations(pool);
      await this.seedDatabase(pool, seed);
      this.monitor?.record('tenant.database.provisioned', {
        tenantId: seed.tenantId,
        databaseName,
      });
      return { databaseName, status: 'ready' as const };
    } catch (error) {
      this.monitor?.failure('tenant.database.provisioning.failed', error, {
        tenantId: seed.tenantId,
        databaseName,
      });
      await this.closePool(databaseName).catch(() => undefined);
      if (created) await this.dropDatabase(databaseName).catch(() => undefined);
      throw error;
    }
  }

  async createDatabase(databaseName: string) {
    this.assertDatabaseName(databaseName);
    const admin = new Pool({ ...this.basePoolConfig(), max: 1 });
    try {
      const exists = await admin.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [databaseName],
      );
      if (exists.rowCount)
        throw new Error(`Tenant database ${databaseName} already exists`);
      await admin.query(
        `CREATE DATABASE ${this.quoteIdentifier(databaseName)}`,
      );
    } finally {
      await admin.end();
    }
  }

  async dropDatabase(databaseName: string) {
    this.assertDatabaseName(databaseName);
    await this.closePool(databaseName);
    const admin = new Pool({ ...this.basePoolConfig(), max: 1 });
    try {
      await admin.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
        [databaseName],
      );
      await admin.query(
        `DROP DATABASE IF EXISTS ${this.quoteIdentifier(databaseName)}`,
      );
      await admin.query(
        `DROP ROLE IF EXISTS ${this.quoteIdentifier(this.tenantRoleName(databaseName))}`,
      );
    } finally {
      await admin.end();
    }
  }

  getPool(databaseName: string) {
    this.assertDatabaseName(databaseName);
    const existing = this.pools.get(databaseName);
    if (existing) {
      this.touchPool(databaseName);
      return existing;
    }
    this.evictIdlePools(databaseName);
    const pool = new Pool({
      ...this.tenantPoolConfig(databaseName),
      max: this.envInt('TENANT_DB_POOL_MAX', 2, 1, 10),
      idleTimeoutMillis: this.envInt(
        'TENANT_DB_IDLE_TIMEOUT_MS',
        60_000,
        5_000,
        600_000,
      ),
      connectionTimeoutMillis: this.envInt(
        'TENANT_DB_CONNECTION_TIMEOUT_MS',
        5_000,
        500,
        60_000,
      ),
    });
    pool.on('connect', () => {
      this.monitor?.record('tenant.database.pool.connection.created', {
        databaseName,
      });
    });
    pool.on('error', (error) => {
      this.logger.error(
        `Tenant pool error for ${databaseName}: ${error.message}`,
      );
      this.monitor?.failure('tenant.database.pool.error', error, {
        databaseName,
      });
    });
    this.pools.set(databaseName, pool);
    this.touchPool(databaseName);
    return pool;
  }

  async withTenantClient<T>(
    databaseName: string,
    callback: (client: import('pg').PoolClient) => Promise<T>,
  ) {
    const pool = this.getPool(databaseName);
    let client: import('pg').PoolClient;
    try {
      client = await pool.connect();
    } catch (error) {
      this.monitor?.failure('tenant.database.connection.failed', error, {
        databaseName,
      });
      throw error;
    }
    try {
      return await callback(client);
    } finally {
      client.release();
      this.touchPool(databaseName);
    }
  }

  async runMigrations(
    pool: Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>,
  ) {
    const connection =
      typeof pool.connect === 'function' ? await pool.connect() : pool;
    try {
      await connection.query('BEGIN');
      try {
        await connection.query(
          `SELECT pg_advisory_xact_lock(hashtext('tenant-schema-migrations'))`,
        );
        await connection.query(`CREATE TABLE IF NOT EXISTS tenant_schema_migration (
          version integer PRIMARY KEY,
          name varchar(160) NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )`);
        const appliedResult = await connection.query<{ version: number }>(
          'SELECT version FROM tenant_schema_migration',
        );
        const applied = new Set(
          appliedResult.rows.map((row) => Number(row.version)),
        );
        for (const migration of TENANT_DATABASE_MIGRATIONS) {
          if (applied.has(migration.version)) continue;
          for (const statement of migration.statements) {
            await connection.query(statement);
          }
          await connection.query(
            'INSERT INTO tenant_schema_migration(version, name) VALUES ($1, $2)',
            [migration.version, migration.name],
          );
        }
        await connection.query('COMMIT');
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      }
    } finally {
      if ('release' in connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  }

  async migrateAllTenantDatabases() {
    const tenants = (
      await this.tenantRepo.find({
        where: { databaseStatus: 'ready' },
        order: { id: 'ASC' },
      })
    ).filter((tenant) => Boolean(tenant.databaseName));
    const results: Array<{
      tenantId: number;
      databaseName: string;
      success: boolean;
      error?: string;
    }> = new Array(tenants.length);
    const concurrency = this.envInt(
      'TENANT_DB_MIGRATION_CONCURRENCY',
      4,
      1,
      12,
    );
    let cursor = 0;
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, tenants.length) },
        async () => {
          while (cursor < tenants.length) {
            const index = cursor++;
            const tenant = tenants[index];
            const databaseName = tenant.databaseName!;
            try {
              await this.ensureTenantDatabaseRole(databaseName);
              await this.runMigrations(this.getPool(databaseName));
              results[index] = {
                tenantId: tenant.id,
                databaseName,
                success: true,
              };
            } catch (error) {
              results[index] = {
                tenantId: tenant.id,
                databaseName,
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Unknown migration error',
              };
            }
          }
        },
      ),
    );
    return results;
  }

  async healthCheck(databaseName: string) {
    const cached = this.healthCache.get(databaseName);
    if (cached && cached.expiresAt > Date.now()) return cached.healthy;
    try {
      const result = await this.getPool(databaseName).query(
        'SELECT current_database() AS database_name',
      );
      const healthy = result.rows[0]?.database_name === databaseName;
      const ttl = this.envInt(
        'TENANT_DB_HEALTH_TTL_MS',
        30_000,
        1_000,
        300_000,
      );
      this.healthCache.set(databaseName, {
        healthy,
        expiresAt: Date.now() + (healthy ? ttl : Math.min(ttl, 5_000)),
      });
      if (!healthy) {
        this.monitor?.failure(
          'tenant.database.health.failed',
          new Error('Database identity mismatch'),
          { databaseName },
        );
      }
      return healthy;
    } catch (error) {
      this.healthCache.set(databaseName, {
        healthy: false,
        expiresAt: Date.now() + 5_000,
      });
      this.monitor?.failure('tenant.database.health.failed', error, {
        databaseName,
      });
      return false;
    }
  }

  async closePool(databaseName: string) {
    const pool = this.pools.get(databaseName);
    if (!pool) return;
    this.pools.delete(databaseName);
    this.poolLastUsedAt.delete(databaseName);
    this.healthCache.delete(databaseName);
    await pool.end();
  }

  async onModuleDestroy() {
    await Promise.allSettled(
      [...this.pools.keys()].map((name) => this.closePool(name)),
    );
  }

  private async seedDatabase(
    pool: Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>,
    seed: {
      tenantId: number;
      businessName: string;
      owner: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
    },
  ) {
    const connection =
      typeof pool.connect === 'function' ? await pool.connect() : pool;
    try {
      await connection.query('BEGIN');
      try {
        await connection.query(
          `INSERT INTO tenant_setting(key, value) VALUES
            ('tenant_identity', $1::jsonb),
            ('feature_flags', $2::jsonb)
           ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = now()`,
          [
            JSON.stringify({
              tenantId: seed.tenantId,
              businessName: seed.businessName,
            }),
            JSON.stringify({ initialized: true }),
          ],
        );
        await connection.query(
          `INSERT INTO tenant_user_profile(
             master_user_id, first_name, last_name, email, role
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (master_user_id) DO UPDATE
           SET first_name = EXCLUDED.first_name,
               last_name = EXCLUDED.last_name,
               email = EXCLUDED.email,
               role = EXCLUDED.role,
               updated_at = now()`,
          [
            seed.owner.id,
            seed.owner.firstName,
            seed.owner.lastName,
            seed.owner.email,
            seed.owner.role,
          ],
        );
        await connection.query('COMMIT');
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      }
    } finally {
      if ('release' in connection && typeof connection.release === 'function') {
        connection.release();
      }
    }
  }

  getPoolStats() {
    return [...this.pools.entries()].map(([databaseName, pool]) => ({
      databaseName,
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      lastUsedAt: this.poolLastUsedAt.get(databaseName) ?? null,
    }));
  }

  private touchPool(databaseName: string) {
    this.poolLastUsedAt.set(databaseName, Date.now());
  }

  private evictIdlePools(excludeDatabaseName: string) {
    const now = Date.now();
    const maxPools = this.envInt('TENANT_DB_POOL_CACHE_MAX', 64, 4, 500);
    const idleTtl = this.envInt(
      'TENANT_DB_POOL_CACHE_IDLE_MS',
      15 * 60_000,
      30_000,
      24 * 60 * 60_000,
    );
    const candidates = [...this.pools.entries()]
      .filter(
        ([databaseName, pool]) =>
          databaseName !== excludeDatabaseName &&
          pool.waitingCount === 0 &&
          pool.totalCount === pool.idleCount,
      )
      .sort(
        ([left], [right]) =>
          (this.poolLastUsedAt.get(left) ?? 0) -
          (this.poolLastUsedAt.get(right) ?? 0),
      );
    let overflow = Math.max(0, this.pools.size - maxPools + 1);
    for (const [databaseName, pool] of candidates) {
      const expired =
        now - (this.poolLastUsedAt.get(databaseName) ?? 0) >= idleTtl;
      if (!expired && overflow <= 0) continue;
      this.pools.delete(databaseName);
      this.poolLastUsedAt.delete(databaseName);
      this.healthCache.delete(databaseName);
      void pool.end().catch((error) => {
        this.logger.warn(
          `Failed to close idle tenant pool ${databaseName}: ${error.message}`,
        );
      });
      if (overflow > 0) overflow--;
    }
  }

  private envInt(key: string, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${process.env[key] ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  async ensureTenantDatabaseRole(databaseName: string) {
    this.assertDatabaseName(databaseName);
    const roleName = this.tenantRoleName(databaseName);
    const password = this.tenantRolePassword(databaseName);
    const admin = new Pool({ ...this.basePoolConfig(), max: 1 });
    try {
      const role = this.quoteIdentifier(roleName);
      const passwordLiteral = this.quoteLiteral(password);
      await admin.query(
        `DO $tenant_role$
         BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${this.quoteLiteral(roleName)}) THEN
             CREATE ROLE ${role} LOGIN PASSWORD ${passwordLiteral};
           END IF;
         END
         $tenant_role$`,
      );
      await admin.query(
        `ALTER ROLE ${role} WITH LOGIN PASSWORD ${passwordLiteral}
         NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`,
      );
      await admin.query(
        `REVOKE CONNECT ON DATABASE ${this.quoteIdentifier(databaseName)} FROM PUBLIC`,
      );
      await admin.query(
        `GRANT CONNECT, TEMPORARY ON DATABASE ${this.quoteIdentifier(databaseName)} TO ${role}`,
      );
    } finally {
      await admin.end();
    }

    const target = new Pool({
      ...this.basePoolConfig(),
      database: databaseName,
      max: 1,
    });
    try {
      const role = this.quoteIdentifier(roleName);
      await target.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${role}`);
      await target.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
      );
      await target.query(
        `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
      );
      await target.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public
         GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
      );
      await target.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public
         GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`,
      );
    } finally {
      await target.end();
    }
    await this.closePool(databaseName).catch(() => undefined);
  }

  private tenantPoolConfig(databaseName: string): PoolConfig {
    return {
      ...this.basePoolConfig(),
      database: databaseName,
      user: this.tenantRoleName(databaseName),
      password: this.tenantRolePassword(databaseName),
    };
  }

  private tenantRoleName(databaseName: string) {
    this.assertDatabaseName(databaseName);
    return `ta_${databaseName}`.slice(0, 63);
  }

  private tenantRolePassword(databaseName: string) {
    const base = this.basePoolConfig();
    const secret =
      process.env.TENANT_DB_ROLE_SECRET ||
      process.env.PLATFORM_SETTINGS_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      `${base.password ?? 'local-tenant-role-secret'}`;
    return createHmac('sha256', secret)
      .update(`tenant-db-role:${databaseName}`)
      .digest('base64url');
  }

  private basePoolConfig(): PoolConfig {
    const options = this.masterDataSource.options as any;
    if (options.url) {
      const url = new URL(options.url);
      return {
        host: url.hostname,
        port: Number(url.port || 5432),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(url.pathname.replace(/^\//, '')),
        ssl: options.ssl,
      };
    }
    return {
      host: options.host,
      port: Number(options.port ?? 5432),
      user: options.username,
      password: options.password,
      database: options.database,
      ssl: options.ssl,
    };
  }

  private assertDatabaseName(databaseName: string) {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName))
      throw new Error('Invalid tenant database name');
  }

  private quoteLiteral(value: string) {
    return `'${`${value ?? ''}`.replace(/'/g, "''")}'`;
  }

  private quoteIdentifier(value: string) {
    this.assertDatabaseName(value);
    return `"${value}"`;
  }
}
