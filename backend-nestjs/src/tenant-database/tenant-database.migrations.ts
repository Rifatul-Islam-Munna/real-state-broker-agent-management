import { TenantDatabaseMigration } from './tenant-database.types';

export const TENANT_DATABASE_MIGRATIONS: TenantDatabaseMigration[] = [
  {
    version: 1,
    name: 'initial_tenant_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_schema_migration (
        version integer PRIMARY KEY,
        name varchar(160) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_setting (
        key varchar(160) PRIMARY KEY,
        value jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_user_profile (
        id bigserial PRIMARY KEY,
        master_user_id integer NOT NULL UNIQUE,
        first_name varchar(100) NOT NULL,
        last_name varchar(100) NOT NULL,
        email varchar(160) NOT NULL UNIQUE,
        role varchar(40) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_property (
        id bigserial PRIMARY KEY,
        title varchar(240) NOT NULL,
        status varchar(60) NOT NULL DEFAULT 'draft',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_lead (
        id bigserial PRIMARY KEY,
        full_name varchar(200) NOT NULL,
        email varchar(160),
        phone varchar(80),
        status varchar(60) NOT NULL DEFAULT 'new',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_audit_log (
        id bigserial PRIMARY KEY,
        action varchar(120) NOT NULL,
        actor_master_user_id integer,
        summary text NOT NULL DEFAULT '',
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
];
