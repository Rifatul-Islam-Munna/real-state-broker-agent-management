import {
  defaultChatbotSettings,
  evaluateChatbotPolicy,
  normalizeChatbotSettings,
} from './tenant-chatbot-policy';

describe('tenant chatbot policy', () => {
  const activeSettings = () =>
    normalizeChatbotSettings({
      enabled: true,
      channels: { web: true, email: true, sms: true },
    });

  it('is disabled and fail-closed by default', () => {
    expect(defaultChatbotSettings()).toMatchObject({
      enabled: false,
      channels: { web: false, email: false, sms: false },
      minimumConfidence: 0.82,
    });
    expect(
      evaluateChatbotPolicy({
        settings: defaultChatbotSettings(),
        channel: 'WEB',
        conversationStatus: 'ACTIVE',
      }),
    ).toEqual({
      action: 'STOP',
      reason: 'BOT_DISABLED',
      terminal: false,
    });
  });

  it('enforces the selected channel toggle', () => {
    const settings = activeSettings();
    settings.channels.email = false;
    expect(
      evaluateChatbotPolicy({
        settings,
        channel: 'EMAIL',
        conversationStatus: 'ACTIVE',
      }),
    ).toMatchObject({
      action: 'STOP',
      reason: 'CHANNEL_DISABLED',
      terminal: false,
    });
  });

  it('gives an existing stop and human intervention priority over retrieval', () => {
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'SMS',
        conversationStatus: 'STOPPED',
        conversationStopReason: 'MANUAL_STOP',
        humanIntervened: true,
      }),
    ).toEqual({
      action: 'STOP',
      reason: 'MANUAL_STOP',
      terminal: true,
    });
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'SMS',
        conversationStatus: 'ACTIVE',
        humanIntervened: true,
      }),
    ).toMatchObject({
      action: 'STOP',
      reason: 'HUMAN_INTERVENED',
      terminal: true,
    });
  });

  it('stops for do-not-contact and an unavailable property', () => {
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'EMAIL',
        conversationStatus: 'ACTIVE',
        doNotContact: true,
      }),
    ).toMatchObject({ reason: 'DO_NOT_CONTACT', terminal: true });
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'WEB',
        conversationStatus: 'ACTIVE',
        propertyStatus: 'archived',
      }),
    ).toMatchObject({ reason: 'PROPERTY_UNAVAILABLE', terminal: true });
  });

  it('asks for missing credit and stops below the property minimum', () => {
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'WEB',
        conversationStatus: 'ACTIVE',
        minimumCreditScore: 680,
        leadCreditScore: null,
      }),
    ).toEqual({
      action: 'ASK_CREDIT',
      reason: 'CREDIT_REQUIRED',
      terminal: false,
    });
    expect(
      evaluateChatbotPolicy({
        settings: activeSettings(),
        channel: 'WEB',
        conversationStatus: 'ACTIVE',
        minimumCreditScore: 680,
        leadCreditScore: 650,
      }),
    ).toMatchObject({
      action: 'STOP',
      reason: 'CREDIT_BELOW_MINIMUM',
      terminal: true,
    });
  });

  it('allows retrieval before evidence and fails closed for weak or conflicting evidence', () => {
    const base = {
      settings: activeSettings(),
      channel: 'WEB' as const,
      conversationStatus: 'ACTIVE' as const,
    };
    expect(evaluateChatbotPolicy(base)).toEqual({
      action: 'ALLOW_RETRIEVAL',
      reason: 'READY',
      terminal: false,
    });
    expect(
      evaluateChatbotPolicy({ ...base, hasEvidence: false }),
    ).toMatchObject({ reason: 'EVIDENCE_INSUFFICIENT', terminal: true });
    expect(
      evaluateChatbotPolicy({
        ...base,
        hasEvidence: true,
        evidenceConflict: true,
        confidence: 0.99,
      }),
    ).toMatchObject({ reason: 'EVIDENCE_CONFLICT', terminal: true });
    expect(
      evaluateChatbotPolicy({
        ...base,
        hasEvidence: true,
        confidence: 0.81,
      }),
    ).toMatchObject({ reason: 'EVIDENCE_INSUFFICIENT', terminal: true });
    expect(
      evaluateChatbotPolicy({
        ...base,
        hasEvidence: true,
        confidence: 0.82,
      }),
    ).toEqual({
      action: 'ANSWER',
      reason: 'EVIDENCE_VERIFIED',
      terminal: false,
    });
  });

  it('stops at the configured turn limit and fails closed when infrastructure is unavailable', () => {
    const settings = activeSettings();
    settings.maxTurns = 3;
    expect(
      evaluateChatbotPolicy({
        settings,
        channel: 'SMS',
        conversationStatus: 'ACTIVE',
        turnCount: 3,
      }),
    ).toMatchObject({ reason: 'TURN_LIMIT', terminal: true });
    expect(
      evaluateChatbotPolicy({
        settings,
        channel: 'SMS',
        conversationStatus: 'ACTIVE',
        infrastructureReady: false,
      }),
    ).toMatchObject({ reason: 'SYSTEM_UNAVAILABLE', terminal: true });
  });
});
