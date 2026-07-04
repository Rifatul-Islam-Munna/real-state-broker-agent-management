"use client"

import { keepPreviousData, useQueryClient } from "@tanstack/react-query"

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  AgencyIntegrationStatus,
  AgencyProfileSettings,
  AgencySettings,
  AiProviderIntegrationWriteInput,
  AgentUserOption,
  BlogPostDetail,
  BlogPostItem,
  BlogPostSaveInput,
  BlogPostSummary,
  BrokerageApprovalItem,
  BrokerageApprovalStatus,
  BrokerageReports,
  CommunicationProviderWriteInput,
  ContactRequestItem,
  CreateShowingBookingInput,
  CreateLeadHistoryEntryInput,
  CreatePropertyChatConversationInput,
  CreateAgentUserInput,
  DashboardSummary,
  DealItem,
  DocumentRepositoryItem,
  DocumentRepositorySaveInput,
  DocumentRepositorySummary,
  HomePageSettings,
  LeadItem,
  LeadAssignmentRuleItem,
  LeadHistoryEntry,
  MailboxSyncStatus,
  MailInboxItem,
  MarketingSettings,
  PaginatedResult,
  PortalCurrentUser,
  PropertyItem,
  PropertyChatConversationItem,
  PropertySaveInput,
  ReviewBrokerageApprovalInput,
  ShowingAvailabilitySlot,
  ShowingBookingItem,
  UpdateShowingBookingInput,
  SmtpIntegrationWriteInput,
  SmsMessageItem,
  SendSmsMessageInput,
  SendMailMessageInput,
  TwilioIntegrationWriteInput,
  UpdateAgencyIntegrationSettingsInput,
  UpdateDocumentRepositoryInput,
  UpdateAgentRoutePermissionsInput,
  UpdateAgentUserInput,
  WebsiteInquiryItem,
} from "@/@types/real-estate-api"

export type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  AgencyIntegrationStatus,
  AgencyProfileSettings,
  AgencySettings,
  AiProviderIntegrationWriteInput,
  AgentSummary,
  AgentUserOption,
  BlogPostDetail,
  BlogPostItem,
  BlogPostSaveInput,
  BlogPostSummary,
  BrokerageAgentConversionItem,
  BrokerageApprovalItem,
  BrokerageApprovalStatus,
  BrokerageApprovalType,
  BrokerageReports,
  BrokerageSourcePerformanceItem,
  CommunicationProviderWriteInput,
  ContactRequestItem,
  ContactRequestStatus,
  CreateShowingBookingInput,
  CreateLeadHistoryEntryInput,
  CreateAgentUserInput,
  DashboardAlert,
  DashboardOverview,
  DashboardSummary,
  DashboardTopAgent,
  DashboardVisitItem,
  DealItem,
  DealStage,
  DealType,
  DocumentAccessLevel,
  DocumentRepositoryItem,
  DocumentRepositorySaveInput,
  DocumentRepositorySummary,
  DocumentType,
  HomePageFeatureItem,
  HomePageHeroSearchMode,
  HomePageHeroSection,
  HomePageImageAsset,
  HomePageNeighborhoodCard,
  HomePageNeighborhoodSection,
  HomePageSectionIntro,
  HomePageServiceCard,
  HomePageSettings,
  HomePageStatItem,
  HomePageTeamSection,
  HomePageTestimonialSection,
  HomePageWhyChooseUsSection,
  LeadItem,
  LeadAssignmentRuleItem,
  LeadFollowUpStatus,
  LeadHistoryDirection,
  LeadHistoryEntry,
  LeadHistoryKind,
  LeadHistoryStatus,
  MailboxSyncStatus,
  LeadPriority,
  LeadStage,
  MailInboxItem,
  MailInboxKind,
  MailInboxStatus,
  SmsMessageItem,
  SmsMessageDirection,
  SmsMessageStatus,
  SendSmsMessageInput,
  SendMailMessageInput,
  MarketingEmailCampaignItem,
  MarketingHomepageBoostSection,
  MarketingHomepageBoostSlot,
  MarketingSettings,
  MarketingSmsStatusItem,
  MarketingSocialChannel,
  MarketingSocialSharingSettings,
  MarketingSummaryMetric,
  MarketingSummarySection,
  MarketingTemplateItem,
  MarketingTrendDirection,
  NeighborhoodInsight,
  PaginatedResult,
  PortalCurrentUser,
  PropertyItem,
  PropertyStatus,
  PropertyChatAnswerInput,
  PropertyChatConversationItem,
  PropertyChatConversationStatus,
  PropertyChatMessage,
  PropertyPreQuestion,
  PropertySaveInput,
  PropertySellPrediction,
  ReviewBrokerageApprovalInput,
  ShowingAvailabilitySlot,
  ShowingBookingItem,
  ShowingBookingStatus,
  SmtpIntegrationWriteInput,
  TwilioIntegrationWriteInput,
  UpdateAgencyIntegrationSettingsInput,
  UpdateDocumentRepositoryInput,
  UpdateShowingBookingInput,
  UpdateAgentRoutePermissionsInput,
  UpdateAgentUserInput,
  WebsiteInquiryItem,
} from "@/@types/real-estate-api"

