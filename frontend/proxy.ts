import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { getDefaultAgentRoute, hasAgentRoutePermission } from "@/lib/agent-route-access"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

async function fetchCurrentUser(accessToken: string) {
  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      cache: "no-store",
      headers: {
        access_token: accessToken,
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as {
      role: string
      agentRoutePermissions: string[]
    }
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
  const accessToken = request.cookies.get("access_token")?.value
  const userRole = request.cookies.get("user_role")?.value

  if (pathname.startsWith("/admin")) {
    if (!accessToken) {
      return redirectToLogin(request)
    }

    if (userRole && userRole !== "Admin") {
      if (userRole === "Agent") {
        const currentUser = await fetchCurrentUser(accessToken)
        return NextResponse.redirect(new URL(getDefaultAgentRoute(currentUser?.agentRoutePermissions), request.url))
      }

      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (pathname.startsWith("/agent")) {
    if (!accessToken) {
      return redirectToLogin(request)
    }

    if (userRole && userRole !== "Admin" && userRole !== "Agent") {
      return redirectToLogin(request)
    }

    if (userRole === "Agent") {
      const currentUser = await fetchCurrentUser(accessToken)

      if (!currentUser || currentUser.role !== "Agent") {
        return redirectToLogin(request)
      }

      const requiredPermission = getRequiredAgentPermission(pathname)

      if (
        requiredPermission &&
        !hasAgentRoutePermission(currentUser.agentRoutePermissions, requiredPermission)
      ) {
        return NextResponse.redirect(new URL(getDefaultAgentRoute(currentUser.agentRoutePermissions), request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
}
