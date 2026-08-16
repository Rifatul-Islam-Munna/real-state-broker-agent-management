"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get("access_token")?.value
  const incomingHeaders = await headers()
  const tenantHost = incomingHeaders.get("x-tenant-host") ?? incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host")
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
    const message = Array.isArray(payload.message)
      ? payload.message[0]
      : payload.message ?? "Tenant dashboard request failed"
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

function numberValue(value: FormDataEntryValue | null) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function stringValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim()
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed"
}

export type TenantActionState = {
  ok: boolean
  message: string
}

export type TenantDashboardContext = {
  tenant: {
    id: number
    businessName: string
    slug: string
    subdomain: string
    dashboardPermissions: string[]
    subscriptionExpiresAt: string | null
    subscriptionStatus: "active" | "expired" | "blocked" | "inactive"
    isActive: boolean
    isBlocked: boolean
    plan: { id: number; name: string; billingDays: number } | null
  }
}

export type TenantProperty = {
  id: number
  title: string
  status: "draft" | "published" | "archived" | string
  payload: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export type TenantPropertyReference = {
  id: number
  title: string
  status: string
}

export type TenantLead = {
  id: number
  full_name: string
  email: string | null
  phone: string | null
  status: string
  payload?: Record<string, unknown>
  properties: TenantPropertyReference[]
  created_at: string
  updated_at?: string
}

export type TenantOwnerReport = {
  id: number
  propertyId: number
  propertyTitle: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  subject: string
  body?: string
  channels: string[]
  deliveryResults: Array<{ channel: string; status: string; message: string }>
  deliveryStatus: "sent" | "partial" | "failed" | string
  sentByName: string
  sentAt: string
  createdAt?: string
}

export type TenantShowingFormField = {
  key: string
  label: string
  type: "text" | "email" | "phone" | "number" | "textarea" | "select" | "radio" | "checkbox" | "checkbox-group" | "date" | "datetime" | "divider" | "heading" | "paragraph" | "image"
  required: boolean
  options: string[]
  description?: string
  imageUrl?: string
}

export type TenantShowingTemplate = {
  id: number
  name: string
  description: string
  propertyMode: "fixed" | "respondent"
  fields: TenantShowingFormField[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TenantShowingRequest = {
  id: number
  title: string
  message?: string
  status: string
  deliveryStatus: string
  leadId: number
  leadName: string
  propertyId: number | null
  propertyTitle: string | null
  requestedPropertyId: number | null
  requestedPropertyTitle: string | null
  propertyMode: "fixed" | "respondent"
  recipientName?: string
  recipientEmail: string
  recipientPhone: string
  fields?: TenantShowingFormField[]
  answers?: Record<string, unknown>
  deliveryChannels?: string[]
  deliveryResults?: Array<{ channel: string; status: string; message: string }>
  expiresAt: string
  preferredShowingAt: string | null
  publicUrl?: string
  sentAt: string
  viewedAt?: string | null
  submittedAt: string | null
  approvedAt: string | null
  rejectedAt?: string | null
  assignedRealtorName: string
  assignedRealtorEmail?: string
  assignedRealtorPhone?: string
  approvedShowingId: number | null
  createdAt?: string
  updatedAt?: string
}

export type TenantShowing = {
  id: number
  showingRequestId: number
  leadId: number
  propertyId: number
  propertyTitle: string
  leadName: string
  leadEmail: string
  leadPhone: string
  realtorName: string
  realtorEmail: string
  realtorPhone: string
  showingAt: string
  status: string
  notes: string
  createdAt: string
  updatedAt: string
}

export async function getTenantDashboardContext() {
  return request<TenantDashboardContext>("/tenant-dashboard/context")
}

export async function getTenantDashboardOverview() {
  return request<
    TenantDashboardContext & {
      metrics: {
        properties: number
        publishedProperties: number
        leads: number
        ownerReports: number
        showingRequests: number
        pendingShowingRequests: number
        showings: number
        upcomingShowings: number
      }
      recentActivity: Array<{ id: number; action: string; summary: string; created_at: string }>
    }
  >("/tenant-dashboard/overview")
}

export async function getTenantProfile() {
  const settings = await request<{
    identity: { businessName?: string }
    subdomain: string
    branding: { primaryColor?: string; logoUrl?: string; tagline?: string }
    homepage: { phone?: string; email?: string; address?: string; headline?: string; description?: string }
    contactForm: { enabled?: boolean }
  }>("/tenant-dashboard/settings")
  return { ...settings, businessName: settings.identity.businessName ?? "" }
}

export async function updateTenantProfileAction(formData: FormData) {
  await request("/tenant-dashboard/settings/profile", {
    method: "PATCH",
    body: JSON.stringify({
      ...Object.fromEntries(formData.entries()),
      contactFormEnabled: formData.get("contactFormEnabled") !== "off",
    }),
  })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings/tenant")
}

export async function updateAssignedSubdomainAction(formData: FormData) {
  await request("/tenant-dashboard/settings/subdomain", {
    method: "PATCH",
    body: JSON.stringify({ subdomain: formData.get("subdomain") }),
  })
  revalidatePath("/dashboard/settings/tenant")
}

export async function getTenantProperties() {
  return request<TenantProperty[]>("/tenant-dashboard/properties")
}

export async function createTenantPropertyAction(formData: FormData) {
  await request("/tenant-dashboard/properties", {
    method: "POST",
    body: JSON.stringify({ title: formData.get("title"), status: formData.get("status") }),
  })
  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard")
}

export async function updateTenantPropertyStatusAction(formData: FormData) {
  const id = numberValue(formData.get("propertyId"))
  if (!id) throw new Error("Property is required")
  await request(`/tenant-dashboard/properties/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: formData.get("status") }),
  })
  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/showing-requests")
  revalidatePath("/dashboard")
}

export async function getTenantLeads() {
  return request<TenantLead[]>("/tenant-dashboard/leads")
}

export async function createTenantLeadAction(formData: FormData) {
  await request("/tenant-dashboard/leads", {
    method: "POST",
    body: JSON.stringify({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      propertyIds: formData.getAll("propertyIds").map(Number),
    }),
  })
  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/showing-requests")
  revalidatePath("/dashboard")
}

export async function updateTenantLeadPropertiesAction(formData: FormData) {
  const id = numberValue(formData.get("leadId"))
  if (!id) throw new Error("Lead is required")
  await request(`/tenant-dashboard/leads/${id}/properties`, {
    method: "PATCH",
    body: JSON.stringify({ propertyIds: formData.getAll("propertyIds").map(Number) }),
  })
  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/showing-requests")
}

export async function getTenantOwnerReports() {
  return request<TenantOwnerReport[]>("/tenant-dashboard/owner-reports")
}

export async function getTenantOwnerReport(id: number) {
  return request<TenantOwnerReport>(`/tenant-dashboard/owner-reports/${id}`)
}

export async function sendTenantOwnerReportAction(
  _previous: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    await request("/tenant-dashboard/owner-reports", {
      method: "POST",
      body: JSON.stringify({
        propertyId: numberValue(formData.get("propertyId")),
        ownerName: stringValue(formData.get("ownerName")),
        ownerEmail: stringValue(formData.get("ownerEmail")),
        ownerPhone: stringValue(formData.get("ownerPhone")),
        subject: stringValue(formData.get("subject")),
        body: stringValue(formData.get("body")),
        channels: formData.getAll("channels").map(String),
      }),
    })
    revalidatePath("/dashboard/owner-reports")
    revalidatePath("/dashboard")
    return { ok: true, message: "Owner report recorded and delivery attempted." }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

export async function getTenantShowingTemplates() {
  return request<TenantShowingTemplate[]>("/tenant-dashboard/showing-form-templates")
}

export async function createTenantShowingTemplateAction(
  _previous: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const rawFields = stringValue(formData.get("fields"))
    const fields = JSON.parse(rawFields || "[]")
    await request("/tenant-dashboard/showing-form-templates", {
      method: "POST",
      body: JSON.stringify({
        name: stringValue(formData.get("name")),
        description: stringValue(formData.get("description")),
        propertyMode: stringValue(formData.get("propertyMode")),
        fields,
      }),
    })
    revalidatePath("/dashboard/showing-requests")
    return { ok: true, message: "Showing form template created." }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

export async function getTenantShowingRequests() {
  return request<TenantShowingRequest[]>("/tenant-dashboard/showing-requests")
}

export async function getTenantShowingRequest(id: number) {
  return request<TenantShowingRequest>(`/tenant-dashboard/showing-requests/${id}`)
}

export async function createTenantShowingRequestAction(
  _previous: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    await request("/tenant-dashboard/showing-requests", {
      method: "POST",
      body: JSON.stringify({
        leadId: numberValue(formData.get("leadId")),
        templateId: numberValue(formData.get("templateId")),
        propertyId: numberValue(formData.get("propertyId")),
        propertyMode: stringValue(formData.get("propertyMode")),
        title: stringValue(formData.get("title")),
        message: stringValue(formData.get("message")),
        expiryHours: Number(formData.get("expiryHours") ?? 72),
        channels: formData.getAll("channels").map(String),
      }),
    })
    revalidatePath("/dashboard/showing-requests")
    revalidatePath("/dashboard")
    return { ok: true, message: "Showing request created. Open its detail page to copy the secure link." }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

export async function approveTenantShowingRequestAction(
  _previous: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const requestId = numberValue(formData.get("requestId"))
    if (!requestId) throw new Error("Showing request is required")
    await request(`/tenant-dashboard/showing-requests/${requestId}/approve`, {
      method: "PATCH",
      body: JSON.stringify({
        propertyId: numberValue(formData.get("propertyId")),
        showingAt: stringValue(formData.get("showingAt")),
        realtorName: stringValue(formData.get("realtorName")),
        realtorEmail: stringValue(formData.get("realtorEmail")),
        realtorPhone: stringValue(formData.get("realtorPhone")),
        notes: stringValue(formData.get("notes")),
      }),
    })
    revalidatePath(`/dashboard/showing-requests/${requestId}`)
    revalidatePath("/dashboard/showing-requests")
    revalidatePath("/dashboard/realtor-showings")
    revalidatePath("/dashboard")
    return { ok: true, message: "Request approved and added to Realtor Showings." }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

export async function rejectTenantShowingRequestAction(
  _previous: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const requestId = numberValue(formData.get("requestId"))
    if (!requestId) throw new Error("Showing request is required")
    await request(`/tenant-dashboard/showing-requests/${requestId}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason: stringValue(formData.get("reason")) }),
    })
    revalidatePath(`/dashboard/showing-requests/${requestId}`)
    revalidatePath("/dashboard/showing-requests")
    return { ok: true, message: "Showing request rejected." }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

export async function getTenantShowings() {
  return request<TenantShowing[]>("/tenant-dashboard/showings")
}
