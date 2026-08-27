export type LimeBayIntent = {
  id: string; title: string; storedAnswer: string;
  subjects: string[]; expectIncludes: string[];
};

const PREFIXES = [
  '', 'hey, ', 'quick question, ', 'just wondering, ',
  'for this property, ', 'before i apply, ', 'sorry typing fast, ', 'pls, ',
];

const QUESTION_FORMS = [
  (s: string) => `${s}?`,
  (s: string) => `what about ${s}?`,
  (s: string) => `can you tell me about ${s}?`,
  (s: string) => `i need to know ${s}`,
  (s: string) => `do you have info on ${s}?`,
  (s: string) => `how does ${s} work?`,
  (s: string) => `what should i know about ${s}?`,
  (s: string) => `is there anything important about ${s}?`,
];

const EXTRA_SUBJECTS: Record<string, string[]> = {
  rent: ['rent amount','asking rent','price per month','monthly housing cost','what is the rent','what do i pay every month'],
  available: ['property availability','ready to move in date','occupancy date','when can i get keys','when can the lease start','vacant date'],
  bedrooms: ['bedroom total','how many beds are there','bedroom count','number of sleeping rooms'],
  bathrooms: ['bathroom total','how many baths are there','bathroom count','number of washrooms'],
  address: ['location of the property','where is the apartment','where is this place','full property address','unit location'],
  community: ['name of the community','which development is this in','senior community','neighborhood name'],
  age: ['age requirement','age limit','55+ restriction','senior only rule','how old do i need to be'],
  floor: ['what floor is the unit on','unit level','is this on the top floor','floor number'],
  supermarket: ['nearest grocery store','food market nearby','where can i buy groceries','supermarket close to the property'],
  dining: ['restaurants close to the property','food nearby','where can i eat nearby','nearby places to eat'],
  shopping: ['shopping center nearby','malls close by','where can i shop nearby','nearest mall'],
  highway: ['highway nearby','interstate access','how close is i-75','freeway connection'],
  cities: ['towns nearby','areas close to tamarac','cities close to the property','what cities are around here'],
  'movein-total': ['cash needed to move in','total upfront payment','move in money required','all move in charges','amount due before moving in'],
  'first-month': ['first month due','pay first month upfront','first rent payment required','first month at move in'],
  'last-month': ['last month due','pay last month upfront','last rent payment required','last month at move in'],
  security: ['security deposit amount','rental security deposit','deposit required before move in','how much security deposit'],
  cable: ['cable included in rent','cable utility bill','who pays for cable','is cable covered'],
  gas: ['gas included in rent','gas utility bill','who pays for gas','is gas covered'],
  trash: ['trash included in rent','garbage pickup bill','who pays garbage','waste service included'],
  internet: ['internet included in rent','wifi bill','who pays internet','is wifi covered'],
  water: ['water included in rent','water utility bill','who pays water','is water covered'],
  electricity: ['electricity included in rent','power bill','who pays electricity','electric utility responsibility'],
  'pest-control': ['pest control included','who pays exterminator','bug treatment responsibility','pest service bill'],
  'apply-url': ['online application','how do i apply','where can i submit application','application website','rental application link'],
  credit: ['fico requirement','minimum fico score','credit score needed','score required to qualify','what score do i need','credit cutoff'],
  'income-multiple': ['income to rent ratio','3x rent rule','salary multiple requirement','three times rent requirement'],
  'monthly-income': ['income per month needed','monthly salary requirement','how much must i make monthly','monthly earnings required','minimum pay per month'],
  criminal: ['criminal background policy','criminal record requirement','background check criminal history','crime history rule'],
  eviction: ['previous eviction policy','past eviction requirement','eviction record rule','can i have an eviction'],
  cosigner: ['guarantor policy','can i use a cosigner','co signer allowed','can someone guarantee the lease'],
  insurance: ['renters insurance requirement','tenant liability policy','do i need renters insurance','required insurance'],
  'insurance-duration': ['how long renters insurance is needed','keep insurance for whole lease','insurance during entire tenancy','policy duration'],
  'additional-interest': ['who goes as additional interest','insurance interested party','name to list on insurance','additional interest company'],
  'insurance-address': ['address for insurance additional interest','where to send insurance notice','insurance mailing location','mailing address for truenest'],
  'landlord-fee': ['application charge per adult','landlord application cost','fee to submit application','application price for each adult'],
  turnaround: ['application processing time','how many days for landlord review','landlord approval wait','application decision time'],
  hoa: ['homeowners association','is there an association','does this have an hoa','hoa requirement'],
  dti: ['dti limit','debt ratio requirement','maximum debt to income','how much debt ratio is allowed'],
  'hoa-income': ['association yearly income requirement','hoa salary minimum','annual earnings required by hoa','hoa income cutoff'],
  'proof-income': ['income verification documents','do i need to prove income','proof of salary','income proof requirement'],
  'tax-docs': ['tax return paperwork','w2 requirement','income tax documents','two years of tax returns'],
  'hoa-time': ['association approval wait','hoa processing days','how long does hoa take','hoa review time'],
  'hoa-fee': ['association application charge','hoa fee per applicant','hoa application cost','hoa fee for adult applicant'],
  'married-fee': ['hoa cost for married couple','association fee for spouses','married applicant hoa charge','spouse application fee'],
  'marriage-cert': ['proof of marriage required','marriage document','wedding certificate requirement','certificate for married applicants'],
  card: ['hoa payment by credit card','association payment method','how do i pay hoa','hoa card payment requirement'],
  'hoa-deposit': ['association refundable deposit','hoa security deposit amount','refundable 500 deposit','hoa deposit refund'],
  pets: ['dog policy','cat policy','can pets live here','are animals allowed','can i bring a puppy','pet restrictions'],
  parking: ['where can i leave my car','assigned car space','vehicle parking','suv parking space','how many parking spots','parking for my car'],
  'guest-parking': ['visitor car space','parking for my guest','where visitors can park','guest vehicle parking'],
  lease: ['lease term','shortest lease allowed','minimum rental period','how many months is the lease','lease duration'],
  smoking: ['vaping policy','cigarette rule','can i smoke here','can i vape inside','smoke policy'],
  phone: ['phone number for the listing','who do i call','agent contact number','listing telephone'],
  email: ['email address for the listing','who do i email','agent contact email','listing mail address'],
  'liability-name': ['insurance additional interest name','property manager insurance name','who should be named on policy'],
  'application-docs': ['paperwork for application','documents every adult must submit','application document checklist','what papers are required'],
};

