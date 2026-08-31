export type BotActivityItem = {
  id: string
  kind: "message" | "event"
  type: string
  reason: string | null
  body: string | null
  direction?: string | null
  confidence?: number | null
  createdAt: string
  conversationId?: string
  leadId?: number | null
  propertyId?: number | null
  channel: string
  audience?: string
  conversationStatus: string
  leadName: string
  propertyTitle?: string | null
}

export type BotActivityFilters = {
  search: string
  kind: string
  channel: string
  status: string
}

export function filterBotActivity(
  items: BotActivityItem[],
  filters: BotActivityFilters
) {
  const search = filters.search.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.kind !== "all" && item.kind !== filters.kind) return false
    if (filters.channel !== "all" && item.channel !== filters.channel) return false
    if (filters.status !== "all" && item.conversationStatus !== filters.status) return false
    if (!search) return true
    return [item.leadName, item.propertyTitle, item.body, item.reason, item.type]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search))
  })
}

export function appendConversationalPrompt(answer: string, prompt?: string) {
  const base = answer.trim()
  const followUp = String(prompt ?? "").trim()
  if (!followUp) return base
  return base ? `${base}\n\n${followUp}` : followUp
}

export function buildTestChatbotInput(question: string, propertyId?: number | null) {
  return {
    audience: "LEAD" as const,
    channel: "WEB" as const,
    propertyId: propertyId && propertyId > 0 ? propertyId : null,
    question: question.trim(),
  }
}

export function leadShowingTemplates<
  T extends { audience?: string; isActive?: boolean },
>(templates: T[]) {
  return templates.filter(
    (template) =>
      template.audience === "LeadShowing" && template.isActive !== false
  )
}

export type PropertyPickerOption = {
  id: number
  title: string
  address: string
}

export function propertyPickerLabel(property: PropertyPickerOption) {
  return `${property.title} - ${property.address}`
}

export function propertyIdFromPickerLabel(
  label: string,
  properties: PropertyPickerOption[]
) {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return null
  return (
    properties.find(
      (property) => propertyPickerLabel(property).toLowerCase() === normalized
    )?.id ?? null
  )
}

export function shouldOfferPropertyIndex(
  result: { reason: string; evidence: unknown[] },
  propertyId?: number | null
) {
  return Boolean(
    propertyId &&
      result.reason === "EVIDENCE_INSUFFICIENT" &&
      result.evidence.length === 0
  )
}

export function splitIndexedKnowledge<T extends { sourceType?: string }>(items: T[]) {
  const manual = items.filter((item) => item.sourceType === "MANUAL")
  return {
    manual,
    propertyCount: items.length - manual.length,
  }
}

export function composeQuestionExamples(mainQuestion: string, similarQuestions: string) {
  const values = [mainQuestion, ...similarQuestions.split(/\r?\n/)]
    .map((value) => value.trim())
    .filter(Boolean)
  return [...new Set(values)]
}

export function splitQuestionExamples(examples?: string[]) {
  const values = (examples ?? []).map((value) => value.trim()).filter(Boolean)
  return {
    mainQuestion: values[0] ?? "",
    similarQuestions: values.slice(1).join("\n"),
  }
}

const TEST_WORD_ALIASES: Record<string, string> = {
  u: "you", ur: "your", r: "are", n: "and", pls: "please", plz: "please", im: "i am", ive: "i have",
  wanna: "want to", gonna: "going to", gotta: "have to", lemme: "let me", gimme: "give me", tryna: "trying to",
  tmr: "tomorrow", tmrw: "tomorrow", tommorow: "tomorrow", tomorow: "tomorrow", tommor: "tomorrow", tmor: "tomorrow", tonite: "tonight", wknd: "weekend",
  possibale: "possible", posible: "possible", possble: "possible",
  shwoing: "showing", showng: "showing", shoing: "showing", shwng: "showing", shwing: "showing",
  vewing: "viewing", viewng: "viewing", veiwng: "viewing", veiw: "view", vwing: "viewing",
  scheduel: "schedule", schdule: "schedule", scedule: "schedule", sched: "schedule", appt: "appointment",
  proparty: "property", propraty: "property", proprty: "property", prpty: "property", prop: "property", apt: "apartment",
  relator: "realtor", realter: "realtor", realator: "realtor", tenent: "tenant", tennant: "tenant",
  creidt: "credit", crenti: "credit", creti: "credit", credti: "credit", credt: "credit", crdit: "credit", scroe: "score", socre: "score",
  inocme: "income", incme: "income", inome: "income", mnthly: "monthly", montly: "monthly",
  app: "application", req: "requirement", reqd: "required", min: "minimum", avail: "available", incl: "included", inc: "included",
  parknig: "parking", insurence: "insurance", depsoit: "deposit", deopsit: "deposit", utilites: "utilities",
  br: "bedroom", bdrm: "bedroom", bd: "bedroom", ba: "bathroom", mo: "month", yr: "year", wk: "week",
  rn: "right now", asap: "as soon as possible", idk: "i do not know", thx: "thanks", ty: "thanks", abt: "about", arnd: "around",
}

