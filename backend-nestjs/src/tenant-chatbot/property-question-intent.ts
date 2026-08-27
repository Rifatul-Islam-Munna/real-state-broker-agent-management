type IntentRule = { id: string; label: string; weight: number; pattern: RegExp };

const RULES: IntentRule[] = [
  { id:'hoa-deposit', label:'HOA refundable security deposit', weight:4, pattern:/\b(hoa|association).{0,30}(refundable|security)?\s*deposit|\brefundable\s+deposit\b|\b500 deposit\b/i },
  { id:'hoa-fee', label:'HOA application fee', weight:4, pattern:/\b(hoa|association).{0,30}(application\s+fee|fee per|cost per applicant)|\bfee for person 18/i },
  { id:'married-fee', label:'married HOA application fee', weight:4, pattern:/\b(married|spouse).{0,25}(hoa|association|application).{0,20}(fee|cost)|\b(hoa|association).{0,20}fee.{0,15}(married|spouse)\b|\bmarried hoa fee\b/i },
  { id:'hoa-approval', label:'HOA approval time', weight:4, pattern:/\b(hoa|association).{0,25}(approval|processing|wait).{0,15}(time|days?)?|\bhoa wait days\b/i },
  { id:'hoa-income', label:'HOA annual income requirement', weight:4, pattern:/\b(hoa|association).{0,30}(annual|yearly|income|earnings)|\b(annual|yearly|income|earnings).{0,30}(hoa|association)\b|\byearly earnings needed\b|\b40,?000 yearly\b/i },
  { id:'hoa-payment', label:'HOA payment method', weight:4, pattern:/\b(hoa|association).{0,25}(payment|pay).{0,20}(card|method)|\bpay.{0,20}(hoa|association).{0,20}(card|application)|\bhow pay hoa application\b|\bcredit card required\b/i },
  { id:'marriage-cert', label:'marriage certificate requirement', weight:4, pattern:/\b(marriage certificate|marriage cert|proof of marriage|married applicants documents)\b/i },
  { id:'dti', label:'debt to income ratio', weight:4, pattern:/\b(dti|debt.{0,8}income|debt ratio|income debt percentage)\b/i },
  { id:'guest-parking', label:'guest parking', weight:4, pattern:/\b(guest|visitor).{0,18}(parking|car spot)|\bparking for guests\b/i },
  { id:'insurance-address', label:'insurance mailing address', weight:4, pattern:/\b(insurance|additional interest).{0,30}(mailing address|address)|\bwhere to mail insurance/i },
  { id:'additional-interest', label:'insurance additional interest', weight:4, pattern:/\b(additional interest|interested party|who to add on insurance|property manager insurance name)\b/i },
  { id:'insurance-duration', label:'tenant insurance duration', weight:4, pattern:/\b(insurance).{0,25}(duration|how long|entire lease|through tenancy|keep policy)\b|\bhow long.{0,25}insurance\b|\bkeep policy.{0,20}(lease|tenancy)\b|\binsurance through tenancy\b/i },
  { id:'apply-url', label:'online rental application link', weight:4, pattern:/\b(where to apply|application link|apply online|application website|rental application website|apply url)\b/i },
  { id:'application-turnaround', label:'application turnaround time', weight:4, pattern:/\b(application).{0,25}(turnaround|processing|review|how long|days)|\blandlord approval takes\b/i },
  { id:'application-docs', label:'application documentation', weight:4, pattern:/\b(application).{0,25}(documents?|documentation|paperwork)|\badult occupants.{0,15}documents?|\bwhat paperwork is needed\b|\ball adults documentation\b/i },
  { id:'application-fee', label:'landlord application fee', weight:4, pattern:/\b(application).{0,20}(fee|cost)|\bfee per adult\b|\bhow much to apply\b/i },
  { id:'income-multiple', label:'income multiple of rent', weight:4, pattern:/\b(3x|three times).{0,15}rent|\bincome multiple\b|\btimes rent income\b|\bincome ratio for rent\b/i },
  { id:'monthly-income', label:'minimum monthly income', weight:4, pattern:/\b(monthly income|salary per month|monthly earnings|monthly pay|income per month|monthly salary)\b/i },
  { id:'income-generic', label:'income requirements', weight:3, pattern:/\b(income|earn(?:ing|ings)?|salary|make|pay).{0,28}(need|required|requirement|qualif|minimum|property)|\b(need|required|minimum|requirement).{0,28}(income|earn(?:ing|ings)?|salary|make|pay)\b|\bincome\s+requirement\b/i },
  { id:'tax-docs', label:'W-2 and tax return documents', weight:4, pattern:/\b(w-?2|tax returns?|tax documents?|two years income docs)\b/i },
  { id:'proof-income', label:'proof of income', weight:4, pattern:/\b(proof of income|income verification|prove income|income documents required|need income documents)\b/i },
  { id:'credit', label:'minimum credit score', weight:4, pattern:/\b(credit score|credit requirement|required credit|credit rating|how much credit|what credit|credit do i need|credit needed)\b/i },
  { id:'movein-cost', label:'move-in costs', weight:4, pattern:/\b(move[- ]?in).{0,20}(cost|total|money|upfront)|\b(money|upfront).{0,25}move[- ]?in\b|\bfirst month.{0,30}last month/i },
  { id:'security-deposit', label:'security deposit', weight:4, pattern:/\bsecurity deposit|\brental deposit\b|\bdeposit amount\b|\bhow much deposit\b/i },
  { id:'pets', label:'pet policy', weight:4, pattern:/\b(pets?|dogs?|pupp(?:y|ies)|cats?|kittens?|animals?).{0,20}(allow|permi|policy|bring|live)?|\bpet policy\b/i },
  { id:'parking', label:'parking', weight:4, pattern:/\b(parking|park|car space|car spot|vehicle spot|vehicle parking|suv parking|assigned spot)\b/i },
  { id:'rent', label:'monthly rent', weight:4, pattern:/\b(monthly rent|rent price|monthly payment|costs? per month|how much.{0,20}per month)\b/i },
  { id:'available', label:'availability date', weight:4, pattern:/\b(available from|availability date|when.{0,12}available|move[- ]?in availability|when.{0,12}move\s*in|move\s*in\s*date|ready to move in)\b/i },
  { id:'bedrooms', label:'bedrooms', weight:4, pattern:/\b(bedrooms?|beds?|bed count)\b/i },
  { id:'bathrooms', label:'bathrooms', weight:4, pattern:/\b(bathrooms?|baths?|bath count)\b/i },
  { id:'address', label:'property address', weight:4, pattern:/\b(address|exact location|street address|where.{0,18}(condo|property|unit))\b/i },
  { id:'age', label:'55+ age restriction', weight:4, pattern:/\b(55\+?|age restriction|minimum age|senior community age)\b/i },
  { id:'floor', label:'floor level', weight:4, pattern:/\b(top floor|floor level|which floor|upstairs)\b/i },
  { id:'supermarket', label:'nearby supermarkets', weight:4, pattern:/\b(supermarkets?|grocer(?:y|ies)|grocery stores?|food shopping)\b/i },
  { id:'dining', label:'nearby dining', weight:4, pattern:/\b(restaurants?|dining|places? to eat|food spots?)\b/i },
  { id:'shopping', label:'nearby shopping malls', weight:4, pattern:/\b(shopping malls?|nearby shopping|places? to shop|mall access)\b/i },
  { id:'highway', label:'I-75 highway access', weight:4, pattern:/\b(i-?75|highway access|interstate|freeway access)\b/i },
  { id:'cities', label:'nearby cities', weight:4, pattern:/\b(nearby cities|cities.{0,12}close|coral springs|sunrise|cities around)\b/i },
  { id:'first-month', label:'first month due at move-in', weight:4, pattern:/\bfirst month\b|\bfirst rent payment\b/i },
  { id:'last-month', label:'last month due at move-in', weight:4, pattern:/\blast month\b|\blast rent payment\b/i },
  { id:'cable', label:'cable utility', weight:4, pattern:/\bcable\b/i },
  { id:'gas', label:'gas utility', weight:4, pattern:/\bgas\b/i },
  { id:'trash', label:'trash utility', weight:4, pattern:/\b(trash|garbage)\b/i },
  { id:'internet', label:'internet utility', weight:4, pattern:/\b(internet|wifi)\b/i },
  { id:'water', label:'water utility', weight:4, pattern:/\bwater\b/i },
  { id:'electricity', label:'electricity utility', weight:4, pattern:/\b(electricity|electric bill|power included|tenant electricity)\b/i },
  { id:'pest-control', label:'pest control utility', weight:4, pattern:/\b(pest control|pest service|exterminator)\b/i },
  { id:'criminal', label:'criminal history requirement', weight:4, pattern:/\b(criminal|crime record)\b/i },
  { id:'eviction', label:'eviction history requirement', weight:4, pattern:/\b(eviction|evicted)\b/i },
  { id:'cosigner', label:'co-signer policy', weight:4, pattern:/\b(co[- ]?sign(?:er|ers)?|cosign(?:er|ers)?|guarantor)\b/i },
  { id:'insurance', label:'tenant liability insurance', weight:3, pattern:/\b(renter|tenant|liability).{0,12}insurance|\binsurance required\b|\bneed insurance\b/i },
  { id:'lease', label:'minimum lease duration', weight:4, pattern:/\b(minimum lease|lease length|how long.{0,10}rent|shortest tenancy)\b/i },
  { id:'smoking', label:'smoking policy', weight:4, pattern:/\b(smoking|smoke|cigarettes?|vape|vaping|e[- ]?cigarettes?)\b/i },
  { id:'phone', label:'listing phone number', weight:4, pattern:/\b(listing|agent|contact).{0,15}(phone|number|call)|\bphone number\b|\bwho can i call\b|\b\d{3}-\d{3}-\d{4}\b/i },
  { id:'email', label:'listing email', weight:4, pattern:/\b(listing|agent|contact).{0,15}(email|mail)|\bemail address\b|\bwho can i email\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { id:'community', label:'community', weight:3, pattern:/\bcommunity\b/i },
  { id:'hoa', label:'HOA association', weight:3, pattern:/\b(hoa|homeowners association|association)\b/i },
];

export function detectPropertyIntents(value: string) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  return RULES.filter((rule) => rule.pattern.test(text));
}