const TOPIC_TYPOS: Array<[RegExp, string]> = [
  [/\bcredit\b/i,'creidt'], [/\bincome\b/i,'inocme'], [/\bparking\b/i,'parknig'], [/\bapplication\b/i,'applicaton'],
  [/\binsurance\b/i,'insurence'], [/\bavailability\b/i,'availabilty'], [/\bavailable\b/i,'avaliable'], [/\bproperty\b/i,'proprty'],
  [/\bbedrooms\b/i,'bedroms'], [/\bbathrooms\b/i,'bathroms'], [/\baddress\b/i,'adress'], [/\bcommunity\b/i,'comunity'],
  [/\bsupermarket\b/i,'supermaket'], [/\brestaurants\b/i,'resturants'], [/\bshopping\b/i,'shoping'], [/\bhighway\b/i,'higway'],
  [/\butilities\b/i,'utilites'], [/\binternet\b/i,'interent'], [/\belectricity\b/i,'electrcity'], [/\bdeposit\b/i,'deopsit'],
  [/\bassociation\b/i,'assocation'], [/\bapproval\b/i,'aproval'], [/\bmarriage\b/i,'marrige'], [/\bdocuments\b/i,'documnts'],
  [/\beviction\b/i,'evicton'], [/\bcosigner\b/i,'cosingner'], [/\blease\b/i,'leese'], [/\bsmoking\b/i,'smokng'],
  [/\bphone\b/i,'phne'], [/\bemail\b/i,'emial'],
];

function subjectsFor(intent: LimeBayIntent) {
  return [...new Set([...intent.subjects, ...(EXTRA_SUBJECTS[intent.id] ?? [])])];
}

function typoSubject(subject: string) {
  for (const [pattern, typo] of TOPIC_TYPOS) {
    if (pattern.test(subject)) return subject.replace(pattern, typo);
  }
  return subject;
}

export function variantsFor(intent: LimeBayIntent) {
  const subjects = subjectsFor(intent);
  const variants: string[] = [];
  for (let prefixIndex = 0; prefixIndex < PREFIXES.length; prefixIndex += 1) {
    for (let formIndex = 0; formIndex < QUESTION_FORMS.length; formIndex += 1) {
      const index = prefixIndex * QUESTION_FORMS.length + formIndex;
      const baseSubject = subjects[index % subjects.length];
      const subject = prefixIndex >= 6 ? typoSubject(baseSubject) : baseSubject;
      variants.push(`${PREFIXES[prefixIndex]}${QUESTION_FORMS[formIndex](subject)}`);
    }
  }
  return [...new Set(variants)];
}

