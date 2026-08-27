import { normalizeChatbotHumanText } from './chatbot-human-language';

type IntentRule = { id: string; label: string; weight: number; pattern: RegExp };

const RULES: IntentRule[] = [
  { id:'hoa-deposit', label:'HOA refundable security deposit', weight:5, pattern:/\b(hoa|association).{0,35}(refundable|security)?\s*deposit|\brefundable\s+deposit\b|\b500\s+deposit\b/i },
  { id:'hoa-fee', label:'HOA application fee', weight:5, pattern:/\b(hoa|association).{0,35}(application\s+fee|fee per|cost per applicant|application cost)|\bfee for person 18|\bassociation fee per adult\b/i },
  { id:'married-fee', label:'married HOA application fee', weight:5, pattern:/\b(married|spouse|couple).{0,30}(hoa|association|application).{0,25}(fee|cost)|\b(hoa|association).{0,25}fee.{0,20}(married|spouse|couple)\b/i },
  { id:'hoa-approval', label:'HOA approval time', weight:5, pattern:/\b(hoa|association).{0,30}(approval|processing|review|wait).{0,20}(time|days?|long)?|\bhow long.{0,20}(hoa|association)\b/i },
  { id:'hoa-income', label:'HOA annual income requirement', weight:5, pattern:/\b(hoa|association).{0,35}(annual|yearly|income|earnings|salary)|\b(annual|yearly|income|earnings|salary).{0,35}(hoa|association)\b|\b40\s*000\s+yearly\b/i },
  { id:'hoa-payment', label:'HOA payment method', weight:5, pattern:/\b(hoa|association).{0,30}(payment|pay).{0,25}(card|method|how)|\bpay.{0,25}(hoa|association).{0,25}(card|application)|\bcredit card.{0,20}(hoa|association)\b|\bcredit card required\b/i },
  { id:'marriage-cert', label:'marriage certificate requirement', weight:5, pattern:/\b(marriage certificate|marriage cert|proof of marriage|married applicants? documents?|wedding certificate)\b/i },
  { id:'dti', label:'debt to income ratio', weight:5, pattern:/\b(dti|debt.{0,12}income|debt ratio|income debt percentage|debt percentage|debt to salary)\b/i },
  { id:'guest-parking', label:'guest parking', weight:5, pattern:/\b(guest|visitor|company|friend|family).{0,24}(parking|car spot|vehicle spot)|\bparking for (guests?|visitors?)\b/i },
  { id:'insurance-address', label:'insurance mailing address', weight:5, pattern:/\b(insurance|additional interest).{0,35}(mailing address|address|mail to|send to)|\bwhere.{0,20}mail.{0,15}insurance\b/i },
  { id:'additional-interest', label:'insurance additional interest', weight:5, pattern:/\b(additional interest|interested party|who to add on insurance|insurance interested party|property manager insurance name)\b/i },
  { id:'insurance-duration', label:'tenant insurance duration', weight:5, pattern:/\binsurance.{0,30}(duration|how long|entire lease|through tenancy|keep policy|whole lease)|\bhow long.{0,25}insurance\b/i },
  { id:'apply-url', label:'online rental application link', weight:5, pattern:/\b(where|how).{0,15}(apply|application)|\b(application link|apply online|application website|rental application website|apply url|online application)\b/i },
  { id:'application-turnaround', label:'application turnaround time', weight:5, pattern:/\bapplication.{0,30}(turnaround|processing|review|approval|how long|days|time)|\bhow long.{0,25}(application|landlord approval)\b/i },
  { id:'application-docs', label:'application documentation', weight:5, pattern:/\bapplication.{0,30}(documents?|documentation|paperwork|papers|proof|need to submit)|\badult occupants?.{0,20}documents?|\bwhat paperwork.{0,15}(needed|required)\b/i },
  { id:'application-fee', label:'landlord application fee', weight:5, pattern:/\bapplication.{0,25}(fee|cost|charge|price)|\bfee per adult\b|\bhow much.{0,15}apply\b/i },
  { id:'income-multiple', label:'income multiple of rent', weight:5, pattern:/\b(3x|3 x|three times).{0,20}rent|\bincome multiple\b|\btimes rent income\b|\bincome ratio for rent\b/i },
  { id:'monthly-income', label:'minimum monthly income', weight:5, pattern:/\b(monthly income|salary per month|monthly earnings|monthly pay|income per month|monthly salary|make per month|earn per month)\b/i },
  { id:'income-generic', label:'income requirements', weight:4, pattern:/\b(income|earnings?|salary|make|pay|wages?).{0,32}(need|required|requirement|qualif|minimum|property|enough|must)|\b(need|required|minimum|requirement|must|enough).{0,32}(income|earnings?|salary|make|pay|wages?)\b|\bincome\s+requirement\b/i },
  { id:'tax-docs', label:'W-2 and tax return documents', weight:5, pattern:/\b(w\s*-?\s*2|tax returns?|tax documents?|tax papers?|two years income docs?|2 years income docs?)\b/i },
  { id:'proof-income', label:'proof of income', weight:5, pattern:/\b(proof of income|income verification|verify income|prove income|income documents required|need income documents|pay stubs?|paystubs?)\b/i },
  { id:'credit', label:'minimum credit score', weight:5, pattern:/\b(credit score|credit requirement|required credit|credit rating|fico|how much credit|what credit|credit do i need|credit needed|minimum score|score needed|score required)\b/i },
  { id:'movein-cost', label:'move-in costs', weight:5, pattern:/\b(move\s*-?\s*in).{0,25}(cost|total|money|upfront|need|pay)|\b(money|upfront|cash).{0,30}move\s*-?\s*in\b|\bfirst month.{0,35}last month\b/i },
  { id:'security-deposit', label:'security deposit', weight:5, pattern:/\bsecurity deposit|\brental deposit\b|\bdeposit amount\b|\bhow much.{0,12}deposit\b|\bdeposit.{0,15}(required|cost|price)\b/i },
  { id:'pets', label:'pet policy', weight:5, pattern:/\b(pets?|dogs?|pupp(?:y|ies)|cats?|kittens?|animals?).{0,25}(allow|permit|policy|bring|live|okay|ok|accept)?|\bpet policy\b/i },
  { id:'parking', label:'parking', weight:5, pattern:/\b(parking|park|car space|car spot|vehicle spot|vehicle parking|suv parking|assigned spot|assigned parking|where.{0,12}leave my car|space for my car)\b/i },
  { id:'rent', label:'monthly rent', weight:5, pattern:/\b(monthly rent|rent price|rent amount|asking rent|monthly payment|monthly housing cost|price per month|costs? per month|how much.{0,22}(rent|per month)|what do i pay every month|what is the rent)\b/i },
  { id:'available', label:'availability date', weight:5, pattern:/\b(available from|availability date|availability|when.{0,16}available|move\s*-?\s*in availability|when.{0,16}move\s*-?\s*in|move\s*-?\s*in date|ready to move in|ready date|occupancy date|when.{0,15}get keys|when.{0,15}start lease|vacant date)\b/i },
  { id:'bedrooms', label:'bedrooms', weight:5, pattern:/\b(bedrooms?|beds?|bed count|how many beds|sleeping rooms?)\b/i },
  { id:'bathrooms', label:'bathrooms', weight:5, pattern:/\b(bathrooms?|baths?|bath count|how many baths|washrooms?)\b/i },
  { id:'address', label:'property address', weight:5, pattern:/\b(address|exact location|street address|where.{0,22}(condo|property|unit|apartment|place|home)|location of the property)\b/i },
  { id:'age', label:'55+ age restriction', weight:5, pattern:/\b(55\s*\+?|age restriction|minimum age|senior community age|senior only|age limit|how old.{0,15}(live|rent)|age requirement)\b/i },
  { id:'floor', label:'floor level', weight:5, pattern:/\b(top floor|floor level|which floor|what floor|upstairs|level is the unit|unit level)\b/i },
  { id:'supermarket', label:'nearby supermarkets', weight:5, pattern:/\b(supermarkets?|grocery|groceries|grocery stores?|food shopping|food market|buy groceries)\b/i },
  { id:'dining', label:'nearby dining', weight:5, pattern:/\b(restaurants?|dining|places? to eat|food spots?|eat nearby|restaurants? close|food nearby)\b/i },
  { id:'shopping', label:'nearby shopping malls', weight:5, pattern:/\b(shopping malls?|nearby shopping|places? to shop|mall access|malls? nearby|shopping center)\b/i },
  { id:'highway', label:'I-75 highway access', weight:5, pattern:/\b(i\s*-?\s*75|highway access|interstate|freeway access|expressway|major road|highway nearby)\b/i },
  { id:'cities', label:'nearby cities', weight:5, pattern:/\b(nearby cities|cities.{0,16}close|coral springs|sunrise|cities around|towns? nearby|areas? nearby)\b/i },
  { id:'first-month', label:'first month due at move-in', weight:5, pattern:/\bfirst month\b|\bfirst rent payment\b|\bpay first month\b/i },
  { id:'last-month', label:'last month due at move-in', weight:5, pattern:/\blast month\b|\blast rent payment\b|\bpay last month\b/i },
  { id:'utilities', label:'included and tenant-paid utilities', weight:4, pattern:/\b(utilities?|bills?).{0,25}(included|covered|pay|tenant|rent)|\bwhat utilities|\bwhich bills|\bwhat bills.{0,12}included\b/i },
  { id:'cable', label:'cable utility', weight:5, pattern:/\bcable\b/i },
  { id:'gas', label:'gas utility', weight:5, pattern:/\bgas\b/i },
  { id:'trash', label:'trash utility', weight:5, pattern:/\b(trash|garbage|waste pickup|garbage service)\b/i },
  { id:'internet', label:'internet utility', weight:5, pattern:/\b(internet|wifi|wi fi|broadband)\b/i },
  { id:'water', label:'water utility', weight:5, pattern:/\bwater\b/i },
  { id:'electricity', label:'electricity utility', weight:5, pattern:/\b(electricity|electric bill|power included|tenant electricity|electric utility|power bill)\b/i },
  { id:'pest-control', label:'pest control utility', weight:5, pattern:/\b(pest control|pest service|exterminator|bugs?|roach|pest treatment)\b/i },
  { id:'criminal', label:'criminal history requirement', weight:5, pattern:/\b(criminal|crime record|criminal record|background history|criminal history)\b/i },
  { id:'eviction', label:'eviction history requirement', weight:5, pattern:/\b(eviction|evicted|past eviction|eviction record)\b/i },
  { id:'cosigner', label:'co-signer policy', weight:5, pattern:/\b(co\s*-?\s*sign(?:er|ers)?|cosign(?:er|ers)?|guarantor|someone sign for me|co applicant guarantor)\b/i },
  { id:'insurance', label:'tenant liability insurance', weight:4, pattern:/\b(renter|tenant|liability).{0,16}insurance|\binsurance required\b|\bneed insurance\b|\brenters insurance\b/i },
  { id:'lease', label:'minimum lease duration', weight:5, pattern:/\b(minimum lease|lease length|lease term|how long.{0,14}rent|shortest tenancy|minimum tenancy|month to month|how many months.{0,15}lease)\b/i },
  { id:'smoking', label:'smoking policy', weight:5, pattern:/\b(smoking|smoke|cigarettes?|cigar|vape|vaping|e\s*-?\s*cigarettes?|weed|marijuana|hookah)\b/i },
  { id:'phone', label:'listing phone number', weight:5, pattern:/\b(listing|agent|contact).{0,18}(phone|number|call)|\bphone number\b|\bwho can i call\b|\bcontact by phone\b|\b\d{3}-\d{3}-\d{4}\b/i },
  { id:'email', label:'listing email', weight:5, pattern:/\b(listing|agent|contact).{0,18}(email|mail)|\bemail address\b|\bwho can i email\b|\bcontact by email\b|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { id:'community', label:'community', weight:4, pattern:/\b(community|neighborhood community|development|senior community)\b/i },
  { id:'hoa', label:'HOA association', weight:4, pattern:/\b(hoa|homeowners association|homeowner association|association)\b/i },
];

export function detectPropertyIntents(value: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const normalized = normalizeChatbotHumanText(raw);
  const searchable = `${raw}\n${normalized}`;
  return RULES.filter((rule) => rule.pattern.test(searchable));
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
    .filter((intent) => intent.id !== 'income-generic' && intent.id !== 'utilities')
    .sort((left, right) => right.weight - left.weight)[0]?.id ?? null;
}

export function strongestSharedPropertyIntent(question: string, evidence: string) {
  const query = detectPropertyIntents(question);
  if (!query.length) return null;
  const evidenceIntents = detectPropertyIntents(evidence);
  const evidenceIds = new Set(evidenceIntents.map((intent) => intent.id));
  const evidenceFamilies = new Set(evidenceIntents.map((intent) => propertyIntentFamily(intent.id)));
  return query
    .filter((intent) => evidenceIds.has(intent.id) || evidenceFamilies.has(propertyIntentFamily(intent.id)))
    .sort((left, right) => right.weight - left.weight)[0] ?? null;
}