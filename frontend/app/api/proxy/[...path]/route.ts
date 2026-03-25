import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

type ProxyRouteContext = {
  params: Promise<{
    path: string[]
  }>
}

async function forward(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  const targetUrl = `${baseUrl}/${path.join("/")}${request.nextUrl.search}`
  const contentType = request.headers.get("content-type")
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text()

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(accessToken ? { access_token: accessToken } : {}),
    },
    body,
    cache: "no-store",
  })

  const responseBody = await response.text()
  const responseContentType = response.headers.get("content-type")

  return new NextResponse(responseBody, {
    status: response.status,
    headers: responseContentType ? { "Content-Type": responseContentType } : undefined,
  })
}

export async function GET(request: NextRequest, context: ProxyRouteContext) {
  return forward(request, context)
}

export async function POST(request: NextRequest, context: ProxyRouteContext) {
  return forward(request, context)
}

export async function PATCH(request: NextRequest, context: ProxyRouteContext) {
  return forward(request, context)
}

export async function DELETE(request: NextRequest, context: ProxyRouteContext) {
  return forward(request, context)
}
