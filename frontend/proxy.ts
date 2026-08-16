import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getDefaultAgentRoute, hasAgentRoutePermission } from "@/lib/agent-route-access"
import { canOpenDashboardRoute, getDashboardHomePath } from "@/lib/dashboard-routes"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

function configuredPrimaryDomain() {
  const explicit = process.env.PRIMARY_DOMAIN?.trim()
  if (explicit) return explicit.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "")

  const frontendUrl = process.env.FRONTEND_URL?.trim()
  if (frontendUrl) {
    try {
      return new URL(frontendUrl).hostname.toLowerCase().replace(/\.$/, "")
    } catch {
      // Fall through to localhost for local development.
    }
  }

  return "localhost"
}

const fallbackPrimaryDomain = configuredPrimaryDomain()
const fallbackTenantBaseDomain = normalizeHost(process.env.TENANT_BASE_DOMAIN ?? fallbackPrimaryDomain) || fallbackPrimaryDomain

async function getDomainConfig() {
  try {
    const response = await fetch(`${baseUrl}/public-saas/platform-domain`, {
      next: { revalidate: 30 },
    })
    if (!response.ok) return { primaryDomain: fallbackPrimaryDomain, tenantBaseDomain: fallbackTenantBaseDomain }
    const payload = (await response.json()) as { primaryDomain?: string; tenantBaseDomain?: string }
    return {
      primaryDomain: normalizeHost(payload.primaryDomain ?? fallbackPrimaryDomain) || fallbackPrimaryDomain,
      tenantBaseDomain: normalizeHost(payload.tenantBaseDomain ?? fallbackTenantBaseDomain) || fallbackTenantBaseDomain,
    }
  } catch {
    return { primaryDomain: fallbackPrimaryDomain, tenantBaseDomain: fallbackTenantBaseDomain }
  }
}

function normalizeHost(value: string | null) {
  return (value ?? "").toLowerCase().split(",")[0].trim().replace(/:\d+$/, "").replace(/\.$/, "")
}

function assignedSubdomain(host: string, primaryDomain: string, tenantBaseDomain: string) {
  if (!host || host === primaryDomain || host === `www.${primaryDomain}` || host === "localhost" || host === "127.0.0.1") return null
  // Keep local tenant hosts usable even when production domain env values are loaded.
  if (host.endsWith(".localhost")) {
    const subdomain = host.slice(0, -".localhost".length)
    return subdomain && !subdomain.includes(".") ? subdomain : null
  }
  if (host === tenantBaseDomain || host === `www.${tenantBaseDomain}` || !host.endsWith(`.${tenantBaseDomain}`)) return null
  const subdomain = host.slice(0, -(tenantBaseDomain.length + 1))
  return subdomain && !subdomain.includes(".") ? subdomain : null
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

async function fetchCurrentUser(accessToken: string) {
  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      cache: "no-store",
      headers: { access_token: accessToken },
    })
    if (!response.ok) return null
    return (await response.json()) as { role: string; tenantId?: number | null; tenantRole?: string | null; agentRoutePermissions: string[] }
  } catch {
    return null
  }
}

function getRequiredAgentPermission(pathname: string) {
  if (pathname === "/agent/dashboard" || pathname.startsWith("/agent/dashboard/")) return "dashboard"
  if (pathname === "/agent/properties" || pathname.startsWith("/agent/properties/")) return "properties"
  if (pathname === "/agent/deal-pipeline" || pathname.startsWith("/agent/deal-pipeline/")) return "deal-pipeline"
  if (pathname === "/agent/lead" || pathname.startsWith("/agent/lead/")) return "lead"
  if (pathname === "/agent/mail" || pathname.startsWith("/agent/mail/")) return "mail"
  if (pathname === "/agent/settings" || pathname.startsWith("/agent/settings/")) return "settings"
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { primaryDomain, tenantBaseDomain } = await getDomainConfig()
  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
  const tenantSubdomain = assignedSubdomain(host, primaryDomain, tenantBaseDomain)
  const mainHost = !host || host === primaryDomain || host === `www.${primaryDomain}` || host === "localhost" || host === "127.0.0.1"
  const tenantHost = Boolean(tenantSubdomain) || !mainHost

  if (tenantHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")
    const isCustomDomain = !tenantSubdomain
    if (process.env.NODE_ENV === "production" && isCustomDomain && forwardedProto !== "https") {
      const secureUrl = request.nextUrl.clone()
      secureUrl.protocol = "https:"
      return NextResponse.redirect(secureUrl, 308)
    }

    if (pathname.startsWith("/super-admin")) {
      const mainUrl = new URL(request.url)
      mainUrl.hostname = primaryDomain
      mainUrl.pathname = "/super-admin/login"
      return NextResponse.redirect(mainUrl)
    }
    if (pathname.startsWith("/account")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-tenant-host", host)

    if (pathname === "/") {
      const rewrite = request.nextUrl.clone()
      rewrite.pathname = "/tenant-public-home"
      return NextResponse.rewrite(rewrite, { request: { headers: requestHeaders } })
    }

    if (pathname.startsWith("/showing-request/")) {
      const rewrite = request.nextUrl.clone()
      rewrite.pathname = `/tenant-site${pathname}`
      return NextResponse.rewrite(rewrite, { request: { headers: requestHeaders } })
    }

    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const tenantAccessToken = request.cookies.get("access_token")?.value
      if (!tenantAccessToken) return redirectToLogin(request)
      const currentUser = await fetchCurrentUser(tenantAccessToken)
      if (!currentUser || currentUser.role !== "Agent") return redirectToLogin(request)
      if (!canOpenDashboardRoute(pathname, currentUser.role, currentUser.agentRoutePermissions)) {
        return NextResponse.redirect(new URL(getDashboardHomePath(currentUser.role, currentUser.agentRoutePermissions), request.url))
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const accessToken = request.cookies.get("access_token")?.value
  const userRole = request.cookies.get("user_role")?.value

  if (pathname.startsWith("/account")) {
    if (!accessToken) return redirectToLogin(request)
    const currentUser = await fetchCurrentUser(accessToken)
    if (!currentUser || currentUser.role !== "Agent" || !currentUser.tenantId) return redirectToLogin(request)
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!accessToken) return redirectToLogin(request)
    const currentUser = await fetchCurrentUser(accessToken)
    if (currentUser?.role === "Agent" && currentUser.tenantId) {
      return NextResponse.redirect(new URL("/account", request.url))
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!accessToken) return redirectToLogin(request)
    if (userRole && userRole !== "Admin") {
      if (userRole === "Agent") {
        const currentUser = await fetchCurrentUser(accessToken)
        return NextResponse.redirect(new URL(getDefaultAgentRoute(currentUser?.agentRoutePermissions), request.url))
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (pathname.startsWith("/agent")) {
    if (!accessToken) return redirectToLogin(request)
    if (userRole && userRole !== "Admin" && userRole !== "Agent") return redirectToLogin(request)
    if (userRole === "Agent") {
      const currentUser = await fetchCurrentUser(accessToken)
      if (!currentUser || currentUser.role !== "Agent") return redirectToLogin(request)
      const requiredPermission = getRequiredAgentPermission(pathname)
      if (requiredPermission && !hasAgentRoutePermission(currentUser.agentRoutePermissions, requiredPermission)) {
        return NextResponse.redirect(new URL(getDefaultAgentRoute(currentUser.agentRoutePermissions), request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}