const TEST_CANONICAL = [
  "showing", "viewing", "tour", "visit", "appointment", "schedule", "property", "place", "home", "house", "apartment", "unit", "condo",
  "realtor", "broker", "agent", "tenant", "renter", "applicant", "credit", "score", "fico", "income", "salary", "monthly", "annual",
  "parking", "available", "availability", "application", "insurance", "deposit", "utilities", "bedroom", "bathroom", "tomorrow", "weekend",
]

export function normalizeTestHumanText(value: string) {
  let text = String(value ?? "").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  text = text.replace(/[’`]/g, "'")
    .replace(/\bi'?m\b/g, "i am").replace(/\bwe'?re\b/g, "we are").replace(/\bit'?s\b/g, "it is")
    .replace(/\bwhat'?s\b/g, "what is").replace(/\bwhere'?s\b/g, "where is").replace(/\bwhen'?s\b/g, "when is")
    .replace(/([a-z])\1{2,}/g, "$1$1")
  const tokens = text.match(/[a-z]+|(?:\$|usd)?\d+(?:[.,]\d+)?(?:k|grand|thousand)?|[/@.+-]+/g) ?? []
  let normalized = tokens.map((token) => normalizeTestToken(token)).join(" ").replace(/\s+/g, " ").trim()
  normalized = normalized
    .replace(/\bstill up\b/g, "still available").replace(/\bstill open\b/g, "still available")
    .replace(/\bcan i swing by\b/g, "can i visit").replace(/\bcan i pull up\b/g, "can i visit")
    .replace(/\bcan i go there\b/g, "can i visit").replace(/\bcan we go there\b/g, "can we visit").replace(/\bi want to go there\b/g, "i want to visit")
    .replace(/\bcan i take a peek\b/g, "can i see inside").replace(/\bcan we take a peek\b/g, "can we see inside")
    .replace(/\bwhen can we take a look\b/g, "when can we view the property")
    .replace(/\bwhat is it going for\b/g, "monthly rent").replace(/\bwhat are they asking\b/g, "monthly rent")
  return normalized
}

function normalizeTestToken(token: string) {
  if (TEST_WORD_ALIASES[token]) return TEST_WORD_ALIASES[token]
  if (!/^[a-z]+$/.test(token) || token.length < 4 || TEST_CANONICAL.includes(token)) return token
  const candidates = TEST_CANONICAL.filter((candidate) => candidate[0] === token[0] && Math.abs(candidate.length - token.length) <= 1 && oneEditApart(token, candidate))
  return candidates.length === 1 ? candidates[0] : token
}

function oneEditApart(left: string, right: string) {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false
  let i = 0; let j = 0; let edits = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i += 1; j += 1; continue }
    edits += 1; if (edits > 1) return false
    if (left.length > right.length) i += 1
    else if (right.length > left.length) j += 1
    else { i += 1; j += 1 }
  }
  return edits + Number(i < left.length || j < right.length) <= 1
}

export function parseTestChatbotRole(value: string) {
  const text = normalizeTestHumanText(value)
  if (/\b(i am|we are|this is|working as).{0,12}\b(realtor|broker|real estate agent|leasing agent|rental agent|buyers? agent)\b/.test(text)) return "REALTOR" as const
  if (/\b(realtor|broker|agent)\s+(here|speaking)\b/.test(text)) return "REALTOR" as const
  if (/\b(represent|representing|working for|acting for|on behalf of).{0,20}\b(buyer|client|tenant|renter|owner|seller)\b/.test(text)) return "REALTOR" as const
  if (/\b(my|our)\s+(buyer|client)\b/.test(text)) return "REALTOR" as const
  if (/\b(showing|viewing|touring).{0,20}\b(for|with).{0,12}\b(client|buyer|tenant|renter)\b/.test(text)) return "REALTOR" as const
  if (/^(?:yes |yeah |yep )?(?:(?:i am|we are) )?(?:a |an )?(realtor|broker|real estate agent|leasing agent|rental agent)$/.test(text)) return "REALTOR" as const

  if (/^(?:yes |yeah |yep )?(?:(?:i am|we are) )?(?:a |an )?(tenant|renter|applicant|prospective tenant|prospective renter)$/.test(text)) return "LEAD" as const
  if (/\b(for myself|for ourselves|for me|for us|just me|my family|our family|my partner|my spouse|my husband|my wife|my girlfriend|my boyfriend|personal use)\b/.test(text)) return "LEAD" as const
  if (/\b(i|we|my|our).{0,18}\b(family|household|wife|husband|spouse|partner|kids?|children).{0,28}\b(fit|stay|live|move|enough|space|room)\b/.test(text)) return "LEAD" as const
  if (/\b(family|household)\s+(?:of\s+)?\d{1,2}.{0,24}\b(fit|stay|live|move|enough|space|room)\b/.test(text)) return "LEAD" as const
  if (/\b(i|we).{0,8}\b(want|would like|plan|hope|need|looking|interested|trying).{0,35}\b(rent|lease|move|live|buy|purchase)\b/.test(text)) return "LEAD" as const
  if (/\b(i|we).{0,8}\b(need|want|looking for|trying to find).{0,24}\b(place|home|house|apartment|unit|condo)\b/.test(text)) return "LEAD" as const
  if (/\b(rent|lease|move into|live in|buy|purchase).{0,30}\b(myself|ourselves|me|us|my family|my partner|my spouse|this property|this place|this home|this house|this apartment|this unit|this condo)\b/.test(text)) return "LEAD" as const
  return null
}

export function parseTestShowingIntent(value: string) {
  const text = normalizeTestHumanText(value)
  return Boolean(
    /\b(showing|viewing|tour|visit|walk through|walkthrough|open house)\b/.test(text) ||
    /\b(show me around|show me (?:the )?(?:place|property|home|house|apartment|condo|unit)|take a look|look around|see inside|get inside|check it out|see it in person|physically see|come see|meet there)\b/.test(text) ||
    /\b(schedule|book|arrange|set up|reserve|make|get).{0,24}\b(visit|appointment|showing|viewing|tour|time|slot|walk through)\b/.test(text) ||
    /\b(can|could|would|may)\s+(?:i|we).{0,18}\b(see|view|tour|visit|walk|check).{0,20}\b(it|inside|there|place|property|unit|apartment|condo|house|home)\b/.test(text) ||
    /\b(i|we).{0,16}\b(want|would love|would like|hope|need|trying).{0,18}\b(see|view|tour|visit|walk through|check out).{0,18}\b(it|this|there|inside|property|place|home|house|apartment|unit|condo)\b/.test(text) ||
    /\b(would love|would like|love to|want to|trying to).{0,12}\b(see|view|tour|visit|walk through|check out).{0,18}\b(it|this|there|inside|property|place|home|house|apartment|unit|condo)\b/.test(text) ||
    /\b(is it|would it be).{0,20}\b(possible|okay|ok).{0,20}\b(see|view|visit|tour|come by|come over)\b/.test(text) ||
    /\b(see|view|visit|check out|look at).{0,28}\b(place|property|home|house|apartment|condo|unit)\b/.test(text) ||
    /\b(come by|come over|stop by|drop by|swing by|pull up|stop in|see it in person|physically see|meet there)\b/.test(text) ||
    /\bwhen\b.{0,28}\b(showing|viewing|visit|tour|see|come by|come over)\b/.test(text) ||
    /\b(showing|viewing|visit|tour|slot|appointment)\b.{0,28}\b(possible|available|tomorrow|today|tonight|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(text)
  )
}

export function parseTestCredit(value: string) {
  const text = normalizeTestHumanText(value).replace(/,/g, "")
  if (isRequirementQuestion(text, "creditScore") || (testHasPropertyNumberContext(text) && !testHasCreditSelfContext(text))) return null
  const band = testParseCreditBand(text)
  if (band !== null && testLooksLikeCreditAttempt(text)) return band
  const spoken = parseTestSpokenCredit(text)
  if (spoken !== null && (testLooksLikeCreditAttempt(text) || isTerseTestCredit(text))) return spoken
  const match = text.match(/\b(\d{3})\b/)
  const numeric = Number(match?.[1])
  if (!Number.isFinite(numeric) || numeric < 300 || numeric > 850 || (!testLooksLikeCreditAttempt(text) && !isTerseTestCredit(text))) return null
  if (/\b(just|slightly|little|bit)\s+under\b.{0,12}\b\d{3}\b/i.test(text)) return numeric - 1
  if (/\b(just|slightly|little|bit)\s+over\b.{0,12}\b\d{3}\b/i.test(text)) return numeric + 1
  return Math.round(numeric)
}

export function parseTestMonthlyIncome(value: string) {
  const text = normalizeTestHumanText(value).replace(/,/g, "")
  if (isRequirementQuestion(text, "monthlyEarning") || (!testLooksLikeIncomeAttempt(text) && !isTerseTestIncome(text))) return null
  const contextual = text.match(/\b(?:income|salary|earnings|pay|make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)\b.{0,60}/i)?.[0] ?? text
  const amount = parseTestHumanAmount(contextual)
  if (amount === null) return null
  if (/\b(per year|a year|yearly|annual|annually)\b|\/\s*year\b/i.test(text)) return Math.round(amount / 12)
  if (/\b(biweekly|every two weeks)\b/i.test(text)) return Math.round((amount * 26) / 12)
  if (/\b(per week|a week|weekly)\b|\/\s*week\b/i.test(text)) return Math.round((amount * 52) / 12)
  return amount
}

export function testQualificationClarification(value: string, expected: "creditScore" | "monthlyEarning") {
  const text = normalizeTestHumanText(value).replace(/,/g, "")
  if (!text || isRequirementQuestion(text, expected)) return null
  if (expected === "creditScore") {
    if (parseTestCredit(value) !== null || !testLooksLikeCreditAttempt(text)) return null
    const raw = text.match(/\b\d{3,5}\b/)?.[0] ?? null
    if (raw) {
      const suggestions = testCreditTypoSuggestions(raw)
      if (suggestions.length) return `I got that you're giving me your credit score. ${raw} is outside the usual 300–850 range. Did you mean ${formatTestChoices(suggestions)}?`
      return `I got that you're giving me your credit score, but ${raw} is outside the usual 300–850 range. What approximate score should I use?`
    }
    return `I got that you're talking about your credit score, but I couldn't pin down the number. A rough number is fine — for example, “around 710” or “high 600s.”`
  }
  if (parseTestMonthlyIncome(value) !== null || !testLooksLikeIncomeAttempt(text)) return null
  return `I got that you're giving me your income, but I couldn't pin down the amount. A rough amount is fine — for example, “about 5k a month” or “60k a year.”`
}

