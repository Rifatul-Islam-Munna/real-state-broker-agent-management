export type PaginatedResult<T> = {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type DashboardOverview = {
  activeListings: number
  activeListingsChange: number
  newLeadsThisWeek: number
  contactedLeadsThisWeek: number
  convertedLeadsThisWeek: number
  dealsInProgress: number
  closingThisMonth: number
  monthlyRevenue: number
  monthlyRevenueChange: number
}

export type DashboardTopAgent = {
  id: number
  fullName: string
  status: "Active" | "Inactive"
  dealsClosed: number
  revenue: number
  growth: number
  avatarUrl?: string | null
  agencyName?: string | null
}

export type DashboardAlert = {
  id: string
  title: string
  description: string
  count: number
  tone: "warning" | "danger" | "info"
  actionLabel: string
  target: "deals" | "leads"
}

export type DashboardVisitItem = {
  id: number
  propertyTitle: string
  clientName: string
  activityAt: string
  timeline?: string | null
  status: "Scheduled" | "FollowUp" | "Completed" | "Canceled"
}

export type DashboardSummary = {
  overview: DashboardOverview
  topAgents: DashboardTopAgent[]
  alerts: DashboardAlert[]
  visits: DashboardVisitItem[]
}

export type PortalCurrentUser = {
  id: number
  fullName: string
  role: string
}

export type PublicAgentProfile = {
  id: number
  fullName: string
  avatarUrl?: string | null
  agencyName?: string | null
  bio?: string | null
  isVerifiedAgent: boolean
  propertyCount: number
}

export type PublicPropertyFilters = {
  propertyTypes: Array<PropertyItem["propertyType"]>
  listingTypes: Array<PropertyItem["listingType"]>
  locations: string[]
}

export type AgentSummary = {
  id: number
  fullName: string
  phone?: string | null
  email?: string | null
  avatarUrl?: string | null
  agencyName?: string | null
  isVerifiedAgent: boolean
}

export type AgentUserOption = {
  id: number
  fullName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  agencyName?: string | null
  licenseNumber?: string | null
  commissionRate?: number | null
  role?: string
  isActive?: boolean
  isVerifiedAgent: boolean
  bio?: string | null
  createdAt?: string
  propertyCount?: number
}

export type CreateAgentUserInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string | null
  avatarUrl?: string | null
  agencyName?: string | null
  licenseNumber?: string | null
  bio?: string | null
  commissionRate?: number | null
  isVerifiedAgent?: boolean
  isActive?: boolean
}

export type NeighborhoodInsight = {
  id?: number
  title: string
  description: string
  propertyId?: number
}

export type PropertyItem = {
  id: number
  slug: string
  title: string
  propertyType: "Residential" | "Commercial"
  listingType: "ForSale" | "ForRent"
  price: string
  status: "Open" | "Closed"
  location: string
  exactLocation: string
  bedRoom: string
  bathRoom: string
  width: string
  description: string
  thumbnailUrl?: string | null
  thumbnailObjectName?: string | null
  imageUrls: string[]
  imageObjectNames: string[]
  keyAmenities: string[]
  neighborhoodInsights: NeighborhoodInsight[]
  createdAt: string
  updatedAt: string
  agent?: AgentSummary | null
  agentId?: number | null
}

export type LeadStage =
  | "New"
  | "Contacted"
  | "Pending"
  | "Qualified"
  | "Visit"
  | "Negotiation"
  | "Deal"
  | "Canceled"

export type LeadPriority = "HighPriority" | "Warm" | "FollowUp"

export type LeadItem = {
  id: number
  name: string
  email: string
  phone: string
  summary: string
  property: string
  budget: string
  stage: LeadStage
  priority: LeadPriority
  agent: string
  source: string
  interest: string
  timeline: string
  inBoard: boolean
  notes: string[]
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  linkedDealId?: number | null
  linkedDealTitle?: string | null
}

export type DealStage =
  | "OfferMade"
  | "OfferAccepted"
  | "UnderContract"
  | "Inspection"
  | "Financing"
  | "Closing"
  | "Completed"
  | "Canceled"

export type DealType = "Residential" | "Commercial" | "Industrial"

export type DealItem = {
  id: number
  title: string
  type: DealType
  client: string
  value: number
  commissionRate: number
  stage: DealStage
  deadline: string
  note: string
  agent: string
  sourceLeadId?: number | null
  sourceLeadName?: string | null
  createdAt: string
  updatedAt: string
}

export type ContactRequestStatus = "New" | "Reviewing" | "Converted"

export type ContactRequestItem = {
  id: number
  name: string
  email: string
  phone: string
  message: string
  inquiryType: string
  status: ContactRequestStatus
  leadId?: number | null
  createdAt: string
  updatedAt: string
}

export type MailInboxStatus = "New" | "Replied" | "Converted"
export type MailInboxKind = "Newsletter" | "Direct"

export type MailInboxItem = {
  id: number
  email: string
  name: string
  subject: string
  message: string
  kind: MailInboxKind
  status: MailInboxStatus
  leadId?: number | null
  createdAt: string
  updatedAt: string
}
