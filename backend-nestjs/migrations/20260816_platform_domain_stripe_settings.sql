ALTER TABLE saas_platform_domain_setting
  ADD COLUMN IF NOT EXISTS stripe_secret_key_encrypted text NULL,
  ADD COLUMN IF NOT EXISTS stripe_webhook_secret_encrypted text NULL,
  ADD COLUMN IF NOT EXISTS stripe_publishable_key varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS stripe_currency varchar(3) NOT NULL DEFAULT 'usd';