function testHasCreditSelfContext(text: string) {
  return /\b(my|our)\s+(credit|credit score|fico|score)|\b(mine|ours)\s+(is|was|at|around)|\b(i|we)\s+(have|had|am at|are at|was at|were at)|\b(credit|fico|score)\s+(?:is|was|sits?|sitting|around|about|roughly|approximately|at)|\b(last time i checked|last i checked|credit karma|experian|equifax|transunion)\b/i.test(text)
}

function testHasPropertyNumberContext(text: string) {
  return /\b(apartment|unit|apt|address|rent|deposit|fee|hoa|association|floor|bedroom|bathroom|parking|price|cost|listing|square feet|sq ft|phone|year built)\b/i.test(text)
}

function testLooksLikeCreditAttempt(text: string) {
  if (testHasCreditSelfContext(text)) return true
  if (testHasPropertyNumberContext(text)) return false
  if (testParseCreditBand(text) !== null || parseTestSpokenCredit(text) !== null) return text.length <= 140
  return /\b\d{3,5}\b/.test(text) && text.length <= 140 && /\b(about|around|roughly|maybe|probably|like|ish|think|guess|not great|not good|pretty good|decent|low|high|somewhere|approximately|approx|last checked|was|is|at)\b/i.test(text)
}

function testParseCreditBand(text: string) {
  const match = text.match(/\b(low|lower|mid|middle|high|upper)\s+(6|7|8)00(?:\s*s)?\b/i)
  if (!match) return null
  const value = Number(match[2]) * 100 + (/^(low|lower)$/i.test(match[1]) ? 10 : /^(mid|middle)$/i.test(match[1]) ? 50 : 80)
  return value >= 300 && value <= 850 ? value : null
}

