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
});
