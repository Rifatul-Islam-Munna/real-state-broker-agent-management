const WORD_ALIASES: Record<string, string> = {
  u: 'you', ur: 'your', pls: 'please', plz: 'please', im: 'i am', ive: 'i have', id: 'i would',
  wanna: 'want to', gonna: 'going to', gotta: 'have to', kinda: 'kind of', cuz: 'because', cos: 'because',
  cant: 'cannot', couldnt: 'could not', wouldnt: 'would not', dont: 'do not', doesnt: 'does not', didnt: 'did not',
  shwoing: 'showing', showin: 'showing', showng: 'showing', shoing: 'showing', showwing: 'showing',
  vewing: 'viewing', viewng: 'viewing', veiwng: 'viewing', veiw: 'view',
  appoinment: 'appointment', apointment: 'appointment', appoitment: 'appointment', appontment: 'appointment',
  scheduel: 'schedule', schdule: 'schedule', scedule: 'schedule', shedule: 'schedule', sheduele: 'schedule',
  tommorow: 'tomorrow', tomorow: 'tomorrow', tommorrow: 'tomorrow', tmrw: 'tomorrow', whn: 'when', wen: 'when', nead: 'need', mnay: 'many',
  proparty: 'property', proprty: 'property', propery: 'property', propety: 'property', proprety: 'property', porperty: 'property',
  relator: 'realtor', realter: 'realtor', realator: 'realtor', realitor: 'realtor',
  tenent: 'tenant', tennant: 'tenant', tanant: 'tenant', renterz: 'renter',
  credeit: 'credit', creidt: 'credit', crdit: 'credit', credt: 'credit', crdti: 'credit', crdt: 'credit',
  scroe: 'score', scor: 'score', socre: 'score',
  inocme: 'income', incme: 'income', inome: 'income', incom: 'income', incomm: 'income',
  salry: 'salary', salery: 'salary', earnngs: 'earnings', earningz: 'earnings',
  mnthly: 'monthly', monhtly: 'monthly', monthy: 'monthly', montly: 'monthly',
  minmum: 'minimum', minimun: 'minimum', minumum: 'minimum', requirment: 'requirement', reqirement: 'requirement',
  requred: 'required', requried: 'required', qualfy: 'qualify', qualifiy: 'qualify',
  parknig: 'parking', parkng: 'parking', pakring: 'parking', paking: 'parking',
  availabilty: 'availability', avaliability: 'availability', avaliable: 'available', availble: 'available',
  bedroms: 'bedrooms', bedrroms: 'bedrooms', bathroms: 'bathrooms', bathrroms: 'bathrooms',
  adress: 'address', addres: 'address', comunity: 'community', communty: 'community',
  supermaket: 'supermarket', supermakets: 'supermarkets', groccery: 'grocery', resturants: 'restaurants',
  shoping: 'shopping', higway: 'highway', intersate: 'interstate',
  utilites: 'utilities', utlities: 'utilities', interent: 'internet', intenet: 'internet',
  electrcity: 'electricity', eletricity: 'electricity', garbadge: 'garbage',
  deopsit: 'deposit', depsoit: 'deposit', depoist: 'deposit',
  applicaton: 'application', aplicaton: 'application', appliction: 'application',
  insurence: 'insurance', insurnace: 'insurance', liabilty: 'liability',
  assocation: 'association', asociaton: 'association', aproval: 'approval', proccessing: 'processing',
  marrige: 'marriage', certficate: 'certificate', documnts: 'documents', paperwrok: 'paperwork',
  evicton: 'eviction', cosingner: 'cosigner', cosigner: 'cosigner', guarentor: 'guarantor',
  leese: 'lease', smokng: 'smoking', cigarete: 'cigarette', vapng: 'vaping',
  phne: 'phone', emial: 'email', contcat: 'contact',
  yr: 'year', yrs: 'years', wk: 'week', wks: 'weeks', mo: 'month', mos: 'months',
};

const CANONICAL_WORDS = [
  'showing','viewing','view','tour','visit','appointment','schedule','property','place','home','house','apartment','unit','condo',
  'realtor','broker','agent','tenant','renter','applicant','applicants','occupant','occupants','client','buyer','credit','score','fico','income','salary','earnings',
  'monthly','month','months','yearly','annual','annually','year','years','weekly','week','weeks','biweekly','minimum','required','requirement','qualify',
  'parking','guest','visitor','vehicle','availability','available','bedroom','bedrooms','bathroom','bathrooms','address','community',
  'supermarket','supermarkets','grocery','restaurant','restaurants','dining','shopping','highway','interstate','utilities','utility',
  'internet','electricity','garbage','trash','water','cable','gas','pest','deposit','security','application','apply','insurance','liability',
  'association','approval','processing','marriage','certificate','documents','document','paperwork','criminal','eviction','cosigner',
  'guarantor','lease','smoking','cigarette','vaping','phone','email','contact','income','proof','payment','married','spouse','floor',
  'senior','age','price','rent','rental','cost','move','occupancy','ready','tomorrow','today','morning','afternoon','evening',
];
const CANONICAL_SET = new Set(CANONICAL_WORDS);

