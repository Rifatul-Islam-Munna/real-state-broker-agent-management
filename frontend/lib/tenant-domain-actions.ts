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
    throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message ?? "Domain request failed")
  }
  return response.json()
}

export async function getTenantDomainSettings() {
  return request("/tenant-domain")
}

export async function saveTenantDomainAction(formData: FormData) {
  await request("/tenant-domain", {
    method: "PUT",
    body: JSON.stringify({ hostname: formData.get("hostname") }),
  })
  revalidatePath("/dashboard/settings/custom-domain")
  revalidatePath("/account/domain")
}

export async function verifyTenantDomainAction() {
  await request("/tenant-domain/verify", { method: "POST" })
  revalidatePath("/dashboard/settings/custom-domain")
  revalidatePath("/account/domain")
}

export async function removeTenantDomainAction() {
  await request("/tenant-domain", { method: "DELETE" })
  revalidatePath("/dashboard/settings/custom-domain")
  revalidatePath("/account/domain")
}
