import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class LegacyPreferencesService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS property_operations_preferences (
          id SERIAL PRIMARY KEY,
          content JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await this.dataSource.query(`
        INSERT INTO property_operations_preferences (id, content, updated_at)
        SELECT 1, payload_json, COALESCE(updated_at, NOW())
        FROM property_operations_record
        WHERE record_type = 'Preferences'
        ORDER BY updated_at DESC
        LIMIT 1
        ON CONFLICT (id) DO NOTHING
      `);
    } catch {
      // Existing defaults remain available when there is no legacy record to migrate.
    }
  }
}
