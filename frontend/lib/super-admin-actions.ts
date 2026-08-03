"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api").replace(/\/$/, "")

async function request(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get("accessToken")?.value
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
