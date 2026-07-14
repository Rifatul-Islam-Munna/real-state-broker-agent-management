import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:4000/api").replace(/\/$/, "")

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { access_token: accessToken },
      cache: "no-store",
    })
    const body = await response.arrayBuffer()
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    })
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 503 })
  }
}
