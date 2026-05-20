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
  agentRoutePermissions: string[]
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

export type HomePageImageAsset = {
  url: string
  objectName?: string | null
}

export type HomePageHeroSearchMode = {
  tabLabel: string
  inputPlaceholder: string
  selectLabel: string
  ctaLabel: string
}

export type HomePageHeroSection = {
  headline: string
  highlightedHeadline: string
  description: string
  backgroundImage: HomePageImageAsset
  buyMode: HomePageHeroSearchMode
  rentMode: HomePageHeroSearchMode
  sellMode: HomePageHeroSearchMode
}

export type HomePageSectionIntro = {
  eyebrow: string
  title: string
}

export type HomePageFeatureItem = {
  title: string
  description: string
}

export type HomePageStatItem = {
  value: string
  label: string
}

export type HomePageWhyChooseUsSection = HomePageSectionIntro & {
  description: string
  features: HomePageFeatureItem[]
  stats: HomePageStatItem[]
  primaryImage: HomePageImageAsset
  secondaryImage: HomePageImageAsset
}

export type HomePageNeighborhoodCard = {
  name: string
  propertyCountLabel: string
  image: HomePageImageAsset
}

export type HomePageNeighborhoodSection = HomePageSectionIntro & {
  cards: HomePageNeighborhoodCard[]
}

export type HomePageServiceCard = {
  title: string
  description: string
  linkLabel: string
}

export type HomePageTeamSection = HomePageSectionIntro & {
  buttonLabel: string
}

export type HomePageTestimonialSection = {
  quote: string
  name: string
  role: string
  avatarImage: HomePageImageAsset
}

export type HomePageBlogSection = HomePageSectionIntro & {
  buttonLabel: string
}

export type HomePageSettings = {
  hero: HomePageHeroSection
  featuredListings: HomePageSectionIntro
  whyChooseUs: HomePageWhyChooseUsSection
  neighborhoods: HomePageNeighborhoodSection
  services: HomePageServiceCard[]
  team: HomePageTeamSection
  testimonial: HomePageTestimonialSection
  blog: HomePageBlogSection
  updatedAt: string
}

export type MarketingTrendDirection = "Up" | "Down" | "Stable"

export type MarketingSummaryMetric = {
  value: string
  deltaLabel: string
  progressPercent: number
  trendDirection: MarketingTrendDirection
}

export type MarketingSummarySection = {
  emailOpenRate: MarketingSummaryMetric
  smsCtr: MarketingSummaryMetric
  conversions: MarketingSummaryMetric
  socialReach: MarketingSummaryMetric
}

export type MarketingEmailCampaignItem = {
  id: string
  name: string
  type: string
  status: string
  performancePercent: number
}

export type MarketingSmsStatusItem = {
  id: string
  title: string
  recipientCount: number
  status: string
  lastActivityAt: string
}

export type MarketingHomepageBoostSlot = {
  id: string
  propertyId?: number | null
  isActive: boolean
}

export type MarketingHomepageBoostSection = {
  title: string
  description: string
  buttonLabel: string
  slots: MarketingHomepageBoostSlot[]
}

export type MarketingTemplateItem = {
  id: string
  name: string
  variableHint: string
}

export type MarketingSocialChannel = {
  id: string
  label: string
  icon: string
  accentClassName: string
  isEnabled: boolean
}

export type MarketingSocialSharingSettings = {
  autoPostEnabled: boolean
  autoPostMessage: string
  channels: MarketingSocialChannel[]
}

export type MarketingSettings = {
  summary: MarketingSummarySection
  emailCampaigns: MarketingEmailCampaignItem[]
  smsStatuses: MarketingSmsStatusItem[]
  homepageBoost: MarketingHomepageBoostSection
  templates: MarketingTemplateItem[]
  socialSharing: MarketingSocialSharingSettings
  updatedAt?: string | null
}

