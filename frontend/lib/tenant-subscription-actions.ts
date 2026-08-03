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
    throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message ?? "Subscription request failed")
  }
  return response.json()
}

export async function getTenantSubscription() {
  return request("/tenant-subscription")
}

export async function getActivePlans() {
  return request("/public-saas/plans")
}

export async function renewTenantSubscriptionAction(formData: FormData) {
  await request("/tenant-subscription/renew", {
    method: "POST",
    body: JSON.stringify({
      planId: Number(formData.get("planId")),
      purchaseReference: formData.get("purchaseReference"),
    }),
  })
  revalidatePath("/dashboard/subscription")
}
