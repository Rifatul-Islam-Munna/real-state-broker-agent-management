import { normalizeChatbotHumanText } from './chatbot-human-language';
import type { ChatbotAudience } from './tenant-chatbot.types';

export type QualificationField = 'creditScore' | 'monthlyEarning';
export type QualificationValues = { creditScore?: number | null; monthlyEarning?: number | null };
export type QualificationRequirements = { minimumCreditScore: number | null; minimumMonthlyIncome: number | null };

const PROPERTY_TARGET = '(?:property|place|home|house|apartment|unit|condo)';
const SHOWING_TIME = '(?:today|tomorrow|morning|afternoon|evening|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|weekday|later)';

export function parseChatbotRole(value: unknown): ChatbotAudience | null {
  const text = normalizeChatbotHumanText(value);
  if (!text) return null;

  const shortRealtorReply = /^(?:yes |yeah |yep )?(?:(?:i am|we are) )?(?:a |an )?(realtor|broker|real estate agent|estate agent|leasing agent|rental agent|buyers? agent|sellers? agent)$/i;
  const realtorSelfContext = [
    /\b(i am|we are|working as|this is)\s+(?:a|an|the)?\s*(realtor|broker|real estate agent|estate agent|leasing agent|rental agent|buyers? agent|sellers? agent)\b/i,
    /\b(realtor|broker|agent)\s+(?:here|speaking)\b/i,
    /\b(represent|representing|working for|acting for|on behalf of)\s+(?:a|my|the|our)?\s*(buyer|client|tenant|renter|owner|seller)\b/i,
    /\b(my|our)\s+(buyer|client)\b/i,
    /\b(agent|realtor|broker).{0,18}\b(for|representing)\s+(?:my|a|the)?\s*(client|buyer|tenant|renter)\b/i,
  ];
  if (shortRealtorReply.test(text) || realtorSelfContext.some((pattern) => pattern.test(text))) return 'REALTOR';

  const shortLeadReply = /^(?:yes |yeah |yep )?(?:(?:i am|we are) )?(?:a |an )?(tenant|renter|applicant|prospective tenant|prospective renter|future tenant|future renter)$/i;
  const leadSelfContext = [
    /\b(i am|we are)\s+(?:a|an|the)?\s*(tenant|renter|applicant|prospective tenant|prospective renter|future tenant|future renter)\b/i,
    /\b(for myself|for ourselves|for me|for us|my family|our family|my partner|our partner|my spouse|our home|personal use)\b/i,
    /\b(i|we)\s+(?:want|want to|would like|plan|hope|need|looking|are looking|interested|are interested).{0,35}\b(rent|lease|move|live)\b/i,
    new RegExp(`\\b(rent|lease|move into|live in).{0,35}\\b(myself|ourselves|me|us|my family|our family|my partner|my spouse|this ${PROPERTY_TARGET})\\b`, 'i'),
    new RegExp(`\\b(i am|we are).{0,30}\\b(renting|leasing|moving into|living in).{0,20}${PROPERTY_TARGET}?\\b`, 'i'),
  ];
  return shortLeadReply.test(text) || leadSelfContext.some((pattern) => pattern.test(text)) ? 'LEAD' : null;
}

export function parseShowingIntent(value: unknown) {
  const text = normalizeChatbotHumanText(value);
  if (!text) return false;

  if (/\b(showing|tour|viewing|visit|walk through|walkthrough|open house)\b/i.test(text)) return true;
  if (/\b(show me around|show me (?:the )?(?:property|place|home|house|apartment|unit|condo)|take a look|look around|see inside|check it out|check this out|see it in person|see this in person|physically see|come see|meet there|when can i come by|when can i come over)\b/i.test(text)) return true;
  if (/\b(schedule|book|arrange|set up|reserve|make).{0,20}\b(visit|appointment|time|slot|walk through)\b/i.test(text)) return true;
  if (/\b(visit|see|view|look at|check out).{0,24}\b(property|place|home|house|apartment|unit|condo)\b/i.test(text)) return true;
  if (new RegExp(`\\b(visit|see|view|come by|stop by|drop by|come over).{0,24}\\b${SHOWING_TIME}\\b`, 'i').test(text)) return true;
  if (new RegExp(`\\b(come by|stop by|drop by|come over|meet there|meet at).{0,24}(?:${PROPERTY_TARGET}|${SHOWING_TIME})\\b`, 'i').test(text)) return true;
  if (new RegExp(`\\b(appointment|visit|slot).{0,20}${SHOWING_TIME}\\b`, 'i').test(text)) return true;
  if (new RegExp(`\\b(want to|would like to|ready to|plan to|trying to|interested in).{0,30}\\b(rent|lease).{0,20}${PROPERTY_TARGET}?\\b`, 'i').test(text)) return true;
  if (new RegExp(`\\b(rent|lease)\\s+(this|the)?\\s*${PROPERTY_TARGET}\\b`, 'i').test(text)) return true;
  return /\b(rent this|lease this|want to rent|want to lease)\b/i.test(text);
}

