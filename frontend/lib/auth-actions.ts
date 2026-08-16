"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { type AgentRoutePermission } from "@/lib/agent-route-access"
import { hasAgentRoutePermission } from "@/lib/agent-route-access"
import {
  getPortalHomePath,
  getPortalPathByRole,
  resolvePostAuthRedirect,
} from "@/lib/portal-paths"

type AuthResponse = {
  id: number
  fullName: string
  email: string
  role: string
  accessToken: string
  refreshToken: string
  accessTokenExpiry: string
  refreshTokenExpiry: string
}

export type SessionUser = {
  id: number
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  role: string
  tenantId?: number | null
  tenantRole?: "Owner" | "Staff" | null
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  agentRoutePermissions: string[]
}

export type AuthActionState = {
  error: string | null
}

const initialState: AuthActionState = { error: null }
const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json()
    const message = payload?.message

    if (typeof message === "string") return message
    if (Array.isArray(message)) return message[0] ?? "Request failed"
    if (typeof payload?.errors?.[0] === "string") return payload.errors[0]
  } catch {
    return "Request failed"
  }

  return "Request failed"
}

async function requestBackend(path: string, init: RequestInit = {}) {
  try {
    return await fetch(`${baseUrl}${path}`, { ...init, cache: "no-store" })
  } catch {
    return null
  }
}

function sessionCookieOptions(expires: Date, httpOnly = false) {
  const secure = process.env.NODE_ENV === "production"
  const configuredDomain = String(process.env.AUTH_COOKIE_DOMAIN ?? "").trim()
  const maxAge = Math.max(1, Math.floor((expires.getTime() - Date.now()) / 1000))
  return {
    expires,
    maxAge,
    httpOnly,
    path: "/" as const,
    sameSite: "lax" as const,
    secure,
    ...(configuredDomain ? { domain: configuredDomain } : {}),
  }
}

async function persistSession(auth: AuthResponse) {
  const cookieStore = await cookies()
  const accessExpiry = new Date(auth.accessTokenExpiry)
  const refreshExpiry = new Date(auth.refreshTokenExpiry)

  cookieStore.set("access_token", auth.accessToken, sessionCookieOptions(accessExpiry, true))
  cookieStore.set("refresh_token", auth.refreshToken, sessionCookieOptions(refreshExpiry, true))
  cookieStore.set("user_role", auth.role, sessionCookieOptions(refreshExpiry))
}

async function clearSessionCookies() {
  const cookieStore = await cookies()

  cookieStore.set("access_token", "", { expires: new Date(0), path: "/" })
  cookieStore.set("refresh_token", "", { expires: new Date(0), path: "/" })
  cookieStore.set("user_role", "", { expires: new Date(0), path: "/" })
}

async function fetchCurrentUser(accessToken: string) {
  const response = await requestBackend("/auth/me", {
    headers: { access_token: accessToken },
  })

  if (response?.ok) return (await response.json()) as SessionUser
  return null
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) return null
  return fetchCurrentUser(accessToken)
}

export async function requireSuperAdminSession() {
  const user = await getSessionUser()

  if (!user) redirect("/super-admin/login")
  if (user.role !== "Admin") redirect(getPortalHomePath(user))

  return user
}

export async function requireSession(
  allowedRoles?: string[],
  requiredAgentPermission?: AgentRoutePermission,
) {
  const user = await getSessionUser()

  if (!user) redirect("/login")

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(getPortalHomePath(user))
  }

  const tenantOwner =
    user.role === "Agent" && user.agentRoutePermissions.includes("tenant-isolated")

  if (
    user.role === "Agent" &&
    requiredAgentPermission &&
    !tenantOwner &&
    !hasAgentRoutePermission(user.agentRoutePermissions, requiredAgentPermission)
  ) {
    redirect(getPortalHomePath(user))
  }

  return user
}

export async function loginAction(
  _prevState: AuthActionState = initialState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const nextPath = String(formData.get("next") ?? "")

  const response = await requestBackend("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response) return { error: "Authentication service is temporarily unavailable. Please try again." }
  if (!response.ok) return { error: await readErrorMessage(response) }

  const auth = (await response.json()) as AuthResponse
  await persistSession(auth)
  const currentUser = await fetchCurrentUser(auth.accessToken)
  const requestHeaders = await headers()
  const onTenantHost = Boolean(requestHeaders.get("x-tenant-host"))

  if (onTenantHost && currentUser?.tenantId) redirect("/dashboard")

  redirect(
    await resolvePostAuthRedirect(
      auth.role,
      nextPath,
      currentUser?.agentRoutePermissions ?? [],
      currentUser?.tenantId,
    ),
  )
}

export async function superAdminLoginAction(
  _prevState: AuthActionState = initialState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  const response = await requestBackend("/auth/super-admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response) return { error: "Super Admin authentication is temporarily unavailable. Please try again." }
  if (!response.ok) return { error: await readErrorMessage(response) }

  const auth = (await response.json()) as AuthResponse
  if (auth.role !== "Admin") {
    return { error: "This account cannot access the Super Admin portal" }
  }

  await persistSession(auth)
  redirect("/super-admin")
}

export async function purchaseTenantAction(
  _prevState: AuthActionState = initialState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState
  const response = await fetch(`${baseUrl}/public-saas/checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    cache: "no-store",
  })

  if (!response.ok) return { error: await readErrorMessage(response) }
  const checkout = (await response.json()) as { url?: string }
  if (!checkout.url) return { error: "Stripe did not return a checkout URL" }
  redirect(checkout.url)
}

export async function registerAction(
  _prevState: AuthActionState = initialState,
  formData: FormData,
): Promise<AuthActionState> {
  void _prevState
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: String(formData.get("email") ?? "").trim(),
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      phone: String(formData.get("phone") ?? "").trim(),
      role: "Agent",
    }),
    cache: "no-store",
  })

  if (!response.ok) return { error: await readErrorMessage(response) }

  const auth = (await response.json()) as AuthResponse
  await persistSession(auth)
  const currentUser = await fetchCurrentUser(auth.accessToken)
  redirect(getPortalPathByRole(auth.role, currentUser?.agentRoutePermissions ?? []))
}

export async function logoutAction() {
  await clearSessionCookies()
  redirect("/login")
}

export async function superAdminLogoutAction() {
  await clearSessionCookies()
  redirect("/super-admin/login")
}
