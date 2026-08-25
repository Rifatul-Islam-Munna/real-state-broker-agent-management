import { TenantDatabaseMigration } from './tenant-database.types';

export const TENANT_DATABASE_MIGRATIONS: TenantDatabaseMigration[] = [
  {
    version: 1,
    name: 'initial_tenant_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_schema_migration (
        version integer PRIMARY KEY,
        name varchar(160) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_setting (
        key varchar(160) PRIMARY KEY,
        value jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_user_profile (
        id bigserial PRIMARY KEY,
        master_user_id integer NOT NULL UNIQUE,
        first_name varchar(100) NOT NULL,
        last_name varchar(100) NOT NULL,
        email varchar(160) NOT NULL UNIQUE,
        role varchar(40) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_property (
        id bigserial PRIMARY KEY,
        title varchar(240) NOT NULL,
        status varchar(60) NOT NULL DEFAULT 'draft',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_lead (
        id bigserial PRIMARY KEY,
        full_name varchar(200) NOT NULL,
        email varchar(160),
        phone varchar(80),
        status varchar(60) NOT NULL DEFAULT 'new',
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_audit_log (
        id bigserial PRIMARY KEY,
        action varchar(120) NOT NULL,
        actor_master_user_id integer,
        summary text NOT NULL DEFAULT '',
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: 2,
    name: 'tenant_realtor_workflows',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_lead_property (
        lead_id bigint NOT NULL REFERENCES tenant_lead(id) ON DELETE CASCADE,
        property_id bigint NOT NULL REFERENCES tenant_property(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (lead_id, property_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_lead_property_property
        ON tenant_lead_property(property_id, lead_id)`,
      `CREATE TABLE IF NOT EXISTS tenant_owner_report (
        id bigserial PRIMARY KEY,
        property_id bigint NOT NULL REFERENCES tenant_property(id) ON DELETE RESTRICT,
        property_title varchar(240) NOT NULL,
        owner_name varchar(200) NOT NULL DEFAULT '',
        owner_email varchar(240) NOT NULL DEFAULT '',
        owner_phone varchar(80) NOT NULL DEFAULT '',
        subject varchar(300) NOT NULL,
        body text NOT NULL,
        channels jsonb NOT NULL DEFAULT '[]'::jsonb,
        delivery_results jsonb NOT NULL DEFAULT '[]'::jsonb,
        delivery_status varchar(40) NOT NULL DEFAULT 'sent',
        sent_by_master_user_id integer,
        sent_by_name varchar(200) NOT NULL DEFAULT '',
        sent_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_owner_report_sent
        ON tenant_owner_report(sent_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_owner_report_property
        ON tenant_owner_report(property_id, sent_at DESC)`,
      `CREATE TABLE IF NOT EXISTS tenant_showing_form_template (
        id bigserial PRIMARY KEY,
        name varchar(200) NOT NULL,
        description text NOT NULL DEFAULT '',
        property_mode varchar(40) NOT NULL DEFAULT 'fixed',
        fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        created_by_master_user_id integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_showing_request (
        id bigserial PRIMARY KEY,
        access_token varchar(96) NOT NULL UNIQUE,
        template_id bigint REFERENCES tenant_showing_form_template(id) ON DELETE SET NULL,
        lead_id bigint NOT NULL REFERENCES tenant_lead(id) ON DELETE CASCADE,
        property_id bigint REFERENCES tenant_property(id) ON DELETE SET NULL,
        requested_property_id bigint REFERENCES tenant_property(id) ON DELETE SET NULL,
        title varchar(240) NOT NULL,
        message text NOT NULL DEFAULT '',
        recipient_name varchar(200) NOT NULL DEFAULT '',
        recipient_email varchar(240) NOT NULL DEFAULT '',
        recipient_phone varchar(80) NOT NULL DEFAULT '',
        property_mode varchar(40) NOT NULL DEFAULT 'fixed',
        fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        delivery_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
        delivery_results jsonb NOT NULL DEFAULT '[]'::jsonb,
        delivery_status varchar(40) NOT NULL DEFAULT 'sent',
        status varchar(40) NOT NULL DEFAULT 'sent',
        expires_at timestamptz NOT NULL,
        preferred_showing_at timestamptz,
        sent_at timestamptz NOT NULL DEFAULT now(),
        viewed_at timestamptz,
        submitted_at timestamptz,
        approved_at timestamptz,
        rejected_at timestamptz,
        assigned_realtor_name varchar(200) NOT NULL DEFAULT '',
        assigned_realtor_email varchar(240) NOT NULL DEFAULT '',
        assigned_realtor_phone varchar(80) NOT NULL DEFAULT '',
        approved_showing_id bigint,
        created_by_master_user_id integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_showing_request_status
        ON tenant_showing_request(status, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_showing_request_lead
        ON tenant_showing_request(lead_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS tenant_showing (
        id bigserial PRIMARY KEY,
        showing_request_id bigint NOT NULL UNIQUE REFERENCES tenant_showing_request(id) ON DELETE CASCADE,
        lead_id bigint NOT NULL REFERENCES tenant_lead(id) ON DELETE CASCADE,
        property_id bigint NOT NULL REFERENCES tenant_property(id) ON DELETE RESTRICT,
        lead_name varchar(200) NOT NULL,
        lead_email varchar(240) NOT NULL DEFAULT '',
        lead_phone varchar(80) NOT NULL DEFAULT '',
        realtor_name varchar(200) NOT NULL,
        realtor_email varchar(240) NOT NULL DEFAULT '',
        realtor_phone varchar(80) NOT NULL DEFAULT '',
        showing_at timestamptz NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'scheduled',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_showing_schedule
        ON tenant_showing(showing_at, status)`,
      `INSERT INTO tenant_showing_form_template(name, description, property_mode, fields)
       SELECT 'Standard showing request',
              'Collect a preferred appointment time, attendee count, and notes for a selected property.',
              'fixed',
              '[{"key":"preferredShowingAt","label":"Preferred showing time","type":"datetime","required":true,"options":[]},{"key":"attendees","label":"Number of attendees","type":"text","required":false,"options":[]},{"key":"notes","label":"Notes or accessibility needs","type":"textarea","required":false,"options":[]}]'::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM tenant_showing_form_template WHERE name = 'Standard showing request'
       )`,
      `INSERT INTO tenant_showing_form_template(name, description, property_mode, fields)
       SELECT 'Choose a property',
              'Let the recipient choose from currently published properties and request a preferred time.',
              'respondent',
              '[{"key":"preferredShowingAt","label":"Preferred showing time","type":"datetime","required":true,"options":[]},{"key":"buyingTimeline","label":"Buying timeline","type":"select","required":false,"options":["Immediately","Within 3 months","Within 6 months","Just researching"]},{"key":"notes","label":"What should the realtor know?","type":"textarea","required":false,"options":[]}]'::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM tenant_showing_form_template WHERE name = 'Choose a property'
       )`,
    ],
  },
  {
    version: 3,
    name: 'tenant_property_operations',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_property_operations_record (
        id bigserial PRIMARY KEY,
        property_id bigint NOT NULL REFERENCES tenant_property(id) ON DELETE CASCADE,
        module_key varchar(80) NOT NULL,
        record_type varchar(80) NOT NULL DEFAULT 'Item',
        title varchar(240) NOT NULL,
        description text NOT NULL DEFAULT '',
        status varchar(60) NOT NULL DEFAULT 'active',
        priority varchar(40) NOT NULL DEFAULT 'medium',
        contact_name varchar(160) NOT NULL DEFAULT '',
        contact_email varchar(240) NOT NULL DEFAULT '',
        contact_phone varchar(80) NOT NULL DEFAULT '',
        amount numeric(18,2),
        due_at timestamptz,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_property_ops_property_module
        ON tenant_property_operations_record(property_id, module_key)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_property_ops_status
        ON tenant_property_operations_record(status, updated_at DESC)`,
    ],
  },
  {
    version: 4,
    name: 'tenant_legacy_resource_store',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_legacy_resource (
        id bigserial PRIMARY KEY,
        resource varchar(100) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_legacy_resource_type
        ON tenant_legacy_resource(resource, updated_at DESC)`,
    ],
  },
  {
    version: 5,
    name: 'tenant_isolated_outreach_queue',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_outreach_job (
        id bigserial PRIMARY KEY,
        idempotency_key varchar(200) NOT NULL UNIQUE,
        lead_id bigint REFERENCES tenant_lead(id) ON DELETE SET NULL,
        source_type varchar(80) NOT NULL DEFAULT 'lead-outreach',
        source_id varchar(120) NOT NULL DEFAULT '',
        channel varchar(20) NOT NULL,
        direction varchar(20) NOT NULL DEFAULT 'Outgoing',
        status varchar(24) NOT NULL DEFAULT 'scheduled',
        recipient_name varchar(200) NOT NULL DEFAULT '',
        recipient_email varchar(240) NOT NULL DEFAULT '',
        recipient_phone varchar(80) NOT NULL DEFAULT '',
        title varchar(500) NOT NULL DEFAULT '',
        body text NOT NULL DEFAULT '',
        media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
        provider varchar(100) NOT NULL DEFAULT '',
        provider_message_id varchar(240) NOT NULL DEFAULT '',
        created_by varchar(200) NOT NULL DEFAULT 'Tenant workspace',
        scheduled_at timestamptz NOT NULL DEFAULT now(),
        next_attempt_at timestamptz NOT NULL DEFAULT now(),
        attempt_count integer NOT NULL DEFAULT 0,
        max_attempts integer NOT NULL DEFAULT 5,
        locked_at timestamptz,
        locked_by varchar(160),
        last_error text NOT NULL DEFAULT '',
        is_read boolean NOT NULL DEFAULT false,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenant_outreach_channel_check CHECK (channel IN ('Email', 'SMS', 'Call')),
        CONSTRAINT tenant_outreach_direction_check CHECK (direction IN ('Incoming', 'Outgoing', 'Scheduled', 'System')),
        CONSTRAINT tenant_outreach_status_check CHECK (status IN ('scheduled', 'processing', 'sent', 'retrying', 'failed', 'dead_letter', 'received', 'paused', 'cancelled')),
        CONSTRAINT tenant_outreach_attempt_count_check CHECK (attempt_count >= 0 AND max_attempts BETWEEN 1 AND 20)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_outreach_due
        ON tenant_outreach_job(next_attempt_at, scheduled_at, id)
        WHERE status IN ('scheduled', 'retrying')`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_outreach_status
        ON tenant_outreach_job(status, updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_outreach_lead
        ON tenant_outreach_job(lead_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_outreach_source
        ON tenant_outreach_job(source_type, source_id)`,
      `CREATE TABLE IF NOT EXISTS tenant_outreach_attempt (
        id bigserial PRIMARY KEY,
        job_id bigint NOT NULL REFERENCES tenant_outreach_job(id) ON DELETE CASCADE,
        attempt_no integer NOT NULL,
        status varchar(24) NOT NULL,
        provider varchar(100) NOT NULL DEFAULT '',
        provider_message_id varchar(240) NOT NULL DEFAULT '',
        error_message text NOT NULL DEFAULT '',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        UNIQUE(job_id, attempt_no)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_outreach_attempt_job
        ON tenant_outreach_attempt(job_id, attempt_no DESC)`,
      `CREATE TABLE IF NOT EXISTS tenant_sync_state (
        sync_key varchar(100) PRIMARY KEY,
        status varchar(24) NOT NULL DEFAULT 'scheduled',
        cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
        last_started_at timestamptz,
        last_completed_at timestamptz,
        last_succeeded_at timestamptz,
        next_run_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        locked_by varchar(160),
        last_error text NOT NULL DEFAULT '',
        imported_count integer NOT NULL DEFAULT 0,
        matched_count integer NOT NULL DEFAULT 0,
        created_count integer NOT NULL DEFAULT 0,
        skipped_count integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenant_sync_status_check CHECK (status IN ('scheduled', 'processing', 'sent', 'retrying', 'failed', 'dead_letter'))
      )`,
    ],
  },
  {
    version: 6,
    name: 'tenant_mail_deletion_tombstones',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_mail_deletion_tombstone (
        provider varchar(100) NOT NULL,
        provider_message_id varchar(240) NOT NULL,
        deleted_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (provider, provider_message_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_mail_deletion_tombstone_deleted
        ON tenant_mail_deletion_tombstone(deleted_at DESC)`,
    ],
  },
  {
    version: 7,
    name: 'repair_false_lead_reply_stages',
    statements: [
      `UPDATE tenant_lead lead
       SET payload = COALESCE(lead.payload, '{}'::jsonb) || jsonb_build_object(
         'stage', CASE
           WHEN EXISTS (
             SELECT 1 FROM tenant_outreach_job sent
             WHERE sent.lead_id = lead.id
               AND sent.direction <> 'Incoming'
               AND sent.status = 'sent'
           ) THEN 'Contacted'
           ELSE 'New'
         END,
         'followUpStatus', CASE
           WHEN EXISTS (
             SELECT 1 FROM tenant_outreach_job pending
             WHERE pending.lead_id = lead.id
               AND pending.direction <> 'Incoming'
               AND pending.status IN ('scheduled', 'retrying')
           ) THEN 'Scheduled'
           ELSE 'Open'
         END
       ),
       updated_at = now()
       WHERE COALESCE(lead.payload->>'stage', '') = 'Replied'
         AND NOT EXISTS (
           SELECT 1
           FROM tenant_outreach_job incoming
           JOIN tenant_outreach_job sent
             ON sent.lead_id = incoming.lead_id
            AND sent.channel = incoming.channel
            AND sent.direction <> 'Incoming'
            AND sent.status = 'sent'
            AND COALESCE(sent.occurred_at, sent.completed_at, sent.updated_at, sent.created_at)
                <= COALESCE(incoming.occurred_at, incoming.created_at)
            AND (
              (sent.channel = 'Email'
               AND lower(COALESCE(sent.recipient_email, '')) = lower(COALESCE(incoming.recipient_email, '')))
              OR
              (sent.channel = 'SMS'
               AND regexp_replace(COALESCE(sent.recipient_phone, ''), '[^0-9]', '', 'g') =
                   regexp_replace(COALESCE(incoming.recipient_phone, ''), '[^0-9]', '', 'g'))
            )
           WHERE incoming.lead_id = lead.id
             AND incoming.direction = 'Incoming'
             AND (
               (incoming.channel = 'Email'
                AND lower(COALESCE(incoming.recipient_email, '')) = lower(COALESCE(lead.email, ''))
                AND COALESCE(lead.email, '') <> '')
               OR
               (incoming.channel = 'SMS'
                AND regexp_replace(COALESCE(incoming.recipient_phone, ''), '[^0-9]', '', 'g') =
                    regexp_replace(COALESCE(lead.phone, ''), '[^0-9]', '', 'g')
                AND regexp_replace(COALESCE(lead.phone, ''), '[^0-9]', '', 'g') <> '')
             )
         )`,
    ],
  },
  {
    version: 8,
    name: 'remove_automatic_new_leads_from_board',
    statements: [
      `UPDATE tenant_lead
       SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('inBoard', false),
           updated_at = now()
       WHERE COALESCE(payload->>'stage', 'New') = 'New'
         AND COALESCE((payload->>'inBoard')::boolean, false) = true
         AND (
           payload ? 'leadCollectionTemplateId'
           OR payload ? 'latestEmailAt'
           OR lower(COALESCE(payload->>'source', '')) LIKE '%inbound%'
         )`,
    ],
  },
  {
    version: 9,
    name: 'showing_request_share_links',
    statements: [
      `ALTER TABLE tenant_showing_request
       ADD COLUMN IF NOT EXISTS expiry_hours integer NOT NULL DEFAULT 72`,
      `CREATE TABLE IF NOT EXISTS tenant_showing_request_link (
        id bigserial PRIMARY KEY,
        showing_request_id bigint NOT NULL REFERENCES tenant_showing_request(id) ON DELETE CASCADE,
        access_token varchar(96) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        created_by_master_user_id integer,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_showing_request_link_request
       ON tenant_showing_request_link(showing_request_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_showing_request_link_expiry
        ON tenant_showing_request_link(expires_at)`,
    ],
  },
  {
    version: 10,
    name: 'place_contacted_leads_on_board',
    statements: [
      `UPDATE tenant_lead
       SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object('inBoard', true),
           updated_at = now()
       WHERE lower(COALESCE(payload->>'stage', status, '')) = 'contacted'
         AND COALESCE(lower(payload->>'inBoard') = 'true', false) = false`,
    ],
  },
  {
    version: 11,
    name: 'tenant_knowledge_chatbot',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_knowledge (
        id bigserial PRIMARY KEY,
        property_id bigint REFERENCES tenant_property(id) ON DELETE CASCADE,
        scope varchar(20) NOT NULL DEFAULT 'TENANT',
        audience varchar(20) NOT NULL DEFAULT 'LEAD',
        source_type varchar(40) NOT NULL DEFAULT 'MANUAL',
        title varchar(240) NOT NULL,
        answer text NOT NULL,
        question_examples jsonb NOT NULL DEFAULT '[]'::jsonb,
        priority integer NOT NULL DEFAULT 50,
        active boolean NOT NULL DEFAULT true,
        source_hash varchar(64) NOT NULL,
        qdrant_point_id varchar(80),
        index_status varchar(24) NOT NULL DEFAULT 'pending',
        last_error text NOT NULL DEFAULT '',
        created_by_master_user_id integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenant_chatbot_knowledge_scope_check
          CHECK (scope IN ('TENANT', 'PROPERTY')),
        CONSTRAINT tenant_chatbot_knowledge_audience_check
          CHECK (audience IN ('LEAD', 'REALTOR')),
        CONSTRAINT tenant_chatbot_knowledge_index_status_check
          CHECK (index_status IN ('pending', 'indexed', 'failed'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_knowledge_search
        ON tenant_chatbot_knowledge(active, audience, property_id, priority DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_knowledge_hash
        ON tenant_chatbot_knowledge(source_hash)`,
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_conversation (
        id bigserial PRIMARY KEY,
        lead_id bigint REFERENCES tenant_lead(id) ON DELETE SET NULL,
        property_id bigint REFERENCES tenant_property(id) ON DELETE SET NULL,
        channel varchar(20) NOT NULL,
        audience varchar(20) NOT NULL DEFAULT 'LEAD',
        session_id varchar(120) NOT NULL DEFAULT '',
        status varchar(24) NOT NULL DEFAULT 'ACTIVE',
        workflow_state varchar(40) NOT NULL DEFAULT 'ANSWERING',
        stop_reason varchar(60),
        turn_count integer NOT NULL DEFAULT 0,
        human_intervened_at timestamptz,
        stopped_by_master_user_id integer,
        stopped_at timestamptz,
        last_message_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenant_chatbot_conversation_channel_check
          CHECK (channel IN ('WEB', 'EMAIL', 'SMS')),
        CONSTRAINT tenant_chatbot_conversation_audience_check
          CHECK (audience IN ('LEAD', 'REALTOR')),
        CONSTRAINT tenant_chatbot_conversation_status_check
          CHECK (status IN ('ACTIVE', 'STOPPED', 'COMPLETED', 'HANDOFF'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_conversation_lead
        ON tenant_chatbot_conversation(lead_id, updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_conversation_session
        ON tenant_chatbot_conversation(session_id, channel, updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_message (
        id bigserial PRIMARY KEY,
        conversation_id bigint NOT NULL
          REFERENCES tenant_chatbot_conversation(id) ON DELETE CASCADE,
        outreach_job_id bigint
          REFERENCES tenant_outreach_job(id) ON DELETE SET NULL,
        role varchar(20) NOT NULL,
        direction varchar(20) NOT NULL,
        body text NOT NULL,
        evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
        confidence numeric(6,5),
        decision varchar(60) NOT NULL DEFAULT '',
        idempotency_key varchar(200) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tenant_chatbot_message_role_check
          CHECK (role IN ('LEAD', 'BOT', 'HUMAN', 'SYSTEM')),
        CONSTRAINT tenant_chatbot_message_direction_check
          CHECK (direction IN ('INCOMING', 'OUTGOING', 'SYSTEM')),
        UNIQUE(conversation_id, idempotency_key)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_message_conversation
        ON tenant_chatbot_message(conversation_id, created_at, id)`,
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_event (
        id bigserial PRIMARY KEY,
        conversation_id bigint NOT NULL
          REFERENCES tenant_chatbot_conversation(id) ON DELETE CASCADE,
        lead_id bigint REFERENCES tenant_lead(id) ON DELETE SET NULL,
        event_type varchar(60) NOT NULL,
        reason varchar(60) NOT NULL DEFAULT '',
        actor_master_user_id integer,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_event_lead
        ON tenant_chatbot_event(lead_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_processed_inbound (
        outreach_job_id bigint PRIMARY KEY
          REFERENCES tenant_outreach_job(id) ON DELETE CASCADE,
        conversation_id bigint
          REFERENCES tenant_chatbot_conversation(id) ON DELETE SET NULL,
        processed_at timestamptz NOT NULL DEFAULT now()
      )`,
      `INSERT INTO tenant_setting(key, value)
       VALUES (
         'chatbot_settings',
         '{"enabled":false,"channels":{"web":false,"email":false,"sms":false},"minimumConfidence":0.82,"responseDelaySeconds":15,"maxTurns":20}'::jsonb
       )
       ON CONFLICT (key) DO NOTHING`,
    ],
  },
  {
    version: 12,
    name: 'chatbot_web_session_tokens',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenant_chatbot_web_session (
        id bigserial PRIMARY KEY,
        token_hash varchar(64) NOT NULL UNIQUE,
        lead_id bigint NOT NULL REFERENCES tenant_lead(id) ON DELETE CASCADE,
        property_id bigint NOT NULL REFERENCES tenant_property(id) ON DELETE CASCADE,
        contact_request_id bigint,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_web_session_expiry
        ON tenant_chatbot_web_session(expires_at) WHERE revoked_at IS NULL`,
    ],
  },
  {
    version: 13,
    name: 'chatbot_lead_controls_and_activity_retention',
    statements: [
      `ALTER TABLE tenant_lead
        ADD COLUMN IF NOT EXISTS chatbot_manually_stopped boolean NOT NULL DEFAULT false`,
      `ALTER TABLE tenant_lead
        ADD COLUMN IF NOT EXISTS chatbot_control_updated_at timestamptz`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_message_created_at
        ON tenant_chatbot_message(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_chatbot_event_created_at
        ON tenant_chatbot_event(created_at)`,
    ],
  },
];
