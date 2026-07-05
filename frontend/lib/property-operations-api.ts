const apiBase = "/api/property-operations-proxy/property-operations"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const message = payload?.message || payload?.detail || payload?.title || `Request failed (${response.status})`
    throw new Error(Array.isArray(message) ? message[0] : String(message))
  }
  return payload as T
}

export type PropertySnapshotInput = {
  propertyId: number
  title: string
  location?: string
  propertyType?: string
  listingType?: string
  propertyStatus?: string
  propertySlug?: string
  thumbnailUrl?: string
}

export type OperationsModuleState = {
  id: string
  moduleKey: string
  status: "Not started" | "In progress" | "Ready"
  notes: string
  updatedAt: string
}

export type OperationsWorkspace = {
  id: string
  propertyId: number
  status: string
  propertyTitle: string
  propertyLocation: string
  propertyType: string
  listingType: string
  propertyStatus: string
  propertySlug: string
  thumbnailUrl: string
  createdAt: string
  updatedAt: string
  moduleStates: OperationsModuleState[]
}

export type OperationsRecord = {
  id: string
  propertyId?: number
  moduleKey: string
  recordType: string
  title: string
  description: string
  status: string
  priority: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  amount: number | null
  dueAt: string | null
  attachments?: string[]
  payload?: Record<string, unknown>
  payloadJson: string
  assignedTo?: string
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type SaveOperationsRecordInput = {
  id?: string | null
  propertyId: number
  moduleKey: string
  recordType: string
  title: string
  description: string
  status: string
  priority: string
  amount?: number | null
  dueAt?: string | null
  payloadJson: string
}

export type OperationsSettings = {
  businessName: string
  logoUrl: string
  brandColor: string
  publicBaseUrl: string
  defaultExpiryHours: number
  defaultMaxUses: number
  defaultOneTime: boolean
  requireName: boolean
  requireEmail: boolean
  requirePhone: boolean
  allowFileUploads: boolean
  showPropertyAddress: boolean
  autoCloseRecordOnSubmit: boolean
  notifyAdminOnSubmit: boolean
  welcomeMessage: string
  termsText: string
  emailSubjectTemplate: string
  emailBodyTemplate: string
  smsTemplate: string
  updatedAt: string
}

export type OperationsPublicAccess = {
  id: string
  propertyId: number
  recordId: string | null
  moduleKey: string
  title: string
  instructions: string
  recipientLabel: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  status: string
  formSchemaJson: string
  expiresAt: string
  maxUses: number
  useCount: number
  oneTime: boolean
  allowFileUploads: boolean
  createdAt: string
  lastAccessedAt: string | null
  completedAt: string | null
  propertyTitle: string
  propertyLocation: string
  publicUrl: string | null
  accessToken: string | null
  qrDataUrl?: string | null
  submissionCount: number
}

export type OperationsAnalytics = {
  importedProperties: number
  totalRecords: number
  openRecords: number
  overdueRecords: number
  completedRecords: number
  activePublicLinks: number
  completedPublicLinks: number
  anonymousSubmissions: number
  totalIncome: number
  totalExpense: number
  netOperatingAmount?: number
  occupiedUnits?: number
  availableUnits?: number
  maintenanceBacklog?: number
  pendingQuotes?: number
  recordsByModule: Record<string, number>
  recordsByStatus: Record<string, number>
}

export type PublicOperationsRequest = {
  businessName: string
  logoUrl: string
  brandColor: string
  welcomeMessage: string
  termsText: string
  requireName: boolean
  requireEmail: boolean
  requirePhone: boolean
  allowFileUploads: boolean
  showPropertyAddress: boolean
  propertyTitle: string
  propertyLocation: string
  moduleKey: string
  title: string
  instructions: string
  recipientLabel: string
  formSchemaJson: string
  expiresAt: string
  remainingUses: number
}

function parseJson(value: string, fallback: unknown) {
  try { return JSON.parse(value) } catch { return fallback }
}

export const propertyOperationsApi = {
  getWorkspaces: () => request<OperationsWorkspace[]>("/workspaces"),
  importProperties: (properties: PropertySnapshotInput[]) => request<OperationsWorkspace[]>("/import", { method: "POST", body: JSON.stringify({ properties }) }),
  removeWorkspace: (propertyId: number) => request<void>(`/workspaces?propertyId=${propertyId}`, { method: "DELETE" }),
  updateModuleState: (input: { propertyId: number; moduleKey: string; status: string; notes?: string }) => request<OperationsModuleState>("/module-state", { method: "PATCH", body: JSON.stringify(input) }),
  getRecords: (propertyId: number, moduleKey?: string) => request<OperationsRecord[]>(`/records?propertyId=${propertyId}${moduleKey ? `&moduleKey=${encodeURIComponent(moduleKey)}` : ""}`),
  saveRecord: (input: SaveOperationsRecordInput) => {
    const parsed = parseJson(input.payloadJson, {}) as Record<string, unknown>
    return request<OperationsRecord>("/records/save", { method: "POST", body: JSON.stringify({
      ...input,
      contactName: String(parsed.contactName ?? ""),
      contactEmail: String(parsed.contactEmail ?? ""),
      contactPhone: String(parsed.contactPhone ?? ""),
      payload: typeof parsed.extra === "object" && parsed.extra ? parsed.extra : parsed,
      payloadJson: undefined,
    }) })
  },
  deleteRecord: (id: string) => request<void>(`/records?id=${id}`, { method: "DELETE" }),
  recordAction: (id: string, action: string, input: Record<string, unknown> = {}) => request<OperationsRecord>(`/records/${id}/actions/${action}`, { method: "PATCH", body: JSON.stringify(input) }),
  runRecurringMaintenance: (propertyId?: number) => request<OperationsRecord[]>(`/recurring-maintenance/run${propertyId ? `?propertyId=${propertyId}` : ""}`, { method: "POST" }),
  getSettings: () => request<OperationsSettings>("/settings"),
  updateSettings: (input: OperationsSettings) => request<OperationsSettings>("/settings", { method: "PATCH", body: JSON.stringify(input) }),
  getAnalytics: (propertyId?: number) => request<OperationsAnalytics>(`/analytics${propertyId ? `?propertyId=${propertyId}` : ""}`),
  getAssistant: (propertyId?: number) => request<Record<string, unknown>>(`/ai/summary${propertyId ? `?propertyId=${propertyId}` : ""}`),
  getActivity: (propertyId?: number) => request<Array<Record<string, unknown>>>(`/activity${propertyId ? `?propertyId=${propertyId}` : ""}`),
  getPublicLinks: (propertyId?: number) => request<OperationsPublicAccess[]>(`/public-access${propertyId ? `?propertyId=${propertyId}` : ""}`),
  createPublicLink: (input: Record<string, unknown>) => {
    const formSchemaJson = String(input.formSchemaJson ?? "[]")
    return request<OperationsPublicAccess>("/public-access", { method: "POST", body: JSON.stringify({ ...input, formSchema: parseJson(formSchemaJson, []), formSchemaJson: undefined }) })
  },
  revokePublicLink: (id: string) => request<void>(`/public-access/revoke?id=${id}`, { method: "PATCH" }),
  getSubmissions: (accessId: string) => request<Array<Record<string, unknown>>>(`/public-submissions?accessId=${accessId}`),
  getPublicRequest: (token: string) => request<PublicOperationsRequest>(`/public/${encodeURIComponent(token)}`),
  submitPublicRequest: (token: string, input: Record<string, unknown>) => request<Record<string, unknown>>(`/public/${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify({
    responderName: input.responderName,
    responderEmail: input.responderEmail,
    responderPhone: input.responderPhone,
    notes: input.notes,
    response: parseJson(String(input.responseJson ?? "{}"), {}),
    attachmentUrls: parseJson(String(input.attachmentUrlsJson ?? "[]"), []),
  }) }),
}
