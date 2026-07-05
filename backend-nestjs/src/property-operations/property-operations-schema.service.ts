import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PropertyOperationsSchemaService implements OnModuleInit {
  private readonly logger = new Logger(PropertyOperationsSchemaService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_workspace (
            id SERIAL PRIMARY KEY,
            property_id INTEGER NOT NULL UNIQUE,
            status VARCHAR(255) NOT NULL DEFAULT 'Active',
            property_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_module_state (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL,
            module_key VARCHAR(80) NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'Not started',
            notes TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await manager.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_property_operations_module_state ON property_operations_module_state (workspace_id, module_key)');
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_record (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL,
            module_key VARCHAR(80) NOT NULL,
            record_type VARCHAR(80) NOT NULL DEFAULT 'Item',
            title VARCHAR(240) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status VARCHAR(60) NOT NULL DEFAULT 'Open',
            priority VARCHAR(40) NOT NULL DEFAULT 'Normal',
            contact_name VARCHAR(160) NOT NULL DEFAULT '',
            contact_email VARCHAR(240) NOT NULL DEFAULT '',
            contact_phone VARCHAR(80) NOT NULL DEFAULT '',
            contact_label VARCHAR(120) NOT NULL DEFAULT '',
            amount NUMERIC(18,2),
            due_at TIMESTAMPTZ,
            attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
            payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            recurrence_json JSONB,
            parent_record_id INTEGER,
            assigned_to VARCHAR(240) NOT NULL DEFAULT '',
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await manager.query("ALTER TABLE property_operations_record ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb");
        await manager.query('ALTER TABLE property_operations_record ADD COLUMN IF NOT EXISTS recurrence_json JSONB');
        await manager.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'property_operations_record' AND column_name = 'payload'
            ) THEN
              EXECUTE 'UPDATE property_operations_record SET payload_json = payload WHERE payload_json = ''{}''::jsonb AND payload IS NOT NULL';
            END IF;
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'property_operations_record' AND column_name = 'recurrence'
            ) THEN
              EXECUTE 'UPDATE property_operations_record SET recurrence_json = recurrence WHERE recurrence_json IS NULL AND recurrence IS NOT NULL';
            END IF;
          END $$
        `);
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_record_workspace_module ON property_operations_record (workspace_id, module_key)');
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_record_status ON property_operations_record (status)');
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_record_due_at ON property_operations_record (due_at)');
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_public_access (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL,
            record_id INTEGER,
            module_key VARCHAR(80) NOT NULL,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            access_token VARCHAR(80) NOT NULL,
            title VARCHAR(240) NOT NULL,
            instructions TEXT NOT NULL DEFAULT '',
            recipient_label VARCHAR(120) NOT NULL DEFAULT '',
            recipient_name VARCHAR(160) NOT NULL DEFAULT '',
            recipient_email VARCHAR(240) NOT NULL DEFAULT '',
            recipient_phone VARCHAR(80) NOT NULL DEFAULT '',
            status VARCHAR(40) NOT NULL DEFAULT 'Active',
            form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
            expires_at TIMESTAMPTZ NOT NULL,
            max_uses INTEGER NOT NULL DEFAULT 1,
            use_count INTEGER NOT NULL DEFAULT 0,
            one_time BOOLEAN NOT NULL DEFAULT TRUE,
            allow_file_uploads BOOLEAN NOT NULL DEFAULT TRUE,
            payment_amount NUMERIC(18,2),
            payment_currency VARCHAR(12) NOT NULL DEFAULT 'USD',
            payment_verified BOOLEAN NOT NULL DEFAULT FALSE,
            payment_session_id VARCHAR(120),
            payment_token_hash VARCHAR(64),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_accessed_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ
          )
        `);
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_public_access_workspace ON property_operations_public_access (workspace_id)');
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_public_access_expiry ON property_operations_public_access (status, expires_at)');
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_submission (
            id SERIAL PRIMARY KEY,
            access_id INTEGER NOT NULL,
            responder_name VARCHAR(160) NOT NULL DEFAULT '',
            responder_email VARCHAR(240) NOT NULL DEFAULT '',
            responder_phone VARCHAR(80) NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            response JSONB NOT NULL DEFAULT '{}'::jsonb,
            attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await manager.query('CREATE INDEX IF NOT EXISTS idx_property_operations_submission_access ON property_operations_submission (access_id)');
        await manager.query(`
          CREATE TABLE IF NOT EXISTS property_operations_preferences (
            id SERIAL PRIMARY KEY,
            content JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
      });
      this.logger.log('Property Operations PostgreSQL schema is ready');
    } catch (error) {
      this.logger.error(`Property Operations schema bootstrap failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw error;
    }
  }
}
