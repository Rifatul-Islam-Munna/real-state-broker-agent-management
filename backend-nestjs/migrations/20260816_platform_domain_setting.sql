CREATE TABLE IF NOT EXISTS saas_platform_domain_setting (
  id integer PRIMARY KEY,
  primary_domain varchar(253) NOT NULL,
  stripe_secret_key_encrypted text NULL,
  stripe_webhook_secret_encrypted text NULL,
  stripe_publishable_key varchar(255) NULL,
  stripe_currency varchar(3) NOT NULL DEFAULT 'usd',
  updated_by_user_id integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
