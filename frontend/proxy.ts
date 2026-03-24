import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get("access_token")?.value
  const userRole = request.cookies.get("user_role")?.value

  if (pathname.startsWith("/admin")) {
    if (!accessToken) {
      return redirectToLogin(request)
    }

    if (userRole && userRole !== "Admin") {
      return NextResponse.redirect(new URL(userRole === "Agent" ? "/agent/dashboard" : "/login", request.url))
    }
  }

  if (pathname.startsWith("/agent")) {
    if (!accessToken) {
      return redirectToLogin(request)
    }

    if (userRole && userRole !== "Admin" && userRole !== "Agent") {
      return redirectToLogin(request)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
}
