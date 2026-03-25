"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { type AgentRoutePermission } from "@/lib/agent-route-access"
import { hasAgentRoutePermission } from "@/lib/agent-route-access"
import { getPortalHomePath, getPortalPathByRole, resolvePostAuthRedirect } from "@/lib/portal-paths"

type AuthResponse = {
  id: number
  fullName: string
  email: string
  role: string
  accessToken: string
  refreshToken: string
  accessTokenExpiry: string
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
const sessionCookieDays = 10

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json()
    const message = payload?.message

    if (typeof message === "string") {
      return message
    }

    if (Array.isArray(message)) {
      return message[0] ?? "Request failed"
    }

    if (typeof payload?.errors?.[0] === "string") {
      return payload.errors[0]
    }
  } catch {
    return "Request failed"
  }

  return "Request failed"
}

async function persistSession(auth: AuthResponse) {
  const cookieStore = await cookies()
  const secure = process.env.NODE_ENV === "production"

  cookieStore.set("access_token", auth.accessToken, {
    expires: new Date(auth.accessTokenExpiry),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  })

  cookieStore.set("refresh_token", auth.refreshToken, {
    expires: new Date(Date.now() + sessionCookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  })

  cookieStore.set("user_role", auth.role, {
    expires: new Date(Date.now() + sessionCookieDays * 24 * 60 * 60 * 1000),
    path: "/",
    sameSite: "lax",
    secure,
  })
}

async function clearSessionCookies() {
  const cookieStore = await cookies()

  cookieStore.set("access_token", "", { expires: new Date(0), path: "/" })
  cookieStore.set("refresh_token", "", { expires: new Date(0), path: "/" })
  cookieStore.set("user_role", "", { expires: new Date(0), path: "/" })
}

async function fetchCurrentUser(accessToken: string) {
  const response = await fetch(`${baseUrl}/auth/me`, {
    cache: "no-store",
    headers: {
      access_token: accessToken,
    },
  })

  if (response.ok) {
    return (await response.json()) as SessionUser
  }

  return null
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value

  if (!accessToken) {
    return null
  }

  return fetchCurrentUser(accessToken)
}

export async function requireSession(
  allowedRoles?: string[],
  requiredAgentPermission?: AgentRoutePermission,
) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(getPortalHomePath(user))
  }

  if (
    user.role === "Agent" &&
    requiredAgentPermission &&
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

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  })

  if (!response.ok) {
    return { error: await readErrorMessage(response) }
  }

  const auth = (await response.json()) as AuthResponse
  await persistSession(auth)
  const currentUser = await fetchCurrentUser(auth.accessToken)
  redirect(await resolvePostAuthRedirect(auth.role, nextPath, currentUser?.agentRoutePermissions ?? []))
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
      role: String(formData.get("role") ?? "Admin"),
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    return { error: await readErrorMessage(response) }
  }

  const auth = (await response.json()) as AuthResponse
  await persistSession(auth)
  const currentUser = await fetchCurrentUser(auth.accessToken)
  redirect(getPortalPathByRole(auth.role, currentUser?.agentRoutePermissions ?? []))
}

export async function logoutAction() {
  await clearSessionCookies()
  redirect("/login")
}
