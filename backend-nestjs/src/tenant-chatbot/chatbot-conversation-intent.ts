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
    /\b(i am|we are).{0,18}\b(their|his|her)\s+(agent|realtor|broker)\b/i,
    /\b(i|we)\s+(have|got)\s+(?:a|the|my)?\s*(client|buyer|tenant|renter).{0,30}\b(interested|looking|want|needs?|showing|viewing|tour)\b/i,
    /\b(showing|viewing|touring).{0,20}\b(for|with)\s+(?:my|a|the)?\s*(client|buyer|tenant|renter)\b/i,
    /\bcalling|emailing|messaging\s+(?:you\s+)?on behalf of\s+(?:my|a|the)?\s*(client|buyer|tenant|renter)\b/i,
  ];
  if (shortRealtorReply.test(text) || realtorSelfContext.some((pattern) => pattern.test(text))) return 'REALTOR';

  const shortLeadReply = /^(?:yes |yeah |yep )?(?:(?:i am|we are) )?(?:a |an )?(tenant|renter|applicant|prospective tenant|prospective renter|future tenant|future renter)$/i;
  const leadSelfContext = [
    /\b(i am|we are)\s+(?:a|an|the)?\s*(tenant|renter|applicant|prospective tenant|prospective renter|future tenant|future renter)\b/i,
    /\b(for myself|for ourselves|for me|for us|just me|me only|my family|our family|my partner|our partner|my spouse|my husband|my wife|my girlfriend|my boyfriend|our home|personal use)\b/i,
    /\b(i|we)\s+(?:want|want to|would like|plan|hope|need|looking|are looking|interested|are interested|trying to).{0,40}\b(rent|lease|move|live|buy|purchase)\b/i,
    /\b(i|we)\s+(?:need|want|looking for|trying to find).{0,30}\b(place|home|house|apartment|unit|condo)\b/i,
    /\b(i|we)\s+(?:would|will|plan to|want to).{0,20}\b(live|stay|move).{0,20}\b(here|there|in it|into it)\b/i,
    /\b(not an? agent|not a realtor|no realtor).{0,25}\b(for me|for us|myself|ourselves|rent|lease|move|live)\b/i,
    new RegExp(`\\b(rent|lease|move into|live in|buy|purchase).{0,35}\\b(myself|ourselves|me|us|my family|our family|my partner|my spouse|my husband|my wife|my girlfriend|my boyfriend|this ${PROPERTY_TARGET})\\b`, 'i'),
    new RegExp(`\\b(i am|we are).{0,30}\\b(renting|leasing|moving into|living in|buying).{0,20}${PROPERTY_TARGET}?\\b`, 'i'),
  ];
  return shortLeadReply.test(text) || leadSelfContext.some((pattern) => pattern.test(text)) ? 'LEAD' : null;
}

export function parseShowingIntent(value: unknown) {
  const text = normalizeChatbotHumanText(value);
  if (!text) return false;

  if (/\b(showing|tour|viewing|visit|walk through|walkthrough|open house)\b/i.test(text)) return true;
  if (/\b(show me around|show me (?:the )?(?:property|place|home|house|apartment|unit|condo)|take a look|look around|see inside|get inside|check it out|check this out|see it in person|see this in person|physically see|come see|meet there|when can i come by|when can i come over|swing by|pull up|stop in)\b/i.test(text)) return true;
  if (/\b(schedule|book|arrange|set up|reserve|make|get).{0,24}\b(visit|appointment|showing|viewing|tour|time|slot|walk through)\b/i.test(text)) return true;
  if (/\b(can|could|would|may)\s+(?:i|we).{0,18}\b(see|view|tour|visit|walk|check).{0,20}\b(it|inside|there|the place|the property|the unit|the apartment|the condo|the house|the home)\b/i.test(text)) return true;
  if (/\b(i|we).{0,16}\b(want|would love|would like|hope|need|trying).{0,18}\b(see|view|tour|visit|walk through|check out).{0,18}\b(it|this|there|inside|property|place|home|house|apartment|unit|condo)\b/i.test(text)) return true;
  if (/\b(would love|would like|love to|want to|trying to).{0,12}\b(see|view|tour|visit|walk through|check out).{0,18}\b(it|this|there|inside|property|place|home|house|apartment|unit|condo)\b/i.test(text)) return true;
  if (/\b(is it|would it be).{0,20}\b(possible|okay|ok).{0,20}\b(see|view|visit|tour|come by|come over)\b/i.test(text)) return true;
  if (/\b(any|what|which).{0,18}\b(openings?|slots?|times?|appointments?).{0,20}\b(showing|viewing|tour|visit|see)\b/i.test(text)) return true;
  if (/\b(when|what time|what day).{0,24}\b(can|could).{0,12}\b(i|we).{0,12}\b(see|view|visit|tour|come|stop|drop)\b/i.test(text)) return true;
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
    const score = parseExpectedCreditReply(text);
    return score === null ? {} : { creditScore: score };
  }
  if (!looksLikeIncomeAnswerAttempt(text) && !isTerseIncomeReply(text)) return {};
  const amount = parseHumanAmount(text);
  if (amount === null) return {};
  return { monthlyEarning: monthlyEquivalent(amount, text) };
}