export type AgencyIntegrationStatus = {
  hasCommunicationConfig: boolean
  communicationUpdatedAt?: string | null
  communicationProviderName?: string | null
  hasAiProviderConfig: boolean
  aiProviderUpdatedAt?: string | null
  aiProviderName?: string | null
  hasSmtpConfig: boolean
  smtpUpdatedAt?: string | null
  smtpProviderName?: string | null
  mailboxSyncEnabled: boolean
  mailboxSyncIntervalMinutes?: number | null
  updatedAt?: string | null
}

export type CommunicationProviderWriteInput = {
  providerName: string
  accountId: string
  authToken: string
  clientSecret?: string | null
  jwtToken?: string | null
  extensionId?: string | null
  fromNumber: string
  baseUrl?: string | null
  voiceWebhookUrl?: string | null
  supportsSms: boolean
  supportsVoice: boolean
}

export type AiProviderIntegrationWriteInput = {
  providerName: string
  baseUrl?: string | null
  model: string
  apiKey: string
}

export type SmtpIntegrationWriteInput = {
  providerName: string
  host: string
  port: number
  username: string
  password: string
  fromEmail: string
  fromName?: string | null
  useSsl: boolean
  enableInboxSync?: boolean
  imapHost?: string | null
  imapPort?: number
  imapUsername?: string | null
  imapPassword?: string | null
  imapUseSsl?: boolean
  imapFolder?: string | null
  syncIntervalMinutes?: number
  maxMessagesPerSync?: number
}

export type UpdateAgencyIntegrationSettingsInput = {
  communication?: CommunicationProviderWriteInput
  aiProvider?: AiProviderIntegrationWriteInput
  smtp?: SmtpIntegrationWriteInput
  clearCommunication?: boolean
  clearAiProvider?: boolean
  clearSmtp?: boolean
}

export type TwilioIntegrationWriteInput = CommunicationProviderWriteInput

export type AgencyCommunicationChannel = "Email" | "SMS" | "WhatsApp"

export type AgencySocialLinkPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "youtube"
  | "tiktok"

export type AgencySocialLink = {
  platform: AgencySocialLinkPlatform
  url: string
}

export type AgencyProfileSettings = {
  agencyName: string
  taxId: string
  standardCommissionPercent: string
  logo: HomePageImageAsset
  officeLocations: string[]
  contactEmail: string
  contactPhone: string
  socialLinks: AgencySocialLink[]
}

export type AgencyCommunicationTemplateItem = {
  id: string
  name: string
  subject: string
  body: string
  followUpSubject?: string
  followUpBody?: string
  channels: AgencyCommunicationChannel[]
  variableTokens: string[]
}

export type AgencyCommunicationTemplateSaveInput = AgencyCommunicationTemplateItem

export type AgencySettings = {
  profile: AgencyProfileSettings
  communicationTemplates: AgencyCommunicationTemplateItem[]
  updatedAt: string
}

export type PublicAgencyProfileSettings = Pick<
  AgencyProfileSettings,
  "agencyName" | "logo" | "officeLocations" | "contactEmail" | "contactPhone" | "socialLinks"
>

export type PublicAgencySettings = {
  profile: PublicAgencyProfileSettings
  updatedAt: string
}

export type BlogPostSummary = {
  id: number
  title: string
  slug: string
  excerpt: string
  category: string
  coverImageUrl: string
  authorName: string
  publishedAt: string
  readTimeMinutes: number
  isFeatured: boolean
}

export type BlogPostItem = {
  id: number
  title: string
  slug: string
  excerpt: string
  category: string
  coverImageUrl: string
  coverImageObjectName?: string | null
  authorName: string
  readTimeMinutes: number
  isFeatured: boolean
  isPublished: boolean
  publishedAt?: string | null
  tags: string[]
  highlights: string[]
  paragraphs: string[]
  createdAt: string
  updatedAt: string
}

export type BlogPostSaveInput = {
  title: string
  excerpt: string
  category: string
  coverImageUrl: string
  coverImageObjectName?: string | null
  authorName: string
  readTimeMinutes: number
  isFeatured: boolean
  isPublished: boolean
  publishedAt?: string | null
  tags: string[]
  highlights: string[]
  paragraphs: string[]
}