export function parseQualificationReply(value: unknown, expected: QualificationField): QualificationValues {
  const all = parseQualificationValues(value);
  if (expected === 'creditScore' && validCredit(all.creditScore) !== null) return { creditScore: all.creditScore };
  if (expected === 'monthlyEarning' && positiveMoney(all.monthlyEarning) !== null) return { monthlyEarning: all.monthlyEarning };

  const text = normalizeChatbotHumanText(value).replace(/,/g, '');
  if (!text || isRequirementQuestion(text, expected)) return {};
  if (expected === 'creditScore') {
    const shortCredit = isShortQualificationReply(text) ? text.match(/\b(\d{3})\b/) : null;
    const score = validCredit(shortCredit?.[1]);
    return score === null ? {} : { creditScore: score };
  }
  if (!isShortQualificationReply(text)) return {};
  const amount = parseHumanAmount(text);
  return amount === null ? {} : { monthlyEarning: amount };
}

export function parseQualificationValues(value: unknown): QualificationValues {
  const text = normalizeChatbotHumanText(value).replace(/,/g, '');
  if (!text) return {};
  const result: QualificationValues = {};
  const credit = extractSelfReportedCredit(text);
  const income = extractSelfReportedMonthlyIncome(text);
  if (credit !== null) result.creditScore = credit;
  if (income !== null) result.monthlyEarning = income;
  return result;
}

function extractSelfReportedCredit(text: string) {
  const candidates = [...text.matchAll(/\b(\d{3})\b/g)];
  let best: { value: number; score: number } | null = null;
  for (const candidate of candidates) {
    const value = validCredit(candidate[1]);
    if (value === null) continue;
    const index = candidate.index ?? 0;
    const before = text.slice(Math.max(0, index - 45), index);
    const after = text.slice(index + candidate[0].length, index + candidate[0].length + 35);
    const window = `${before} ${after}`;
    let score = 0;
    if (/\b(credit|fico|score|credit rating)\b/i.test(window)) score += 5;
    if (/\b(my|our)\s+(credit|fico|score)|\b(mine|ours)\s+(is|at)|\bi am at\b/i.test(window)) score += 4;
    if (/\b(i have|we have|my score|our score)\b/i.test(window)) score += 3;
    if (/\b(minimum|required|requirement|need|needed|what|how much|must have|at least)\b/i.test(before) && !/\b(my|our|mine|ours|i have|we have|i am at)\b/i.test(window)) score -= 8;
    if (/\b(apartment|unit|apt|address|rent|deposit|fee|year|phone)\b/i.test(window) && !/\b(credit|fico|score)\b/i.test(window)) score -= 8;
    if (!best || score > best.score) best = { value, score };
  }
  return best && best.score >= 5 ? best.value : null;
}

