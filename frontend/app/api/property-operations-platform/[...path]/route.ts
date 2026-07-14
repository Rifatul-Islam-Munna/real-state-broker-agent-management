import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:4000/api").replace(/\/$/, "")

type Context = { params: Promise<{ path: string[] }> }
type Workspace = { propertyId: number; propertyTitle: string; propertyLocation?: string; propertyType?: string; propertyStatus?: string; thumbnailUrl?: string; propertySlug?: string }
type OpsRecord = { id: string; propertyId: number; moduleKey: string; recordType: string; title: string; description?: string; status?: string; priority?: string; amount?: number | null; dueAt?: string | null; payload?: Record<string, unknown>; contactName?: string; contactEmail?: string; contactPhone?: string; createdAt?: string; updatedAt?: string }

const moduleMap: Record<string, string> = {
  unit: "units", tenant: "tenants", lease: "leases", ticket: "tickets", technician: "technicians",
  announcement: "announcements", "work-order": "work-orders", inspection: "inspections",
  "recurring-maintenance": "recurring-maintenance", vendor: "vendors", staff: "staff", asset: "assets",
  "vendor-quote": "vendor-quotes", bill: "billing", "finance-entry": "finance", messaging: "messages",
  notification: "notifications", user: "users", document: "documents",
}

