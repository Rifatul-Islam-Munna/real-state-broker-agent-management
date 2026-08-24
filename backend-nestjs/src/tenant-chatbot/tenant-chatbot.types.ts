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
  | 'CREDIT_REQUIRED'
  | 'CREDIT_BELOW_MINIMUM'
  | 'EVIDENCE_INSUFFICIENT'
  | 'EVIDENCE_CONFLICT'
  | 'TURN_LIMIT'
  | 'SHOWING_REQUESTED'
  | 'SYSTEM_UNAVAILABLE'
  | 'EVIDENCE_VERIFIED';

export type ChatbotSettings = {
  enabled: boolean;
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
    | 'ASK_CREDIT'
    | 'ANSWER'
    | 'CREATE_SHOWING_REQUEST'
    | 'STOP';
  reason: ChatbotDecisionReason;
  terminal: boolean;
};