function extractSelfReportedMonthlyIncome(text: string) {
  const amountPattern = /(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?/gi;
  const candidates = [...text.matchAll(amountPattern)];
  let best: { value: number; score: number } | null = null;
  for (const candidate of candidates) {
    const index = candidate.index ?? 0;
    const before = text.slice(Math.max(0, index - 55), index);
    const after = text.slice(index + candidate[0].length, index + candidate[0].length + 45);
    const window = `${before} ${after}`;
    let score = 0;
    const selfIncome = /\b(i|we)\s+(make|earn|get|receive|bring in|pull in|take home|gross)|\b(my|our)\s+(income|salary|earnings|pay)|\b(income|salary|earnings|combined income|gross income|take home)\b/i.test(window);
    if (selfIncome) score += 6;
    if (/\b(per month|a month|monthly|\/\s*month|per year|a year|yearly|annual|annually|\/\s*year|per week|a week|weekly|biweekly)\b/i.test(window)) score += 3;
    if (/\b(combined|before tax|before taxes|gross|take home)\b/i.test(window)) score += 1;
    const raw = Number(candidate[1]) * (/^(k|grand|thousand)$/i.test(candidate[2] ?? '') ? 1000 : 1);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    if (/\b(credit|fico|score)\b/i.test(window) && raw <= 850) score -= 10;
    if (/\b(rent|deposit|fee|hoa|association|price|cost|application fee|security deposit)\b/i.test(window) && !selfIncome) score -= 9;
    if (/\b(minimum|required|requirement|need|needed|what|how much|must make|at least)\b/i.test(before) && !/\b(my|our|i|we)\b/i.test(window)) score -= 8;
    const monthly = monthlyEquivalent(raw, window);
    if (!best || score > best.score) best = { value: monthly, score };
  }
  return best && best.score >= 6 ? best.value : null;
}

function monthlyEquivalent(amount: number, context: string) {
  if (/\b(per year|a year|yearly|annual|annually|\/\s*year)\b/i.test(context)) return Math.round(amount / 12);
  if (/\b(biweekly|every two weeks)\b/i.test(context)) return Math.round((amount * 26) / 12);
  if (/\b(per week|a week|weekly|\/\s*week)\b/i.test(context)) return Math.round((amount * 52) / 12);
  return Math.round(amount);
}

function parseHumanAmount(value: string) {
  const match = value.match(/(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\b/i);
  if (!match) return null;
  let amount = Number(match[1]);
  if (/^(k|grand|thousand)$/i.test(match[2] ?? '')) amount *= 1000;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function isRequirementQuestion(value: string, expected: QualificationField) {
  const text = normalizeChatbotHumanText(value);
  const topic = expected === 'creditScore'
    ? /\b(credit|fico|score)\b/i
    : /\b(income|earnings|salary|monthly pay|monthly income)\b/i;
  if (!topic.test(text)) return false;
  const selfReport = expected === 'creditScore'
    ? /\b(my|our)\s+(credit|fico|score)|\b(mine|ours)\s+(is|at)|\b(i|we)\s+(have|am at|are at)\b/i.test(text)
    : /\b(my|our)\s+(income|salary|earnings|pay)|\b(i|we)\s+(make|earn|get|receive|bring in|pull in|take home)\b/i.test(text);
  if (selfReport) return false;
  return /\?|\b(minimum|required|requirement|need|needed|qualify|how much|what|at least|must have|must make)\b/i.test(text);
}

function isShortQualificationReply(value: string) {
  const compact = normalizeChatbotHumanText(value)
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it is|mine is|ours is|i am at|we are at|just|like)\b/g, ' ')
    .replace(/(?:\$|usd)/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  return compact === '';
}

export function readPropertyQualification(payload: Record<string, unknown> | null | undefined): QualificationRequirements {
  const source = payload ?? {};
  const description = normalize(source.description);
  const minimumCreditScore = validCredit(source.minimumCreditScore ?? source.minCreditScore) ?? extractCredit(description);
  const minimumMonthlyIncome = positiveMoney(source.minimumMonthlyIncome ?? source.minMonthlyIncome) ?? extractMonthlyIncome(description);
  return { minimumCreditScore, minimumMonthlyIncome };
}

export function qualificationResult(values: QualificationValues, requirements: QualificationRequirements) {
  const credit = validCredit(values.creditScore);
  const income = positiveMoney(values.monthlyEarning);
  if (requirements.minimumCreditScore !== null && credit === null) return { qualified: false, missing: 'creditScore' as const, failed: null };
  if (requirements.minimumMonthlyIncome !== null && income === null) return { qualified: false, missing: 'monthlyEarning' as const, failed: null };
  if (requirements.minimumCreditScore !== null && credit !== null && credit < requirements.minimumCreditScore) return { qualified: false, missing: null, failed: 'creditScore' as const };
  if (requirements.minimumMonthlyIncome !== null && income !== null && income < requirements.minimumMonthlyIncome) return { qualified: false, missing: null, failed: 'monthlyEarning' as const };
  return { qualified: true, missing: null, failed: null };
}

function normalize(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function validCredit(value: unknown) { const n = Number(value); return Number.isFinite(n) && n >= 300 && n <= 850 ? Math.round(n) : null; }
function positiveMoney(value: unknown) { const n = Number(String(value ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; }
function extractCredit(text: string) { const m = text.match(/\b(?:minimum\s+)?credit\s*score\b[^\d]{0,24}(\d{3})\b/i); return validCredit(m?.[1]); }
function extractMonthlyIncome(text: string) {
  const direct = text.match(/(?:\$\s*)?([\d,]+(?:\.\d{1,2})?)\s*(?:monthly\s+income|per\s+month|\/\s*month)/i);
  if (direct) return positiveMoney(direct[1]);
  const wrapped = text.match(/\(\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s+monthly\s+income\s*\)/i);
  return positiveMoney(wrapped?.[1]);
}