export type BlogPostDetail = BlogPostSummary & {
  tags: string[]
  highlights: string[]
  paragraphs: string[]
  relatedPosts: BlogPostSummary[]
}

export type DocumentAccessLevel = "AdminOnly" | "AgentAccess" | "Public"

export type DocumentRepositoryItem = {
  id: number
  title: string
  fileName: string
  fileUrl: string
  fileObjectName?: string | null
  mimeType: string
  sizeBytes: number
  category: string
  folder: string
  description: string
  versionLabel: string
  tags: string[]
  accessLevel: DocumentAccessLevel
  isTemplate: boolean
  requiresSignature: boolean
  createdAt: string
  updatedAt: string
}

export type DocumentRepositorySummary = {
  totalDocuments: number
  adminOnlyCount: number
  agentAccessCount: number
  publicCount: number
  templateCount: number
  signatureRequiredCount: number
  totalSizeBytes: number
}

export type DocumentRepositorySaveInput = {
  title: string
  fileName: string
  fileUrl: string
  fileObjectName?: string | null
  mimeType: string
  sizeBytes: number
  category: string
  folder: string
  description: string
  versionLabel: string
  tags: string[]
  accessLevel: DocumentAccessLevel
  isTemplate: boolean
  requiresSignature: boolean
}

export type UpdateDocumentRepositoryInput = DocumentRepositorySaveInput & {
  id: number
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
  hasCustomAgentRoutePermissions?: boolean
  agentRoutePermissions: string[]
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
  useCustomAgentRoutePermissions?: boolean
  agentRoutePermissions?: string[]
}

export type UpdateAgentUserInput = {
  id: number
  firstName: string
  lastName: string
  email: string
  password?: string | null
  phone?: string | null
  avatarUrl?: string | null
  agencyName?: string | null
  licenseNumber?: string | null
  bio?: string | null
  commissionRate?: number | null
  isVerifiedAgent?: boolean
  isActive?: boolean
  useCustomAgentRoutePermissions?: boolean
  agentRoutePermissions?: string[]
}

export type UpdateAgentRoutePermissionsInput = {
  agentId: number
  useCustomAgentRoutePermissions: boolean
  agentRoutePermissions: string[]
}

export type NeighborhoodInsight = {
  id?: number
  title: string
  description: string
  propertyId?: number
}

export type PropertyPreQuestion = {
  id?: number
  prompt: string
  helperText: string
  isRequired: boolean
  sortOrder: number
  allowsFileUpload: boolean
  attachmentUrl?: string | null
  attachmentObjectName?: string | null
}

export type PropertySellPrediction = {
  predictedDays: number
  isModelTrained: boolean
  trainingSampleSize: number
  confidence: number
  historicalAverageDays: number
  basis: string
}

export type PropertyItem = {
  id: number
  slug: string
  title: string
  propertyType: "Residential" | "Commercial"
  listingType: "ForSale" | "ForRent"
  price: string
  status: PropertyStatus
  location: string
  exactLocation: string
  bedRoom: string
  bathRoom: string
  width: string
  description: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerCompany?: string | null
  ownerAddress?: string | null
  ownerNotes?: string | null
  internalDetailsMarkdown?: string | null
  thumbnailUrl?: string | null
  thumbnailObjectName?: string | null
  imageUrls: string[]
  imageObjectNames: string[]
  keyAmenities: string[]
  documentRepositoryItemIds: number[]
  neighborhoodInsights: NeighborhoodInsight[]
  preQuestions: PropertyPreQuestion[]
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  sellPrediction: PropertySellPrediction
  agent?: AgentSummary | null
  agentId?: number | null
}

export type PropertyStatus =
  | "Open"
  | "Closed"
  | "Draft"
  | "PendingApproval"
  | "Active"
  | "UnderOffer"
  | "Sold"
  | "Rented"
  | "Unpublished"

