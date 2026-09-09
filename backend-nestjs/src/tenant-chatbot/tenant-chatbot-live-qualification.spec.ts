import { normalizeChatbotSettings } from './tenant-chatbot-policy';
import { TenantChatbotService } from './tenant-chatbot.service';

describe('Tenant chatbot live qualification workflow', () => {
  const tenant = {
    id: 42,
    databaseName: 'tenant_42',
    businessName: 'Alpha',
  } as any;
  const settings = normalizeChatbotSettings({
    enabled: true,
    channels: { web: true, email: true, sms: true },
    responseDelaySeconds: 0,
  });

  function harness(options?: {
    verifiedRealtor?: boolean;
    credit?: string;
    income?: string;
    ai?: { interpretReply?: jest.Mock; answerFromEvidence?: jest.Mock };
    learning?: {
      approvedQualificationHint?: jest.Mock;
      recordQualification?: jest.Mock;
      recordAnswer?: jest.Mock;
    };
  }) {
    let conversation: any = null;
    let leadPayload: Record<string, unknown> = {
      ...(options?.credit ? { creditScore: options.credit } : {}),
      ...(options?.income ? { monthlyEarning: options.income } : {}),
    };
    const query = jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('SELECT value FROM tenant_setting'))
        return { rows: [{ value: settings }] };
      if (sql.includes('chatbot_manually_stopped'))
        return { rows: [{ chatbotManuallyStopped: false }] };
      if (sql.includes('SELECT audience FROM tenant_chatbot_conversation')) {
        return {
          rows: conversation ? [{ audience: conversation.audience }] : [],
        };
      }
      if (sql.includes('JOIN tenant_legacy_resource realtor')) {
        return { rows: options?.verifiedRealtor ? [{ '?column?': 1 }] : [] };
      }
      if (sql.includes('FROM tenant_lead l')) {
        return {
          rows: [
            {
              id: 7,
              fullName: 'Sam Lead',
              email: 'sam@example.com',
              phone: '555',
              payload: leadPayload,
              doNotContact: false,
            },
          ],
        };
      }
      if (sql.includes('FROM tenant_lead WHERE id = $1')) {
        return { rows: [{ id: 7, payload: leadPayload }] };
      }
      if (
        sql.includes('FROM tenant_property') &&
        sql.includes('WHERE id = $1')
      ) {
        return {
          rows: [
            {
              id: 9,
              title: 'Lime Bay',
              status: 'published',
              payload: {
                minimumCreditScore: 720,
                minimumMonthlyIncome: 4650,
                exactLocation: '9101 Lime Bay Blvd',
              },
            },
          ],
        };
      }
      if (
        sql.includes('FROM tenant_property') &&
        sql.includes("status = 'published'")
      ) {
        return {
          rows: [
            {
              id: 12,
              title: 'Palm Court',
              status: 'published',
              payload: {
                minimumCreditScore: 620,
                minimumMonthlyIncome: 3500,
                monthlyRent: '1400',
                exactLocation: '12 Palm Court',
              },
            },
          ],
        };
      }
      if (sql.includes('FROM tenant_chatbot_knowledge')) {
        return {
          rows: [
            {
              id: 'k-credit',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Lime Bay - Minimum credit score',
              answer: 'Minimum credit score: 720',
              priority: 90,
              active: true,
              sourceHash: 'credit',
            },
            {
              id: 'k-parking',
              propertyId: 9,
              scope: 'PROPERTY',
              audience: 'LEAD',
              sourceType: 'PROPERTY_FIELD',
              title: 'Lime Bay - Parking',
              answer: 'Parking: 1 assigned spot and 1 guest parking spot',
              priority: 80,
              active: true,
              sourceHash: 'parking',
            },
          ],
        };
      }
      if (
        sql.includes('FROM tenant_chatbot_conversation') &&
        sql.includes('LIMIT 1')
      ) {
        return { rows: conversation ? [conversation] : [] };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_conversation')) {
        conversation = {
          id: '31',
          status: 'ACTIVE',
          stopReason: null,
          audience: params[3] ?? 'LEAD',
          workflowState: params[5] ?? 'ANSWERING',
          turnCount: 0,
        };
        return { rows: [conversation] };
      }
      if (
        sql.includes('UPDATE tenant_chatbot_conversation') &&
        sql.includes('workflow_state')
      ) {
        if (sql.includes('audience = $2')) conversation.audience = params[1];
        conversation.workflowState =
          params[sql.includes('audience = $2') ? 2 : 1];
        return { rows: [{ id: '31' }] };
      }
      if (sql.includes('UPDATE tenant_lead') && sql.includes('creditScore')) {
        leadPayload = { ...leadPayload, creditScore: String(params[1]) };
        return { rows: [{ id: 7 }] };
      }
      if (
        sql.includes('UPDATE tenant_lead') &&
        sql.includes('monthlyEarning')
      ) {
        leadPayload = { ...leadPayload, monthlyEarning: String(params[1]) };
        return { rows: [{ id: 7 }] };
      }
      if (
        sql.includes('INSERT INTO tenant_chatbot_message') &&
        sql.includes("'LEAD'")
      )
        return { rows: [{ id: '100' }] };
      if (sql.includes('INSERT INTO tenant_chatbot_message'))
        return { rows: [{ id: '101' }] };
      return { rows: [] };
    });
    const database = {
      withTenantClient: jest.fn(async (_name: string, work: any) =>
        work({ query }),
      ),
    };
    const embeddings = {
      embed: jest.fn(async () => Array(384).fill(0.01)),
      modelSignature: jest.fn(
        () => 'snowflake/snowflake-arctic-embed-xs|q8|384|cls|arctic-query-v1',
      ),
    };
    const vectorMatches = [
      {
        pointId: 'p-credit',
        score: 0.9,
        scope: 'PROPERTY',
        tenantId: 42,
        audience: 'LEAD',
        propertyId: 9,
        knowledgeId: 'k-credit',
        sourceType: 'PROPERTY_FIELD',
        sourceHash: 'credit',
        priority: 90,
        active: true,
      },
      {
        pointId: 'p-parking',
        score: 0.9,
        scope: 'PROPERTY',
        tenantId: 42,
        audience: 'LEAD',
        propertyId: 9,
        knowledgeId: 'k-parking',
        sourceType: 'PROPERTY_FIELD',
        sourceHash: 'parking',
        priority: 80,
        active: true,
      },
    ];
    const vectors = {
      isConfigured: jest.fn(() => true),
      healthCheck: jest.fn(async () => ({
        configured: true,
        connected: true,
        error: null,
      })),
      search: jest.fn(async (input: any) =>
        input.scope === 'TENANT' ? vectorMatches : [],
      ),
    };
    const service = new TenantChatbotService(
      database as any,
      embeddings as any,
      vectors as any,
      { findActiveByIds: jest.fn(async () => []) } as any,
      options?.ai as any,
      options?.learning as any,
    );
    const send = (
      body: string,
      id: string,
      extra: Record<string, unknown> = {},
    ) =>
      service.handleMessage(tenant, {
        channel: 'WEB',
        leadId: 7,
        propertyId: 9,
        sessionId: 'web-role',
        idempotencyKey: id,
        body,
        requireRoleConfirmation: true,
        realtorVerified: options?.verifiedRealtor === true,
        ...extra,
      });
    return {
      service,
      send,
      query,
      getLeadPayload: () => leadPayload,
      getConversation: () => conversation,
    };
  }

  it('answers a greeting first and then asks the visitor role without returning unrelated property evidence', async () => {
    const state = harness();
    const result = await state.send('hello', 'greeting-1');
    expect(result).toMatchObject({
      decision: 'ASK_ROLE',
      reason: 'ROLE_REQUIRED',
      queued: false,
    });
    expect(result.answer).toMatch(/hi|hello/i);
    expect(result.answer).toMatch(/for you|realtor/i);
    expect(result.answer).not.toMatch(/minimum credit score is 720/i);
    expect(state.getConversation()?.workflowState).toBe('ASK_ROLE');
  });

  it('acknowledges a greeting while qualification is pending and repeats the missing field', async () => {
    const state = harness();
    await state.send('hello', 'pending-1');
    await state.send('tenant', 'pending-2');
    const waitingCredit = await state.send('hey', 'pending-3');
    expect(waitingCredit).toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
    });
    expect(waitingCredit.answer).toMatch(/credit score/i);
    await state.send('690', 'pending-4');
    const waitingIncome = await state.send('good morning', 'pending-5');
    expect(waitingIncome).toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
    });
    expect(waitingIncome.answer).toMatch(/income/i);
  });

  it('answers a safe property question first, then asks whether the visitor is a tenant or Realtor', async () => {
    const state = harness();
    const result = await state.send(
      'For this property what minimum credit score do I need?',
      'm1',
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
      queued: false,
    });
    expect(result.answer).toMatch(/minimum credit score is 720/i);
    expect(result.answer).toMatch(/tenant|realtor/i);
    expect(state.getConversation()?.workflowState).toBe('ASK_ROLE');
  });

  it('does not block safe property Q&A while credit qualification is still missing', async () => {
    const state = harness();
    await state.send('hello, I have a question about the property', 'm1');
    await state.send('tenant', 'm2');
    const result = await state.send('Can I park my car?', 'm3');
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
    });
    expect(result.answer).toMatch(/1 assigned parking spot/i);
    expect(result.answer).toMatch(/credit score/i);
    expect(state.getConversation()?.workflowState).toBe('ASK_CREDIT');
  });

  it('collects only credit score and monthly earning, saves both, then enables showing', async () => {
    const state = harness();
    await state.send('Can I park my car?', 'm1');
    await expect(state.send('I am a tenant', 'm2')).resolves.toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
    });
    await expect(state.send('my credit is 735', 'm3')).resolves.toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
    });
    expect(state.getLeadPayload()).toMatchObject({ creditScore: '735' });
    await expect(
      state.send('I make $5,000 per month', 'm4'),
    ).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '735',
      monthlyEarning: '5000',
    });
  });

  it('suggests other published properties when credit is below the selected property minimum', async () => {
    const state = harness();
    await state.send('hello', 'm1');
    await state.send('tenant', 'm2');
    await state.send('650', 'm3');
    const result = await state.send('I make $5,000 per month', 'm4');
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'CREDIT_BELOW_MINIMUM',
      showingEligible: false,
    });
    expect(result.answer).toContain('Palm Court');
  });

  it('lets a self-declared Realtor use Realtor context but blocks lockbox/access secrets until verified', async () => {
    const state = harness();
    await state.send('hello', 'm1');
    await expect(state.send('I am a Realtor', 'm2')).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'ROLE_CAPTURED',
      realtorVerified: false,
    });
    await expect(
      state.send('what is the lockbox code?', 'm3'),
    ).resolves.toMatchObject({
      decision: 'STOP',
      reason: 'REALTOR_VERIFICATION_REQUIRED',
      realtorVerified: false,
    });
  });

  it('marks a Realtor verified only when the tenant Realtor directory matches', async () => {
    const state = harness({ verifiedRealtor: true });
    await state.send('hello', 'm1');
    await expect(state.send('realtor', 'm2')).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'ROLE_CAPTURED',
      realtorVerified: true,
    });
  });
  it('routes a direct showing request through role and qualification instead of generic evidence fallback', async () => {
    const state = harness();
    await expect(
      state.send(
        'I wanna rent this, can you give me the showing form?',
        'show-1',
      ),
    ).resolves.toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
      showingEligible: false,
    });
    await expect(state.send('800', 'show-2')).resolves.toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
      showingEligible: false,
    });
    const result = await state.send('6k', 'show-3');
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(result.answer).toMatch(/showing|request/i);
  });

  it('opens the showing path immediately after role confirmation when stored qualification already passes', async () => {
    const state = harness({ credit: '800', income: '6000' });
    await state.send('can I schedule a tour?', 'tour-1');
    const result = await state.send('tenant', 'tour-2');
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
  });

  it('understands a misspelled first-message showing request and asks the visitor role', async () => {
    const state = harness();
    const result = await state.send(
      'can i have a shwoing tommorw?',
      'typo-show-1',
    );
    expect(result).toMatchObject({
      decision: 'ASK_ROLE',
      reason: 'ROLE_REQUIRED',
      showingEligible: false,
    });
  });

  it('uses proactively supplied role, credit, and income in one message and unlocks showing immediately', async () => {
    const state = harness();
    const result = await state.send(
      'I want to rent this place myself. My credit is 760 and I make $5,500 per month. Can I come see it tomorrow?',
      'all-at-once-1',
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '760',
      monthlyEarning: '5500',
    });
  });

  it('uses the same human slang and typo workflow for SMS conversations', async () => {
    const state = harness();
    const sms = { channel: 'SMS', sessionId: 'sms-human' };
    await expect(
      state.send('yo cud i swing by tmr?', 'sms-1', sms),
    ).resolves.toMatchObject({ decision: 'ASK_ROLE', reason: 'ROLE_REQUIRED' });
    await expect(
      state.send('just me n my wife', 'sms-2', sms),
    ).resolves.toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
    });
    await expect(
      state.send('seven forty', 'sms-3', sms),
    ).resolves.toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
    });
    await expect(state.send('5k monthly', 'sms-4', sms)).resolves.toMatchObject(
      { decision: 'ANSWER', reason: 'QUALIFIED', showingEligible: true },
    );
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '740',
      monthlyEarning: '5000',
    });
  });

  it('understands a natural all-at-once email qualification and showing request', async () => {
    const state = harness();
    const result = await state.send(
      'Hi, this is for me. my score is seven forty and i make 5k monthly. wud love to take a look this wknd.',
      'email-human-1',
      { channel: 'EMAIL', sessionId: 'email-human' },
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '740',
      monthlyEarning: '5000',
    });
  });

  it('keeps invalid human credit self-reports in qualification instead of answering the property minimum', async () => {
    const state = harness();
    await expect(
      state.send(
        'i wanna visit this propraty tommor is it possibale to do it can you give me details',
        'human-visit-1',
      ),
    ).resolves.toMatchObject({ decision: 'ASK_ROLE', reason: 'ROLE_REQUIRED' });
    await expect(
      state.send('just me n my wife', 'human-visit-2'),
    ).resolves.toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
    });
    const invalid = await state.send(
      'ahhh, my credit score is like 900',
      'human-visit-3',
    );
    expect(invalid).toMatchObject({
      decision: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
      showingEligible: false,
    });
    expect(invalid.answer).toMatch(/300–850/);
    await expect(
      state.send('not great maybe 790', 'human-visit-4'),
    ).resolves.toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
    });
    await expect(
      state.send('between 5 and 6k', 'human-visit-5'),
    ).resolves.toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '790',
      monthlyEarning: '5000',
    });
  });

  it('accepts a valid human credit reply even when the same message repeats the showing request', async () => {
    const state = harness();
    await state.send('can i visit tomorrow?', 'show-credit-1');
    await state.send('this is for me', 'show-credit-2');
    await expect(
      state.send(
        'my score is around 740, can i still come see it tomorrow?',
        'show-credit-3',
      ),
    ).resolves.toMatchObject({
      decision: 'ASK_INCOME',
      reason: 'INCOME_REQUIRED',
    });
  });

  it('uses AI only when a human qualification reply is genuinely hard to parse', async () => {
    const ai = {
      interpretReply: jest.fn().mockResolvedValue({
        recognized: true,
        role: null,
        creditScore: null,
        monthlyEarning: 5417,
        period: 'BIWEEKLY',
        confidence: 0.93,
        provider: 'OpenRouter',
        model: 'free/model-a',
      }),
    };
    const learning = {
      approvedQualificationHint: jest.fn().mockResolvedValue(null),
      recordQualification: jest.fn().mockResolvedValue({ id: 'learn-1' }),
    };
    const state = harness({ ai, learning });
    await state.send('can i visit tomorrow?', 'ai-human-1');
    await state.send('this one is for me', 'ai-human-2');
    await state.send('760', 'ai-human-3');
    const result = await state.send(
      'i receive a couple and a half thousand every two weeks before tax',
      'ai-human-4',
      { channel: 'EMAIL', sessionId: 'email-ai-human' },
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '760',
      monthlyEarning: '5417',
    });
    expect(ai.interpretReply).toHaveBeenCalledWith(
      expect.objectContaining({
        expected: 'monthlyEarning',
        channel: 'EMAIL',
      }),
    );
    expect(learning.recordQualification).toHaveBeenCalledWith(
      expect.objectContaining({
        question:
          'i receive a couple and a half thousand every two weeks before tax',
        structuredPayload: expect.objectContaining({
          expected: 'monthlyEarning',
          monthlyEarning: 5417,
        }),
      }),
    );
  });

  it('uses AI for an unusual role reply and records the interpretation for review', async () => {
    const ai = {
      interpretReply: jest.fn().mockResolvedValue({
        recognized: true,
        role: 'REALTOR',
        creditScore: null,
        monthlyEarning: null,
        period: null,
        confidence: 0.96,
        provider: 'OpenRouter',
        model: 'free/model-b',
      }),
    };
    const learning = {
      approvedQualificationHint: jest.fn().mockResolvedValue(null),
      recordQualification: jest.fn().mockResolvedValue({ id: 'role-review' }),
    };
    const state = harness({ ai, learning });
    await state.send('can i arrange a viewing?', 'ai-role-1');
    const result = await state.send(
      'im handling this for a purchaser as their representative',
      'ai-role-2',
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'ROLE_CAPTURED',
    });
    expect(state.getConversation()?.audience).toBe('REALTOR');
    expect(ai.interpretReply).toHaveBeenCalledWith(
      expect.objectContaining({ expected: 'role' }),
    );
    expect(learning.recordQualification).toHaveBeenCalledWith(
      expect.objectContaining({
        structuredPayload: { expected: 'role', role: 'REALTOR' },
      }),
    );
  });

  it('reuses an approved exact hard reply locally without calling AI again', async () => {
    const ai = { interpretReply: jest.fn().mockResolvedValue(null) };
    const learning = {
      approvedQualificationHint: jest.fn(async (input: any) =>
        input.expected === 'monthlyEarning'
          ? {
              exact: true,
              score: 1,
              candidateId: 'approved-income',
              role: null,
              creditScore: null,
              monthlyEarning: 5417,
            }
          : null,
      ),
    };
    const state = harness({ ai, learning });
    await state.send('can i visit tomorrow?', 'learned-1');
    await state.send('this is for me', 'learned-2');
    await state.send('760', 'learned-3');
    const result = await state.send(
      'i receive a couple and a half thousand every two weeks before tax',
      'learned-4',
    );
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'QUALIFIED',
      showingEligible: true,
    });
    expect(state.getLeadPayload()).toMatchObject({
      creditScore: '760',
      monthlyEarning: '5417',
    });
    expect(ai.interpretReply).not.toHaveBeenCalled();
  });

  it('does not spend an AI call on an ordinary property question while qualification is pending', async () => {
    const ai = { interpretReply: jest.fn().mockResolvedValue(null) };
    const learning = {
      approvedQualificationHint: jest.fn().mockResolvedValue(null),
    };
    const state = harness({ ai, learning });
    await state.send('hello', 'gate-1');
    await state.send('tenant', 'gate-2');
    const result = await state.send('Can I park my car?', 'gate-3');
    expect(result).toMatchObject({
      decision: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
    });
    expect(ai.interpretReply).not.toHaveBeenCalled();
    expect(learning.approvedQualificationHint).not.toHaveBeenCalled();
  });
});
