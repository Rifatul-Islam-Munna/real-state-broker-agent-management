"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get("access_token")?.value
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { access_token: token } : {}),
      ...init.headers,
    },
    cache: "no-store",
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message ?? "Tenant dashboard request failed"
    throw new Error(message)
  }
  return response.json()
}

export type TenantDashboardContext = {
  tenant: {
    id: number
    businessName: string
    slug: string
    subdomain: string
    dashboardPermissions: string[]
    subscriptionStartsAt: string | null
    subscriptionExpiresAt: string | null
    subscriptionStatus: "active" | "expired" | "blocked" | "inactive"
    plan: { id: number; name: string; billingDays: number } | null
  }
}

export async function getTenantDashboardContext() {
  return request<TenantDashboardContext>("/tenant-dashboard/context")
}

export async function getTenantDashboardOverview() {
  return request<TenantDashboardContext & { metrics: { properties: number; publishedProperties: number; leads: number }; recentActivity: Array<{ id: number; action: string; summary: string; created_at: string }> }>("/tenant-dashboard/overview")
}

export async function getTenantProfile() {
  return request<{ businessName: string; subdomain: string; branding: { tagline?: string }; homepage: { phone?: string; email?: string; address?: string; headline?: string; description?: string } }>("/tenant-dashboard/profile")
}

export async function updateTenantProfileAction(formData: FormData) {
  await request("/tenant-dashboard/profile", {
    method: "PATCH",
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  })
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings/tenant")
}

export async function updateAssignedSubdomainAction(formData: FormData) {
  await request("/tenant-dashboard/subdomain", {
    method: "PATCH",
    body: JSON.stringify({ subdomain: formData.get("subdomain") }),
  })
  revalidatePath("/dashboard/settings/tenant")
}

export async function getTenantProperties() {
  return request<Array<{ id: number; title: string; status: string; payload: Record<string, unknown>; created_at: string }>>("/tenant-dashboard/properties")
}

export async function createTenantPropertyAction(formData: FormData) {
  await request("/tenant-dashboard/properties", {
    method: "POST",
    body: JSON.stringify({ title: formData.get("title"), status: formData.get("status") }),
  })
  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard")
}

export async function getTenantLeads() {
  return request<Array<{ id: number; full_name: string; email: string | null; phone: string | null; status: string; created_at: string }>>("/tenant-dashboard/leads")
}

export async function createTenantLeadAction(formData: FormData) {
  await request("/tenant-dashboard/leads", {
    method: "POST",
    body: JSON.stringify({ fullName: formData.get("fullName"), email: formData.get("email"), phone: formData.get("phone") }),
  })
  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard")
}