export function parseQualificationValues(value: unknown): QualificationValues {
  const text = normalizeChatbotHumanText(value).replace(/,/g, '');
  if (!text) return {};
  const result: QualificationValues = {};
  const creditRequirement = isRequirementQuestion(text, 'creditScore');
  const numericCredit = creditRequirement ? null : extractSelfReportedCredit(text);
  const spokenCreditSelfReport = hasCreditSelfContext(text);
  const bandCredit = spokenCreditSelfReport && !creditRequirement ? parseCreditBand(text) : null;
  const spokenCredit = spokenCreditSelfReport && !creditRequirement ? parseSpokenCredit(text) : null;
  const credit = bandCredit ?? numericCredit ?? spokenCredit;
  const income = isRequirementQuestion(text, 'monthlyEarning') ? null : extractSelfReportedMonthlyIncome(text);
  if (credit !== null) result.creditScore = credit;
  if (income !== null) result.monthlyEarning = income;
  return result;
}

export function qualificationClarificationPrompt(value: unknown, expected: QualificationField) {
  const text = normalizeChatbotHumanText(value).replace(/,/g, '');
  if (!text || isRequirementQuestion(text, expected)) return null;
  if (expected === 'creditScore') {
    if (validCredit(parseQualificationReply(value, expected).creditScore) !== null) return null;
    if (!looksLikeCreditAnswerAttempt(text)) return null;
    const raw = text.match(/\b\d{3,5}\b/)?.[0] ?? null;
    if (raw) {
      const suggestions = creditTypoSuggestions(raw);
      if (suggestions.length) {
        return `I got that you're giving me your credit score. ${raw} is outside the usual 300–850 range. Did you mean ${formatChoices(suggestions)}?`;
      }
      return `I got that you're giving me your credit score, but ${raw} is outside the usual 300–850 range. What approximate score should I use?`;
    }
    return `I got that you're talking about your credit score, but I couldn't pin down the number. A rough number is fine — for example, “around 710” or “high 600s.”`;
  }
  if (positiveMoney(parseQualificationReply(value, expected).monthlyEarning) !== null) return null;
  if (!looksLikeIncomeAnswerAttempt(text)) return null;
  return `I got that you're giving me your income, but I couldn't pin down the amount. A rough amount is fine — for example, “about 5k a month” or “60k a year.”`;
}

function parseExpectedCreditReply(text: string) {
  if (hasPropertyNumberContext(text) && !hasCreditSelfContext(text)) return null;
  const band = parseCreditBand(text);
  if (band !== null && looksLikeCreditAnswerAttempt(text)) return band;
  const spoken = parseSpokenCredit(text);
  if (spoken !== null && (looksLikeCreditAnswerAttempt(text) || isTerseCreditReply(text))) return spoken;
  const candidates = [...text.matchAll(/\b(\d{3})\b/g)]
    .map((match) => validCredit(match[1]))
    .filter((score): score is number => score !== null);
  if (!candidates.length || (!looksLikeCreditAnswerAttempt(text) && !isTerseCreditReply(text))) return null;
  const score = candidates[0];
  if (/\b(just|slightly|little|bit)\s+under\b.{0,12}\b\d{3}\b/i.test(text)) return validCredit(score - 1);
  if (/\b(just|slightly|little|bit)\s+over\b.{0,12}\b\d{3}\b/i.test(text)) return validCredit(score + 1);
  return score;
}