type QueryParams = Record<string, string | number | boolean | undefined | null>

const defaultQueryOptions = {
  placeholderData: keepPreviousData,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: 30_000,
} as const

function buildQuery(params?: QueryParams) {
  const searchParams = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

function useInvalidate(keys: string[]) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

export function useProperties(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<PropertyItem>>(
    ["properties", params],
    `/properties${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "properties",
  )
}

export function useAdminHomePageSettings() {
  return useQueryWrapper<HomePageSettings>(
    ["homepage-settings"],
    "/homepage-settings",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "homepage-settings",
  )
}

export function usePublicHomePageSettings() {
  return useQueryWrapper<HomePageSettings>(
    ["public-homepage-settings"],
    "/public/homepage-settings",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "public-homepage-settings",
  )
}

export function useUpdateHomePageSettings() {
  const invalidate = useInvalidate(["homepage-settings", "public-homepage-settings"])

  return useCommonMutationApi<HomePageSettings, HomePageSettings>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Homepage updated",
    url: "/homepage-settings",
  })
}

export function useMarketingSettings() {
  return useQueryWrapper<MarketingSettings>(
    ["marketing-settings"],
    "/marketing-settings",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "marketing-settings",
  )
}

export function useUpdateMarketingSettings() {
  const invalidate = useInvalidate(["marketing-settings"])

  return useCommonMutationApi<MarketingSettings, MarketingSettings>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Marketing updated",
    url: "/marketing-settings",
  })
}

export function useAgencyIntegrationSettings() {
  return useQueryWrapper<AgencyIntegrationStatus>(
    ["agency-integration-settings"],
    "/settings/integrations/workspace",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "agency-integration-settings",
  )
}

export function useUpdateAgencyIntegrationSettings() {
  const invalidate = useInvalidate(["agency-integration-settings"])

  return useCommonMutationApi<AgencyIntegrationStatus, UpdateAgencyIntegrationSettingsInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Integration settings updated",
    url: "/settings/integrations/workspace",
  })
}

export function useLeadHistory(leadId?: number) {
  return useQueryWrapper<LeadHistoryEntry[]>(
    ["lead-history", leadId],
    `/lead-history${buildQuery({ leadId })}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(leadId),
      placeholderData: undefined,
    },
    0,
    "lead-history",
  )
}

export function useCreateLeadHistory() {
  const invalidate = useInvalidate(["lead-history", "lead", "leads"])

  return useCommonMutationApi<LeadHistoryEntry, CreateLeadHistoryEntryInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead history saved",
    url: "/lead-history",
  })
}

export function useAgencySettings() {
  return useQueryWrapper<AgencySettings>(
    ["agency-settings"],
    "/agency-settings",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "agency-settings",
  )
}

export function useUpdateAgencySettings() {
  const invalidate = useInvalidate(["agency-settings"])

  return useCommonMutationApi<AgencySettings, AgencySettings>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Agency settings updated",
    url: "/agency-settings",
  })
}