function testLooksLikeIncomeAttempt(text: string) {
  const selfIncome = /\b(my|our)\s+(income|salary|earnings|pay|gross|net|take home)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)|\b(income|salary|earnings|gross|net|take home)\s+(?:is|was|around|about|roughly|approximately|at)\b/i.test(text)
  if (selfIncome) return true
  if (/\b(rent|deposit|fee|hoa|association|price|cost|application|security deposit)\b/i.test(text) || text.length > 140) return false
  if (/(?:\$\s*)?\d+(?:\.\d+)?\s*(?:k|grand|thousand)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:\s+and\s+a\s+half)?\s+(?:grand|thousand)\b/i.test(text)) return true
  return /\b\d{3,6}\b/.test(text) && /\b(about|around|roughly|maybe|probably|like|ish|think|guess|not much|not a lot|pretty low|pretty good|somewhere|approximately|approx|per month|monthly|a month)\b/i.test(text)
}

function testCreditTypoSuggestions(raw: string) {
  if (!/^\d{4,5}$/.test(raw)) return []
  const values = new Set<number>()
  for (let index = 0; index < raw.length; index += 1) {
    const candidate = Number(raw.slice(0, index) + raw.slice(index + 1))
    if (Number.isFinite(candidate) && candidate >= 300 && candidate <= 850) values.add(candidate)
  }
  return [...values].slice(0, 3)
}

