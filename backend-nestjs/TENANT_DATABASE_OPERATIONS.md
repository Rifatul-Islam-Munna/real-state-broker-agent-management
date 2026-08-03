# Tenant Database Operations

## Architecture

The primary PostgreSQL database is the master SaaS database. It stores users, tenant identities, plans, subscriptions, domains, tenant status, database registry fields, and global administrative audit logs.

Each tenant receives a dedicated PostgreSQL database named with the validated pattern `tenant_<tenantId>_<slug>`. Tenant database credentials are derived server-side from the master PostgreSQL connection and are never returned to browser clients.

## Provisioning lifecycle

1. Create the owner and tenant registry record in the master database with `provisioningStatus=provisioning` and `databaseStatus=provisioning`.
2. Generate a validated database name.
3. Create the PostgreSQL database.
4. Run all versioned tenant migrations inside transactions.
5. Seed tenant identity, feature flags, and the owner profile.
6. Mark the master tenant record `ready` and active.
7. If any database, migration, seed, or finalization step fails, drop the tenant database and delete the partial master tenant and owner records.

## Connection pooling

Tenant connections are stored in an in-memory registry keyed only by the validated database name. Pools are reused per tenant, checked-out clients are always released in `finally`, and every pool is closed during application shutdown.

Configuration:

- `TENANT_DB_POOL_MAX` defaults to `5`.
- `TENANT_DB_IDLE_TIMEOUT_MS` defaults to `30000`.
- `TENANT_DB_CONNECTION_TIMEOUT_MS` defaults to `5000`.

## Migrations

Tenant migrations live in `src/tenant-database/tenant-database.migrations.ts`. Every tenant database tracks applied versions in `tenant_schema_migration`.

`TenantDatabaseService.migrateAllTenantDatabases()` migrates every ready tenant independently and returns a result per tenant. A failure in one database does not stop migrations for the remaining tenant databases. Review failures and rerun after fixing the cause.

## Backup policy

Use separate backup jobs for the master database and every tenant database.

Recommended schedule:

- Master database: daily full backup, hourly WAL/archive coverage where supported.
- Tenant databases: daily full backup; increase frequency for high-activity tenants.
- Keep encrypted backups in storage separate from the PostgreSQL host.
- Retain at least 30 daily restore points and monthly long-term restore points according to business requirements.
- Record the tenant ID, database name, backup timestamp, PostgreSQL version, and application migration version with every backup.

Example commands, run only by authorized operators with credentials supplied through the environment:

```bash
pg_dump --format=custom --file=master.dump "$MASTER_DATABASE_URL"
pg_dump --format=custom --file=tenant_42.dump "$TENANT_DATABASE_URL"
```

## Restore procedure

1. Put the affected tenant into maintenance or blocked mode in the master database.
2. Create a new empty recovery database; do not overwrite the current database first.
3. Restore the backup into the recovery database.
4. Run `tenant_schema_migration` checks and application health checks.
5. Verify tenant identity and owner seed records.
6. Switch the master tenant registry to the recovered database during a controlled maintenance window.
7. Keep the previous database unchanged until validation is complete.
8. Unblock the tenant and monitor logs.

Example:

```bash
createdb tenant_42_recovery
pg_restore --clean --if-exists --no-owner --dbname=tenant_42_recovery tenant_42.dump
```

## Disaster recovery verification

Perform a scheduled restore drill at least quarterly. A backup is not considered valid until it has been restored into an isolated database and the schema, seed records, and representative tenant queries have been verified.
