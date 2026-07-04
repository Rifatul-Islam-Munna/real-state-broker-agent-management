export type PropertyAddressLike = {
  title?: string | null;
  location?: string | null;
  exactLocation?: string | null;
};

export type PropertyAddressMatch<T extends PropertyAddressLike> = {
  property: T | null;
  score: number;
};

const STREET_WORDS: Record<string, string> = {
  street: 'st',
  road: 'rd',
  avenue: 'ave',
  boulevard: 'blvd',
  drive: 'dr',
  court: 'ct',
  lane: 'ln',
  highway: 'hwy',
  parkway: 'pkwy',
  place: 'pl',
  terrace: 'ter',
  circle: 'cir',
  north: 'n',
  south: 's',
  east: 'e',
  west: 'w',
  apartment: 'apt',
  suite: 'ste',
  unit: 'unit',
};

const LOW_SIGNAL = new Set([
  'the',
  'at',
  'property',
  'listing',
  'home',
  'house',
  'real',
  'estate',
]);

export function normalizePropertyAddress(value: unknown) {
  return `${value ?? ''}`
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/#\s*/g, ' unit ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => STREET_WORDS[token] ?? token)
    .join(' ')
    .trim();
}

export function propertyAddressSimilarity(input: unknown, candidate: unknown) {
  const left = normalizePropertyAddress(input);
  const right = normalizePropertyAddress(candidate);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length);
    const longer = Math.max(left.length, right.length);
    return round(Math.max(0.88, shorter / longer));
  }

  const leftTokens = usefulTokens(left);
  const rightTokens = usefulTokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const intersection = [...rightSet].filter((token) => leftSet.has(token));
  const weightedMatched = intersection.reduce((sum, token) => sum + tokenWeight(token), 0);
  const weightedCandidate = [...rightSet].reduce((sum, token) => sum + tokenWeight(token), 0);
  const weightedInput = [...leftSet].reduce((sum, token) => sum + tokenWeight(token), 0);
  const candidateCoverage = weightedCandidate ? weightedMatched / weightedCandidate : 0;
  const inputCoverage = weightedInput ? weightedMatched / weightedInput : 0;
  const jaccard = intersection.length / new Set([...leftSet, ...rightSet]).size;

  const leftNumbers = numberTokens(leftTokens);
  const rightNumbers = numberTokens(rightTokens);
  const sharedNumber = rightNumbers.some((number) => leftNumbers.includes(number));
  const conflictingHouseNumber =
    leftNumbers.length > 0 &&
    rightNumbers.length > 0 &&
    !sharedNumber;

  let score = candidateCoverage * 0.58 + inputCoverage * 0.17 + jaccard * 0.25;
  if (sharedNumber) score += 0.18;
  if (contiguousPartial(leftTokens, rightTokens)) score += 0.12;
  if (conflictingHouseNumber) score *= 0.42;

  return round(Math.min(1, Math.max(0, score)));
}

export function bestPropertyAddressMatch<T extends PropertyAddressLike>(
  input: unknown,
  properties: T[],
  minimumScore = 0.38,
): PropertyAddressMatch<T> {
  const normalizedInput = normalizePropertyAddress(input);
  if (!normalizedInput) return { property: null, score: 0 };

  let best: T | null = null;
  let bestScore = 0;
  for (const property of properties) {
    const candidates = [
      property.title,
      property.exactLocation,
      property.location,
      `${property.title ?? ''} ${property.exactLocation ?? ''}`,
      `${property.title ?? ''} ${property.location ?? ''}`,
    ].filter(Boolean);
    const score = Math.max(
      0,
      ...candidates.map((candidate) => propertyAddressSimilarity(normalizedInput, candidate)),
    );
    if (score > bestScore) {
      best = property;
      bestScore = score;
    }
  }

  return best && bestScore >= minimumScore
    ? { property: best, score: round(bestScore) }
    : { property: null, score: round(bestScore) };
}

function usefulTokens(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !LOW_SIGNAL.has(token));
}

function numberTokens(tokens: string[]) {
  return tokens.filter((token) => /^\d+[a-z]?$/.test(token));
}

function tokenWeight(token: string) {
  if (/^\d+[a-z]?$/.test(token)) return 2.4;
  if (token.length >= 8) return 1.4;
  if (token.length >= 5) return 1.15;
  if (token.length <= 2) return 0.55;
  return 1;
}

function contiguousPartial(left: string[], right: string[]) {
  const smaller = left.length <= right.length ? left : right;
  const larger = left.length <= right.length ? right : left;
  if (smaller.length < 2) return false;
  for (let length = Math.min(smaller.length, 5); length >= 2; length--) {
    for (let index = 0; index <= smaller.length - length; index++) {
      const phrase = smaller.slice(index, index + length).join(' ');
      if (larger.join(' ').includes(phrase)) return true;
    }
  }
  return false;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
