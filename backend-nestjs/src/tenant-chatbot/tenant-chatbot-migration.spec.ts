import { TENANT_DATABASE_MIGRATIONS } from '../tenant-database/tenant-database.migrations';

describe('tenant chatbot migration', () => {
  it('adds the complete version 11 chatbot schema', () => {
    const migration = TENANT_DATABASE_MIGRATIONS.find(
      (candidate) => candidate.version === 11,
    );

    expect(migration?.name).toBe('tenant_knowledge_chatbot');
    const sql = migration?.statements.join('\n') ?? '';

    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS tenant_chatbot_knowledge',
    );
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS tenant_chatbot_conversation',
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tenant_chatbot_message');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tenant_chatbot_event');
    expect(sql).toContain(
      'CREATE TABLE IF NOT EXISTS tenant_chatbot_processed_inbound',
    );
    expect(sql).toContain("audience IN ('LEAD', 'REALTOR')");
    expect(sql).toContain("channel IN ('WEB', 'EMAIL', 'SMS')");
    expect(sql).toContain('UNIQUE(conversation_id, idempotency_key)');
    expect(sql).toContain("'chatbot_settings'");
  });

  it('backfills chatbot conversation workflow state for existing tenant databases', () => {
    const migration = TENANT_DATABASE_MIGRATIONS.find((candidate) => candidate.version === 14);
    const sql = migration?.statements.join('\n') ?? '';

    expect(migration?.name).toBe('chatbot_conversation_workflow_state');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS workflow_state');
    expect(sql).toContain("DEFAULT 'ANSWERING'");
  });
  it('adds durable lead controls and activity retention indexes', () => {
    const migration = TENANT_DATABASE_MIGRATIONS.find((candidate) => candidate.version === 13);
    const sql = migration?.statements.join('\n') ?? '';

    expect(migration?.name).toBe('chatbot_lead_controls_and_activity_retention');
    expect(sql).toContain('chatbot_manually_stopped');
    expect(sql).toContain('chatbot_control_updated_at');
    expect(sql).toContain('idx_tenant_chatbot_message_created_at');
    expect(sql).toContain('idx_tenant_chatbot_event_created_at');
  });

});
