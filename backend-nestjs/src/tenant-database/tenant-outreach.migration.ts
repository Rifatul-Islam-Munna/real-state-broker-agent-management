export const TENANT_OUTREACH_MIGRATION = {
  version: 3,
  name: 'tenant_isolated_outreach_queue',
  statements: [
    `CREATE TABLE IF NOT EXISTS tenant_outreach_job (
      id bigserial PRIMARY KEY,
      lead_id bigint NULL,
      job_type varchar(40) NOT NULL DEFAULT 'outreach',
      channel varchar(20) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'scheduled',
      subject text NOT NULL DEFAULT '',
      body text NOT NULL DEFAULT '',
      recipient_email varchar(320) NOT NULL DEFAULT '',
      recipient_phone varchar(80) NOT NULL DEFAULT '',
      provider varchar(100) NOT NULL DEFAULT '',
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      scheduled_at timestamptz NOT NULL DEFAULT now(),
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      attempt_count integer NOT NULL DEFAULT 0,
      max_attempts integer NOT NULL DEFAULT 5,
      locked_at timestamptz NULL,
      locked_by varchar(160) NULL,
      idempotency_key varchar(160) NOT NULL,
      provider_message_id varchar(320) NULL,
      last_error text NOT NULL DEFAULT '',
      completed_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_outreach_job_status_check CHECK (
        status IN ('scheduled', 'processing', 'sent', 'retrying', 'failed', 'dead_letter')
      ),
      CONSTRAINT tenant_outreach_job_attempts_check CHECK (
        attempt_count >= 0 AND max_attempts BETWEEN 1 AND 25
      ),
      CONSTRAINT tenant_outreach_job_idempotency_unique UNIQUE (idempotency_key)
    )`,
    `CREATE INDEX IF NOT EXISTS tenant_outreach_job_due_idx
      ON tenant_outreach_job(next_attempt_at, scheduled_at, id)
      WHERE status IN ('scheduled', 'retrying')`,
    `CREATE INDEX IF NOT EXISTS tenant_outreach_job_status_idx
      ON tenant_outreach_job(status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS tenant_outreach_job_lead_idx
      ON tenant_outreach_job(lead_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS tenant_outreach_event (
      id bigserial PRIMARY KEY,
      job_id bigint NOT NULL REFERENCES tenant_outreach_job(id) ON DELETE CASCADE,
      from_status varchar(20) NULL,
      to_status varchar(20) NOT NULL,
      attempt integer NOT NULL DEFAULT 0,
      message text NOT NULL DEFAULT '',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS tenant_outreach_event_job_idx
      ON tenant_outreach_event(job_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS tenant_inbound_message (
      id bigserial PRIMARY KEY,
      lead_id bigint NULL,
      channel varchar(20) NOT NULL,
      provider_key varchar(120) NOT NULL,
      provider_message_id varchar(320) NOT NULL,
      sender varchar(320) NOT NULL DEFAULT '',
      recipient varchar(320) NOT NULL DEFAULT '',
      subject text NOT NULL DEFAULT '',
      body text NOT NULL DEFAULT '',
      is_read boolean NOT NULL DEFAULT false,
      received_at timestamptz NOT NULL DEFAULT now(),
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_inbound_message_provider_unique
        UNIQUE (provider_key, provider_message_id)
    )`,
    `CREATE INDEX IF NOT EXISTS tenant_inbound_message_received_idx
      ON tenant_inbound_message(received_at DESC)`,
    `CREATE INDEX IF NOT EXISTS tenant_inbound_message_lead_idx
      ON tenant_inbound_message(lead_id, received_at DESC)`,
    `CREATE TABLE IF NOT EXISTS tenant_provider_sync_state (
      provider_key varchar(120) PRIMARY KEY,
      cursor text NULL,
      last_started_at timestamptz NULL,
      last_completed_at timestamptz NULL,
      last_error text NOT NULL DEFAULT '',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  ],
} as const;
