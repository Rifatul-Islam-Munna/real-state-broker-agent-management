import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ReliabilityMonitorService } from '../security/reliability-monitor.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pool, PoolConfig } from 'pg';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TENANT_DATABASE_MIGRATIONS } from './tenant-database.migrations';

@Injectable()
export class TenantDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly pools = new Map<string, Pool>();

  constructor(
    private readonly masterDataSource: DataSource,
    @InjectRepository(SaasTenant) private readonly tenantRepo: Repository<SaasTenant>,
    @Optional() private readonly monitor?: ReliabilityMonitorService,
  ) {}

  databaseNameForTenant(tenantId: number, slug: string) {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    const name = `tenant_${tenantId}_${cleanSlug || 'workspace'}`.slice(0, 63);
    this.assertDatabaseName(name);
    return name;
  }

  async provisionDatabase(databaseName: string, seed: { tenantId: number; businessName: string; owner: { id: number; firstName: string; lastName: string; email: string; role: string } }) {
    this.assertDatabaseName(databaseName);
    let created = false;
    try {
      await this.createDatabase(databaseName);
      created = true;
      const pool = this.getPool(databaseName);
      await this.runMigrations(pool);
      await this.seedDatabase(pool, seed);
      this.monitor?.record('tenant.database.provisioned', { tenantId: seed.tenantId, databaseName });
      return { databaseName, status: 'ready' as const };
    } catch (error) {
      this.monitor?.failure('tenant.database.provisioning.failed', error, { tenantId: seed.tenantId, databaseName });
      await this.closePool(databaseName).catch(() => undefined);
      if (created) await this.dropDatabase(databaseName).catch(() => undefined);
      throw error;
    }
  }

  async createDatabase(databaseName: string) {
    this.assertDatabaseName(databaseName);
    const admin = new Pool({ ...this.basePoolConfig(), max: 1 });
    try {
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
      if (exists.rowCount) throw new Error(`Tenant database ${databaseName} already exists`);
      await admin.query(`CREATE DATABASE ${this.quoteIdentifier(databaseName)}`);
    } finally {
      await admin.end();
    }
  }

  async dropDatabase(databaseName: string) {
    this.assertDatabaseName(databaseName);
    await this.closePool(databaseName);
    const admin = new Pool({ ...this.basePoolConfig(), max: 1 });
    try {
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [databaseName]);
      await admin.query(`DROP DATABASE IF EXISTS ${this.quoteIdentifier(databaseName)}`);
    } finally {
      await admin.end();
    }
  }

  getPool(databaseName: string) {
    this.assertDatabaseName(databaseName);
    const existing = this.pools.get(databaseName);
    if (existing) return existing;
    const pool = new Pool({
      ...this.basePoolConfig(),
      database: databaseName,
      max: Number(process.env.TENANT_DB_POOL_MAX ?? 5),
      idleTimeoutMillis: Number(process.env.TENANT_DB_IDLE_TIMEOUT_MS ?? 30000),
      connectionTimeoutMillis: Number(process.env.TENANT_DB_CONNECTION_TIMEOUT_MS ?? 5000),
    });
    pool.on('error', (error) => {
      this.logger.error(`Tenant pool error for ${databaseName}: ${error.message}`);
      this.monitor?.failure('tenant.database.pool.error', error, { databaseName });
    });
    this.pools.set(databaseName, pool);
    return pool;
  }

  async withTenantClient<T>(databaseName: string, callback: (client: import('pg').PoolClient) => Promise<T>) {
    const pool = this.getPool(databaseName);
    let client: import('pg').PoolClient;
    try {
      client = await pool.connect();
      this.monitor?.record('tenant.database.connection.succeeded', { databaseName });
    } catch (error) {
      this.monitor?.failure('tenant.database.connection.failed', error, { databaseName });
      throw error;
    }
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  async runMigrations(pool: Pick<Pool, 'query'>) {
    await pool.query('BEGIN');
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS tenant_schema_migration (
        version integer PRIMARY KEY,
        name varchar(160) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
      const appliedResult = await pool.query<{ version: number }>('SELECT version FROM tenant_schema_migration');
      const applied = new Set(appliedResult.rows.map((row) => Number(row.version)));
      for (const migration of TENANT_DATABASE_MIGRATIONS) {
        if (applied.has(migration.version)) continue;
        for (const statement of migration.statements) await pool.query(statement);
        await pool.query('INSERT INTO tenant_schema_migration(version, name) VALUES ($1, $2)', [migration.version, migration.name]);
      }
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  async migrateAllTenantDatabases() {
    const tenants = await this.tenantRepo.find({ where: { databaseStatus: 'ready' } });
    const results: Array<{ tenantId: number; databaseName: string; success: boolean; error?: string }> = [];
    for (const tenant of tenants) {
      if (!tenant.databaseName) continue;
      try {
        await this.runMigrations(this.getPool(tenant.databaseName));
        results.push({ tenantId: tenant.id, databaseName: tenant.databaseName, success: true });
      } catch (error) {
        results.push({ tenantId: tenant.id, databaseName: tenant.databaseName, success: false, error: error instanceof Error ? error.message : 'Unknown migration error' });
      }
    }
    return results;
  }

  async healthCheck(databaseName: string) {
    try {
      const result = await this.getPool(databaseName).query('SELECT current_database() AS database_name');
      const healthy = result.rows[0]?.database_name === databaseName;
      if (!healthy) this.monitor?.failure('tenant.database.health.failed', new Error('Database identity mismatch'), { databaseName });
      return healthy;
    } catch (error) {
      this.monitor?.failure('tenant.database.health.failed', error, { databaseName });
      return false;
    }
  }

  async closePool(databaseName: string) {
    const pool = this.pools.get(databaseName);
    if (!pool) return;
    this.pools.delete(databaseName);
    await pool.end();
  }

  async onModuleDestroy() {
    await Promise.allSettled([...this.pools.keys()].map((name) => this.closePool(name)));
  }

  private async seedDatabase(pool: Pick<Pool, 'query'>, seed: { tenantId: number; businessName: string; owner: { id: number; firstName: string; lastName: string; email: string; role: string } }) {
    await pool.query('BEGIN');
    try {
      await pool.query(
        `INSERT INTO tenant_setting(key, value) VALUES
          ('tenant_identity', $1::jsonb),
          ('feature_flags', $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify({ tenantId: seed.tenantId, businessName: seed.businessName }), JSON.stringify({ initialized: true })],
      );
      await pool.query(
        `INSERT INTO tenant_user_profile(master_user_id, first_name, last_name, email, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (master_user_id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = now()`,
        [seed.owner.id, seed.owner.firstName, seed.owner.lastName, seed.owner.email, seed.owner.role],
      );
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
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
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(databaseName)) throw new Error('Invalid tenant database name');
  }

  private quoteIdentifier(value: string) {
    this.assertDatabaseName(value);
    return `"${value}"`;
  }
}