export type PropertySaveInput = {
  title: string
  propertyType: "Residential" | "Commercial"
  listingType: "ForSale" | "ForRent"
  price: string
  status: PropertyStatus
  location: string
  exactLocation: string
  bedRoom: string
  bathRoom: string
  width: string
  description: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerCompany?: string | null
  ownerAddress?: string | null
  ownerNotes?: string | null
  internalDetailsMarkdown?: string | null
  thumbnailUrl?: string | null
  thumbnailObjectName?: string | null
  imageUrls: string[]
  imageObjectNames: string[]
  keyAmenities: string[]
  documentRepositoryItemIds: number[]
  neighborhoodInsights: NeighborhoodInsight[]
  preQuestions: PropertyPreQuestion[]
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
export type LeadFollowUpStatus = "Open" | "Scheduled" | "Completed" | "NoActionNeeded"

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
  agentId?: number | null
  assignedAgentName?: string | null
  source: string
  showingAgentName: string
  showingAgentEmail: string
  showingAgentPhone: string
  interest: string
  timeline: string
  inBoard: boolean
  nextActionDate?: string | null
  nextActionType: string
  followUpStatus: LeadFollowUpStatus
  isFollowUpOverdue: boolean
  notes: string[]
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  linkedDealId?: number | null
  linkedDealTitle?: string | null
}

export type LeadHistoryKind =
  | "Note"
  | "Email"
  | "Sms"
  | "Call"
  | "PropertyChat"
  | "ContactForm"
  | "MailInbox"
  | "System"

export type LeadHistoryDirection = "Incoming" | "Outgoing" | "Internal" | "Scheduled" | "System"

export type LeadHistoryStatus =
  | "Logged"
  | "Scheduled"
  | "Sent"
  | "Received"
  | "Completed"
  | "Failed"

