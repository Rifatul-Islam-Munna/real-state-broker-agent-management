import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const baseUrl = process.env.PROPERTY_OPERATIONS_API_URL ?? "http://localhost:4100/api"

type Context = { params: Promise<{ path: string[] }> }

async function forward(request: NextRequest, context: Context) {
  const { path } = await context.params
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  const adminKey = process.env.PROPERTY_OPERATIONS_ADMIN_KEY
  const contentType = request.headers.get("content-type")
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()
  const response = await fetch(`${baseUrl}/${path.join("/")}${request.nextUrl.search}`, {
    method: request.method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(accessToken ? { access_token: accessToken } : {}),
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body,
    cache: "no-store",
  })
  const responseBody = await response.arrayBuffer()
  const responseType = response.headers.get("content-type")
  return new NextResponse(responseBody, { status: response.status, headers: responseType ? { "Content-Type": responseType } : undefined })
}

export const GET = forward
export const POST = forward
export const PATCH = forward
export const DELETE = forward
