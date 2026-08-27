import { normalizeChatbotSettings } from './tenant-chatbot-policy';
import { TenantChatbotService } from './tenant-chatbot.service';

describe('Tenant chatbot live qualification workflow', () => {
  const tenant = { id: 42, databaseName: 'tenant_42', businessName: 'Alpha' } as any;
  const settings = normalizeChatbotSettings({
    enabled: true,
    channels: { web: true, email: true, sms: true },
    responseDelaySeconds: 0,
  });

  function harness(options?: { verifiedRealtor?: boolean; credit?: string; income?: string }) {
    let conversation: any = null;
    let leadPayload: Record<string, unknown> = {
      ...(options?.credit ? { creditScore: options.credit } : {}),
      ...(options?.income ? { monthlyEarning: options.income } : {}),
    };
    const query = jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('SELECT value FROM tenant_setting')) return { rows: [{ value: settings }] };
      if (sql.includes('chatbot_manually_stopped')) return { rows: [{ chatbotManuallyStopped: false }] };
      if (sql.includes('SELECT audience FROM tenant_chatbot_conversation')) {
        return { rows: conversation ? [{ audience: conversation.audience }] : [] };
      }
      if (sql.includes("JOIN tenant_legacy_resource realtor")) {
        return { rows: options?.verifiedRealtor ? [{ '?column?': 1 }] : [] };
      }
      if (sql.includes('FROM tenant_lead l')) {
        return { rows: [{ id: 7, fullName: 'Sam Lead', email: 'sam@example.com', phone: '555', payload: leadPayload, doNotContact: false }] };
      }
      if (sql.includes('FROM tenant_lead WHERE id = $1')) {
        return { rows: [{ id: 7, payload: leadPayload }] };
      }
      if (sql.includes('FROM tenant_property') && sql.includes('WHERE id = $1')) {
        return { rows: [{ id: 9, title: 'Lime Bay', status: 'published', payload: { minimumCreditScore: 720, minimumMonthlyIncome: 4650, exactLocation: '9101 Lime Bay Blvd' } }] };
      }
      if (sql.includes("FROM tenant_property") && sql.includes("status = 'published'")) {
        return { rows: [{ id: 12, title: 'Palm Court', status: 'published', payload: { minimumCreditScore: 620, minimumMonthlyIncome: 3500, monthlyRent: '1400', exactLocation: '12 Palm Court' } }] };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return { rows: [
          { id: 'k-credit', propertyId: 9, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'Lime Bay - Minimum credit score', answer: 'Minimum credit score: 720', priority: 90, active: true, sourceHash: 'credit' },
          { id: 'k-parking', propertyId: 9, scope: 'PROPERTY', audience: 'LEAD', sourceType: 'PROPERTY_FIELD', title: 'Lime Bay - Parking', answer: 'Parking: 1 assigned spot and 1 guest parking spot', priority: 80, active: true, sourceHash: 'parking' },
        ] };
      }
      if (sql.includes('FROM tenant_chatbot_conversation') && sql.includes('LIMIT 1')) {
        return { rows: conversation ? [conversation] : [] };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_conversation')) {
        conversation = {
          id: '31', status: 'ACTIVE', stopReason: null,
          audience: params[3] ?? 'LEAD', workflowState: params[5] ?? 'ANSWERING', turnCount: 0,
        };
        return { rows: [conversation] };
      }
      if (sql.includes('UPDATE tenant_chatbot_conversation') && sql.includes('workflow_state')) {
        if (sql.includes('audience = $2')) conversation.audience = params[1];
        conversation.workflowState = params[sql.includes('audience = $2') ? 2 : 1];
        return { rows: [{ id: '31' }] };
      }
      if (sql.includes('UPDATE tenant_lead') && sql.includes('creditScore')) {
        leadPayload = { ...leadPayload, creditScore: String(params[1]) };
        return { rows: [{ id: 7 }] };
      }
      if (sql.includes('UPDATE tenant_lead') && sql.includes('monthlyEarning')) {
        leadPayload = { ...leadPayload, monthlyEarning: String(params[1]) };
        return { rows: [{ id: 7 }] };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_message') && sql.includes("'LEAD'")) return { rows: [{ id: '100' }] };
      if (sql.includes('INSERT INTO tenant_chatbot_message')) return { rows: [{ id: '101' }] };
      return { rows: [] };
    });
    const database = { withTenantClient: jest.fn(async (_name: string, work: any) => work({ query })) };
    const embeddings = {
      embed: jest.fn(async () => Array(384).fill(0.01)),
      modelSignature: jest.fn(() => 'snowflake/snowflake-arctic-embed-xs|q8|384|cls|arctic-query-v1'),
    };
    const vectorMatches = [
      { pointId: 'p-credit', score: 0.9, scope: 'PROPERTY', tenantId: 42, audience: 'LEAD', propertyId: 9, knowledgeId: 'k-credit', sourceType: 'PROPERTY_FIELD', sourceHash: 'credit', priority: 90, active: true },
      { pointId: 'p-parking', score: 0.9, scope: 'PROPERTY', tenantId: 42, audience: 'LEAD', propertyId: 9, knowledgeId: 'k-parking', sourceType: 'PROPERTY_FIELD', sourceHash: 'parking', priority: 80, active: true },
    ];
    const vectors = {
      isConfigured: jest.fn(() => true),
      healthCheck: jest.fn(async () => ({ configured: true, connected: true, error: null })),
      search: jest.fn(async (input: any) => input.scope === 'TENANT' ? vectorMatches : []),
    };
    const service = new TenantChatbotService(
      database as any,
      embeddings as any,
      vectors as any,
      { findActiveByIds: jest.fn(async () => []) } as any,
    );
    const send = (body: string, id: string, extra: Record<string, unknown> = {}) => service.handleMessage(tenant, {
      channel: 'WEB', leadId: 7, propertyId: 9, sessionId: 'web-role',
      idempotencyKey: id, body, requireRoleConfirmation: true, realtorVerified: options?.verifiedRealtor === true,
      ...extra,
    });
    return { service, send, query, getLeadPayload: () => leadPayload, getConversation: () => conversation };
  }

  it('answers a safe property question first, then asks whether the visitor is a tenant or Realtor', async () => {
    const state = harness();
    const result = await state.send('For this property what minimum credit score do I need?', 'm1');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'EVIDENCE_VERIFIED', queued: false });
    expect(result.answer).toMatch(/minimum credit score is 720/i);
    expect(result.answer).toMatch(/tenant|realtor/i);
    expect(state.getConversation()?.workflowState).toBe('ASK_ROLE');
  });

  it('does not block safe property Q&A while credit qualification is still missing', async () => {
    const state = harness();
    await state.send('hello, I have a question about the property', 'm1');
    await state.send('tenant', 'm2');
    const result = await state.send('Can I park my car?', 'm3');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'EVIDENCE_VERIFIED' });
    expect(result.answer).toMatch(/1 assigned parking spot/i);
    expect(result.answer).toMatch(/credit score/i);
    expect(state.getConversation()?.workflowState).toBe('ASK_CREDIT');
  });

  it('collects only credit score and monthly earning, saves both, then enables showing', async () => {
    const state = harness();
    await state.send('Can I park my car?', 'm1');
    await expect(state.send('I am a tenant', 'm2')).resolves.toMatchObject({ decision: 'ASK_CREDIT', reason: 'CREDIT_REQUIRED' });
    await expect(state.send('my credit is 735', 'm3')).resolves.toMatchObject({ decision: 'ASK_INCOME', reason: 'INCOME_REQUIRED' });
    expect(state.getLeadPayload()).toMatchObject({ creditScore: '735' });
    await expect(state.send('I make $5,000 per month', 'm4')).resolves.toMatchObject({
      decision: 'ANSWER', reason: 'QUALIFIED', showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({ creditScore: '735', monthlyEarning: '5000' });
  });

  it('suggests other published properties when credit is below the selected property minimum', async () => {
    const state = harness();
    await state.send('hello', 'm1');
    await state.send('tenant', 'm2');
    await state.send('650', 'm3');
    const result = await state.send('I make $5,000 per month', 'm4');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'CREDIT_BELOW_MINIMUM', showingEligible: false });
    expect(result.answer).toContain('Palm Court');
  });

  it('lets a self-declared Realtor use Realtor context but blocks lockbox/access secrets until verified', async () => {
    const state = harness();
    await state.send('hello', 'm1');
    await expect(state.send('I am a Realtor', 'm2')).resolves.toMatchObject({
      decision: 'ANSWER', reason: 'ROLE_CAPTURED', realtorVerified: false,
    });
    await expect(state.send('what is the lockbox code?', 'm3')).resolves.toMatchObject({
      decision: 'STOP', reason: 'REALTOR_VERIFICATION_REQUIRED', realtorVerified: false,
    });
  });

  it('marks a Realtor verified only when the tenant Realtor directory matches', async () => {
    const state = harness({ verifiedRealtor: true });
    await state.send('hello', 'm1');
    await expect(state.send('realtor', 'm2')).resolves.toMatchObject({
      decision: 'ANSWER', reason: 'ROLE_CAPTURED', realtorVerified: true,
    });
  });
  it('routes a direct showing request through role and qualification instead of generic evidence fallback', async () => {
    const state = harness();
    await expect(state.send('I wanna rent this, can you give me the showing form?', 'show-1')).resolves.toMatchObject({
      decision: 'ASK_CREDIT', reason: 'CREDIT_REQUIRED', showingEligible: false,
    });
    await expect(state.send('800', 'show-2')).resolves.toMatchObject({
      decision: 'ASK_INCOME', reason: 'INCOME_REQUIRED', showingEligible: false,
    });
    const result = await state.send('6k', 'show-3');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'QUALIFIED', showingEligible: true });
    expect(result.answer).toMatch(/showing|request/i);
  });

  it('opens the showing path immediately after role confirmation when stored qualification already passes', async () => {
    const state = harness({ credit: '800', income: '6000' });
    await state.send('can I schedule a tour?', 'tour-1');
    const result = await state.send('tenant', 'tour-2');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'QUALIFIED', showingEligible: true });
  });

  it('understands a misspelled first-message showing request and asks the visitor role', async () => {
    const state = harness();
    const result = await state.send('can i have a shwoing tommorw?', 'typo-show-1');
    expect(result).toMatchObject({ decision: 'ASK_ROLE', reason: 'ROLE_REQUIRED', showingEligible: false });
  });

  it('uses proactively supplied role, credit, and income in one message and unlocks showing immediately', async () => {
    const state = harness();
    const result = await state.send('I want to rent this place myself. My credit is 760 and I make $5,500 per month. Can I come see it tomorrow?', 'all-at-once-1');
    expect(result).toMatchObject({ decision: 'ANSWER', reason: 'QUALIFIED', showingEligible: true });
    expect(state.getLeadPayload()).toMatchObject({ creditScore: '760', monthlyEarning: '5500' });
  });
});

