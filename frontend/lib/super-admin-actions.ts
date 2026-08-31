"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const apiBase = (process.env.BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "")

async function request(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get("access_token")?.value
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message ?? "Super Admin request failed")
  }
  return response.json()
}

function permissions(formData: FormData) {
  return formData.getAll("dashboardPermissions").map(String)
}

export async function getPlans() { return request("/super-admin-management/plans") }
export async function getTenants() { return request("/super-admin-management/tenants") }
export async function getPlatformDomain() { return request("/super-admin-management/platform-domain") }
export async function getPaymentSettings() { return request("/super-admin-management/payment-settings") }

export async function updatePlatformDomainAction(formData: FormData) {
  await request("/super-admin-management/platform-domain", {
    method: "PATCH",
    body: JSON.stringify({ primaryDomain: formData.get("primaryDomain") }),
  })
  revalidatePath("/super-admin/settings")
  revalidatePath("/super-admin/tenants")
  revalidatePath("/super-admin/activity")
}

export async function updatePaymentSettingsAction(formData: FormData) {
  await request("/super-admin-management/payment-settings", {
    method: "PATCH",
    body: JSON.stringify({
      stripeSecretKey: formData.get("stripeSecretKey"),
      stripeWebhookSecret: formData.get("stripeWebhookSecret"),
      stripePublishableKey: formData.get("stripePublishableKey"),
      stripeCurrency: formData.get("stripeCurrency"),
      clearStripeSecretKey: formData.get("clearStripeSecretKey") === "on",
      clearStripeWebhookSecret: formData.get("clearStripeWebhookSecret") === "on",
    }),
  })
  revalidatePath("/super-admin/settings")
  revalidatePath("/super-admin/activity")
}

export async function createTenantAction(formData: FormData) {
  await request("/super-admin-management/tenants", {
    method: "POST",
    body: JSON.stringify({
      businessName: formData.get("businessName"),
      requestedSubdomain: formData.get("requestedSubdomain"),
      planId: Number(formData.get("planId")),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      password: formData.get("password"),
    }),
  })
  revalidatePath("/super-admin/tenants")
  revalidatePath("/super-admin/activity")
}
export async function getAuditLogs() { return request("/super-admin-management/audit-logs") }

export async function createPlanAction(formData: FormData) {
  await request("/super-admin-management/plans", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      billingDays: formData.get("billingDays"),
      dashboardPermissions: permissions(formData),
    }),
  })
  revalidatePath("/super-admin/plans")
  revalidatePath("/super-admin/activity")
}

export async function updatePlanAction(formData: FormData) {
  const id = Number(formData.get("id"))
  await request(`/super-admin-management/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      billingDays: formData.get("billingDays"),
      dashboardPermissions: permissions(formData),
    }),
  })
  revalidatePath("/super-admin/plans")
  revalidatePath("/super-admin/activity")
}

export async function setPlanStatusAction(formData: FormData) {
  const id = Number(formData.get("id"))
  const isActive = formData.get("isActive") === "true"
  await request(`/super-admin-management/plans/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  })
  revalidatePath("/super-admin/plans")
  revalidatePath("/super-admin/activity")
}

export async function deletePlanAction(formData: FormData) {
  const id = Number(formData.get("id"))
  await request(`/super-admin-management/plans/${id}`, { method: "DELETE" })
  revalidatePath("/super-admin/plans")
  revalidatePath("/super-admin/activity")
}

