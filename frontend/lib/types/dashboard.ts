// @ts-nocheck
import type { Edge, Node, Viewport } from "@xyflow/react"
import type { AuthUser } from "@/lib/types/auth"

type AuditFields = {
  updatedByUserId?: string | null
  updatedByName?: string | null
  updatedByRole?: "super_admin" | "admin" | "tetentwoner" | "worker" | "renter" | "guest" | null
  updatedAt?: string
}

export type DashboardRoleKey =
  | "admin"
  | "tenant-owner"
  | "resident"
  | "worker"

export type DashboardNavItem = {
  label: string
  href: string
}

export type DashboardRoleConfig = {
  key: DashboardRoleKey
  title: string
  subtitle: string
  allowedRoles: AuthUser["role"][]
  nav: DashboardNavItem[]
}

export type DashboardMetrics = {
  totalTickets: number
  openTickets: number
  emergencyTickets: number
  totalProperties: number
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  finance?: {
    totalEarnings: number
    totalExpenses: number
    netIncome: number
    dueAmount: number
    unpaidBills: number
    overdueBills: number
    currentMonthEarnings: number
    currentMonthExpenses: number
    currentMonthNet: number
    previousMonthEarnings: number
    previousMonthExpenses: number
    earningsGrowthPct: number
    expenseGrowthPct: number
    topExpenseCategories: Array<{ label: string; total: number }>
    topEarningCategories: Array<{ label: string; total: number }>
    monthlySeries: Array<{ month: string; earnings: number; expenses: number; due: number }>
    issueSummary: Array<{ label: string; count: number; amount: number }>
    opsCosts: {
      workOrders: { count: number; estimated: number; actual: number }
      inspections: { count: number; estimated: number; actual: number }
    }
  }
}

export type TicketStatBucket = {
  _id: string
  count: number
}

export type OccupancyStats = {
  vacant: number
  occupied: number
  maintenance: number
  reserved: number
}

export type TechnicianStats = {
  totalTechnicians: number
  activeTechnicians: number
  totalTenants: number
}

export type FinanceEntryItem = AuditFields & {
  _id: string
  organizationId: string
  kind: "earning" | "expense"
  title: string
  description?: string | null
  category: string
  amount: number
  currency?: string | null
  propertyId?: string | null
  unitId?: string | null
  tenantId?: string | null
  billId?: string | null
  source?: string | null
  status: "pending" | "cleared" | "canceled"
  occurredAt: string
  attachments?: string[]
  note?: string | null
  createdAt?: string
}

export type OrganizationItem = {
  _id: string
  name: string
  slug: string
  isActive: boolean
}

export type PropertyItem = AuditFields & {
  _id: string
  name: string
  type: string
  totalUnits?: number
  totalFloors?: number
  description?: string | null
  address?: {
    street?: string | null
    city?: string | null
    state?: string | null
    country?: string | null
    zipCode?: string | null
  }
  amenities?: string[]
  images?: string[]
  documents?: string[]
  contactPhone?: string | null
  contactEmail?: string | null
  isActive?: boolean
}

export type UnitItem = AuditFields & {
  _id: string
  propertyId?: string
  unitNumber: string
  floor?: number
  type?: string | null
  status: string
  tenantId?: string | null
  monthlyRent?: number | null
  rentAmount?: number
  area?: number | null
  notes?: string | null
  images?: string[]
  amenities?: string[]
  extraChargeTemplates?: Array<{
    title: string
    amount: number
    frequency?: string | null
    note?: string | null
  }>
  isActive?: boolean
}

