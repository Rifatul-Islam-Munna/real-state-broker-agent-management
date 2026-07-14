// @ts-nocheck
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteRequest, patchRequest, postRequest } from "@/api-hooks/property-operations-api"
import { useCommonMutationApi } from "@/api-hooks/property-operations-mutation"
import type { ApiSuccessResponse } from "@/lib/types/api"
import type { AuthResponse } from "@/lib/types/auth"
import type {
  AnnouncementItem,
  AssetItem,
  BillItem,
  FinanceEntryItem,
  InspectionItem,
  MessageItem,
  NotificationSettingsItem,
  NotificationTemplateItem,
  PropertyItem,
  RecurringMaintenanceItem,
  StaffItem,
  TechnicianItem,
  TenantItem,
  UnitItem,
  TicketItem,
  VendorItem,
  VendorQuoteItem,
  VendorQuoteRequestItem,
  WorkOrderItem,
} from "@/lib/types/dashboard"

type OwnerManagedUserPayload = {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  jobTitle?: string
  propertyIds?: string[]
  role: "tetentwoner" | "worker" | "renter" | "guest"
  ownerProfileType?: "primary_owner" | "co_owner" | "manager"
}

type OwnerAssignmentRequestPayload = {
  direction: "owner_to_user"
  targetUserId: string
  targetEmail?: string
  requestedRole: "worker" | "renter" | "guest"
  propertyIds?: string[]
  message?: string
}

type OwnerPropertyPayload = {
  name: string
  type:
    | "apartment"
    | "hotel"
    | "villa"
    | "office"
    | "coworking_space"
    | "vacation_rental"
  description?: string
  totalUnits?: number
  totalFloors?: number
  contactPhone?: string
  contactEmail?: string
  amenities?: string[]
  images?: string[]
  documents?: string[]
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
  }
  isActive?: boolean
}

type UnitPayload = {
  propertyId: string
  unitNumber: string
  floor?: number
  type?: string
  status?: "vacant" | "occupied" | "maintenance" | "reserved"
  tenantId?: string
  monthlyRent?: number
  area?: number
  notes?: string
  images?: string[]
  amenities?: string[]
  extraChargeTemplates?: Array<{
    title: string
    amount: number
    frequency?: string
    note?: string
  }>
  isActive?: boolean
}

type OwnerTenantPayload = {
  tenantKind?: "renter" | "guest"
  propertyId: string
  unitId?: string
  userId?: string
  fullName: string
  email: string
  phone: string
  profileImage?: string
  address?: string
  monthlyRent?: number
  rentDueDay?: number
  securityDeposit?: number
  oneTimeGuestFee?: number
  notes?: string
  isActive?: boolean
}

type OwnerTenantUpdatePayload = {
  id: string
  payload: Partial<OwnerTenantPayload> & {
    address?: string
    notes?: string
    leaseStart?: string
    leaseEnd?: string
    documents?: string[]
    movedInAt?: string
    movedOutAt?: string
    guestFeePaid?: boolean
  }
}

type OwnerTechnicianPayload = {
  userId?: string
  name: string
  email: string
  phone: string
  skills?: string[]
  availability?: "available" | "busy" | "on_leave" | "off_duty"
  assignedProperties?: string[]
  hourlyRate?: number
  notes?: string
  isActive?: boolean
}

type OwnerStaffPayload = {
  propertyId: string
  fullName: string
  email?: string
  phone?: string
  role: string
  image?: string
  workDescription?: string
  workStart?: string
  workEnd?: string
  monthlyPay?: number
  currency?: string
  status?: "active" | "on_leave" | "inactive"
  isActive?: boolean
}

type OwnerStaffPaymentPayload = {
  id: string
  payload: {
    monthKey: string
    amount?: number
    currency?: string
    note?: string
  }
}

type OwnerStaffMessagePayload = {
  id: string
  payload: {
    subject?: string
    body: string
    channels?: Array<"email" | "sms">
  }
}

type NoticePayload = {
  propertyId?: string
  title: string
  content: string
  audience?: "all" | "role_based" | "user_based"
  targetRoles?: Array<"worker" | "renter" | "guest">
  targetUserIds?: string[]
  attachments?: string[]
  isActive?: boolean
}

type OwnerDocumentPayload = {
  recipientIds: string[]
  documentUrl?: string
  title?: string
  note?: string
  htmlContent?: string
  useTemplateVariables?: boolean
}

