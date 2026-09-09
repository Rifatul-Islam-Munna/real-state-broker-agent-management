import {
  detectPropertyIntentFamilies,
  strongestPropertyFact,
} from './property-question-intent';

type EvidenceLike = {
  match: { score: number };
  record: { title: string; answer: string };
};

export function selectAnswerEvidence<T extends EvidenceLike>(
  question: string,
  hydrated: T[],
) {
  if (!hydrated.length) return [];
  const queryFamilies = detectPropertyIntentFamilies(question);
  if (!queryFamilies.length) return hydrated.slice(0, 1);
  const familyMatches = hydrated.filter(({ record }) => {
    const families = detectPropertyIntentFamilies(
      `${record.title} ${record.answer}`,
    );
    return families.some((family) => queryFamilies.includes(family));
  });
  if (!familyMatches.length) return [];
  if (queryFamilies.includes('income')) return familyMatches.slice(0, 8);
  const queryFact = strongestPropertyFact(question);
  if (!queryFact) return familyMatches.slice(0, 3);
  const exactFact = familyMatches.filter(
    ({ record }) =>
      strongestPropertyFact(`${record.title} ${record.answer}`) === queryFact,
  );
  return (exactFact.length ? exactFact : familyMatches).slice(0, 4);
}

export function hasTopicEvidenceConflict<T extends EvidenceLike>(
  question: string,
  hydrated: T[],
) {
  if (hydrated.length < 2) return false;
  const queryFamilies = detectPropertyIntentFamilies(question);
  const grouped = new Map<string, T[]>();
  for (const item of hydrated) {
    const key = canonicalFactKey(item.record);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  for (const items of grouped.values()) {
    if (items.length < 2) continue;
    if (queryFamilies.length) {
      const families = detectPropertyIntentFamilies(
        `${items[0].record.title} ${items[0].record.answer}`,
      );
      if (!families.some((family) => queryFamilies.includes(family))) continue;
    }
    const top = Math.max(...items.map(({ match }) => match.score));
    const significant = items.filter(({ match }) => match.score >= top - 0.05);
    for (let i = 0; i < significant.length; i += 1) {
      for (let j = i + 1; j < significant.length; j += 1) {
        if (
          answersContradict(
            significant[i].record.answer,
            significant[j].record.answer,
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function canonicalFactKey(record: { title: string; answer: string }) {
  return (
    strongestPropertyFact(`${record.title} ${record.answer}`) ??
    record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  );
}

function answersContradict(leftValue: string, rightValue: string) {
  const left = leftValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const right = rightValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const negative = (value: string) =>
    /\b(no|not|never|prohibited|disallowed|isn t|aren t)\b/.test(value);
  const positive = (value: string) =>
    /\b(yes|allowed|available|included|permitted)\b/.test(value);
  return (
    (negative(left) && positive(right)) || (negative(right) && positive(left))
  );
}
