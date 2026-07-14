// @ts-nocheck
"use client"

import { useQueryWrapper } from "@/api-hooks/property-operations-query-wrapper"
import type { ApiSuccessResponse, PaginatedResult } from "@/lib/types/api"
import type { AuthUser } from "@/lib/types/auth"
import type {
  AnnouncementItem,
  AssetItem,
  BillItem,
  DashboardMetrics,
  FinanceEntryItem,
  OccupancyStats,
  InspectionItem,
  MessageItem,
  NotificationSettingsItem,
  NotificationTemplateItem,
  PropertyItem,
  RecurringMaintenanceItem,
  StaffItem,
  TechnicianItem,
  TechnicianStats,
  TenantItem,
  TicketItem,
  TicketStatBucket,
  UnitItem,
  VendorItem,
  VendorQuoteItem,
  VendorQuoteRequestItem,
  WorkOrderItem,
} from "@/lib/types/dashboard"

export function useOwnerAnalyticsQuery() {
  return useQueryWrapper<ApiSuccessResponse<DashboardMetrics>, DashboardMetrics>(
    ["owner", "analytics", "dashboard"],
    "/analytics/dashboard",
    {
      select: (response) => response?.data,
    }
  )
}

export function useOwnerTicketStatsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<{ byStatus: TicketStatBucket[]; byPriority: TicketStatBucket[] }>,
    { byStatus: TicketStatBucket[]; byPriority: TicketStatBucket[] }
  >(["owner", "analytics", "tickets"], "/analytics/tickets", {
    select: (response) => response?.data,
  })
}

export function useOwnerOccupancyStatsQuery() {
  return useQueryWrapper<ApiSuccessResponse<OccupancyStats>, OccupancyStats>(
    ["owner", "analytics", "occupancy"],
    "/analytics/occupancy",
    {
      select: (response) => response?.data,
    }
  )
}

export function useOwnerTechnicianStatsQuery() {
  return useQueryWrapper<ApiSuccessResponse<TechnicianStats>, TechnicianStats>(
    ["owner", "analytics", "technicians"],
    "/analytics/technicians",
    {
      select: (response) => response?.data,
    }
  )
}

