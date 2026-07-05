const apiBase = "/api/proxy/property-operations"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
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

export type OperationsModuleState = {
  id: number
  moduleKey: string
  status: "Not started" | "In progress" | "Ready"
  notes: string
  updatedAt: string
}

export type OperationsWorkspace = {
  id: number
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
  id: number
  propertyId: number
  moduleKey: string
  recordType: string
  title: string
  description: string
  status: string
  priority: string
  amount: number | null
  dueAt: string | null
  payloadJson: string
  createdAt: string
  updatedAt: string
}

export type SaveOperationsRecordInput = {
  id?: number | null
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
  id: number
  propertyId: number
  recordId: number | null
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

export const propertyOperationsApi = {
  getWorkspaces: () => request<OperationsWorkspace[]>("/workspaces"),
  importProperties: (propertyIds: number[]) => request<OperationsWorkspace[]>("/import", { method: "POST", body: JSON.stringify({ propertyIds }) }),
  removeWorkspace: (propertyId: number) => request<void>(`/workspaces?propertyId=${propertyId}`, { method: "DELETE" }),
  updateModuleState: (input: { propertyId: number; moduleKey: string; status: string; notes?: string }) => request<OperationsModuleState>("/module-state", { method: "PATCH", body: JSON.stringify(input) }),
  getRecords: (propertyId: number, moduleKey?: string) => request<OperationsRecord[]>(`/records?propertyId=${propertyId}${moduleKey ? `&moduleKey=${encodeURIComponent(moduleKey)}` : ""}`),
  saveRecord: (input: SaveOperationsRecordInput) => request<OperationsRecord>("/records/save", { method: "POST", body: JSON.stringify(input) }),
  deleteRecord: (id: number) => request<void>(`/records?id=${id}`, { method: "DELETE" }),
  getSettings: () => request<OperationsSettings>("/settings"),
  updateSettings: (input: OperationsSettings) => request<OperationsSettings>("/settings", { method: "PATCH", body: JSON.stringify(input) }),
  getAnalytics: () => request<OperationsAnalytics>("/analytics"),
  getPublicLinks: (propertyId?: number) => request<OperationsPublicAccess[]>(`/public-access${propertyId ? `?propertyId=${propertyId}` : ""}`),
  createPublicLink: (input: Record<string, unknown>) => request<OperationsPublicAccess>("/public-access", { method: "POST", body: JSON.stringify(input) }),
  revokePublicLink: (id: number) => request<void>(`/public-access/revoke?id=${id}`, { method: "PATCH" }),
  getPublicRequest: (token: string) => request<PublicOperationsRequest>(`/public/${encodeURIComponent(token)}`),
  submitPublicRequest: (token: string, input: Record<string, unknown>) => request<Record<string, unknown>>(`/public/${encodeURIComponent(token)}`, { method: "POST", body: JSON.stringify(input) }),
}
