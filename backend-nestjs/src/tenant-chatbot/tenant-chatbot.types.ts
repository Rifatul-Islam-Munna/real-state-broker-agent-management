export type ChatbotChannel = 'WEB' | 'EMAIL' | 'SMS';

export type ChatbotAudience = 'LEAD' | 'REALTOR';

export type ChatbotConversationStatus =
  | 'ACTIVE'
  | 'STOPPED'
  | 'COMPLETED'
  | 'HANDOFF';

export type ChatbotDecisionReason =
  | 'READY'
  | 'BOT_DISABLED'
  | 'CHANNEL_DISABLED'
  | 'MANUAL_STOP'
  | 'HUMAN_INTERVENED'
  | 'DO_NOT_CONTACT'
  | 'PROPERTY_UNAVAILABLE'
  | 'ROLE_REQUIRED'
  | 'ROLE_CAPTURED'
  | 'CREDIT_REQUIRED'
  | 'CREDIT_BELOW_MINIMUM'
  | 'INCOME_REQUIRED'
  | 'INCOME_BELOW_MINIMUM'
  | 'QUALIFIED'
  | 'EVIDENCE_INSUFFICIENT'
  | 'EVIDENCE_CONFLICT'
  | 'TURN_LIMIT'
  | 'SHOWING_REQUESTED'
  | 'SYSTEM_UNAVAILABLE'
  | 'REALTOR_VERIFICATION_REQUIRED'
  | 'AI_GROUNDED_FALLBACK'
  | 'EVIDENCE_VERIFIED';

export type ChatbotSettings = {
  enabled: boolean;
  showingRequestTemplateId: string | null;
  channels: {
    web: boolean;
    email: boolean;
    sms: boolean;
  };
  minimumConfidence: number;
  responseDelaySeconds: number;
  maxTurns: number;
  fallbackMessage: string;
  creditRequiredMessage: string;
  creditRejectedMessage: string;
  propertyUnavailableMessage: string;
  evidenceConflictMessage: string;
  turnLimitMessage: string;
  realtorVerificationMessage: string;
  stopRules: {
    humanIntervention: boolean;
    doNotContact: boolean;
    propertyUnavailable: boolean;
    creditBelowMinimum: boolean;
    insufficientEvidence: boolean;
    evidenceConflict: boolean;
    turnLimit: boolean;
  };
};

export type ChatbotPolicyContext = {
  settings: ChatbotSettings;
  channel: ChatbotChannel;
  conversationStatus: ChatbotConversationStatus;
  conversationStopReason?: ChatbotDecisionReason | null;
  humanIntervened?: boolean;
  doNotContact?: boolean;
  propertyStatus?: string | null;
  minimumCreditScore?: number | null;
  leadCreditScore?: number | null;
  turnCount?: number;
  infrastructureReady?: boolean;
  hasEvidence?: boolean;
  evidenceConflict?: boolean;
  confidence?: number | null;
  showingConfirmed?: boolean;
};

export type ChatbotPolicyDecision = {
  action:
    | 'ALLOW_RETRIEVAL'
    | 'ASK_ROLE'
    | 'ASK_CREDIT'
    | 'ASK_INCOME'
    | 'ANSWER'
    | 'CREATE_SHOWING_REQUEST'
    | 'STOP';
  reason: ChatbotDecisionReason;
  terminal: boolean;
};
