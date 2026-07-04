import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class LeadTemplateSchemaService implements OnModuleInit {
  private readonly logger = new Logger(LeadTemplateSchemaService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (!this.dataSource.isInitialized) return;
    try {
      await this.dataSource.query(`
        ALTER TABLE lead_collection_template
          ADD COLUMN IF NOT EXISTS linked_page_config jsonb NOT NULL
            DEFAULT '{"enabled":false,"allowedHosts":[],"urlIncludes":[],"linkTextIncludes":[],"maxLinks":3}'::jsonb,
          ADD COLUMN IF NOT EXISTS linked_page_sample_url text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS linked_page_source_html text NOT NULL DEFAULT '',
          ADD COLUMN IF NOT EXISTS linked_page_source_text text NOT NULL DEFAULT ''
      `);
    } catch (error) {
      this.logger.error(
        `Unable to ensure linked-page template columns: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