export function useOwnerFinanceEntriesQuery(params?: {
  page?: number
  limit?: number
  kind?: "earning" | "expense"
  status?: "pending" | "cleared" | "canceled"
  propertyId?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.kind) searchParams.set("kind", params.kind)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<FinanceEntryItem>>,
    FinanceEntryItem[]
  >(["owner", "finance-entries", params ?? {}], `/finance-entry${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerUsersQuery() {
  return useQueryWrapper<AuthUser[]>(["owner", "users"], "/user")
}

export function useOwnerUserSearchQuery(search: string, role?: AuthUser["role"]) {
  const params = new URLSearchParams()
  if (search.trim()) {
    params.set("q", search.trim())
  }
  if (role) {
    params.set("role", role)
  }

  return useQueryWrapper<AuthUser[]>(
    ["owner", "user-search", search, role],
    `/user/search?${params.toString()}`,
    {
      enabled: search.trim().length >= 2,
    }
  )
}

export function useOwnerPropertiesQuery(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<PropertyItem>>,
    PropertyItem[]
  >(["owner", "properties", params ?? {}], `/property${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerUnitsQuery(params?: { page?: number; limit?: number; propertyId?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  const queryString = searchParams.toString()

  return useQueryWrapper<ApiSuccessResponse<PaginatedResult<UnitItem>>, UnitItem[]>(
    ["owner", "units", params ?? {}],
    `/unit${queryString ? `?${queryString}` : ""}`,
    {
      select: (response) => response?.data?.data ?? [],
    }
  )
}

export function useOwnerTenantsQuery(params?: {
  page?: number
  limit?: number
  propertyId?: string
  tenantKind?: "renter" | "guest"
  search?: string
  paymentMonth?: string
  paidThisMonth?: boolean
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.tenantKind) searchParams.set("tenantKind", params.tenantKind)
  if (params?.search?.trim()) searchParams.set("search", params.search.trim())
  if (params?.paymentMonth) searchParams.set("paymentMonth", params.paymentMonth)
  if (typeof params?.paidThisMonth === "boolean") {
    searchParams.set("paidThisMonth", String(params.paidThisMonth))
  }

  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<TenantItem>>,
    TenantItem[]
  >(["owner", "tenants", params ?? {}], `/tenant${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerTicketsQuery(params?: {
  page?: number
  limit?: number
  propertyId?: string
  status?: string
  priority?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.priority) searchParams.set("priority", params.priority)
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<TicketItem>>,
    TicketItem[]
  >(["owner", "tickets", params ?? {}], `/ticket${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerTechniciansQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<TechnicianItem>>,
    TechnicianItem[]
  >(["owner", "technicians"], "/technician", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerAnnouncementsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<AnnouncementItem>>,
    AnnouncementItem[]
  >(["owner", "announcements"], "/announcement", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerWorkOrdersQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<WorkOrderItem>>,
    WorkOrderItem[]
  >(["owner", "work-orders"], "/work-order", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerInspectionsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<InspectionItem>>,
    InspectionItem[]
  >(["owner", "inspections"], "/inspection", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerRecurringMaintenancesQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<RecurringMaintenanceItem>>,
    RecurringMaintenanceItem[]
  >(["owner", "recurring-maintenances"], "/recurring-maintenance", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useWorkerInspectionsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<InspectionItem>>,
    InspectionItem[]
  >(["worker", "inspections"], "/inspection", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useWorkerRecurringMaintenancesQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<RecurringMaintenanceItem>>,
    RecurringMaintenanceItem[]
  >(["worker", "recurring-maintenances"], "/recurring-maintenance", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerMessagesQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<MessageItem>>,
    MessageItem[]
  >(["owner", "messages"], "/messaging/messages", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerVendorsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<VendorItem>>,
    VendorItem[]
  >(["owner", "vendors"], "/vendor", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerStaffQuery(params?: {
  page?: number
  limit?: number
  propertyId?: string
  status?: "active" | "on_leave" | "inactive"
  search?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.search?.trim()) searchParams.set("search", params.search.trim())
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<StaffItem>>,
    StaffItem[]
  >(["owner", "staff", params ?? {}], `/staff${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerAssetsQuery(params?: {
  page?: number
  limit?: number
  propertyId?: string
  unitId?: string
  status?: string
  category?: string
  search?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.unitId) searchParams.set("unitId", params.unitId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.category) searchParams.set("category", params.category)
  if (params?.search?.trim()) searchParams.set("search", params.search.trim())
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<AssetItem>>,
    AssetItem[]
  >(["owner", "assets", params ?? {}], `/asset${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerVendorQuotesQuery(params?: {
  page?: number
  limit?: number
  vendorId?: string
  propertyId?: string
  status?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.vendorId) searchParams.set("vendorId", params.vendorId)
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.status) searchParams.set("status", params.status)
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<VendorQuoteItem>>,
    VendorQuoteItem[]
  >(["owner", "vendor-quotes", params ?? {}], `/vendor-quote${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerVendorQuoteRequestsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<VendorQuoteRequestItem>>,
    VendorQuoteRequestItem[]
  >(["owner", "vendor-quote-requests"], "/vendor-quote/marketplace-requests", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerNotificationSettingsQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<NotificationSettingsItem>,
    NotificationSettingsItem | undefined
  >(["owner", "notification-settings"], "/notification/settings", {
    select: (response) => response?.data,
  })
}

export function useOwnerNotificationTemplatesQuery() {
  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<NotificationTemplateItem>>,
    NotificationTemplateItem[]
  >(["owner", "notification-templates"], "/notification/templates", {
    select: (response) => response?.data?.data ?? [],
  })
}

export function useOwnerBillsQuery(params?: {
  page?: number
  limit?: number
  tenantId?: string
  propertyId?: string
  status?: string
  kind?: string
  monthKey?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.limit) searchParams.set("limit", String(params.limit))
  if (params?.tenantId) searchParams.set("tenantId", params.tenantId)
  if (params?.propertyId) searchParams.set("propertyId", params.propertyId)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.kind) searchParams.set("kind", params.kind)
  if (params?.monthKey) searchParams.set("monthKey", params.monthKey)
  const queryString = searchParams.toString()

  return useQueryWrapper<
    ApiSuccessResponse<PaginatedResult<BillItem>>,
    BillItem[]
  >(["owner", "bills", params ?? {}], `/bill${queryString ? `?${queryString}` : ""}`, {
    select: (response) => response?.data?.data ?? [],
  })
}