export type TenantItem = AuditFields & {
  _id: string
  propertyId?: string
  userId?: string | null
  unitId?: string | null
  fullName: string
  email?: string
  phone?: string
  phoneNumber?: string
  profileImage?: string | null
  tenantKind?: string
  address?: string | null
  leaseStart?: string | null
  leaseEnd?: string | null
  monthlyRent?: number | null
  rentDueDay?: number | null
  securityDeposit?: number | null
  oneTimeGuestFee?: number | null
  guestFeePaid?: boolean
  documents?: string[]
  paymentRecords?: Array<{
    monthKey: string
    status: string
    amount: number
    paidAt?: string | null
    dueDate?: string | null
    paymentMethod?: string | null
    billId?: string | null
    note?: string | null
  }>
  notes?: string | null
  isActive?: boolean
  movedInAt?: string | null
  movedOutAt?: string | null
  createdAt?: string
}

export type BillItem = AuditFields & {
  _id: string
  tenantId: string
  recipientUserId?: string | null
  propertyId: string
  unitId?: string | null
  kind: string
  title: string
  description?: string | null
  amount: number
  currency?: string | null
  monthKey?: string | null
  dueDate?: string | null
  status: string
  attachments?: string[]
  note?: string | null
  paidAt?: string | null
  paymentMode?: string | null
  stripeCheckoutStatus?: string | null
  stripeInvoicePdf?: string | null
  stripeHostedInvoiceUrl?: string | null
  stripePaymentMethodType?: string | null
  paymentVerifiedAt?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeInvoiceId?: string | null
  createdAt?: string
}

export type TicketItem = AuditFields & {
  _id: string
  propertyId?: string
  propertyName?: string | null
  unitId?: string
  unitNumber?: string | null
  tenantId?: string
  title: string
  description?: string
  category?: string
  priority: string
  status: string
  assignedTo?: string | null
  images?: string[]
  comments?: Array<{
    userId: string
    userName: string
    content: string
    createdAt?: string
  }>
  internalNotes?: Array<{
    userId: string
    userName: string
    content: string
    createdAt?: string
  }>
  timeline?: Array<{
    action: string
    performedBy: string
    performedAt?: string
    details: string
  }>
  scheduledDate?: string | null
  dueDate?: string | null
  estimatedCost?: number | null
  actualCost?: number | null
  completionNotes?: string | null
  completionProof?: string[]
  approvalStatus?: "not_submitted" | "pending" | "approved" | "rejected"
  approvalRequestedAt?: string | null
  approvalNote?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  resolvedAt?: string | null
  createdAt?: string
}

export type TechnicianItem = {
  _id: string
  fullName: string
  specialty?: string
  isActive?: boolean
}

export type PlanItem = {
  _id: string
  name: string
  description?: string
  interval: string
  amount: number
  isActive?: boolean
  monthlyPrice?: number
  yearlyPrice?: number
  maxProperties?: number
  maxUsers?: number
  features?: string[]
  paddlePriceIdMonthly?: string | null
  paddlePriceIdYearly?: string | null
}

export type SubscriptionItem = {
  _id: string
  organizationId: string
  ownerUserId: string
  planId: string
  billingInterval: "monthly" | "yearly"
  status: "pending" | "active" | "cancelled" | "expired"
  amount: number
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
}

export type AnnouncementItem = AuditFields & {
  _id: string
  title: string
  content: string
  propertyId?: string | null
  type?: string
  priority?: string
  attachments?: string[]
  audience?: string
  isActive?: boolean
  createdAt?: string
}

export type WorkOrderItem = AuditFields & {
  _id: string
  propertyId?: string
  unitId?: string | null
  ticketId?: string | null
  title: string
  description?: string
  assignedTo?: string | null
  priority?: string
  status: string
  scheduledDate?: string | null
  dueDate?: string | null
  estimatedCost?: number | null
  actualCost?: number | null
  currency?: string | null
  completionNotes?: string | null
  completionProof?: string[]
  approvalStatus?: "not_submitted" | "pending" | "approved" | "rejected"
  approvalRequestedAt?: string | null
  approvalNote?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  verifiedAt?: string | null
}