export function useAdminBlogPosts(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<BlogPostItem>>(
    ["admin-blog-posts", params],
    `/blogs/admin${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "admin-blog-posts",
  )
}

export function usePublicBlogPosts(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<BlogPostSummary>>(
    ["public-blog-posts", params],
    `/blogs${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "public-blog-posts",
  )
}

export function usePublicBlogPostDetail(slug?: string) {
  return useQueryWrapper<BlogPostDetail>(
    ["public-blog-post-detail", slug],
    `/blogs/details${buildQuery({ slug })}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(slug),
      placeholderData: undefined,
    },
    0,
    "public-blog-post-detail",
  )
}

export function useCreateBlogPost() {
  const invalidate = useInvalidate(["admin-blog-posts"])

  return useCommonMutationApi<BlogPostItem, BlogPostSaveInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Blog post created",
    url: "/blogs",
  })
}

export function useUpdateBlogPost() {
  const invalidate = useInvalidate(["admin-blog-posts"])

  return useCommonMutationApi<BlogPostItem, BlogPostItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Blog post updated",
    url: "/blogs",
  })
}

export function useDeleteBlogPost() {
  const invalidate = useInvalidate(["admin-blog-posts"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Blog post deleted",
    url: "/blogs",
  })
}

export function useDocumentRepository(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<DocumentRepositoryItem>>(
    ["documents", params],
    `/documents${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "documents",
  )
}

export function useDocumentRepositorySummary() {
  return useQueryWrapper<DocumentRepositorySummary>(
    ["document-summary"],
    "/documents/summary",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "document-summary",
  )
}

export function useCreateDocumentRepositoryItem() {
  const invalidate = useInvalidate(["documents", "document-summary"])

  return useCommonMutationApi<DocumentRepositoryItem, DocumentRepositorySaveInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Document created",
    url: "/documents",
  })
}

export function useUpdateDocumentRepositoryItem() {
  const invalidate = useInvalidate(["documents", "document-summary"])

  return useCommonMutationApi<DocumentRepositoryItem, UpdateDocumentRepositoryInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Document updated",
    url: "/documents",
  })
}

export function useDeleteDocumentRepositoryItem() {
  const invalidate = useInvalidate(["documents", "document-summary"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Document deleted",
    url: "/documents",
  })
}

export function useDashboardSummary() {
  return useQueryWrapper<DashboardSummary>(
    ["dashboard"],
    "/dashboard/summary",
    defaultQueryOptions,
    0,
    "dashboard",
  )
}

export function usePortalCurrentUser() {
  return useQueryWrapper<PortalCurrentUser>(
    ["portal-current-user"],
    "/auth/me",
    defaultQueryOptions,
    0,
    "portal-current-user",
  )
}

export function useAgentUsers(params?: QueryParams) {
  return useQueryWrapper<AgentUserOption[]>(
    ["agent-users", params],
    `/users/agents${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "agent-users",
  )
}

export function useCreateAgentUser() {
  const invalidate = useInvalidate(["agent-users"])

  return useCommonMutationApi<AgentUserOption, CreateAgentUserInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Agent created",
    url: "/users/agents",
  })
}

export function useUpdateAgentRoutePermissions() {
  const invalidate = useInvalidate(["agent-users", "portal-current-user"])

  return useCommonMutationApi<AgentUserOption, UpdateAgentRoutePermissionsInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Agent access updated",
    url: "/users/agents/permissions",
  })
}

export function useUpdateAgentUser() {
  const invalidate = useInvalidate(["agent-users", "portal-current-user"])

  return useCommonMutationApi<AgentUserOption, UpdateAgentUserInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Agent updated",
    url: "/users/agents",
  })
}

export function useDeleteAgentUser() {
  const invalidate = useInvalidate(["agent-users", "portal-current-user"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Agent deleted",
    url: "/users/agents",
  })
}

export function useCreateProperty() {
  const invalidate = useInvalidate(["properties", "managed-properties"])

  return useCommonMutationApi<PropertyItem, PropertySaveInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Property saved",
    url: "/properties",
  })
}

export function useUpdateProperty() {
  const invalidate = useInvalidate(["properties", "managed-properties"])

  return useCommonMutationApi<PropertyItem, PropertyItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Property updated",
    url: "/properties",
  })
}

export function useDeleteProperty() {
  const invalidate = useInvalidate(["properties", "managed-properties"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Property deleted",
    url: "/properties",
  })
}

export function useWebsiteInquiries(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<WebsiteInquiryItem>>(
    ["website-inquiries", params],
    `/website-inquiries${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "website-inquiries",
  )
}

export function useShowingBookings(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<ShowingBookingItem>>(
    ["showings", params],
    `/showings${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "showings",
  )
}

export function useShowingAvailability(params?: QueryParams) {
  return useQueryWrapper<ShowingAvailabilitySlot[]>(
    ["showing-availability", params],
    `/showings/availability${buildQuery(params)}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(params?.propertyId && params?.date),
      placeholderData: undefined,
    },
    0,
    "showing-availability",
  )
}