function hasCreditSelfContext(text: string) {
  return /\b(my|our)\s+(credit|credit score|fico|score)|\b(mine|ours)\s+(is|was|at|around)|\b(i|we)\s+(have|had|am at|are at|was at|were at)|\b(credit|fico|score)\s+(?:is|was|sits?|sitting|around|about|roughly|approximately|at)|\b(last time i checked|last i checked|credit karma|experian|equifax|transunion)\b/i.test(text);
}

function hasPropertyNumberContext(text: string) {
  return /\b(apartment|unit|apt|address|rent|deposit|fee|hoa|association|floor|bedroom|bathroom|parking|price|cost|listing|square feet|sq ft|phone|year built)\b/i.test(text);
}

function looksLikeCreditAnswerAttempt(text: string) {
  if (hasCreditSelfContext(text)) return true;
  if (hasPropertyNumberContext(text)) return false;
  if (parseCreditBand(text) !== null || parseSpokenCredit(text) !== null) return text.length <= 140;
  return /\b\d{3,5}\b/.test(text) && text.length <= 140 && /\b(about|around|roughly|maybe|probably|like|ish|think|guess|not great|not good|pretty good|decent|low|high|somewhere|approximately|approx|last checked|was|is|at)\b/i.test(text);
}

function looksLikeIncomeAnswerAttempt(text: string) {
  const selfIncome = /\b(my|our)\s+(income|salary|earnings|pay|gross|net|take home)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)|\b(income|salary|earnings|gross|net|take home)\s+(?:is|was|around|about|roughly|approximately|at)\b/i.test(text);
  if (selfIncome) return true;
  if (/\b(rent|deposit|fee|hoa|association|price|cost|application|security deposit)\b/i.test(text)) return false;
  if (text.length > 140) return false;
  const humanAmount = /(?:\$\s*)?\d+(?:\.\d+)?\s*(?:k|grand|thousand)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:\s+and\s+a\s+half)?\s+(?:grand|thousand)\b/i.test(text);
  if (humanAmount) return true;
  return /\b\d{3,6}\b/.test(text) && /\b(about|around|roughly|maybe|probably|like|ish|think|guess|not much|not a lot|pretty low|pretty good|somewhere|approximately|approx|per month|monthly|a month)\b/i.test(text);
}

function parseCreditBand(text: string) {
  const match = text.match(/\b(low|lower|mid|middle|high|upper)\s+(6|7|8)00(?:\s*s)?\b/i);
  if (!match) return null;
  const base = Number(match[2]) * 100;
  const modifier = /^(low|lower)$/i.test(match[1]) ? 10 : /^(mid|middle)$/i.test(match[1]) ? 50 : 80;
  return validCredit(base + modifier);
}

function creditTypoSuggestions(raw: string) {
  if (!/^\d{4,5}$/.test(raw)) return [];
  const candidates = new Set<number>();
  for (let index = 0; index < raw.length; index += 1) {
    const candidate = validCredit(raw.slice(0, index) + raw.slice(index + 1));
    if (candidate !== null) candidates.add(candidate);
  }
  return [...candidates].slice(0, 3);
}

