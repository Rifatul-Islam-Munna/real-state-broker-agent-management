import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

type ProxyRouteContext = {
  params: Promise<{
    path: string[]
  }>
}

function tenantPath(path: string[]) {
  const joined = path.join("/")
  if (joined === "agency-settings") return "tenant-workspace/agency-settings"
  if (joined === "settings/scheduling") return "tenant-workspace/scheduling"
  if (joined === "settings/integrations/workspace")
    return "tenant-workspace/integrations/workspace"
  if (joined === "settings/integrations/health")
    return "tenant-workspace/integrations/health"
  if (joined === "settings/integrations/gmail/connect-url")
    return "tenant-workspace/integrations/gmail/connect-url"
  if (joined === "pdfs/templates") return "tenant-workspace/pdf-templates"

  if (joined === "dashboard/summary") return "tenant-legacy/dashboard/summary"
  if (joined === "properties" || joined === "properties/management")
    return "tenant-legacy/properties"
  if (joined === "leads") return "tenant-legacy/leads"
  if (joined === "documents/summary") return "tenant-legacy/documents/summary"
  if (joined === "homepage-settings")
    return "tenant-legacy/singleton/homepage-settings"
  if (joined === "marketing-settings")
    return "tenant-legacy/singleton/marketing-settings"
  if (joined === "mail-inbox") return "tenant-inbox"
  if (joined === "mail-inbox/send") return "tenant-inbox/send"
  if (joined === "mail-inbox/convert-to-lead")
    return "tenant-inbox/convert-to-lead"
  if (joined === "mail-inbox/sync-status") return "tenant-inbox/sync-status"
  if (joined === "mail-inbox/sync") return "tenant-inbox/sync"
  if (joined === "sms-inbox") return "tenant-sms-inbox"
  if (joined === "sms-inbox/send") return "tenant-sms-inbox/send"
  if (joined === "sms-inbox/sync") return "tenant-sms-inbox/sync"
  if (joined === "sms-inbox/sync-status") return "tenant-sms-inbox/sync-status"
  if (joined === "lead-outreach/templates") return "tenant-outreach/templates"
  if (joined === "lead-outreach/schedule") return "tenant-outreach/schedule"
  if (joined === "lead-outreach/bulk") return "tenant-outreach/bulk"
  if (joined === "lead-outreach/schedule-status")
    return "tenant-outreach/schedule-status"
  if (joined === "lead-outreach/replies/read")
    return "tenant-outreach/replies/read"
  if (joined === "lead-outreach/monitor") return "tenant-outreach/monitor"
  if (joined.startsWith("lead-outreach/jobs/"))
    return `tenant-outreach/${joined.slice("lead-outreach/".length)}`
  if (joined === "lead-outreach") return "tenant-outreach"
  if (joined === "lead-collection-templates/prepare-source")
    return "tenant-legacy/lead-collection-prepare-source"
  if (joined === "lead-collection-templates/test")
    return "tenant-legacy/lead-collection-test"
  if (joined === "lead-collection-templates/fields")
    return "tenant-legacy/lead-collection-fields"
  if (joined === "showing-feedback/properties")
    return "tenant-legacy/resource/showing-feedback-properties"
  if (joined === "realtor-showings/sequences/summary")
    return "tenant-legacy/sequence-summary"

  if (joined === "users/agents") return "tenant-staff"
  if (joined === "users/agents/permissions") return "tenant-staff/permissions"

  const genericRoots = new Set([
    "blogs",
    "brokerage",
    "contact-requests",
    "deals",
    "documents",
    "lead-assignment-rules",
    "lead-collection-templates",
    "lead-history",
    "lead-outreach",
    "mail-inbox",
    "notification",
    "pdfs",
    "property-chats",
    "realtor-showings",
    "realtors",
    "showing-feedback",
    "showings",
    "sms-inbox",
    "tools",
    "website-inquiries",
  ])
  const [root, ...rest] = path
  if (genericRoots.has(root)) {
    if (rest[0] === "import") return `tenant-legacy/resource/${root}/import`
    return `tenant-legacy/resource/${root}`
  }

  if (
    joined === "auth/me" ||
    joined.startsWith("tenant-") ||
    joined.startsWith("public-")
  )
    return joined

  const fallbackResource = joined
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
  return `tenant-legacy/resource/${fallbackResource || "workspace"}`
}

function publicReadPath(path: string[], tenantHost: string | null) {
  const joined = path.join("/")
  if (joined === "public-properties") return tenantHost ? "tenant-public/properties" : "properties"
  if (joined === "public-properties/filters") return tenantHost ? "tenant-public/properties/filters" : "properties/filters"
  if (joined === "public-blogs") return tenantHost ? "tenant-public/blogs" : "blogs"
  if (joined === "public-blogs/details") return tenantHost ? "tenant-public/blogs/details" : "blogs/details"
  return null
}

async function forward(request: NextRequest, context: ProxyRouteContext) {
  const { path } = await context.params
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("access_token")?.value
  const forwardedHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
  const requestHost = forwardedHost.replace(/:\d+$/, "")
  const tenantHost =
    request.headers.get("x-tenant-host") ??
    (requestHost.endsWith(".localhost") ? requestHost : null)
  const forwardedProto = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", ""))
    .split(",")[0]
    .trim()
  const forwardedPort = forwardedHost.match(/:\d+$/)?.[0] ?? (request.nextUrl.port ? `:${request.nextUrl.port}` : "")
  const originHost = tenantHost
    ? requestHost === tenantHost.toLowerCase().replace(/:\d+$/, "")
      ? forwardedHost
      : `${tenantHost}${forwardedPort}`
    : null
  const tenantOrigin = originHost ? `${forwardedProto}://${originHost}` : null
  const explicitPublicPath = request.method === "GET" ? publicReadPath(path, tenantHost) : null
  const backendPath = explicitPublicPath ?? (tenantHost ? tenantPath(path) : path.join("/"))
  const targetUrl = `${baseUrl}/${backendPath}${request.nextUrl.search}`
  const contentType = request.headers.get("content-type")
  const idempotencyKey = request.headers.get("idempotency-key")
  const requestId = request.headers.get("x-request-id")
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer()

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(accessToken ? { access_token: accessToken } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...(requestId ? { "X-Request-Id": requestId } : {}),
        ...(tenantHost ? { "x-tenant-host": tenantHost } : {}),
        ...(tenantOrigin ? { "x-tenant-origin": tenantOrigin } : {}),
      },
      body,
      cache: "no-store",
    })

    const responseBody = await response.arrayBuffer()
    const responseContentType = response.headers.get("content-type")
    const contentDisposition = response.headers.get("content-disposition")

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        ...(responseContentType ? { "Content-Type": responseContentType } : {}),
        ...(contentDisposition
          ? { "Content-Disposition": contentDisposition }
          : {}),
      },
    })
  } catch (error) {
    console.error("API proxy connection failed", {
      method: request.method,
      path: path.join("/"),
      error: error instanceof Error ? error.message : "Unknown proxy error",
    })

    return NextResponse.json(
      {
        message:
          "The backend API is unavailable. Start the NestJS server and try again.",
        code: "BACKEND_UNAVAILABLE",
      },
      { status: 503 }
    )
  }
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