export function augmentPropertyQuestion(value: string) {
  const text = String(value ?? '').trim();
  const intents = detectPropertyIntents(text);
  if (!intents.length) return text;
  const labels = [...new Set(intents.map((intent) => intent.label))];
  return `${text}\nReal-estate topic: ${labels.join('; ')}`;
}

const INTENT_FAMILY: Record<string, string> = {
  'income-multiple': 'income',
  'monthly-income': 'income',
  'income-generic': 'income',
  'hoa-income': 'income',
  dti: 'income',
  'proof-income': 'income',
  'tax-docs': 'income',
  'application-fee': 'application-fee',
  'hoa-fee': 'hoa-fee',
  'security-deposit': 'security-deposit',
  'hoa-deposit': 'hoa-deposit',
  'application-turnaround': 'application-time',
  'hoa-approval': 'hoa-time',
};

export function propertyIntentFamily(intentId: string) {
  return INTENT_FAMILY[intentId] ?? intentId;
}

export function detectPropertyIntentFamilies(value: string) {
  return [...new Set(detectPropertyIntents(value).map((intent) => propertyIntentFamily(intent.id)))];
}

export function strongestPropertyFact(value: string) {
  return detectPropertyIntents(value)
    .filter((intent) => intent.id !== 'income-generic')
    .sort((left, right) => right.weight - left.weight)[0]?.id ?? null;
}

export function strongestSharedPropertyIntent(question: string, evidence: string) {
  const query = detectPropertyIntents(question);
  if (!query.length) return null;
  const evidenceIntents = detectPropertyIntents(evidence);
  const evidenceIds = new Set(evidenceIntents.map((intent) => intent.id));
  const evidenceFamilies = new Set(evidenceIntents.map((intent) => propertyIntentFamily(intent.id)));
  return query
    .filter(
      (intent) =>
        evidenceIds.has(intent.id) ||
        evidenceFamilies.has(propertyIntentFamily(intent.id)),
    )
    .sort((left, right) => right.weight - left.weight)[0] ?? null;
}