async function backend(path: string, init?: RequestInit) {
  const token = (await cookies()).get("access_token")?.value
  const response = await fetch(`${baseUrl}/property-operations${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { access_token: token } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw Object.assign(new Error(payload?.message ?? `Request failed (${response.status})`), { status: response.status })
  return payload
}

function ok(data: unknown, paginated = false) {
  return NextResponse.json(paginated ? { success: true, data: { data, total: Array.isArray(data) ? data.length : 0, page: 1, limit: 100 } } : { success: true, data })
}

function flatten(record: OpsRecord) {
  const payload = record.payload && typeof record.payload === "object" ? record.payload : {}
  return {
    ...payload,
    id: record.id,
    _id: record.id,
    propertyId: String(record.propertyId),
    moduleKey: record.moduleKey,
    recordType: record.recordType,
    title: record.title,
    name: (payload.name as string | undefined) ?? record.title,
    description: record.description ?? "",
    status: record.status ?? "active",
    priority: record.priority ?? "medium",
    amount: record.amount ?? (payload.amount as number | undefined) ?? 0,
    dueAt: record.dueAt,
    contactName: record.contactName ?? "",
    contactEmail: record.contactEmail ?? "",
    contactPhone: record.contactPhone ?? "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

async function workspaces(): Promise<Workspace[]> {
  return backend("/workspaces")
}

async function allRecords(moduleKey: string) {
  const spaces = await workspaces()
  const groups = await Promise.all(spaces.map((space) => backend(`/records?propertyId=${space.propertyId}&moduleKey=${encodeURIComponent(moduleKey)}`).catch(() => [])))
  return (groups.flat() as OpsRecord[]).map(flatten)
}

function moduleFromPath(parts: string[]) {
  if (parts[0] === "messaging" && parts[1] === "documents") return "documents"
  if (parts[0] === "announcement" && parts[1] === "notice") return "announcements"
  if (parts[0] === "notification" && parts[1] === "templates") return "notifications"
  if (parts[0] === "vendor-quote" && parts[1] === "marketplace-requests") return "vendor-quotes"
  return moduleMap[parts[0]] ?? parts[0]
}

async function handleGet(request: NextRequest, parts: string[]) {
  const root = parts[0]
  if (root === "property") {
    const data = (await workspaces()).map((space) => ({
      id: String(space.propertyId), _id: String(space.propertyId), name: space.propertyTitle, title: space.propertyTitle,
      address: space.propertyLocation ?? "", propertyType: space.propertyType ?? "", status: space.propertyStatus ?? "active",
      imageUrl: space.thumbnailUrl ?? "", slug: space.propertySlug ?? "", propertyId: String(space.propertyId),
    }))
    return ok(data, true)
  }
  if (root === "analytics") {
    const analytics = await backend("/analytics")
    if (parts[1] === "tickets") return ok({ byStatus: Object.entries(analytics.recordsByStatus ?? {}).map(([name, value]) => ({ name, value })), byPriority: [] })
    if (parts[1] === "occupancy") return ok({ occupied: analytics.occupiedUnits ?? 0, vacant: analytics.availableUnits ?? 0, occupancyRate: 0 })
    if (parts[1] === "technicians") return ok({ total: analytics.recordsByModule?.technicians ?? 0, active: analytics.recordsByModule?.technicians ?? 0 })
    return ok({
      totalProperties: analytics.importedProperties ?? 0, totalUnits: analytics.recordsByModule?.units ?? 0,
      totalTenants: analytics.recordsByModule?.tenants ?? 0, openTickets: analytics.openRecords ?? 0,
      totalIncome: analytics.totalIncome ?? 0, totalExpense: analytics.totalExpense ?? 0,
      netIncome: analytics.netOperatingAmount ?? 0, occupancyRate: 0,
    })
  }
  if (root === "organization") {
    const settings = await backend("/settings")
    return ok({ ...settings, agencyName: settings.businessName, logoUrl: settings.logoUrl, primaryColor: settings.brandColor, stripeEnabled: true })
  }
  if (root === "notification" && parts[1] === "settings") {
    const settings = await backend("/settings")
    return ok({ emailEnabled: true, smsEnabled: true, pushEnabled: false, ...settings })
  }
  if (root === "user") {
    const me = await fetch(new URL("/api/session-user", request.url), { headers: { cookie: request.headers.get("cookie") ?? "" }, cache: "no-store" }).then((r) => r.ok ? r.json() : null)
    return NextResponse.json(me ? [me] : [])
  }
  return ok(await allRecords(moduleFromPath(parts)), true)
}

function firstText(body: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) if (typeof body[key] === "string" && String(body[key]).trim()) return String(body[key]).trim()
  return fallback
}

async function resolvePropertyId(body: Record<string, unknown>) {
  const raw = body.propertyId ?? body.property ?? body.buildingId
  const parsed = Number(typeof raw === "object" && raw ? (raw as Record<string, unknown>).id : raw)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  const spaces = await workspaces()
  if (!spaces[0]) throw Object.assign(new Error("Import a property before creating operations records."), { status: 400 })
  return spaces[0].propertyId
}

async function handleMutation(request: NextRequest, parts: string[]) {
  const method = request.method
  const root = parts[0]
  const body = method === "DELETE" ? {} : await request.json().catch(() => ({})) as Record<string, unknown>

  if (root === "organization" || (root === "notification" && parts[1] === "settings")) {
    const current = await backend("/settings")
    const saved = await backend("/settings", { method: "PATCH", body: JSON.stringify({
      ...current, ...body,
      businessName: body.agencyName ?? body.businessName ?? current.businessName,
      brandColor: body.primaryColor ?? body.brandColor ?? current.brandColor,
    }) })
    return ok(saved)
  }

  if (root === "property") {
    if (method === "DELETE") return ok({ deleted: false })
    const propertyId = Number(body.id ?? body.propertyId)
    if (!Number.isFinite(propertyId) || propertyId <= 0) throw Object.assign(new Error("Use an existing main property ID."), { status: 400 })
    const imported = await backend("/import", { method: "POST", body: JSON.stringify({ properties: [{
      propertyId, title: firstText(body, ["name", "title"], `Property ${propertyId}`), location: firstText(body, ["address", "location"], ""),
      propertyType: firstText(body, ["propertyType", "type"], ""), propertyStatus: firstText(body, ["status"], "active"),
      propertySlug: firstText(body, ["slug"], ""), thumbnailUrl: firstText(body, ["imageUrl", "thumbnailUrl"], ""),
    }] }) })
    return ok(imported?.[0] ?? imported)
  }

  const moduleKey = moduleFromPath(parts)
  const id = parts.length > 1 && !["notice", "documents", "templates", "marketplace-requests", "monthly-rent", "send-template", "assignment-requests", "create"].includes(parts[1]) ? parts[1] : undefined
  if (method === "DELETE") {
    const targetId = id ?? request.nextUrl.searchParams.get("id")
    if (targetId) await backend(`/records?id=${encodeURIComponent(targetId)}`, { method: "DELETE" })
    return ok({ deleted: true })
  }

  const propertyId = await resolvePropertyId(body)
  const title = firstText(body, ["title", "name", "subject", "description", "tenantName", "vendorName"], `${moduleKey.replaceAll("-", " ")} record`)
  const record = await backend("/records/save", {
    method: "POST",
    body: JSON.stringify({
      id: id ?? body.id ?? null,
      propertyId,
      moduleKey,
      recordType: firstText(body, ["recordType", "type", "kind", "category"], moduleKey),
      title,
      description: firstText(body, ["description", "notes", "message", "details"], ""),
      status: firstText(body, ["status"], "active"),
      priority: firstText(body, ["priority"], "medium"),
      contactName: firstText(body, ["contactName", "tenantName", "vendorName", "name"], ""),
      contactEmail: firstText(body, ["contactEmail", "email"], ""),
      contactPhone: firstText(body, ["contactPhone", "phone"], ""),
      amount: Number(body.amount ?? body.total ?? body.rent ?? 0) || null,
      dueAt: body.dueAt ?? body.dueDate ?? body.date ?? null,
      payload: body,
    }),
  })
  return ok(flatten(record))
}

async function handler(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params
    return request.method === "GET" ? handleGet(request, path) : handleMutation(request, path)
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500)
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed" }, { status })
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
