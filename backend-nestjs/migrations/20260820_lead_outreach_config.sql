-- Keeps template attachment choices intact until scheduled outreach is delivered.
ALTER TABLE lead_history
  ADD COLUMN IF NOT EXISTS outreach_config jsonb NOT NULL DEFAULT '{}'::jsonb;