export function useCreateShowingBooking() {
  const invalidate = useInvalidate(["showings", "website-inquiries", "leads", "dashboard", "showing-availability"])

  return useCommonMutationApi<ShowingBookingItem, CreateShowingBookingInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Showing booked",
    url: "/showings",
  })
}

export function useUpdateShowingBooking() {
  const invalidate = useInvalidate(["showings", "website-inquiries", "leads", "dashboard"])

  return useCommonMutationApi<ShowingBookingItem, UpdateShowingBookingInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Showing updated",
    url: "/showings",
  })
}

export function useBrokerageApprovals(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<BrokerageApprovalItem>>(
    ["brokerage-approvals", params],
    `/brokerage/approvals${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "brokerage-approvals",
  )
}

export function useReviewBrokerageApproval() {
  const invalidate = useInvalidate(["brokerage-approvals", "properties", "dashboard"])

  return useCommonMutationApi<BrokerageApprovalItem, ReviewBrokerageApprovalInput>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Approval reviewed",
    url: "/brokerage/approvals",
  })
}

export function useLeadAssignmentRules() {
  return useQueryWrapper<LeadAssignmentRuleItem[]>(
    ["lead-assignment-rules"],
    "/lead-assignment-rules",
    defaultQueryOptions,
    0,
    "lead-assignment-rules",
  )
}

export function useSaveLeadAssignmentRule() {
  const invalidate = useInvalidate(["lead-assignment-rules"])

  return useCommonMutationApi<LeadAssignmentRuleItem, Partial<LeadAssignmentRuleItem>>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Assignment rule saved",
    url: "/lead-assignment-rules",
  })
}

export function useBrokerageReports() {
  return useQueryWrapper<BrokerageReports>(
    ["brokerage-reports"],
    "/reports/brokerage",
    defaultQueryOptions,
    0,
    "brokerage-reports",
  )
}

export function useLeads(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<LeadItem>>(
    ["leads", params],
    `/leads${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "leads",
  )
}

export function useLead(leadId?: number) {
  return useQueryWrapper<LeadItem>(
    ["lead", leadId],
    `/leads${buildQuery({ id: leadId })}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(leadId),
      placeholderData: undefined,
    },
    0,
    "lead",
  )
}

export function useCreateLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<
    LeadItem,
    Omit<
      LeadItem,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "lastActivityAt"
      | "linkedDealId"
      | "linkedDealTitle"
      | "assignedAgentName"
      | "isFollowUpOverdue"
    >
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead saved",
    url: "/leads",
  })
}

export function useUpdateLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<LeadItem, LeadItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Lead updated",
    url: "/leads",
  })
}

export function useDeleteLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Lead deleted",
    url: "/leads",
  })
}

export function useConvertLeadToDeal() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<DealItem, { leadId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead converted into deal",
    url: "/deals/convert-from-lead",
  })
}

export function useDeals(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<DealItem>>(
    ["deals", params],
    `/deals${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "deals",
  )
}

export function useCreateDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<
    DealItem,
    Omit<DealItem, "id" | "createdAt" | "updatedAt" | "sourceLeadName">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Deal saved",
    url: "/deals",
  })
}

export function useUpdateDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<DealItem, DealItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Deal updated",
    url: "/deals",
  })
}

export function useDeleteDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Deal deleted",
    url: "/deals",
  })
}