export type LeadHistoryEntry = {
  id: number
  leadId: number
  kind: LeadHistoryKind
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider: string
  createdBy: string
  scheduledAt?: string | null
  occurredAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateLeadHistoryEntryInput = {
  leadId: number
  kind: LeadHistoryKind
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider?: string | null
  createdBy?: string | null
  scheduledAt?: string | null
  occurredAt?: string | null
}

export type LeadOutreachDispatchInput = {
  leadId: number
  kind: Extract<LeadHistoryKind, "Email" | "Sms" | "Call">
  title: string
  message: string
  createdBy?: string | null
  scheduledAt?: string | null
}

export type LeadOutreachAudienceType = "LeadStage" | "DealStage"

export type LeadOutreachBulkDispatchInput = {
  audienceType: LeadOutreachAudienceType
  leadStage?: LeadStage | null
  dealStage?: DealStage | null
  kind: Extract<LeadHistoryKind, "Email" | "Sms" | "Call">
  title: string
  message: string
  createdBy?: string | null
  scheduledAt?: string | null
}

export type LeadOutreachBulkDispatchResult = {
  audienceType: LeadOutreachAudienceType
  audienceLabel: string
  matchedCount: number
  savedCount: number
  skippedCount: number
  failedCount: number
  failures: string[]
}

export type LeadOutreachScheduleItem = {
  id: number
  leadId: number
  leadName: string
  leadEmail: string
  leadPhone: string
  kind: Extract<LeadHistoryKind, "Email" | "Sms" | "Call">
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider: string
  createdBy: string
  scheduledAt?: string | null
  occurredAt?: string | null
  createdAt: string
  updatedAt: string
}

export type LeadCampaignImportStatus = "Completed" | "CompletedWithSkips" | "Failed"
export type LeadCampaignImportItemStatus = "Imported" | "Sent" | "Scheduled" | "Skipped" | "Failed"

export type LeadCampaignImportItem = {
  id: number
  rowNumber: number
  leadId?: number | null
  leadName: string
  leadEmail: string
  leadPhone: string
  initialStatus: LeadCampaignImportItemStatus
  followUpStatus?: LeadCampaignImportItemStatus | null
  skipReason: string
  initialHistoryEntryId?: number | null
  followUpHistoryEntryId?: number | null
  createdAt: string
}

export type LeadCampaignImportBatch = {
  id: number
  batchName: string
  templateName: string
  initialKinds: Array<Extract<LeadHistoryKind, "Email" | "Sms" | "Call">>
  followUpKinds: Array<Extract<LeadHistoryKind, "Email" | "Sms" | "Call">>
  totalRows: number
  importedCount: number
  sentCount: number
  scheduledCount: number
  skippedCount: number
  failedCount: number
  status: LeadCampaignImportStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  items: LeadCampaignImportItem[]
}

export type LeadCampaignImportInput = {
  batchName: string
  templateId?: string | null
  templateName: string
  leadFieldMappings: Record<string, string>
  variableMappings: Record<string, string>
  rows: Array<Record<string, string>>
  initialKinds: Array<Extract<LeadHistoryKind, "Email" | "Sms" | "Call">>
  initialTitle: string
  initialMessage: string
  initialScheduledAt?: string | null
  enableFollowUp: boolean
  followUpKinds: Array<Extract<LeadHistoryKind, "Email" | "Sms" | "Call">>
  followUpTitle: string
  followUpMessage: string
  followUpScheduledAt?: string | null
  createdBy?: string | null
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
  commissionAmount: number
  commissionStatus: DealCommissionStatus
  commissionPayoutNote: string
  stage: DealStage
  deadline: string
  expectedClosingDate?: string | null
  note: string
  agent: string
  agentId?: number | null
  dealOwnerName?: string | null
  sourceLeadId?: number | null
  sourceLeadName?: string | null
  checklistItems: DealChecklistItem[]
  createdAt: string
  updatedAt: string
}

export type DealCommissionStatus = "NotReady" | "Estimated" | "ReadyToInvoice" | "Invoiced" | "Paid"

export type DealChecklistItem = {
  id?: number
  title: string
  isCompleted: boolean
  sortOrder: number
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

export type PropertyChatConversationStatus = "New" | "LeadCreated" | "NeedsReview"

export type PropertyChatMessage = {
  id: number
  senderRole: "System" | "Visitor" | "Agent"
  message: string
  attachmentUrl?: string | null
  attachmentObjectName?: string | null
  createdAt: string
}

export type PropertyChatConversationItem = {
  id: number
  propertyId: number
  propertyTitle: string
  assignedAgent: string
  contactName: string
  contactEmail: string
  contactPhone: string
  budget: string
  timeline: string
  interest: string
  summary: string
  qualificationScore: number
  autoQualified: boolean
  status: PropertyChatConversationStatus
  leadId?: number | null
  createdAt: string
  updatedAt: string
  messages: PropertyChatMessage[]
}

export type PropertyChatAnswerInput = {
  questionId?: number | null
  questionPrompt: string
  answerText: string
  attachmentUrl?: string | null
  attachmentObjectName?: string | null
}

export type CreatePropertyChatConversationInput = {
  propertyId: number
  contactName: string
  contactEmail: string
  contactPhone: string
  budget: string
  timeline: string
  interest: string
  additionalMessage: string
  answers: PropertyChatAnswerInput[]
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

export type MailboxSyncStatus = {
  isConfigured: boolean
  syncEnabled: boolean
  syncIntervalMinutes?: number | null
  hasAiProviderConfig: boolean
  isRunning: boolean
  lastTrigger: string
  lastStartedAt?: string | null
  lastCompletedAt?: string | null
  lastSucceededAt?: string | null
  nextRunAt?: string | null
  lastImportedCount: number
  lastMatchedLeadCount: number
  lastCreatedLeadCount: number
  lastSkippedCount: number
  lastError?: string | null
  statusMessage: string
}

export type WebsiteInquiryItem = {
  id: string
  kind: string
  source: string
  contactName: string
  contactEmail: string
  contactPhone: string
  propertyTitle: string
  assignedAgent: string
  leadId?: number | null
  status: string
  summary: string
  createdAt: string
}

export type ShowingBookingStatus = "Scheduled" | "Completed" | "Canceled" | "NoShow"

export type ShowingBookingItem = {
  id: number
  leadId?: number | null
  propertyId: number
  propertyTitle: string
  agentId?: number | null
  assignedAgent: string
  contactName: string
  contactEmail: string
  contactPhone: string
  startAt: string
  endAt: string
  status: ShowingBookingStatus
  notes: string
  showingAgentName: string
  showingAgentEmail: string
  showingAgentPhone: string
  feedbackRequestedAt?: string | null
  feedbackReceivedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CreateShowingBookingInput = {
  propertyId: number
  contactName: string
  contactEmail: string
  contactPhone: string
  startAt: string
  endAt?: string | null
  notes: string
  showingAgentName?: string | null
  showingAgentEmail?: string | null
  showingAgentPhone?: string | null
}

export type UpdateShowingBookingInput = {
  id: number
  status: ShowingBookingStatus
  notes: string
}

export type ShowingAvailabilitySlot = {
  startAt: string
  endAt: string
  isAvailable: boolean
}

export type FeedbackAutomationFrequency = "Weekly" | "Monthly"
export type ShowingFeedbackRequestRecipientType = "Visitor" | "ShowingAgent"
export type ShowingFeedbackRequestStatus = "Pending" | "Sent" | "Replied" | "Skipped" | "Failed"
export type PropertyFeedbackSentiment = "Unknown" | "Positive" | "Mixed" | "Negative"
export type PropertyVisitFeedbackSource = "MailboxAi" | "ManualEntry" | "CsvImport" | "SmsReply"
export type PropertyOwnerReportDispatchStatus = "Sent" | "Skipped" | "Failed"

export type PropertyFeedbackAutomationSettings = {
  ownerReportEnabled: boolean
  ownerReportFrequency: FeedbackAutomationFrequency
  ownerReportDayOfWeek: number
  ownerReportDayOfMonth: number
  ownerReportSendHourUtc: number
  ownerReportChannels: AgencyCommunicationChannel[]
  ownerReportSubject: string
  ownerReportBody: string
  feedbackRequestEnabled: boolean
  feedbackRequestDelayHours: number
  feedbackRequestFollowUpDelayHours: number
  feedbackRequestMaxFollowUps: number
  feedbackRequestSendWindowStartHourUtc?: number | null
  feedbackRequestSendWindowEndHourUtc?: number | null
  feedbackRequestChannels: AgencyCommunicationChannel[]
  feedbackRequestSubject: string
  feedbackRequestBody: string
  autoCaptureMailFeedback: boolean
  lastOwnerReportRunAt?: string | null
  updatedAt: string
}

export type UpdatePropertyFeedbackAutomationSettingsInput = Omit<
  PropertyFeedbackAutomationSettings,
  "lastOwnerReportRunAt" | "updatedAt"
>

export type ShowingFeedbackRequestItem = {
  id: number
  showingBookingId?: number | null
  propertyId: number
  propertyTitle: string
  leadId?: number | null
  leadName: string
  recipientType: ShowingFeedbackRequestRecipientType
  recipientName: string
  recipientEmail: string
  recipientPhone: string
  channels: AgencyCommunicationChannel[]
  subject: string
  message: string
  followUpSubject: string
  followUpMessage: string
  status: ShowingFeedbackRequestStatus
  scheduledAt: string
  lastSentAt?: string | null
  nextFollowUpAt?: string | null
  followUpCount: number
  maxFollowUps: number
  replyReceivedAt?: string | null
  replySummary: string
  skipReason: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type CreateShowingFeedbackRequestInput = {
  showingBookingId?: number | null
  propertyId: number
  leadId?: number | null
  recipientType: ShowingFeedbackRequestRecipientType
  recipientName: string
  recipientEmail?: string | null
  recipientPhone?: string | null
  channels: AgencyCommunicationChannel[]
  subject: string
  message: string
  followUpSubject?: string | null
  followUpMessage?: string | null
  scheduledAt?: string | null
  createdBy?: string | null
}

export type PropertyVisitFeedbackItem = {
  id: number
  propertyId: number
  propertyTitle: string
  showingBookingId?: number | null
  leadId?: number | null
  leadName: string
  feedbackRequestId?: number | null
  source: PropertyVisitFeedbackSource
  contactName: string
  contactEmail: string
  contactPhone: string
  feedbackAt: string
  sentiment: PropertyFeedbackSentiment
  summary: string
  feedbackText: string
  issues: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SavePropertyVisitFeedbackInput = {
  propertyId: number
  showingBookingId?: number | null
  leadId?: number | null
  feedbackRequestId?: number | null
  source?: PropertyVisitFeedbackSource
  contactName: string
  contactEmail?: string | null
  contactPhone?: string | null
  feedbackAt?: string | null
  sentiment: PropertyFeedbackSentiment
  summary: string
  feedbackText: string
  issues: string[]
  createdBy?: string | null
}

export type PropertyFeedbackImportInput = {
  batchName: string
  fieldMappings: Record<string, string>
  rows: Array<Record<string, string>>
  createdBy?: string | null
}

export type PropertyShowingImportInput = {
  batchName: string
  fieldMappings: Record<string, string>
  rows: Array<Record<string, string>>
  scheduleFeedbackRequest: boolean
  createdBy?: string | null
}

export type PropertyFeedbackImportResult = {
  batchName: string
  totalRows: number
  savedCount: number
  skippedCount: number
  failedCount: number
  failures: string[]
}

export type PropertyOwnerReportPropertySummary = {
  propertyId: number
  propertyTitle: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  negativeCount: number
  mixedCount: number
  positiveCount: number
  latestFeedbackAt?: string | null
  topIssues: string[]
  lastSentAt?: string | null
  lastReportSummary: string
}

export type PropertyOwnerReportDispatchItem = {
  id: number
  propertyId: number
  propertyTitle: string
  periodStart: string
  periodEnd: string
  channels: AgencyCommunicationChannel[]
  status: PropertyOwnerReportDispatchStatus
  summary: string
  createdBy: string
  sentAt?: string | null
  createdAt: string
}

export type PropertyOwnerReportWorkspace = {
  summaries: PropertyOwnerReportPropertySummary[]
  dispatches: PropertyOwnerReportDispatchItem[]
}

export type SendPropertyOwnerReportsInput = {
  propertyId?: number | null
  propertyIds?: number[]
  channels?: AgencyCommunicationChannel[]
  ownerName?: string | null
  ownerEmail?: string | null
  ownerPhone?: string | null
  subject?: string | null
  body?: string | null
  manualFeedback?: string | null
  customHint?: string | null
  createdBy?: string | null
}

export type BrokerageApprovalType = "ListingPublish" | "PriceChange"
export type BrokerageApprovalStatus = "Pending" | "Approved" | "Rejected"

export type BrokerageApprovalItem = {
  id: number
  type: BrokerageApprovalType
  status: BrokerageApprovalStatus
  propertyId: number
  propertyTitle: string
  oldPrice: string
  requestedPrice: string
  oldStatus?: PropertyStatus | null
  requestedStatus?: PropertyStatus | null
  requestedBy: string
  reviewedBy: string
  requestNote: string
  reviewNote: string
  createdAt: string
  updatedAt: string
}

export type ReviewBrokerageApprovalInput = {
  approvalId: number
  status: Extract<BrokerageApprovalStatus, "Approved" | "Rejected">
  reviewNote: string
}

export type LeadAssignmentRuleItem = {
  id: number
  area: string
  propertyType?: PropertyItem["propertyType"] | null
  listingType?: PropertyItem["listingType"] | null
  agentId: number
  agentName: string
  priorityOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type BrokerageSourcePerformanceItem = {
  source: string
  leadCount: number
  dealCount: number
  dealValue: number
}

export type BrokerageAgentConversionItem = {
  agentId?: number | null
  agentName: string
  leadCount: number
  dealCount: number
  conversionRate: number
}

export type BrokerageReports = {
  leadsThisMonth: number
  conversionByAgent: BrokerageAgentConversionItem[]
  activeListings: number
  soldRentedCount: number
  sourcePerformance: BrokerageSourcePerformanceItem[]
  overdueFollowUps: number
  commissionSummary: {
    estimatedCommission: number
    paidCommission: number
    openCommission: number
  }
}
