-- Run this migration when TypeORM synchronize is disabled.

CREATE TABLE IF NOT EXISTS pdf_template (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Universal',
  status TEXT NOT NULL DEFAULT 'Draft',
  source_type TEXT NOT NULL DEFAULT 'Blank',
  template_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_name_pattern TEXT NOT NULL DEFAULT 'document-{{property.slug}}',
  source_file_name TEXT NOT NULL DEFAULT '',
  source_file_url TEXT NOT NULL DEFAULT '',
  source_file_object_name TEXT NULL,
  source_mime_type TEXT NOT NULL DEFAULT '',
  source_size_bytes BIGINT NOT NULL DEFAULT 0,
  imported_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pdf_template_name ON pdf_template (name);
CREATE INDEX IF NOT EXISTS idx_pdf_template_category ON pdf_template (category);
CREATE INDEX IF NOT EXISTS idx_pdf_template_status ON pdf_template (status);

CREATE TABLE IF NOT EXISTS pdf_generation (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL,
  template_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Universal',
  property_id INTEGER NULL,
  property_title TEXT NOT NULL DEFAULT '',
  lead_id INTEGER NULL,
  lead_name TEXT NOT NULL DEFAULT '',
  agent_id INTEGER NULL,
  agent_name TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_object_name TEXT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  manual_field_count INTEGER NOT NULL DEFAULT 0,
  missing_field_count INTEGER NOT NULL DEFAULT 0,
  variables_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pdf_generation_template_id ON pdf_generation (template_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_property_id ON pdf_generation (property_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_lead_id ON pdf_generation (lead_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generation_created_at ON pdf_generation (created_at);