export function limeBayCorpusVariantCount() {
  return LIME_BAY_INTENTS.reduce((total, intent) => total + variantsFor(intent).length, 0);
}const i = (id:string,title:string,storedAnswer:string,subjects:string[],expectIncludes:string[]): LimeBayIntent => ({ id,title,storedAnswer,subjects,expectIncludes });
export const LIME_BAY_INTENTS: LimeBayIntent[] = [
  i('rent','Monthly rent','Monthly rent: $1,550.00 / month',['monthly rent','rent price','how much the place costs per month','monthly payment'],['1,550']),
  i('available','Available from','Available from: 8/18/2026',['availability date','when it is available','move in availability','available from date'],['8/18/2026']),
  i('bedrooms','Bedrooms','Bedrooms: 2',['number of bedrooms','beds','how many bedrooms','bed count'],['2']),
  i('bathrooms','Bathrooms','Bathrooms: 2',['number of bathrooms','baths','how many bathrooms','bath count'],['2']),
  i('address','Address','Address: 9101 Lime Bay Blvd, Apt 315, Tamarac, FL 33321',['property address','where the condo is','exact location','street address'],['9101 Lime Bay']),
  i('community','Community','Community: Lime Bay 55+ senior community',['community name','which community','neighborhood community','Lime Bay community'],['Lime Bay']),
  i('age','Age requirement','Age requirement: 55+ senior community',['age restriction','minimum age','55 plus rule','senior community age'],['55']),
  i('floor','Floor','Floor: top floor',['which floor','top floor unit','floor level','is it upstairs'],['top floor']),
  i('supermarket','Nearby supermarkets','Nearby supermarkets: major supermarkets nearby',['grocery stores nearby','supermarkets close by','food shopping nearby','nearby groceries'],['supermarket']),
  i('dining','Nearby dining','Nearby dining: excellent local dining nearby',['restaurants nearby','places to eat nearby','local dining','food spots close'],['dining']),
  i('shopping','Nearby shopping','Nearby shopping: premier shopping malls nearby',['shopping malls nearby','mall access','places to shop','nearby shopping'],['shopping']),
  i('highway','Highway access','Highway access: easy access to I-75',['highway access','I-75 access','interstate nearby','freeway access'],['I-75']),
  i('cities','Nearby cities','Nearby cities: Coral Springs and Sunrise',['nearby cities','what cities are close','Coral Springs and Sunrise','cities around Tamarac'],['Coral Springs','Sunrise']),
  i('movein-total','Move-in costs','Move-in costs: First Month, Last Month, and Security Deposit. ($4,650)',['total move in cost','money needed to move in','move-in total','upfront move in cost'],['4,650']),
  i('first-month','First month','First month: Required at move-in',['first month rent upfront','is first month required','first month payment','first rent payment'],['Required']),
  i('last-month','Last month','Last month: Required at move-in',['last month rent upfront','is last month required','last month payment','last rent payment'],['Required']),
  i('security','Security deposit','Security deposit: $1,550.00',['security deposit','deposit amount','rental deposit','how much deposit'],['1,550']),
  i('cable','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['is cable included','cable bill','does rent cover cable','who pays cable'],['cable']),
  i('gas','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['is gas included','gas utility','does rent cover gas','who pays gas'],['gas']),
  i('trash','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['is trash included','garbage service','does rent cover trash','who pays garbage'],['trash']),
  i('internet','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['is internet included','wifi included','does rent cover internet','who pays internet'],['internet']),
  i('water','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['is water included','water bill','does rent cover water','who pays water'],['water']),
  i('electricity','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['who pays electricity','electric bill','is power included','tenant electricity'],['electricity']),
  i('pest-control','Utilities','Utilities: Rent includes cable, gas, trash, internet, and water. Tenant pays for electricity and pest control.',['who pays pest control','exterminator cost','pest service included','tenant pest control'],['pest control']),
  i('apply-url','Application instructions','Application instructions: Apply online at https://truenest.managebuilding.com/Resident/rental-application/new/apply?listingId=330655',['where to apply','application link','apply online url','rental application website'],['truenest.managebuilding.com']),
  i('credit','Minimum credit score','Minimum credit score: 720',['minimum credit score','credit requirement','what credit do i need','required credit rating'],['720']),
  i('income-multiple','Income requirement','Income requirement: Minimum 3x the rent',['income multiple','three times rent income','how many times rent income','income ratio for rent'],['3x']),
  i('monthly-income','Minimum monthly income','Minimum monthly income: $4,650',['monthly income required','how much salary per month','minimum monthly earnings','monthly pay needed'],['4,650']),
  i('criminal','Applicant history','Applicant history: No criminal history',['criminal history rule','criminal record allowed','background criminal requirement','crime record'],['No criminal']),
  i('eviction','Applicant history','Applicant history: No eviction history',['eviction history rule','past eviction allowed','eviction record','ever been evicted'],['No eviction']),
  i('cosigner','Co-signers','Co-signers: No co-signers allowed',['cosigner allowed','co signer policy','can someone co-sign','guarantor allowed'],['co-signers']),
  i('insurance','Tenant insurance','Tenant insurance: Tenant liability insurance is required',['renter insurance required','liability insurance','need insurance','tenant insurance rule'],['required']),
  i('insurance-duration','Tenant insurance','Tenant insurance: Must be kept for the duration of the tenancy',['how long keep insurance','insurance duration','keep policy entire lease','insurance through tenancy'],['duration']),
  i('additional-interest','Insurance additional interest','Insurance additional interest: TrueNest Property Management',['additional interest name','who to add on insurance','insurance interested party','TrueNest additional interest'],['TrueNest Property Management']),
  i('insurance-address','Insurance mailing address','Insurance mailing address: 10200 W State Rd 84 Ste 221, Davie FL 33324',['insurance mailing address','address for additional interest','where to mail insurance notice','TrueNest insurance address'],['10200 W State Rd 84']),
  i('landlord-fee','Application fee','Application fee: $50 per adult',['landlord application fee','application cost per adult','how much to apply','adult application fee'],['$50']),
  i('turnaround','Application turnaround','Application turnaround: 5 Days after all required documentation from all adult occupants is received',['application turnaround time','how long landlord approval takes','application processing days','when application reviewed'],['5 Days']),
  i('hoa','Association','Association: Yes',['is there an HOA','association required','does property have HOA','homeowners association'],['Yes']),
  i('dti','Debt to income ratio','Debt to income ratio: must not exceed 40%',['debt to income limit','DTI requirement','maximum debt ratio','income debt percentage'],['40%']),
  i('hoa-income','HOA income criteria','HOA income criteria: $40,000 yearly',['HOA yearly income','association income minimum','annual income HOA','yearly earnings needed'],['40,000']),
  i('proof-income','Proof of income','Proof of income: required',['proof of income required','need income documents','must prove income','income verification'],['required']),
  i('tax-docs','Income documents','Income documents: 2 years of W-2 and tax returns',['W2 tax return requirement','two years income docs','what tax documents needed','W-2 history'],['2 years']),
  i('hoa-time','HOA approval time','HOA approval time: 21 days',['HOA approval time','association processing time','how long HOA approval','HOA wait days'],['21 days']),
  i('hoa-fee','HOA application fee','HOA application fee: $150 per person age 18+',['HOA application fee','association fee per adult','fee for person 18 plus','HOA cost per applicant'],['150']),
  i('married-fee','Married HOA fee','Married HOA fee: $150',['married couple HOA fee','association fee if married','married application cost','spouse HOA fee'],['150']),
  i('marriage-cert','Marriage certificate','Marriage certificate: required for married applicants',['marriage certificate needed','proof of marriage','married applicants documents','need marriage cert'],['required']),
  i('card','HOA payment method','HOA payment method: credit card',['HOA payment method','pay association by card','credit card required','how pay HOA application'],['credit card']),
  i('hoa-deposit','HOA security deposit','HOA security deposit: $500 refundable',['HOA refundable deposit','association security deposit','500 deposit','is HOA deposit refundable'],['500','refundable']),
  i('pets','Pet policy','Pet policy: No.',['pet policy','can i bring my dog','are cats allowed','animals permitted','puppy allowed'],['No']),
  i('parking','Parking','Parking: paking spot 1 and 1 guest parking',['assigned parking','car parking space','where can i park my vehicle','SUV parking','parking spot'],['1','parking']),
  i('guest-parking','Guest parking','Guest parking: 1 guest parking spot',['guest parking','visitor parking','parking for guests','visitor car spot'],['1']),
  i('lease','Minimum lease duration','Minimum lease duration: 1 Year',['minimum lease','lease length','how long must i rent','shortest tenancy'],['1 Year']),
  i('smoking','Smoking','Smoking: No smoking allowed inside the property',['smoking policy','can i smoke inside','cigarettes allowed','smoke in condo'],['smoking','allowed']),
  i('phone','Listing contact','Listing contact: 954-676-7867',['listing phone number','agent phone','contact number','who can i call'],['954-676-7867']),
  i('email','Listing contact','Listing contact: scharisse@truenestpm.com',['listing email','agent email','contact email','who can i email'],['scharisse@truenestpm.com']),
  i('liability-name','Additional interest','Additional interest: TrueNest Property Management',['insurance company additional interest','property manager insurance name','who is additional interest','additional interest'],['TrueNest Property Management']),
  i('application-docs','Application documentation','Application documentation: all required documentation from all adult occupants must be received',['application documents','documents from adult occupants','what paperwork is needed','all adults documentation'],['adult occupants']),
];