export type InspectionItem = AuditFields & {
  _id: string
  propertyId?: string
  propertyName?: string | null
  unitId?: string | null
  unitNumber?: string | null
  type: string
  scheduledAt?: string
  estimatedCost?: number | null
  actualCost?: number | null
  currency?: string | null
  paymentStatus?: "unpaid" | "paid" | null
  paidAt?: string | null
  checklist?: string[]
  photos?: string[]
  assignedTo?: string | null
  damageReport?: string | null
  notes?: string | null
  workerReport?: string | null
  workerReportFiles?: string[]
  workerReportedAt?: string | null
  workerReportedBy?: string | null
  completed?: boolean
  approvalStatus?: "not_submitted" | "pending" | "approved" | "rejected"
  approvalRequestedAt?: string | null
  approvalNote?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  completedAt?: string | null
}

export type RecurringMaintenanceItem = AuditFields & {
  _id: string
  propertyId?: string
  propertyName?: string | null
  unitId?: string | null
  unitNumber?: string | null
  title: string
  description?: string
  frequency: string
  nextRunAt?: string
  assignedTo?: string | null
  estimatedCost?: number | null
  actualCost?: number | null
  currency?: string | null
  paymentStatus?: "unpaid" | "paid" | null
  paidAt?: string | null
  runHistory?: Array<{
    status: string
    note?: string | null
    files?: string[]
    reportedAt?: string | null
    reportedBy?: string
  }>
  approvalStatus?: "not_submitted" | "pending" | "approved" | "rejected"
  approvalRequestedAt?: string | null
  approvalNote?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  isActive?: boolean
}

export type MessageItem = {
  _id: string
  roomType?: string
  roomId?: string
  senderId?: string
  recipientIds?: string[]
  senderName?: string
  kind?: string
  receiverId?: string
  title?: string
  content?: string
  attachments?: string[]
  readBy?: string[]
  createdAt?: string
}

export type ResidentWorkspace = {
  tenant: TenantItem | null
  property: PropertyItem | null
  unit: UnitItem | null
  linkedOwner?: {
    _id?: string
    fullName?: string
    email?: string
    phoneNumber?: string
  } | null
  pendingAssignment?: {
    _id: string
    direction?: string
    status?: string
    requesterUserId?: string
    requestedRole?: string
    propertyIds?: string[]
    ownerUser?: {
      id?: string
      fullName?: string
      email?: string
      phoneNumber?: string
    } | null
    properties?: Array<{
      _id: string
      name?: string
      type?: string | null
      address?: {
        street?: string | null
        city?: string | null
        state?: string | null
        country?: string | null
        zipCode?: string | null
      } | null
    }>
    message?: string | null
    createdAt?: string
  } | null
}

