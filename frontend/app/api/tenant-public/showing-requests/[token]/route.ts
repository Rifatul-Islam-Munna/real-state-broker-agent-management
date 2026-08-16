import { NextRequest, NextResponse } from "next/server"

const apiBase = (process.env.BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "")

type RouteContext = {
  params: Promise<{ token: string }>
}

function tenantHost(request: NextRequest) {
  return request.headers.get("x-tenant-host") ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
}

async function forward(request: NextRequest, context: RouteContext, method: "GET" | "POST") {
  const { token } = await context.params
  const response = await fetch(`${apiBase}/tenant-public/showing-requests/${encodeURIComponent(token)}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-host": tenantHost(request),
    },
    body: method === "POST" ? await request.text() : undefined,
  })
  const payload = await response.text()
  return new NextResponse(payload, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context, "GET")
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context, "POST")
}