export async function deleteTenantAction(formData: FormData) {
  const id = Number(formData.get("id"))
  await request(`/super-admin-management/tenants/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation: formData.get("confirmation") }),
  })
  revalidatePath("/super-admin/tenants")
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/activity")
}

export async function setTenantBlockedAction(formData: FormData) {
  const id = Number(formData.get("id"))
  const isBlocked = formData.get("isBlocked") === "true"
  await request(`/super-admin-management/tenants/${id}/block`, {
    method: "PATCH",
    body: JSON.stringify({ isBlocked }),
  })
  revalidatePath("/super-admin/tenants")
  revalidatePath("/super-admin/activity")
}

export async function extendTenantSubscriptionAction(formData: FormData) {
  const id = Number(formData.get("id"))
  const days = Number(formData.get("days"))
  await request(`/super-admin-management/tenants/${id}/extend`, {
    method: "PATCH",
    body: JSON.stringify({ days }),
  })
  revalidatePath("/super-admin/tenants")
  revalidatePath("/super-admin/activity")
}

export type PlatformChatbotKnowledge = {
  id: string
  audience: "LEAD" | "REALTOR"
  title: string
  answer: string
  questionExamples?: string[]
  priority: number
  active: boolean
  sourceHash?: string
  indexStatus: string
  lastError?: string
}

export async function getPlatformChatbotKnowledge() {
  return request("/super-admin-management/chatbot-knowledge") as Promise<PlatformChatbotKnowledge[]>
}

export async function createPlatformChatbotKnowledgeAction(formData: FormData) {
  await request("/super-admin-management/chatbot-knowledge", {
    method: "POST",
    body: JSON.stringify({
      audience: formData.get("audience"),
      title: formData.get("title"),
      answer: formData.get("answer"),
      questionExamples: [String(formData.get("mainQuestion") ?? ""), ...String(formData.get("similarQuestions") ?? "").split("\n")].map((item) => item.trim()).filter(Boolean),
      priority: Number(formData.get("priority") ?? 50),
    }),
  })
  revalidatePath("/super-admin/chatbot-knowledge")
}

export async function updatePlatformChatbotKnowledgeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  await request(`/super-admin-management/chatbot-knowledge/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      audience: formData.get("audience"),
      title: formData.get("title"),
      answer: formData.get("answer"),
      questionExamples: [String(formData.get("mainQuestion") ?? ""), ...String(formData.get("similarQuestions") ?? "").split("\n")].map((item) => item.trim()).filter(Boolean),
      priority: Number(formData.get("priority") ?? 50),
      active: formData.get("active") === "true",
    }),
  })
  revalidatePath("/super-admin/chatbot-knowledge")
  revalidatePath("/super-admin/activity")
}

export async function setPlatformChatbotKnowledgeStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  await request(`/super-admin-management/chatbot-knowledge/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active: formData.get("active") === "true" }),
  })
  revalidatePath("/super-admin/chatbot-knowledge")
  revalidatePath("/super-admin/activity")
}

export async function reindexPlatformChatbotKnowledgeAction() {
  await request("/super-admin-management/chatbot-knowledge/reindex", { method: "POST" })
  revalidatePath("/super-admin/chatbot-knowledge")
  revalidatePath("/super-admin/activity")
}

export async function deletePlatformChatbotKnowledgeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  await request(`/super-admin-management/chatbot-knowledge/${id}`, {
    method: "DELETE",
  })
  revalidatePath("/super-admin/chatbot-knowledge")
}

export type PlatformChatbotAiSettings = {
  enabled: boolean
  providerName: "OpenRouter" | "OpenAI" | "Gemini" | "Claude" | "Ollama" | "Custom"
  baseUrl: string
  models: string[]
  temperature: number
  maxOutputTokens: number
  timeoutMs: number
  maxConcurrency: number
  answerFallbackEnabled: boolean
  qualificationFallbackEnabled: boolean
  reviewLearningEnabled: boolean
  denyDataCollection: boolean
  apiKeyConfigured: boolean
  updatedAt?: string | null
}

export async function getPlatformChatbotAiSettings() {
  return request("/super-admin-management/chatbot-ai") as Promise<PlatformChatbotAiSettings>
}

export async function updatePlatformChatbotAiAction(formData: FormData) {
  const models = String(formData.get("models") ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim().replace(/^[\s,;.'"`]+|[\s,;.'"`]+$/g, ""))
    .filter(Boolean)
  const result = await request("/super-admin-management/chatbot-ai", {
    method: "PATCH",
    body: JSON.stringify({
      enabled: formData.get("enabled") === "on",
      providerName: formData.get("providerName"),
      baseUrl: formData.get("baseUrl"),
      models,
      apiKey: formData.get("apiKey"),
      clearApiKey: formData.get("clearApiKey") === "on",
      temperature: Number(formData.get("temperature") ?? 0.84),
      maxOutputTokens: Number(formData.get("maxOutputTokens") ?? 180),
      timeoutMs: Number(formData.get("timeoutMs") ?? 20000),
      maxConcurrency: Number(formData.get("maxConcurrency") ?? 32),
      answerFallbackEnabled: formData.get("answerFallbackEnabled") === "on",
      qualificationFallbackEnabled: formData.get("qualificationFallbackEnabled") === "on",
      reviewLearningEnabled: formData.get("reviewLearningEnabled") === "on",
      denyDataCollection: formData.get("denyDataCollection") === "on",
    }),
  }) as PlatformChatbotAiSettings
  revalidatePath("/super-admin/chatbot-learning")
  return result
}