type OwnerTicketPayload = {
  propertyId: string
  unitId?: string
  tenantId?: string
  title: string
  description: string
  category: string
  priority?: string
  images?: string[]
}

type OwnerTicketAssignPayload = {
  ticketId: string
  assignedTo: string
}

type OwnerTicketNotePayload = {
  id: string
  content: string
}

type OwnerTicketUpdatePayload = {
  id: string
  payload: {
    status?: string
    scheduledDate?: string
    dueDate?: string
    estimatedCost?: number
    actualCost?: number
    completionNotes?: string
    completionProof?: string[]
    approvalStatus?: ApprovalStatus
    approvalNote?: string
  }
}

type ApprovalStatus = "not_submitted" | "pending" | "approved" | "rejected"

type OwnerWorkOrderPayload = {
  propertyId: string
  unitId?: string
  ticketId?: string
  title: string
  description: string
  assignedTo?: string
  scheduledDate?: string
  dueDate?: string
  estimatedCost?: number
  actualCost?: number
  currency?: string
  priority?: string
  status?: string
  completionProof?: string[]
  approvalStatus?: ApprovalStatus
  approvalNote?: string
}

type OwnerInspectionPayload = {
  propertyId: string
  unitId?: string
  type: string
  scheduledAt: string
  assignedTo?: string
  estimatedCost?: number
  actualCost?: number
  currency?: string
  paymentStatus?: string
  checklist?: string[]
  photos?: string[]
  damageReport?: string
  notes?: string
  completed?: boolean
  approvalStatus?: ApprovalStatus
  approvalNote?: string
}

type OwnerRecurringPayload = {
  propertyId: string
  unitId?: string
  title: string
  description?: string
  frequency: string
  nextRunAt: string
  assignedTo?: string
  estimatedCost?: number
  actualCost?: number
  currency?: string
  paymentStatus?: string
  approvalStatus?: ApprovalStatus
  approvalNote?: string
  isActive?: boolean
}

type OwnerVendorPayload = {
  name: string
  email?: string
  phone?: string
  category: string
  address?: string
  notes?: string
  isActive?: boolean
}

type OwnerAssetPayload = {
  propertyId: string
  unitId?: string
  name: string
  category: string
  serialNumber?: string
  model?: string
  purchaseDate?: string
  warrantyEnd?: string
  lastServiceAt?: string
  nextServiceAt?: string
  status?: "active" | "maintenance" | "retired"
  images?: string[]
  documents?: string[]
  notes?: string
}

type OwnerAssetUpdatePayload = {
  id: string
  payload: Partial<OwnerAssetPayload>
}

type OwnerVendorQuotePayload = {
  vendorId: string
  propertyId: string
  unitId?: string
  title: string
  description?: string
  amount?: number
  currency?: string
  status?: "requested" | "submitted" | "approved" | "rejected"
  attachments?: string[]
  ownerNote?: string
}

type OwnerVendorQuoteRequestPayload = {
  propertyId: string
  unitId?: string
  title: string
  description?: string
  budgetAmount?: number
  currency?: string
  dueDate?: string
  attachments?: string[]
  winnerMessageTemplate?: string
  rejectionMessageTemplate?: string
}

type OwnerVendorQuoteUpdatePayload = {
  id: string
  payload: Partial<OwnerVendorQuotePayload>
}

type OwnerNotificationTemplatePayload = {
  name: string
  subject?: string
  body: string
  channels?: Array<"email" | "sms">
  purpose?: string
  isActive?: boolean
}

type OwnerNotificationSettingsPayload = Partial<NotificationSettingsItem>

type OwnerSendNotificationTemplatePayload = {
  templateId: string
  tenantIds: string[]
  channels?: Array<"email" | "sms">
}

type OwnerTenantPaymentPayload = {
  tenantId: string
  monthKey: string
  amount: number
  status?: string
  paidAt?: string
  dueDate?: string
  paymentMethod?: string
  note?: string
}

type OwnerBillPayload = {
  tenantId: string
  propertyId: string
  unitId?: string
  kind?: "rent" | "extra" | "utility" | "guest_fee" | "custom"
  title: string
  description?: string
  amount: number
  currency?: string
  monthKey?: string
  dueDate?: string
  status?: "unpaid" | "paid" | "partial" | "waived" | "overdue"
  attachments?: string[]
  note?: string
}