function formatTestChoices(values: number[]) {
  if (values.length === 1) return String(values[0])
  if (values.length === 2) return `${values[0]} or ${values[1]}`
  return `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`
}

function isRequirementQuestion(value: string, expected: "creditScore" | "monthlyEarning") {
  const text = normalizeTestHumanText(value)
  const topic = expected === "creditScore" ? /\b(credit|fico|score)\b/i : /\b(income|earnings?|salary|monthly income|monthly pay)\b/i
  if (!topic.test(text)) return false
  const selfReport = expected === "creditScore"
    ? testHasCreditSelfContext(text)
    : /\b(my|our)\s+(income|salary|earnings|pay|monthly|gross|net)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)\b/i.test(text)
  if (selfReport) return false
  return /\?|\b(minimum|required|requirement|need|qualify|how much|what|at least|must have|must make)\b/i.test(text)
}

function parseTestSpokenCredit(value: string) {
  const base: Record<string, number> = { six: 600, seven: 700, eight: 800 }
  const ones: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9 }
  const teens: Record<string, number> = { ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19 }
  const tens: Record<string, number> = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 }
  const suffix = "(?:ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\\s+(?:one|two|three|four|five|six|seven|eight|nine))?|(?:one|two|three|four|five|six|seven|eight|nine)"
  const full = value.match(new RegExp(`\\b(six|seven|eight)\\s+hundred(?:\\s+and)?(?:\\s+(${suffix}))?\\b`, "i"))
  if (full) return validTestCredit(base[full[1].toLowerCase()] + parseTestUnderHundred(full[2] ?? "", ones, teens, tens))
  const zeroStyle = value.match(/\b(six|seven|eight)\s+(?:oh|zero)\s+(one|two|three|four|five|six|seven|eight|nine)\b/i)
  if (zeroStyle) return validTestCredit(base[zeroStyle[1].toLowerCase()] + ones[zeroStyle[2].toLowerCase()])
  const compact = value.match(new RegExp(`\\b(six|seven|eight)\\s+(${suffix})\\b`, "i"))
  return compact ? validTestCredit(base[compact[1].toLowerCase()] + parseTestUnderHundred(compact[2], ones, teens, tens)) : null
}

function parseTestUnderHundred(value: string, ones: Record<string, number>, teens: Record<string, number>, tens: Record<string, number>) {
  if (!value) return 0
  const parts = value.toLowerCase().trim().split(/\s+/)
  if (parts.length === 1) return teens[parts[0]] ?? tens[parts[0]] ?? ones[parts[0]] ?? 0
  return (tens[parts[0]] ?? 0) + (ones[parts[1]] ?? 0)
}

function validTestCredit(value: number) {
  return Number.isFinite(value) && value >= 300 && value <= 850 ? Math.round(value) : null
}

