import {
  ChatbotDecisionReason,
  ChatbotPolicyContext,
  ChatbotPolicyDecision,
  ChatbotSettings,
} from './tenant-chatbot.types';

const DEFAULT_STOP_RULES: ChatbotSettings['stopRules'] = {
  humanIntervention: true,
  doNotContact: true,
  propertyUnavailable: true,
  creditBelowMinimum: true,
  insufficientEvidence: true,
  evidenceConflict: true,
  turnLimit: true,
};

export function defaultChatbotSettings(): ChatbotSettings {
  return {
    enabled: false,
    channels: {
      web: false,
      email: false,
      sms: false,
    },
    minimumConfidence: 0.82,
    responseDelaySeconds: 15,
    maxTurns: 20,
    fallbackMessage:
      'I do not have enough verified information to answer that. A team member can help.',
    creditRequiredMessage:
      'What credit score should I use to check this property requirement?',
    creditRejectedMessage:
      'This property may not match the qualification information provided. A team member can help with other options.',
    propertyUnavailableMessage:
      'This property is no longer available. I can help you with another available property.',
    evidenceConflictMessage:
      'I found conflicting verified information, so I will not guess. A team member can confirm the correct details.',
    turnLimitMessage:
      'I am handing this conversation to a team member so they can continue helping you.',
    realtorVerificationMessage:
      'Private property access information is available only to a verified realtor.',
    stopRules: { ...DEFAULT_STOP_RULES },
  };
}

export function normalizeChatbotSettings(
  input?: Partial<ChatbotSettings> | null,
): ChatbotSettings {
  const defaults = defaultChatbotSettings();
  const channels = input?.channels ?? defaults.channels;
  const rules = input?.stopRules ?? defaults.stopRules;

  return {
    enabled: input?.enabled === true,
    channels: {
      web: channels.web === true,
      email: channels.email === true,
      sms: channels.sms === true,
    },
    minimumConfidence: clampNumber(
      input?.minimumConfidence,
      defaults.minimumConfidence,
      0.5,
      0.99,
    ),
    responseDelaySeconds: clampInteger(
      input?.responseDelaySeconds,
      defaults.responseDelaySeconds,
      0,
      300,
    ),
    maxTurns: clampInteger(input?.maxTurns, defaults.maxTurns, 1, 50),
    fallbackMessage: cleanMessage(
      input?.fallbackMessage,
      defaults.fallbackMessage,
    ),
    creditRequiredMessage: cleanMessage(
      input?.creditRequiredMessage,
      defaults.creditRequiredMessage,
    ),
    creditRejectedMessage: cleanMessage(
      input?.creditRejectedMessage,
      defaults.creditRejectedMessage,
    ),
    propertyUnavailableMessage: cleanMessage(
      input?.propertyUnavailableMessage,
      defaults.propertyUnavailableMessage,
    ),
    evidenceConflictMessage: cleanMessage(
      input?.evidenceConflictMessage,
      defaults.evidenceConflictMessage,
    ),
    turnLimitMessage: cleanMessage(
      input?.turnLimitMessage,
      defaults.turnLimitMessage,
    ),
    realtorVerificationMessage: cleanMessage(
      input?.realtorVerificationMessage,
      defaults.realtorVerificationMessage,
    ),
    stopRules: {
      humanIntervention: rules.humanIntervention !== false,
      doNotContact: rules.doNotContact !== false,
      propertyUnavailable: rules.propertyUnavailable !== false,
      creditBelowMinimum: rules.creditBelowMinimum !== false,
      insufficientEvidence: rules.insufficientEvidence !== false,
      evidenceConflict: rules.evidenceConflict !== false,
      turnLimit: rules.turnLimit !== false,
    },
  };
}

export function evaluateChatbotPolicy(
  context: ChatbotPolicyContext,
): ChatbotPolicyDecision {
  if (context.conversationStatus !== 'ACTIVE') {
    return stop(context.conversationStopReason ?? 'MANUAL_STOP', true);
  }
  if (!context.settings.enabled) return stop('BOT_DISABLED', false);
  if (!channelEnabled(context)) return stop('CHANNEL_DISABLED', false);

  const rules = context.settings.stopRules;
  if (rules.humanIntervention && context.humanIntervened) {
    return stop('HUMAN_INTERVENED', true);
  }
  if (rules.doNotContact && context.doNotContact) {
    return stop('DO_NOT_CONTACT', true);
  }
  if (
    rules.propertyUnavailable &&
    context.propertyStatus &&
    context.propertyStatus.toLowerCase() !== 'published'
  ) {
    return stop('PROPERTY_UNAVAILABLE', true);
  }
  if (context.infrastructureReady === false) {
    return stop('SYSTEM_UNAVAILABLE', true);
  }
  if (
    rules.turnLimit &&
    Number(context.turnCount ?? 0) >= context.settings.maxTurns
  ) {
    return stop('TURN_LIMIT', true);
  }

  const minimum = validCreditScore(context.minimumCreditScore);
  if (rules.creditBelowMinimum && minimum !== null) {
    const leadScore = validCreditScore(context.leadCreditScore);
    if (leadScore === null) {
      return {
        action: 'ASK_CREDIT',
        reason: 'CREDIT_REQUIRED',
        terminal: false,
      };
    }
    if (leadScore < minimum) {
      return stop('CREDIT_BELOW_MINIMUM', true);
    }
  }

  if (context.showingConfirmed) {
    return {
      action: 'CREATE_SHOWING_REQUEST',
      reason: 'SHOWING_REQUESTED',
      terminal: true,
    };
  }
  if (context.hasEvidence === undefined) {
    return {
      action: 'ALLOW_RETRIEVAL',
      reason: 'READY',
      terminal: false,
    };
  }
  if (!context.hasEvidence && rules.insufficientEvidence) {
    return stop('EVIDENCE_INSUFFICIENT', true);
  }
  if (context.evidenceConflict && rules.evidenceConflict) {
    return stop('EVIDENCE_CONFLICT', true);
  }
  if (
    !Number.isFinite(context.confidence) ||
    Number(context.confidence) < context.settings.minimumConfidence
  ) {
    return stop('EVIDENCE_INSUFFICIENT', true);
  }
  return {
    action: 'ANSWER',
    reason: 'EVIDENCE_VERIFIED',
    terminal: false,
  };
}

function channelEnabled(context: ChatbotPolicyContext) {
  if (context.channel === 'WEB') return context.settings.channels.web;
  if (context.channel === 'EMAIL') return context.settings.channels.email;
  return context.settings.channels.sms;
}

function stop(
  reason: ChatbotDecisionReason,
  terminal: boolean,
): ChatbotPolicyDecision {
  return { action: 'STOP', reason, terminal };
}

function validCreditScore(value: unknown) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 300 && score <= 850 ? score : null;
}

function clampNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return Math.round(clampNumber(value, fallback, minimum, maximum));
}

function cleanMessage(value: unknown, fallback: string) {
  const message = typeof value === 'string' ? value.trim() : '';
  return (message || fallback).slice(0, 1000);
}
