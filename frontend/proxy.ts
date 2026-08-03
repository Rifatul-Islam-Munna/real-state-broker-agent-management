import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getDefaultAgentRoute, hasAgentRoutePermission } from "@/lib/agent-route-access"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"
const primaryDomain = (process.env.PRIMARY_DOMAIN ?? "localhost").toLowerCase().replace(/^https?:\/\//, "").replace(/:\d+$/, "")

function normalizeHost(value: string | null) {
  return (value ?? "").toLowerCase().split(",")[0].trim().replace(/:\d+$/, "").replace(/\.$/, "")
}

function assignedSubdomain(host: string) {
  if (!host || host === primaryDomain || host === `www.${primaryDomain}` || host === "127.0.0.1") return null
  if (primaryDomain === "localhost") {
    if (!host.endsWith(".localhost")) return null
    const subdomain = host.slice(0, -".localhost".length)
    return subdomain && !subdomain.includes(".") ? subdomain : null
  }
  if (!host.endsWith(`.${primaryDomain}`)) return null
  const subdomain = host.slice(0, -(primaryDomain.length + 1))
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
    return (await response.json()) as { role: string; agentRoutePermissions: string[] }
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
  const host = normalizeHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"))
  const tenantSubdomain = assignedSubdomain(host)
  const mainHost = !host || host === primaryDomain || host === `www.${primaryDomain}` || host === "127.0.0.1"
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
    const tenantApplicationRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/login") || pathname.startsWith("/register")
    if (!tenantApplicationRoute && !pathname.startsWith("/tenant-site")) {
      const rewrite = request.nextUrl.clone()
      rewrite.pathname = pathname === "/" ? "/tenant-site" : `/tenant-site${pathname}`
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-tenant-host", host)
      return NextResponse.rewrite(rewrite, { request: { headers: requestHeaders } })
    }
  }

  const accessToken = request.cookies.get("access_token")?.value
  const userRole = request.cookies.get("user_role")?.value

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