type OwnerBillUpdatePayload = {
  id: string
  payload: {
    status?: "unpaid" | "paid" | "partial" | "waived" | "overdue"
    note?: string
  }
}

type OwnerGenerateMonthlyBillsPayload = {
  monthKey: string
  propertyId?: string
  lateFeeAmount?: number
  graceDays?: number
  applyLateFees?: boolean
}

type OwnerFinanceEntryPayload = {
  kind: "earning" | "expense"
  title: string
  description?: string
  category: string
  amount: number
  currency?: string
  propertyId?: string
  unitId?: string
  tenantId?: string
  billId?: string
  source?: string
  status?: "pending" | "cleared" | "canceled"
  occurredAt: string
  attachments?: string[]
  note?: string
}

type OwnerFinanceEntryUpdatePayload = {
  id: string
  payload: Partial<OwnerFinanceEntryPayload>
}

type WorkerInspectionReportPayload = {
  id: string
  workerReport?: string
  workerReportFiles?: string[]
  damageReport?: string
  notes?: string
  completed?: boolean
}

type WorkerRecurringReportPayload = {
  id: string
  status?: string
  note?: string
  files?: string[]
}

type ToggleEntityVariables = {
  id: string
  payload: Record<string, unknown>
}

function useDeleteEntityMutation(
  mutationKey: string[],
  queryKeys: string[][],
  urlFactory: (id: string) => string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey,
    mutationFn: async (id: string) => {
      const [data, error] = await deleteRequest(urlFactory(id))
      if (error || !data) throw new Error(error?.message ?? "Delete failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Deleted")
      await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

function usePatchEntityMutation<TData>(
  mutationKey: string[],
  queryKeys: string[][],
  urlFactory: (id: string) => string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey,
    mutationFn: async ({ id, payload }: ToggleEntityVariables) => {
      const [data, error] = await patchRequest<TData, Record<string, unknown>>(urlFactory(id), payload)
      if (error || !data) throw new Error(error?.message ?? "Update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Updated")
      await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateUserMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<AuthResponse | { message: string }, OwnerManagedUserPayload>({
    url: "/user/create",
    method: "POST",
    mutationKey: ["owner", "create", "user"],
    successMessage: "User created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "users"] })
    },
  })
}

export function useOwnerCreateAssignmentRequestMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<any, OwnerAssignmentRequestPayload>({
    url: "/user/assignment-requests",
    method: "POST",
    mutationKey: ["owner", "create", "assignment-request"],
    successMessage: "Request sent",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "assignment-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "users"] }),
      ])
    },
  })
}

export function useOwnerSendDocumentMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<MessageItem>, OwnerDocumentPayload>({
    url: "/messaging/documents",
    method: "POST",
    mutationKey: ["owner", "create", "document"],
    successMessage: "Document sent",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "messages"] })
    },
  })
}

export function useOwnerCreatePropertyMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<PropertyItem>, OwnerPropertyPayload>({
    url: "/property",
    method: "POST",
    mutationKey: ["owner", "create", "property"],
    successMessage: "Property created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "properties"] })
    },
  })
}

export function useOwnerCreateUnitMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<UnitItem>, UnitPayload>({
    url: "/unit",
    method: "POST",
    mutationKey: ["owner", "create", "unit"],
    successMessage: "Unit created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "units"] })
    },
  })
}

export function useOwnerCreateTenantMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<TenantItem>, OwnerTenantPayload>({
    url: "/tenant",
    method: "POST",
    mutationKey: ["owner", "create", "tenant"],
    successMessage: "Tenant created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "tenants"] })
    },
  })
}

export function useOwnerUpdateTenantMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "tenant"],
    mutationFn: async ({ id, payload }: OwnerTenantUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<TenantItem>, typeof payload>(
        `/tenant/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Tenant update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Tenant updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "tenants"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateTechnicianMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<TechnicianItem>, OwnerTechnicianPayload>({
    url: "/technician",
    method: "POST",
    mutationKey: ["owner", "create", "technician"],
    successMessage: "Technician created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "technicians"] })
    },
  })
}

export function useOwnerSendNoticeMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<AnnouncementItem>, NoticePayload>({
    url: "/announcement/notice",
    method: "POST",
    mutationKey: ["owner", "create", "notice"],
    successMessage: "Notice sent",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "announcements"] })
    },
  })
}

export function useOwnerCreateTicketMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<TicketItem>, OwnerTicketPayload>({
    url: "/ticket",
    method: "POST",
    mutationKey: ["owner", "create", "ticket"],
    successMessage: "Ticket created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "tickets"] })
    },
  })
}

export function useOwnerAssignTicketMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "assign", "ticket"],
    mutationFn: async ({ ticketId, assignedTo }: OwnerTicketAssignPayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<TicketItem>, undefined>(
        `/ticket/${ticketId}/assign/${assignedTo}`,
        undefined
      )
      if (error || !data) throw new Error(error?.message ?? "Assign failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Ticket assigned")
      await queryClient.invalidateQueries({ queryKey: ["owner", "tickets"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerUpdateTicketMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "ticket"],
    mutationFn: async ({ id, payload }: OwnerTicketUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<TicketItem>, typeof payload>(
        `/ticket/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Ticket update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Ticket updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "tickets"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerAddTicketNoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "ticket", "note"],
    mutationFn: async ({ id, content }: OwnerTicketNotePayload) => {
      const [data, error] = await postRequest<ApiSuccessResponse<TicketItem>, { content: string }>(
        `/ticket/${id}/internal-notes`,
        { content }
      )
      if (error || !data) throw new Error(error?.message ?? "Ticket note failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Owner note saved")
      await queryClient.invalidateQueries({ queryKey: ["owner", "tickets"] })
      await queryClient.invalidateQueries({ queryKey: ["worker", "tickets"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateWorkOrderMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<WorkOrderItem>, OwnerWorkOrderPayload>({
    url: "/work-order",
    method: "POST",
    mutationKey: ["owner", "create", "work-order"],
    successMessage: "Work order created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "work-orders"] })
    },
  })
}

export function useOwnerUpdateWorkOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "work-order"],
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<OwnerWorkOrderPayload> }) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<WorkOrderItem>, typeof payload>(
        `/work-order/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Work order update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Work order updated")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "work-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["worker", "work-orders"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateInspectionMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<InspectionItem>, OwnerInspectionPayload>({
    url: "/inspection",
    method: "POST",
    mutationKey: ["owner", "create", "inspection"],
    successMessage: "Inspection created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "inspections"] })
    },
  })
}

export function useOwnerCreateRecurringMaintenanceMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<RecurringMaintenanceItem>, OwnerRecurringPayload>({
    url: "/recurring-maintenance",
    method: "POST",
    mutationKey: ["owner", "create", "recurring-maintenance"],
    successMessage: "Recurring maintenance created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "recurring-maintenances"] })
    },
  })
}

export function useOwnerUpdateInspectionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "inspection"],
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<OwnerInspectionPayload> }) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<InspectionItem>, typeof payload>(
        `/inspection/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Inspection update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Inspection updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "inspections"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerUpdateRecurringMaintenanceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "recurring-maintenance"],
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<OwnerRecurringPayload> }) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<RecurringMaintenanceItem>, typeof payload>(
        `/recurring-maintenance/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Recurring maintenance update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Recurring maintenance updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "recurring-maintenances"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateVendorMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<VendorItem>, OwnerVendorPayload>({
    url: "/vendor",
    method: "POST",
    mutationKey: ["owner", "create", "vendor"],
    successMessage: "Vendor created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "vendors"] })
    },
  })
}

export function useOwnerCreateStaffMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<StaffItem>, OwnerStaffPayload>({
    url: "/staff",
    method: "POST",
    mutationKey: ["owner", "create", "staff"],
    successMessage: "Staff added",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "staff"] })
    },
  })
}

export function useOwnerUpdateStaffMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "staff"],
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<OwnerStaffPayload> }) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<StaffItem>, typeof payload>(`/staff/${id}`, payload)
      if (error || !data) throw new Error(error?.message ?? "Staff update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Staff updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "staff"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useOwnerPayStaffMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "pay", "staff"],
    mutationFn: async ({ id, payload }: OwnerStaffPaymentPayload) => {
      const [data, error] = await postRequest<ApiSuccessResponse<StaffItem>, typeof payload>(`/staff/${id}/pay`, payload)
      if (error || !data) throw new Error(error?.message ?? "Staff payment failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Staff payment recorded")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "staff"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "finance-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "analytics", "dashboard"] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useOwnerSendStaffMessageMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "message", "staff"],
    mutationFn: async ({ id, payload }: OwnerStaffMessagePayload) => {
      const [data, error] = await postRequest<ApiSuccessResponse<StaffItem>, typeof payload>(`/staff/${id}/message`, payload)
      if (error || !data) throw new Error(error?.message ?? "Staff message failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Staff message sent")
      await queryClient.invalidateQueries({ queryKey: ["owner", "staff"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useOwnerCreateAssetMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<AssetItem>, OwnerAssetPayload>({
    url: "/asset",
    method: "POST",
    mutationKey: ["owner", "create", "asset"],
    successMessage: "Asset created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "assets"] })
    },
  })
}

export function useOwnerUpdateAssetMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "asset"],
    mutationFn: async ({ id, payload }: OwnerAssetUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<AssetItem>, typeof payload>(
        `/asset/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Asset update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Asset updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "assets"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateVendorQuoteMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<VendorQuoteItem>, OwnerVendorQuotePayload>({
    url: "/vendor-quote",
    method: "POST",
    mutationKey: ["owner", "create", "vendor-quote"],
    successMessage: "Vendor quote created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "vendor-quotes"] })
    },
  })
}

export function useOwnerCreateVendorQuoteRequestMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<VendorQuoteRequestItem>, OwnerVendorQuoteRequestPayload>({
    url: "/vendor-quote/marketplace-requests",
    method: "POST",
    mutationKey: ["owner", "create", "vendor-quote-request"],
    successMessage: "Public quote request created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "vendor-quote-requests"] })
    },
  })
}

export function useOwnerSelectVendorQuoteSubmissionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "select", "vendor-quote-submission"],
    mutationFn: async ({ requestId, submissionId }: { requestId: string; submissionId: string }) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<VendorQuoteRequestItem>, undefined>(
        `/vendor-quote/marketplace-requests/${requestId}/select/${submissionId}`,
        undefined
      )
      if (error || !data) throw new Error(error?.message ?? "Vendor selection failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Vendor selected and messages sent")
      await queryClient.invalidateQueries({ queryKey: ["owner", "vendor-quote-requests"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerUpdateVendorQuoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "vendor-quote"],
    mutationFn: async ({ id, payload }: OwnerVendorQuoteUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<VendorQuoteItem>, typeof payload>(
        `/vendor-quote/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Vendor quote update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Vendor quote updated")
      await queryClient.invalidateQueries({ queryKey: ["owner", "vendor-quotes"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerSaveNotificationSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "save", "notification-settings"],
    mutationFn: async (payload: OwnerNotificationSettingsPayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<NotificationSettingsItem>, typeof payload>(
        "/notification/settings",
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Notification settings save failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Notification settings saved")
      await queryClient.invalidateQueries({ queryKey: ["owner", "notification-settings"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateNotificationTemplateMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<NotificationTemplateItem>, OwnerNotificationTemplatePayload>({
    url: "/notification/templates",
    method: "POST",
    mutationKey: ["owner", "create", "notification-template"],
    successMessage: "Template created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner", "notification-templates"] })
    },
  })
}

export function useOwnerSendNotificationTemplateMutation() {
  return useCommonMutationApi<ApiSuccessResponse<any>, OwnerSendNotificationTemplatePayload>({
    url: "/notification/send-template",
    method: "POST",
    mutationKey: ["owner", "send", "notification-template"],
    successMessage: "Notification queued",
  })
}

export function useOwnerRecordTenantPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "record", "tenant-payment"],
    mutationFn: async ({ tenantId, ...payload }: OwnerTenantPaymentPayload) => {
      const [data, error] = await postRequest<ApiSuccessResponse<TenantItem>, typeof payload>(
        `/tenant/${tenantId}/payments`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Payment record failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Payment recorded")
      await queryClient.invalidateQueries({ queryKey: ["owner", "tenants"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerCreateBillMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<BillItem>, OwnerBillPayload>({
    url: "/bill",
    method: "POST",
    mutationKey: ["owner", "create", "bill"],
    successMessage: "Bill sent",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "bills"] }),
        queryClient.invalidateQueries({ queryKey: ["resident", "bills"] }),
      ])
    },
  })
}

export function useOwnerUpdateBillMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "bill"],
    mutationFn: async ({ id, payload }: OwnerBillUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<BillItem>, typeof payload>(
        `/bill/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Bill update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Bill updated")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "bills"] }),
        queryClient.invalidateQueries({ queryKey: ["resident", "bills"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerGenerateMonthlyBillsMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<any>, OwnerGenerateMonthlyBillsPayload>({
    url: "/bill/monthly-rent",
    method: "POST",
    mutationKey: ["owner", "generate", "monthly-bills"],
    successMessage: "Monthly bills generated",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "bills"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "tenants"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "analytics", "dashboard"] }),
      ])
    },
  })
}