const PHRASE_ALIASES: Array<[RegExp, string]> = [
  [/\bwhen can (?:the )?lease start\b/g, 'availability date'], [/\bunit location\b/g, 'property address'],
  [/\bneighborhood name\b/g, 'community name'], [/\bhow old do i need to be\b/g, 'minimum age'], [/\bfloor number\b/g, 'floor level'],
  [/\bmalls? close by\b/g, 'shopping malls nearby'], [/\bwhere can i shop nearby\b/g, 'nearby shopping'], [/\bnearest mall\b/g, 'shopping mall nearby'],
  [/\bfreeway connection\b/g, 'freeway access'], [/\bareas? close to tamarac\b/g, 'nearby cities'], [/\bwhat cities are around here\b/g, 'nearby cities'],
  [/\btotal upfront payment\b/g, 'move in cost'], [/\ball move in charges\b/g, 'move in cost'], [/\bamount due before moving in\b/g, 'move in cost'],
  [/\bwaste service\b/g, 'trash service'], [/\bwhat score do i need\b/g, 'credit score needed'], [/\bcredit cutoff\b/g, 'credit requirement'],
  [/\bincome to rent ratio\b/g, 'income multiple'], [/\bcrime history\b/g, 'criminal history'], [/\btenant liability policy\b/g, 'tenant liability insurance'],
  [/\brequired insurance\b/g, 'insurance required'], [/\bkeep policy (?:for )?(?:the )?entire lease\b/g, 'insurance entire lease'],
  [/\binsurance during (?:the )?entire tenancy\b/g, 'insurance through tenancy'], [/\bpolicy duration\b/g, 'insurance duration'],
  [/\bname to list on insurance\b/g, 'additional interest'], [/\bwhere to send insurance notice\b/g, 'insurance mailing address'],
  [/\binsurance mailing location\b/g, 'insurance mailing address'], [/\bfee to submit application\b/g, 'application fee'],
  [/\bhow many days for landlord review\b/g, 'application processing days'], [/\blandlord approval wait\b/g, 'application turnaround'],
  [/\bproof of salary\b/g, 'proof of income'], [/\bmarriage document\b/g, 'marriage certificate'],
  [/\bcertificate for married applicants\b/g, 'marriage certificate'], [/\bshortest lease allowed\b/g, 'minimum lease'],
  [/\bminimum rental period\b/g, 'minimum lease'], [/\blease duration\b/g, 'lease length'],
  [/\bwho do i call\b/g, 'who can i call'], [/\bwho do i email\b/g, 'who can i email'], [/\bwho should be named on policy\b/g, 'additional interest'],
  [/\bdocuments from adult occupants\b/g, 'application documents'], [/\bdocuments every adult must submit\b/g, 'application documents'],
  [/\ball adults documentation\b/g, 'application documentation'], [/\bpaperwork for application\b/g, 'application paperwork'],
  [/\bwhat papers are required\b/g, 'application paperwork'], [/\bapplication document checklist\b/g, 'application documents'],
];

export function normalizeChatbotHumanText(value: unknown) {
  if (typeof value !== 'string') return '';
  let text = value.trim().toLowerCase();
  if (!text) return '';
  text = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/\bwhat'?s\b/g, 'what is')
    .replace(/\bwho'?s\b/g, 'who is')
    .replace(/\bwhere'?s\b/g, 'where is')
    .replace(/\bwhen'?s\b/g, 'when is')
    .replace(/\bi'?m\b/g, 'i am')
    .replace(/\bwe'?re\b/g, 'we are')
    .replace(/\byou'?re\b/g, 'you are')
    .replace(/\bit'?s\b/g, 'it is')
    .replace(/([a-z])\1{2,}/g, '$1$1');

  const tokens = text.match(/[a-z]+|(?:\$|usd)?\d+(?:[.,]\d+)?(?:k|grand|thousand)?|[/@.+-]+/g) ?? [];
  let normalized = tokens.map(normalizeHumanToken).join(' ').replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of PHRASE_ALIASES) normalized = normalized.replace(pattern, replacement);
  return normalized.replace(/\s+/g, ' ').trim();
}

function normalizeHumanToken(token: string) {
  const direct = WORD_ALIASES[token];
  if (direct) return direct;
  if (!/^[a-z]+$/.test(token) || token.length < 4 || CANONICAL_SET.has(token)) return token;

  const maxDistance = token.length >= 8 ? 2 : 1;
  let best = token;
  let bestDistance = maxDistance + 1;
  let ties = 0;
  for (const candidate of CANONICAL_WORDS) {
    if (candidate[0] !== token[0] || Math.abs(candidate.length - token.length) > maxDistance) continue;
    const distance = damerauLevenshtein(token, candidate, maxDistance);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      ties = 1;
    } else if (distance === bestDistance) {
      ties += 1;
    }
  }
  return bestDistance <= maxDistance && ties === 1 ? best : token;
}

function damerauLevenshtein(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  const rows = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    let rowMin = limit + 1;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, rows[i][j]);
    }
    if (rowMin > limit) return limit + 1;
  }
  return rows[left.length][right.length];
}