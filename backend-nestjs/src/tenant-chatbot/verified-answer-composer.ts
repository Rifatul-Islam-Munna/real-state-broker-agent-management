import { detectPropertyIntentFamilies } from './property-question-intent';

export type VerifiedAnswerEvidence = { title: string; answer: string };

export function composeVerifiedAnswer(
  question: string,
  evidence: VerifiedAnswerEvidence[],
): string | null {
  if (!evidence.length) return null;
  const families = detectPropertyIntentFamilies(question);
  if (!families.includes('income')) return null;

  const rows = evidence.map((item) => ({
    title: item.title.toLowerCase(),
    answer: clean(item.answer),
  }));
  const incomeMultiple = find(rows, /income requirement/, /\b(?:3x|three times)\b/i);
  const monthly = find(rows, /minimum monthly income/, /\$?\s*[\d,]+.*(?:month|monthly)/i);
  const hoa = find(rows, /hoa income|association income/, /\$?\s*[\d,]+.*(?:year|annual)/i);
  const dti = find(rows, /debt.?to.?income|dti/, /\d+\s*%/i);
  const proof = find(rows, /proof of income/, /proof of income|required/i);
  const docs = find(rows, /income documents|tax|w-?2/, /w-?2|tax return|2 years?/i);

  const parts: string[] = [];
  if (incomeMultiple || monthly) {
    const multiple = extract(incomeMultiple, /(?:minimum\s*)?(3x|three times)[^.;]*/i);
    const monthlyValue = extract(monthly, /\$\s*[\d,]+(?:\.\d{1,2})?/i);
    if (multiple && monthlyValue) {
      parts.push(`For the landlord, you need verifiable income of at least ${multiple.replace(/^minimum\s*/i, '')}, which is ${monthlyValue} per month for this property.`);
    } else if (monthlyValue) {
      parts.push(`For the landlord, the minimum monthly income is ${monthlyValue}.`);
    } else if (multiple) {
      parts.push(`For the landlord, the income requirement is at least ${multiple.replace(/^minimum\s*/i, '')}.`);
    }
  }
  const hoaValue = extract(hoa, /\$\s*[\d,]+(?:\.\d{1,2})?/i);
  if (hoaValue) parts.push(`The HOA separately requires at least ${hoaValue} in yearly income.`);
  const dtiValue = extract(dti, /\d+\s*%/i);
  if (dtiValue) parts.push(`The debt-to-income ratio must not exceed ${dtiValue}.`);
  if (proof || docs) {
    const documentText = docs && /2\s+years?/i.test(docs)
      ? '2 years of W-2s and tax returns'
      : 'the required income documents';
    parts.push(`Proof of income is required${docs ? `, including ${documentText}` : ''}.`);
  }

  return parts.length ? parts.join(' ') : null;
}

function clean(value: string) {
  return String(value ?? '').trim().replace(/\bpaking\b/gi, 'parking');
}

function find(
  rows: Array<{ title: string; answer: string }>,
  titlePattern: RegExp,
  answerPattern: RegExp,
) {
  return rows.find((row) => titlePattern.test(row.title) || answerPattern.test(row.answer))?.answer ?? '';
}

function extract(value: string, pattern: RegExp) {
  return value.match(pattern)?.[0]?.trim().replace(/[.;]+$/, '') ?? '';
}
