"use server"

import { cookies } from "next/headers"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function request<T>(path: string): Promise<T> {
  const token = (await cookies()).get("access_token")?.value
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { access_token: token } : {},
    cache: "no-store",
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
    throw new Error(message ?? "Tenant account request failed")
  }
  return response.json()
}

export type TenantAccountContext = {
  tenantRole: "Owner" | "Staff" | null
  mainPortalUrl: string
  workspaceUrl: string
  publicSiteUrl: string
  tenant: {
    id: number; businessName: string; slug: string; subdomain: string
    isActive: boolean; isBlocked: boolean; provisioningStatus: string; databaseStatus: string
    dashboardPermissions: string[]; subscriptionExpiresAt: string | null
    subscriptionStatus: "active" | "expired" | "blocked" | "inactive"
    plan: { id: number; name: string; price: string; billingDays: number } | null
  }
}

export async function getTenantAccountContext() {
  return request<TenantAccountContext>("/tenant-account/context")
}
