"use server"

import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"
import { leadShowingTemplates, type BotActivityItem } from "@/lib/chatbot-operations"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get("access_token")?.value
  const incoming = await headers()
  const tenantHost =
    incoming.get("x-tenant-host") ??
    incoming.get("x-forwarded-host") ??
    incoming.get("host")
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { access_token: token } : {}),
      ...(tenantHost ? { "x-tenant-host": tenantHost } : {}),
      ...init.headers,
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(
      Array.isArray(payload.message)
        ? payload.message[0]
        : (payload.message ?? "Chatbot request failed")
    )
  }
  return response.json()
}

export type ChatbotSettings = {
  enabled: boolean
  showingRequestTemplateId: string | null
  channels: { web: boolean; email: boolean; sms: boolean }
  minimumConfidence: number
  responseDelaySeconds: number
  maxTurns: number
  fallbackMessage: string
  creditRequiredMessage: string
  creditRejectedMessage: string
  propertyUnavailableMessage: string
  evidenceConflictMessage: string
  turnLimitMessage: string
  realtorVerificationMessage: string
  stopRules: {
    humanIntervention: boolean
    doNotContact: boolean
    propertyUnavailable: boolean
    creditBelowMinimum: boolean
    insufficientEvidence: boolean
    evidenceConflict: boolean
    turnLimit: boolean
  }
}

export type ChatbotInfrastructureStatus = {
  qdrant: {
    configured: boolean
    connected: boolean
    error: string | null
  }
}

export type ChatbotKnowledge = {
  id: string
  propertyId: number | null
  scope: "TENANT" | "PROPERTY"
  sourceType?: string
  audience: "LEAD" | "REALTOR"
  title: string
  answer: string
  questionExamples?: string[]
  priority: number
  active: boolean
  indexStatus: string
  lastError?: string
}

export type ChatbotTestResult = {
  answer: string
  decision: "ANSWER" | "STOP" | "ASK_ROLE" | "ASK_CREDIT" | "ASK_INCOME" | "CREATE_SHOWING_REQUEST"
  reason: string
  confidence: number | null
  ai?: { provider: string; model: string | null; status?: "ANSWERED" | "UNSUPPORTED" | "INVALID_OUTPUT" | "FAILED" | "DISABLED" } | null
  evidence: Array<{
    knowledgeId: string
    title: string
    scope: string
    sourceType: string
    score: number
  }>
}

export async function getChatbotSettings() {
  return request<ChatbotSettings>("/tenant-chatbot/settings")
}

export async function getChatbotInfrastructureStatus() {
  return request<ChatbotInfrastructureStatus>("/tenant-chatbot/health")
}

export async function listChatbotKnowledge() {
  return request<ChatbotKnowledge[]>("/tenant-chatbot/knowledge")
}

export async function listBotActivity() {
  return request<BotActivityItem[]>("/tenant-chatbot/activity")
}

export async function listChatbotShowingTemplates() {
  const settings = await request<{
    communicationTemplates: AgencyCommunicationTemplateItem[]
  }>("/tenant-workspace/agency-settings")
  return leadShowingTemplates(settings.communicationTemplates ?? [])
}

export async function saveChatbotSettings(input: ChatbotSettings) {
  const result = await request<ChatbotSettings>("/tenant-chatbot/settings", {
    method: "POST",
    body: JSON.stringify(input),
  })
  revalidatePath("/dashboard/chatbot-settings")
  return result
}

export async function addChatbotKnowledge(input: {
  propertyId?: number | null
  audience: "LEAD" | "REALTOR"
  title: string
  answer: string
  questionExamples?: string[]
  priority?: number
}) {
  const result = await request<ChatbotKnowledge>("/tenant-chatbot/knowledge", {
    method: "POST",
    body: JSON.stringify(input),
  })
  revalidatePath("/dashboard/chatbot-settings")
  return result
}

export async function testChatbot(input: {
  propertyId?: number | null
  audience: "LEAD" | "REALTOR"
  channel?: "WEB" | "EMAIL" | "SMS"
  question: string
  allowSensitiveRealtorEvidence?: boolean
}) {
  return request<ChatbotTestResult>("/tenant-chatbot/test", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateChatbotKnowledge(
  id: string,
  input: Partial<{
    propertyId: number | null
    audience: "LEAD" | "REALTOR"
    title: string
    answer: string
    questionExamples: string[]
    priority: number
    active: boolean
  }>
) {
  const result = await request<ChatbotKnowledge>(
    `/tenant-chatbot/knowledge/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  )
  revalidatePath("/dashboard/chatbot-settings")
  return result
}

export async function deleteChatbotKnowledge(id: string) {
  const result = await request<{ deleted: boolean; id: string }>(
    `/tenant-chatbot/knowledge/${id}`,
    {
      method: "DELETE",
    }
  )
  revalidatePath("/dashboard/chatbot-settings")
  return result
}

export async function reindexChatbotKnowledge() {
  const result = await request<{ properties: number; indexed: number }>(
    "/tenant-chatbot/reindex",
    {
      method: "POST",
    }
  )
  revalidatePath("/dashboard/chatbot-settings")
  return result
}

export type ChatbotTestReplyInterpretation = {
  recognized: boolean
  source: "LOCAL" | "LEARNED" | "AI" | "NONE"
  role: "LEAD" | "REALTOR" | null
  creditScore: number | null
  monthlyEarning: number | null
  clarification?: string
  provider?: string
  model?: string
  confidence?: number | null
}

export async function interpretTestChatbotReply(input: {
  propertyId?: number | null
  audience?: "LEAD" | "REALTOR"
  channel?: "WEB" | "EMAIL" | "SMS"
  expected: "role" | "creditScore" | "monthlyEarning"
  message: string
}) {
  return request<ChatbotTestReplyInterpretation>("/tenant-chatbot/test/interpret-reply", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
