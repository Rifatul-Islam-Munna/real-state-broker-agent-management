ALTER TABLE saas_platform_domain_setting
  ADD COLUMN IF NOT EXISTS chatbot_ai_config jsonb,
  ADD COLUMN IF NOT EXISTS chatbot_ai_api_key_encrypted text;

CREATE TABLE IF NOT EXISTS platform_chatbot_learning_candidate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint varchar(64) NOT NULL UNIQUE,
  tenant_id integer NOT NULL REFERENCES saas_tenant(id) ON DELETE CASCADE,
  tenant_name varchar(240) NOT NULL DEFAULT '',
  property_id bigint,
  property_title varchar(300) NOT NULL DEFAULT '',
  audience varchar(20) NOT NULL,
  channel varchar(20) NOT NULL,
  kind varchar(24) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'PENDING',
  question text NOT NULL,
  question_hash varchar(64) NOT NULL,
  answer text NOT NULL,
  structured_payload jsonb,
  evidence_knowledge_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider varchar(40) NOT NULL DEFAULT '',
  model varchar(180) NOT NULL DEFAULT '',
  confidence double precision,
  occurrences integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by_master_user_id integer,
  reviewed_at timestamptz,
  qdrant_point_id varchar(80),
  source_hash varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_chatbot_learning_audience_check CHECK (audience IN ('LEAD','REALTOR')),
  CONSTRAINT platform_chatbot_learning_channel_check CHECK (channel IN ('WEB','EMAIL','SMS')),
  CONSTRAINT platform_chatbot_learning_kind_check CHECK (kind IN ('ANSWER','QUALIFICATION')),
  CONSTRAINT platform_chatbot_learning_status_check CHECK (status IN ('PENDING','APPROVED','REJECTED'))
);
CREATE INDEX IF NOT EXISTS idx_platform_chatbot_learning_status_updated
  ON platform_chatbot_learning_candidate(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_chatbot_learning_tenant_status
  ON platform_chatbot_learning_candidate(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_chatbot_learning_question_hash
  ON platform_chatbot_learning_candidate(tenant_id, question_hash, status);