function parseTestHumanAmount(value: string) {
  const between = value.match(/\bbetween\s+(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\s+and\s+(\d+(?:\.\d+)?)\s*(k|grand|thousand)\b/i)
  const range = between ?? value.match(/\b(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(k|grand|thousand)\b/i)
  if (range) {
    const multiplier = range[2] ?? range[4]
    const left = Number(range[1]) * (/^(k|grand|thousand)$/i.test(multiplier) ? 1000 : 1)
    const right = Number(range[3]) * 1000
    if (Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0) return Math.round(Math.min(left, right))
  }
  const words: Record<string, number> = { one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20 }
  const wordAmount = value.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(\s+and\s+a\s+half)?\s+(grand|thousand)\b/i)
  if (wordAmount) return words[wordAmount[1].toLowerCase()] * 1000 + (wordAmount[2] ? 500 : 0)
  const numeric = value.match(/(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\b/i)
  if (!numeric) return null
  const hasMultiplier = /^(k|grand|thousand)$/i.test(numeric[2] ?? "")
  const amount = Number(numeric[1]) * (hasMultiplier ? 1000 : 1)
  if (!hasMultiplier && amount < 100) return null
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null
}

function isTerseTestCredit(value: string) {
  const compact = normalizeTestHumanText(value)
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it is|mine is|ours is|i am at|we are at|my|our|credit|fico|score|is|was|at|just|like|ish|somewhere|honestly|think|guess|pretty|not|very|great|good|bad|decent|low|lower|mid|middle|high|upper|last|time|checked|sitting|sits|little|bit|slightly|under|over)\b/g, " ")
    .replace(/\d{3,5}/g, " ").replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine|hundred|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|and)\b/g, " ")
    .replace(/[^a-z]+/g, " ").trim()
  return compact === ""
}

function isTerseTestIncome(value: string) {
  const text = normalizeTestHumanText(value)
  const selfIncome = /\b(my|our)\s+(income|salary|earnings|pay|monthly|gross|net|take home)|\b(i|we)\s+(make|earn|get|receive|bring in|bring home|pull in|take home|gross|net|clear)\b/i.test(text)
  if (/\b(rent|deposit|fee|hoa|association|price|cost|application|security deposit)\b/i.test(text) && !selfIncome) return false
  if (/\b(minimum|required|requirement|must make|need to make|how much|what income)\b/i.test(text) && !selfIncome) return false
  const compact = text
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it is|mine is|ours is|i am at|we are at|my|our|income|salary|earnings|pay|gross|net|combined|before|tax|taxes|after|monthly|month|yearly|annual|annually|year|weekly|week|biweekly|every|two|per|a|just|like|ish)\b/g, " ")
    .replace(/(?:\$|usd)/g, " ").replace(/\d+(?:\.\d+)?\s*(?:k|grand|thousand)?\b/g, " ")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|grand|thousand)\b/g, " ")
    .replace(/[^a-z]+/g, " ").trim()
  return selfIncome || compact === ""
}

export function propertyQualification(payload?: Record<string, unknown>) {
  const source = payload ?? {}
  const description = typeof source.description === "string" ? source.description : ""
  const creditRaw = source.minimumCreditScore ?? source.minCreditScore
  const incomeRaw = source.minimumMonthlyIncome ?? source.minMonthlyIncome
  const creditMatch = description.match(/\bcredit\s*score\b[^\d]{0,20}(\d{3})\b/i)
  const incomeMatch = description.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:monthly\s+income|per\s+month|\/\s*month)/i)
  const minimumCreditScore = Number(String(creditRaw ?? creditMatch?.[1] ?? "").replace(/[^\d.]/g, "")) || null
  const minimumMonthlyIncome = Number(String(incomeRaw ?? incomeMatch?.[1] ?? "").replace(/[^\d.]/g, "")) || null
  return { minimumCreditScore, minimumMonthlyIncome }
}

export function qualificationMatchesProperty(
  creditScore: number,
  monthlyIncome: number,
  payload?: Record<string, unknown>
) {
  const requirements = propertyQualification(payload)
  return (
    (!requirements.minimumCreditScore || creditScore >= requirements.minimumCreditScore) &&
    (!requirements.minimumMonthlyIncome || monthlyIncome >= requirements.minimumMonthlyIncome)
  )
}