export function useContactRequests(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<ContactRequestItem>>(
    ["contact-requests", params],
    `/contact-requests${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "contact-requests",
  )
}

export function useCreateContactRequest() {
  const invalidate = useInvalidate(["contact-requests", "dashboard"])

  return useCommonMutationApi<
    ContactRequestItem,
    Omit<ContactRequestItem, "id" | "status" | "leadId" | "createdAt" | "updatedAt">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Inquiry sent",
    url: "/contact-requests",
  })
}

export function useUpdateContactRequest() {
  const invalidate = useInvalidate(["contact-requests", "dashboard"])

  return useCommonMutationApi<ContactRequestItem, ContactRequestItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Contact updated",
    url: "/contact-requests",
  })
}

export function useConvertContactRequestToLead() {
  const invalidate = useInvalidate(["contact-requests", "leads", "dashboard"])

  return useCommonMutationApi<LeadItem, { contactRequestId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Contact converted to lead",
    url: "/contact-requests/convert-to-lead",
  })
}

export function usePropertyChats(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<PropertyChatConversationItem>>(
    ["property-chats", params],
    `/property-chats${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "property-chats",
  )
}

export function useCreatePropertyChat() {
  const invalidate = useInvalidate(["property-chats", "leads", "dashboard"])

  return useCommonMutationApi<PropertyChatConversationItem, CreatePropertyChatConversationInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Chat sent",
    url: "/property-chats",
  })
}

export function useMailInbox(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<MailInboxItem>>(
    ["mail-inbox", params],
    `/mail-inbox${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "mail-inbox",
  )
}

export function useMailInboxSyncStatus() {
  return useQueryWrapper<MailboxSyncStatus>(
    ["mail-inbox-sync-status"],
    "/mail-inbox/sync-status",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "mail-inbox-sync-status",
  )
}

export function useRunMailInboxSync() {
  const invalidate = useInvalidate(["mail-inbox", "mail-inbox-sync-status", "leads", "lead-history", "dashboard"])

  return useCommonMutationApi<MailboxSyncStatus, void>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Mailbox sync completed",
    url: "/mail-inbox/sync",
  })
}

export function useCreateMailInboxItem() {
  const invalidate = useInvalidate(["mail-inbox", "dashboard"])

  return useCommonMutationApi<
    MailInboxItem,
    Omit<MailInboxItem, "id" | "status" | "leadId" | "createdAt" | "updatedAt">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Inbox item saved",
    url: "/mail-inbox",
  })
}

export function useUpdateMailInboxItem() {
  const invalidate = useInvalidate(["mail-inbox", "dashboard"])

  return useCommonMutationApi<MailInboxItem, MailInboxItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Mail updated",
    url: "/mail-inbox",
  })
}

export function useConvertMailInboxToLead() {
  const invalidate = useInvalidate(["mail-inbox", "leads", "dashboard"])

  return useCommonMutationApi<LeadItem, { mailInboxId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Mail converted to lead",
    url: "/mail-inbox/convert-to-lead",
  })
}

export function useMailInboxItem(id?: number) {
  return useQueryWrapper<MailInboxItem>(
    ["mail-inbox-item", id],
    `/mail-inbox?id=${id ?? ""}`,
    { ...defaultQueryOptions, enabled: Number.isFinite(id) && Number(id) > 0 },
    0,
    "mail-inbox-item",
  )
}

export function useManagedProperties(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<PropertyItem>>(
    ["managed-properties", params],
    `/properties/management${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "managed-properties",
  )
}

export function useSendMailMessage() {
  const invalidate = useInvalidate(["mail-inbox", "lead-history", "leads"])

  return useCommonMutationApi<MailInboxItem, SendMailMessageInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Mail sent",
    url: "/mail-inbox/send",
  })
}

export function useSmsMessages(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<SmsMessageItem>>(
    ["sms-messages", params],
    `/sms-inbox${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "sms-messages",
  )
}

export function useSmsMessageItem(id?: number) {
  return useQueryWrapper<SmsMessageItem>(
    ["sms-message-item", id],
    `/sms-inbox?id=${id ?? ""}`,
    { ...defaultQueryOptions, enabled: Number.isFinite(id) && Number(id) > 0 },
    0,
    "sms-message-item",
  )
}

export function useSendSmsMessage() {
  const invalidate = useInvalidate(["sms-messages", "lead-history", "leads"])

  return useCommonMutationApi<SmsMessageItem, SendSmsMessageInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "SMS sent",
    url: "/sms-inbox/send",
  })
}

export function useSyncSmsMessages() {
  const invalidate = useInvalidate(["sms-messages"])

  return useCommonMutationApi<{ imported: number }, Record<string, never>>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "SMS sync finished",
    url: "/sms-inbox/sync",
  })
}
