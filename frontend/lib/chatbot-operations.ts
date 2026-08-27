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

export function parseTestChatbotRole(value: string) {
  const text = value.trim().toLowerCase()
  if (/\b(realtor|real estate agent|broker|listing agent|buyer'?s agent)\b/.test(text)) return "REALTOR" as const
  if (/\b(tenant|renter|applicant|renting|want to rent|looking to rent)\b/.test(text)) return "LEAD" as const
  return null
}

export function parseTestCredit(value: string) {
  const text = value.replace(/,/g, "").trim()
  if (isRequirementQuestion(text, "creditScore")) return null
  const explicit = text.match(/\b(?:credit(?:\s+score)?|score)\D{0,16}(\d{3})\b/i)
  const fallback = isShortQualificationReply(text) ? text.match(/\b(\d{3})\b/) : null
  const score = Number(explicit?.[1] ?? fallback?.[1])
  return Number.isFinite(score) && score >= 300 && score <= 850 ? score : null
}

export function parseTestMonthlyIncome(value: string) {
  const text = value.replace(/,/g, "").trim()
  if (isRequirementQuestion(text, "monthlyEarning")) return null
  const explicitIncome = /\b(income|earn(?:ing|ings|ed)?|make|salary|pay|combined)\b/i.test(text)
  if (!explicitIncome && !isShortQualificationReply(text)) return null
  const match = text.match(/(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(k)?\b/i)
  if (!match) return null
  const amount = Number(match[1]) * (match[2] ? 1000 : 1)
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null
}

function isRequirementQuestion(value: string, expected: "creditScore" | "monthlyEarning") {
  const topic = expected === "creditScore"
    ? /\b(credit|score)\b/i
    : /\b(income|earnings?|salary|monthly income)\b/i
  if (!topic.test(value)) return false
  const selfReport = /\b(my|mine|our|we\s+(?:make|earn)|i\s+(?:make|earn|have)|i'm\s+at|i\s+am\s+at)\b/i.test(value)
  if (selfReport) return false
  return /\?|\b(minimum|required|requirement|need|qualify|how much|what)\b/i.test(value)
}

function isShortQualificationReply(value: string) {
  const compact = value
    .toLowerCase()
    .replace(/\b(about|around|approximately|approx|roughly|maybe|probably|it(?:'s| is)?|mine is|i am at|i'm at)\b/g, " ")
    .replace(/(?:\$|usd)/g, " ")
    .replace(/\d+(?:\.\d+)?\s*k?\b/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim()
  return compact === ""
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
