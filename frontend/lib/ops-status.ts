const base = "/api/property-operations-proxy/property-operations/public"

async function call<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const payload = await response.json()
  if (!response.ok) throw new Error(String(payload?.message ?? "Request failed."))
  return payload as T
}

export type PublicRecordStatus = {
  id: string
  moduleKey: string
  recordType: string
  title: string
  description: string
  status: string
  priority: string
  assignedTo: string
  dueAt: string | null
  amount: number | null
  attachments: string[]
  history: Array<Record<string, unknown>>
}

export const opsStatus = {
  get: (token: string) => call<PublicRecordStatus>(`${base}/${encodeURIComponent(token)}/status`),
  update: (token: string, body: Record<string, unknown>) => call<PublicRecordStatus>(`${base}/${encodeURIComponent(token)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
}