export function useOwnerCreateFinanceEntryMutation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ApiSuccessResponse<FinanceEntryItem>, OwnerFinanceEntryPayload>({
    url: "/finance-entry",
    method: "POST",
    mutationKey: ["owner", "create", "finance-entry"],
    successMessage: "Finance entry added",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "finance-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "analytics", "dashboard"] }),
      ])
    },
  })
}

export function useOwnerUpdateFinanceEntryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["owner", "update", "finance-entry"],
    mutationFn: async ({ id, payload }: OwnerFinanceEntryUpdatePayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<FinanceEntryItem>, typeof payload>(
        `/finance-entry/${id}`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Finance entry update failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Finance entry updated")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner", "finance-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "analytics", "dashboard"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useOwnerTogglePropertyMutation() {
  return usePatchEntityMutation<ApiSuccessResponse<PropertyItem>>(
    ["owner", "toggle", "property"],
    [["owner", "properties"]],
    (id) => `/property/${id}`
  )
}

export function useOwnerToggleUnitMutation() {
  return usePatchEntityMutation<ApiSuccessResponse<UnitItem>>(
    ["owner", "toggle", "unit"],
    [["owner", "units"]],
    (id) => `/unit/${id}`
  )
}

export function useOwnerToggleTenantMutation() {
  return usePatchEntityMutation<ApiSuccessResponse<TenantItem>>(
    ["owner", "toggle", "tenant"],
    [["owner", "tenants"]],
    (id) => `/tenant/${id}`
  )
}

export function useOwnerToggleTechnicianMutation() {
  return usePatchEntityMutation<ApiSuccessResponse<TechnicianItem>>(
    ["owner", "toggle", "technician"],
    [["owner", "technicians"]],
    (id) => `/technician/${id}`
  )
}

export function useOwnerDeleteUnitMutation() {
  return useDeleteEntityMutation(
    ["owner", "delete", "unit"],
    [["owner", "units"]],
    (id) => `/unit/${id}`
  )
}

export function useOwnerDeleteTenantMutation() {
  return useDeleteEntityMutation(
    ["owner", "delete", "tenant"],
    [["owner", "tenants"]],
    (id) => `/tenant/${id}`
  )
}

export function useOwnerDeleteTechnicianMutation() {
  return useDeleteEntityMutation(
    ["owner", "delete", "technician"],
    [["owner", "technicians"]],
    (id) => `/technician/${id}`
  )
}

export function useOwnerDeleteFinanceEntryMutation() {
  return useDeleteEntityMutation(
    ["owner", "delete", "finance-entry"],
    [["owner", "finance-entries"], ["owner", "analytics", "dashboard"]],
    (id) => `/finance-entry/${id}`
  )
}

export function useWorkerSubmitInspectionReportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["worker", "report", "inspection"],
    mutationFn: async ({ id, ...payload }: WorkerInspectionReportPayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<InspectionItem>, typeof payload>(
        `/inspection/${id}/report`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Inspection report failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Inspection report sent")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["worker", "inspections"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "inspections"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useWorkerSubmitRecurringReportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["worker", "report", "recurring"],
    mutationFn: async ({ id, ...payload }: WorkerRecurringReportPayload) => {
      const [data, error] = await patchRequest<ApiSuccessResponse<RecurringMaintenanceItem>, typeof payload>(
        `/recurring-maintenance/${id}/report`,
        payload
      )
      if (error || !data) throw new Error(error?.message ?? "Recurring report failed")
      return data
    },
    onSuccess: async () => {
      toast.success("Recurring report sent")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["worker", "recurring-maintenances"] }),
        queryClient.invalidateQueries({ queryKey: ["owner", "recurring-maintenances"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