function formatChoices(values: number[]) {
  if (values.length === 1) return String(values[0]);
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, or ${values.at(-1)}`;
}

function extractSelfReportedCredit(text: string) {
  const candidates = [...text.matchAll(/\b(\d{3})\b/g)];
  let best: { value: number; score: number } | null = null;
  for (const candidate of candidates) {
    let value = validCredit(candidate[1]);
    if (value === null) continue;
    const index = candidate.index ?? 0;
    const before = text.slice(Math.max(0, index - 45), index);
    const after = text.slice(index + candidate[0].length, index + candidate[0].length + 35);
    const window = `${before} ${after}`;
    const baseValue = value;
    if (/\b(just|slightly|little|bit)\s+under\s*$/i.test(before)) value = validCredit(baseValue - 1);
    else if (/\b(just|slightly|little|bit)\s+over\s*$/i.test(before)) value = validCredit(baseValue + 1);
    if (value === null) continue;
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
  const explicitIncome = /\b(my|our)\s+(income|salary|earnings|pay|monthly|gross|net|take home)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)|\b(income|salary|earnings|combined income|gross income|net income|take home|take-home pay)\b/i.test(text);
  if (explicitIncome && (/\bbetween\s+\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\s+and\s+\d+(?:\.\d+)?\s*(?:k|grand|thousand)\b/i.test(text) || /\b\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\s*(?:to|-)\s*\d+(?:\.\d+)?\s*(?:k|grand|thousand)\b/i.test(text))) {
    const ranged = parseHumanAmount(text);
    if (ranged !== null) return monthlyEquivalent(ranged, text);
  }
  const amountPattern = /(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?/gi;
  const candidates = [...text.matchAll(amountPattern)];
  let best: { value: number; score: number } | null = null;
  for (const candidate of candidates) {
    const index = candidate.index ?? 0;
    const before = text.slice(Math.max(0, index - 55), index);
    const after = text.slice(index + candidate[0].length, index + candidate[0].length + 45);
    const window = `${before} ${after}`;
    let score = 0;
    const selfIncome = /\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)|\b(my|our)\s+(income|salary|earnings|pay|monthly|gross|net)|\b(income|salary|earnings|combined income|gross income|net income|take home|take-home pay)\b/i.test(window);
    if (selfIncome) score += 6;
    if (/\b(per month|a month|monthly|\/\s*month|per year|a year|yearly|annual|annually|\/\s*year|per week|a week|weekly|biweekly)\b/i.test(window)) score += 3;
    if (/\b(combined|before tax|before taxes|gross|take home)\b/i.test(window)) score += 1;
    const hasMultiplier = /^(k|grand|thousand)$/i.test(candidate[2] ?? '');
    const raw = Number(candidate[1]) * (hasMultiplier ? 1000 : 1);
    if (!Number.isFinite(raw) || raw <= 0 || (!hasMultiplier && raw < 100)) continue;
    if (/\b(credit|fico|score)\b/i.test(window) && raw <= 850) score -= 10;
    if (/\b(rent|deposit|fee|hoa|association|price|cost|application fee|security deposit)\b/i.test(window) && !selfIncome) score -= 9;
    if (/\b(minimum|required|requirement|need|needed|what|how much|must make|at least)\b/i.test(before) && !/\b(my|our|i|we)\b/i.test(window)) score -= 8;
    const monthly = monthlyEquivalent(raw, window);
    if (!best || score > best.score) best = { value: monthly, score };
  }
  if (best && best.score >= 6) return best.value;
  if (!explicitIncome) return null;
  const wordAmount = parseHumanAmount(text);
  if (wordAmount === null) return null;
  return monthlyEquivalent(wordAmount, text);
}

function monthlyEquivalent(amount: number, context: string) {
  if (/\b(per year|a year|yearly|annual|annually)\b|\/\s*year\b/i.test(context)) return Math.round(amount / 12);
  if (/\b(biweekly|every two weeks)\b/i.test(context)) return Math.round((amount * 26) / 12);
  if (/\b(per week|a week|weekly)\b|\/\s*week\b/i.test(context)) return Math.round((amount * 52) / 12);
  return Math.round(amount);
}

function parseHumanAmount(value: string) {
  const between = value.match(/\bbetween\s+(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\s+and\s+(\d+(?:\.\d+)?)\s*(k|grand|thousand)\b/i);
  if (between) {
    const multiplier = between[2] ?? between[4];
    const left = Number(between[1]) * (/^(k|grand|thousand)$/i.test(multiplier) ? 1000 : 1);
    const right = Number(between[3]) * 1000;
    if (Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0) return Math.round(Math.min(left, right));
  }
  const range = value.match(/\b(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(k|grand|thousand)\b/i);
  if (range) {
    const multiplier = range[2] ?? range[4];
    const left = Number(range[1]) * (/^(k|grand|thousand)$/i.test(multiplier) ? 1000 : 1);
    const right = Number(range[3]) * 1000;
    if (Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0) return Math.round(Math.min(left, right));
  }
  const wordMatch = value.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(\s+and\s+a\s+half)?\s+(grand|thousand)\b/i);
  if (wordMatch) {
    const words: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20 };
    return words[wordMatch[1].toLowerCase()] * 1000 + (wordMatch[2] ? 500 : 0);
  }
  const match = value.match(/(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\b/i);
  if (!match) return null;
  let amount = Number(match[1]);
  const hasMultiplier = /^(k|grand|thousand)$/i.test(match[2] ?? '');
  if (hasMultiplier) amount *= 1000;
  if (!hasMultiplier && amount < 100) return null;
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function isRequirementQuestion(value: string, expected: QualificationField) {
  const text = normalizeChatbotHumanText(value);
  const topic = expected === 'creditScore'
    ? /\b(credit|fico|score)\b/i
    : /\b(income|earnings|salary|monthly pay|monthly income)\b/i;
  if (!topic.test(text)) return false;
  const selfReport = expected === 'creditScore'
    ? hasCreditSelfContext(text)
    : /\b(my|our)\s+(income|salary|earnings|pay|gross|net)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)\b/i.test(text);
  if (selfReport) return false;
  return /\?|\b(minimum|required|requirement|need|needed|qualify|how much|what|at least|must have|must make)\b/i.test(text);
}

function parseSpokenCredit(value: string) {
  const hundreds: Record<string, number> = { six: 600, seven: 700, eight: 800 };
  const ones: Record<string, number> = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9 };
  const teens: Record<string, number> = { ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19 };
  const tens: Record<string, number> = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
  const suffix = '(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\\s+(?:one|two|three|four|five|six|seven|eight|nine))?|(?:one|two|three|four|five|six|seven|eight|nine)';
  const full = value.match(new RegExp(`\\b(six|seven|eight)\\s+hundred(?:\\s+and)?(?:\\s+(${suffix}))?\\b`, 'i'));
  if (full) return validCredit(hundreds[full[1].toLowerCase()] + parseUnderHundred(full[2] ?? '', ones, teens, tens));
  const zeroStyle = value.match(/\b(six|seven|eight)\s+(?:oh|zero)\s+(one|two|three|four|five|six|seven|eight|nine)\b/i);
  if (zeroStyle) return validCredit(hundreds[zeroStyle[1].toLowerCase()] + ones[zeroStyle[2].toLowerCase()]);
  const compact = value.match(new RegExp(`\\b(six|seven|eight)\\s+(${suffix})\\b`, 'i'));
  if (!compact) return null;
  return validCredit(hundreds[compact[1].toLowerCase()] + parseUnderHundred(compact[2], ones, teens, tens));
}

function parseUnderHundred(
  value: string,
  ones: Record<string, number>,
  teens: Record<string, number>,
  tens: Record<string, number>,
) {
  if (!value) return 0;
  const parts = value.toLowerCase().trim().split(/\s+/);
  if (parts.length === 1) return teens[parts[0]] ?? tens[parts[0]] ?? ones[parts[0]] ?? 0;
  return (tens[parts[0]] ?? 0) + (ones[parts[1]] ?? 0);
}

function isTerseCreditReply(value: string) {
  const compact = normalizeChatbotHumanText(value)
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it is|mine is|ours is|i am at|we are at|my|our|credit|fico|score|is|was|at|just|like|ish|somewhere|honestly|think|guess|pretty|not|very|great|good|bad|decent|low|lower|mid|middle|high|upper|last|time|checked|sitting|sits|little|bit|slightly|under|over)\b/g, ' ')
    .replace(/\d{3,5}/g, ' ')
    .replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine|hundred|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|and)\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  return compact === '';
}

function isTerseIncomeReply(value: string) {
  const text = normalizeChatbotHumanText(value);
  const selfIncome = /\b(my|our)\s+(income|salary|earnings|pay|monthly|gross|net)|\b(i|we)\s+(make|earn|get|receive|bring in|pull in|take home|gross|net|clear)\b/i.test(text);
  if (/\b(rent|deposit|fee|hoa|association|price|cost|application|security deposit)\b/i.test(text) && !selfIncome) return false;
  if (/\b(minimum|required|requirement|must make|need to make|how much|what income)\b/i.test(text) && !selfIncome) return false;
  const compact = text
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it is|mine is|ours is|i am at|we are at|my|our|income|salary|earnings|pay|gross|net|combined|before|tax|taxes|after|monthly|month|yearly|annual|annually|year|weekly|week|biweekly|every|two|per|a|just|like|ish)\b/g, ' ')
    .replace(/(?:\$|usd)/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\b/g, ' ')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|grand|thousand)\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();
  return selfIncome || compact === '';
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