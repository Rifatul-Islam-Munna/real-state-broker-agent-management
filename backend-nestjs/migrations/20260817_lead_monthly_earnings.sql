-- Add lead income fields used by CRM and lead collection parsing.
-- Safe to run repeatedly.

ALTER TABLE IF EXISTS lead
  ADD COLUMN IF NOT EXISTS monthly_earning VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS combined_monthly_earning VARCHAR NOT NULL DEFAULT '';

