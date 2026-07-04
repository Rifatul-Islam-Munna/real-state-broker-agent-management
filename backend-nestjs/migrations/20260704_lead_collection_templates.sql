-- Lead collection templates and mailbox extraction audit fields.
-- Run this migration when TypeORM synchronize is disabled.

CREATE TABLE IF NOT EXISTS lead_collection_template (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'PastedText',
  source_mail_inbox_id INTEGER NULL,
  sample_from_address TEXT NOT NULL DEFAULT '',
  sample_subject TEXT NOT NULL DEFAULT '',
  sender_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject_pattern TEXT NOT NULL DEFAULT '',
  subject_match_mode TEXT NOT NULL DEFAULT 'Contains',
  body_fingerprint JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_html TEXT NOT NULL DEFAULT '',
  source_text TEXT NOT NULL DEFAULT '',
  mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.82,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  match_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  ai_fallback_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_collection_template_name
  ON lead_collection_template (name);
CREATE INDEX IF NOT EXISTS idx_lead_collection_template_provider
  ON lead_collection_template (provider_name);
CREATE INDEX IF NOT EXISTS idx_lead_collection_template_active
  ON lead_collection_template (is_active);

ALTER TABLE mail_inbox
  ADD COLUMN IF NOT EXISTS html_body TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extraction_method TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS extraction_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_collection_template_id INTEGER NULL,
  ADD COLUMN IF NOT EXISTS lead_collection_template_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extraction_details JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_mail_inbox_lead_collection_template
  ON mail_inbox (lead_collection_template_id);
CREATE INDEX IF NOT EXISTS idx_mail_inbox_ai_fallback_used
  ON mail_inbox (ai_fallback_used);
