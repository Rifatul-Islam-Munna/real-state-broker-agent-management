import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:4000/api").replace(/\/$/, "")

type Context = { params: Promise<{ path: string[] }> }

async function forward(request: NextRequest, context: Context) {
  const { path } = await context.params
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  const contentType = request.headers.get("content-type")
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()
  const targetUrl = `${baseUrl}/${path.join("/")}${request.nextUrl.search}`

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(accessToken ? { access_token: accessToken } : {}),
      },
      body,
      cache: "no-store",
    })
    const responseBody = await response.arrayBuffer()
    const responseType = response.headers.get("content-type")
    const contentDisposition = response.headers.get("content-disposition")

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        ...(responseType ? { "Content-Type": responseType } : {}),
        ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
      },
    })
  } catch (error) {
    console.error("Property Operations API request failed", { targetUrl, error })
    return NextResponse.json(
      {
        message: "The existing NestJS backend is unavailable.",
        detail: "Start backend-nestjs on port 4000 or set BASE_URL to its /api address.",
      },
      { status: 503 },
    )
  }
}

export const GET = forward
export const POST = forward
export const PATCH = forward
export const DELETE = forward
