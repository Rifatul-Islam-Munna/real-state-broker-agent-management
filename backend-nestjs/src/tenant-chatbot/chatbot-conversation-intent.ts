import type { ChatbotAudience } from './tenant-chatbot.types';

export type QualificationField = 'creditScore' | 'monthlyEarning';
export type QualificationValues = { creditScore?: number | null; monthlyEarning?: number | null };
export type QualificationRequirements = { minimumCreditScore: number | null; minimumMonthlyIncome: number | null };

export function parseChatbotRole(value: unknown): ChatbotAudience | null {
  const text = normalize(value);
  if (!text) return null;
  if (/\b(realtor|real estate agent|broker|listing agent|buyers? agent|seller'?s? agent)\b/i.test(text)) return 'REALTOR';
  if (/\b(tenant|renter|renting|prospective tenant|applicant|looking to rent|want to rent)\b/i.test(text)) return 'LEAD';
  return null;
}

export function parseShowingIntent(value: unknown) {
  const text = normalize(value).toLowerCase();
  if (!text) return false;
  return /\b(showing|tour|viewing|showing form|request a showing|schedule a showing|book a showing|schedule a tour|book a tour|see the property|see this property|see the place|rent this|rent this place|want to rent|wanna rent)\b/i.test(text);
}

export function parseQualificationReply(value: unknown, expected: QualificationField): QualificationValues {
  const text = normalize(value).replace(/,/g, '');
  if (!text || isRequirementQuestion(text, expected)) return {};
  if (expected === 'creditScore') {
    const explicit = text.match(/\b(?:credit(?:\s+score)?|score)\D{0,16}(\d{3})\b/i);
    const fallback = isShortQualificationReply(text)
      ? text.match(/\b(\d{3})\b/)
      : null;
    const score = Number(explicit?.[1] ?? fallback?.[1]);
    return Number.isFinite(score) && score >= 300 && score <= 850 ? { creditScore: score } : {};
  }
  const explicitIncome = /\b(income|earn(?:ing|ings|ed)?|make|salary|pay|combined)\b/i.test(text);
  if (!explicitIncome && !isShortQualificationReply(text)) return {};
  const money = text.match(/(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k)?\b/i);
  if (!money) return {};
  let amount = Number(money[1]);
  if (money[2]) amount *= 1000;
  return Number.isFinite(amount) && amount > 0 ? { monthlyEarning: Math.round(amount) } : {};
}

function isRequirementQuestion(value: string, expected: QualificationField) {
  const topic = expected === 'creditScore'
    ? /\b(credit|score)\b/i
    : /\b(income|earnings?|salary|monthly income)\b/i;
  if (!topic.test(value)) return false;
  const selfReport = /\b(my|mine|our|we\s+(?:make|earn)|i\s+(?:make|earn|have)|i'm\s+at|i\s+am\s+at)\b/i.test(value);
  if (selfReport) return false;
  return /\?|\b(minimum|required|requirement|need|qualify|how much|what)\b/i.test(value);
}

function isShortQualificationReply(value: string) {
  const compact = value
    .toLowerCase()
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it(?:'s| is)?|mine is|i am at|i'm at)\b/g, ' ')
    .replace(/(?:\$|usd)/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*k?\b/g, ' ')
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
function extractCredit(text: string) { const m = text.match(/\bcredit\s*score\b[^\d]{0,20}(\d{3})\b/i); return validCredit(m?.[1]); }
function extractMonthlyIncome(text: string) {
  const direct = text.match(/(?:\$\s*)?([\d,]+(?:\.\d{1,2})?)\s*(?:monthly\s+income|per\s+month|\/\s*month)/i);
  if (direct) return positiveMoney(direct[1]);
  const wrapped = text.match(/\(\s*\$\s*([\d,]+(?:\.\d{1,2})?)\s+monthly\s+income\s*\)/i);
  return positiveMoney(wrapped?.[1]);
}