export async function testPlatformChatbotAiAction() {
  return request("/super-admin-management/chatbot-ai/test", { method: "POST" }) as Promise<{
    ok: boolean
    provider: string
    model: string
    message: string
  }>
}

export type PlatformChatbotLearningCandidate = {
  id: string
  tenantId: number
  tenantName: string
  propertyId: number | null
  propertyTitle: string
  audience: "LEAD" | "REALTOR"
  channel: "WEB" | "EMAIL" | "SMS"
  kind: "ANSWER" | "QUALIFICATION"
  status: "PENDING" | "APPROVED" | "REJECTED"
  question: string
  answer: string
  structuredPayload?: Record<string, unknown> | null
  evidenceKnowledgeIds?: string[]
  provider: string
  model: string
  confidence: number | null
  occurrences: number
  firstSeenAt: string
  lastSeenAt: string
  reviewedAt?: string | null
}

export type PlatformChatbotLearningPage = {
  items: PlatformChatbotLearningCandidate[]
  total: number
  page: number
  pageSize: number
  counts: { pending: number; approved: number; rejected: number }
}

export async function getPlatformChatbotLearning(filters: {
  status?: string
  kind?: string
  tenantId?: string | number
  page?: string | number
} = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set("status", String(filters.status))
  if (filters.kind) params.set("kind", String(filters.kind))
  if (filters.tenantId) params.set("tenantId", String(filters.tenantId))
  if (filters.page) params.set("page", String(filters.page))
  params.set("pageSize", "100")
  return request(`/super-admin-management/chatbot-learning?${params.toString()}`) as Promise<PlatformChatbotLearningPage>
}

async function reviewPlatformChatbotLearning(formData: FormData, status: "APPROVED" | "REJECTED") {
  const ids = formData.getAll("ids").map(String).filter(Boolean)
  await request("/super-admin-management/chatbot-learning/review", {
    method: "PATCH",
    body: JSON.stringify({ ids, status }),
  })
  revalidatePath("/super-admin/chatbot-learning")
  revalidatePath("/super-admin/chatbot-knowledge")
}

export async function approvePlatformChatbotLearningAction(formData: FormData) {
  return reviewPlatformChatbotLearning(formData, "APPROVED")
}

export async function rejectPlatformChatbotLearningAction(formData: FormData) {
  return reviewPlatformChatbotLearning(formData, "REJECTED")
}

export async function importPlatformChatbotLearningAction(formData: FormData) {
  const file = formData.get("backup")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a chatbot learned-pack JSON file.")
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Learning pack must be 10 MB or smaller.")
  }
  const payload = JSON.parse(await file.text())
  const result = await request("/super-admin-management/chatbot-learning/import", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  revalidatePath("/super-admin/chatbot-learning")
  revalidatePath("/super-admin/chatbot-knowledge")
  return result
}