export type VendorItem = AuditFields & {
  _id: string
  name: string
  category: string
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

export type StaffItem = AuditFields & {
  _id: string
  organizationId: string
  propertyId: string
  fullName: string
  email?: string | null
  phone?: string | null
  role: string
  image?: string | null
  workDescription?: string | null
  workStart?: string | null
  workEnd?: string | null
  monthlyPay?: number | null
  currency?: string | null
  status: "active" | "on_leave" | "inactive"
  paymentRecords?: Array<{
    monthKey: string
    amount: number
    currency: string
    status: "pending" | "paid"
    paidAt?: string | null
    financeEntryId?: string | null
    note?: string | null
  }>
  messages?: Array<{
    subject?: string | null
    body: string
    channels: Array<"email" | "sms">
    sentAt?: string
    sentBy: string
  }>
  isActive?: boolean
  createdAt?: string
}

export type AssetItem = AuditFields & {
  _id: string
  propertyId: string
  unitId?: string | null
  name: string
  category: string
  serialNumber?: string | null
  model?: string | null
  purchaseDate?: string | null
  warrantyEnd?: string | null
  lastServiceAt?: string | null
  nextServiceAt?: string | null
  status: "active" | "maintenance" | "retired"
  images?: string[]
  documents?: string[]
  notes?: string | null
}

export type VendorQuoteItem = AuditFields & {
  _id: string
  vendorId: string
  propertyId: string
  unitId?: string | null
  title: string
  description?: string | null
  amount?: number | null
  currency?: string | null
  status: "requested" | "submitted" | "approved" | "rejected"
  attachments?: string[]
  ownerNote?: string | null
  approvedAt?: string | null
  createdAt?: string
}

export type VendorQuoteSubmissionItem = {
  _id: string
  vendorName: string
  vendorEmail: string
  vendorPhone?: string | null
  amount: number
  currency: string
  timeline?: string | null
  proposalNote?: string | null
  paymentTerms?: string | null
  attachments?: string[]
  status: "submitted" | "selected" | "rejected"
  selectedAt?: string | null
  createdAt?: string
}

export type VendorQuoteRequestItem = AuditFields & {
  _id: string
  propertyId: string
  unitId?: string | null
  title: string
  description?: string | null
  budgetAmount?: number | null
  currency: string
  dueDate?: string | null
  attachments?: string[]
  status: "open" | "awarded" | "closed"
  submissions?: VendorQuoteSubmissionItem[]
  selectedSubmissionId?: string | null
  winnerMessageTemplate?: string
  rejectionMessageTemplate?: string
  createdAt?: string
}

export type NotificationTemplateItem = AuditFields & {
  _id: string
  name: string
  subject?: string | null
  body: string
  channels: Array<"email" | "sms">
  purpose?: string | null
  isActive?: boolean
}

export type NotificationSettingsItem = {
  overdueRentEnabled: boolean
  overdueRentDaysAfterDue: number
  overdueRentRepeatEveryDays: number
  overdueRentMaxSends?: number
  overdueRentChannels: Array<"email" | "sms">
  overdueRentTemplateId?: string
  inspectionEnabled?: boolean
  inspectionChannels?: Array<"email" | "sms">
  inspectionTemplateId?: string
  recurringMaintenanceEnabled?: boolean
  recurringMaintenanceChannels?: Array<"email" | "sms">
  recurringMaintenanceTemplateId?: string
  tenantCreatedChannels?: Array<"email" | "sms">
  tenantCreatedTemplateId?: string
  workerCreatedChannels?: Array<"email" | "sms">
  workerCreatedTemplateId?: string
  noticeCreatedChannels?: Array<"email" | "sms">
  noticeCreatedTemplateId?: string
  vendorQuoteWinnerMessageTemplate?: string
  vendorQuoteRejectionMessageTemplate?: string
}

export type UploadImageResponse = {
  message: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

export type PlanEditorAccess = "view" | "edit"

export type PlanEditorNodeKind =
  | "rectangle"
  | "square"
  | "circle"
  | "triangle"
  | "diamond"
  | "pen"

export type PlanEditorNodeData = {
  kind: PlanEditorNodeKind
  label: string
  width: number
  height: number
  fill: string
  stroke: string
  textColor: string
  points?: number[]
  editable?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export type PlanEditorNode = Node<PlanEditorNodeData>
export type PlanEditorEdge = Edge

export type PlanEditorShare = {
  userId: string
  fullName?: string | null
  email?: string | null
  access: PlanEditorAccess
}

export type PlanEditorDocument = {
  _id: string
  title: string
  description?: string | null
  organizationId: string
  createdByUserId: string
  createdByName: string
  createdByRole: AuthUser["role"]
  nodes: PlanEditorNode[]
  edges: PlanEditorEdge[]
  viewport: Viewport
  sharedWith: PlanEditorShare[]
  updatedByUserId?: string | null
  updatedByName?: string | null
  updatedByRole?: AuthUser["role"] | null
  updatedAt?: string
  createdAt?: string
  isOwner?: boolean
  canEdit?: boolean
  myAccess?: PlanEditorAccess | null
}

export type PlanShareCandidate = {
  id: string
  fullName: string
  email: string
  role: AuthUser["role"]
}
