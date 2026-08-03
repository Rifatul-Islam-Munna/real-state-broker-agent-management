"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function request(path: string, init: RequestInit = {}) {
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
    throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message ?? "Tracking settings request failed")
  }
  return response.json()
}

export async function getTenantTrackingSettings() {
  return request("/tenant-tracking")
}

export async function saveTenantTrackingAction(formData: FormData) {
  await request("/tenant-tracking", {
    method: "PUT",
    body: JSON.stringify({
      containerId: formData.get("containerId"),
      enabled: formData.get("enabled") === "on",
    }),
  })
  revalidatePath("/dashboard/settings/tracking")
}

export async function setTenantTrackingStatusAction(formData: FormData) {
  await request("/tenant-tracking/status", {
    method: "PATCH",
    body: JSON.stringify({ enabled: formData.get("enabled") === "true" }),
  })
  revalidatePath("/dashboard/settings/tracking")
}

export async function removeTenantTrackingAction() {
  await request("/tenant-tracking", { method: "DELETE" })
  revalidatePath("/dashboard/settings/tracking")
}
