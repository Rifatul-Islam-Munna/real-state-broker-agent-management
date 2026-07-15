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
  communicationSmsSyncEnabled?: boolean
  communicationSmsSyncIntervalMinutes?: number | null
  hasAiProviderConfig: boolean
  aiProviderUpdatedAt?: string | null
  aiProviderName?: string | null
  hasSmtpConfig: boolean
  smtpUpdatedAt?: string | null
  smtpProviderName?: string | null
  mailboxSyncEnabled: boolean
  mailboxSyncIntervalMinutes?: number | null
  smtpConfig?: Partial<SmtpIntegrationWriteInput> & {
    authType?: "password" | "gmail-oauth"
    gmailEmail?: string | null
    hasGmailAccessToken?: boolean
    hasGmailRefreshToken?: boolean
    hasPassword?: boolean
    hasImapPassword?: boolean
  } | null
  updatedAt?: string | null
}

export type CommunicationProviderWriteInput = {
  providerName: string
  accountId: string
  authToken: string
  fromNumber: string
  baseUrl?: string | null
  voiceWebhookUrl?: string | null
  smsWebhookUrl?: string | null
  supportsSms: boolean
  supportsVoice: boolean
  enableSmsSync?: boolean
  syncIntervalMinutes?: number
  maxMessagesPerSync?: number
}

export type AiProviderIntegrationWriteInput = {
  providerName: string
  baseUrl?: string | null
  model: string
  apiKey: string
}

export type SmtpIntegrationWriteInput = {
  providerName: string
  authType?: "password" | "gmail-oauth"
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
  mailboxTag?: string | null
  leadTemplateTags?: string[]
  duplicatePolicy?: "skip-exact-message" | "process-every-message"
  autoCreateLeads?: boolean
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

export type SmsMessageDirection = "Incoming" | "Outgoing"
export type SmsMessageStatus = "Received" | "Sent" | "Failed"

export type SmsMessageItem = {
  id: number
  provider: string
  providerMessageId: string
  leadId?: number | null
  leadName: string
  fromNumber: string
  toNumber: string
  body: string
  mediaUrls: string[]
  direction: SmsMessageDirection
  status: SmsMessageStatus
  occurredAt?: string | null
  createdAt: string
  updatedAt: string
}

export type SendSmsMessageInput = {
  leadId?: number | null
  to?: string | null
  body: string
  mediaUrls?: string[]
}

export type SendMailMessageInput = {
  to: string
  subject: string
  message: string
  htmlBody?: string
  attachmentUrls?: string[]
  pdfTemplateId?: string
}

export type AgencyCommunicationChannel = "Email" | "SMS"

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
  defaultPhoneCountry: string
  socialLinks: AgencySocialLink[]
}

export type AgencyCommunicationTemplateItem = {
  id: string
  name: string
  subject: string
  body: string
  channels: AgencyCommunicationChannel[]
  variableTokens: string[]
  sequenceType?: "Direct" | "FollowUp1" | "FollowUp2" | "FollowUp3"
  gapDays?: number
  isActive?: boolean
  attachPropertyDocuments?: boolean
  attachmentMode?: "none" | "property" | "pdf" | "document"
  attachmentDocumentType?: DocumentType | ""
  attachmentDocumentCategory?: string
  pdfTemplateId?: string
  audience?: "Lead" | "LeadShowing" | "Realtor" | "OwnerFeedback"
}

export type AgencySettings = {
  profile: AgencyProfileSettings
  communicationTemplates: AgencyCommunicationTemplateItem[]
  leadAutomation?: {
    enabled: boolean
    channels: AgencyCommunicationChannel[]
    directTemplateId: string
    followUpEnabled: boolean
  }
  leadIntelligence?: {
    qualifiedKnowledge: string
    unqualifiedKnowledge: string
    learnedQualified: string[]
    learnedUnqualified: string[]
  }
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
export type DocumentType = "System" | "Property" | "Other" | "Lead" | "Realtor" | "OwnerFeedback"

export type DocumentRepositoryItem = {
  id: number
  title: string
  fileName: string
  fileUrl: string
  fileObjectName?: string | null
  mimeType: string
  sizeBytes: number
  category: string
  documentType: DocumentType
  propertyId?: number | null
  propertyTitle?: string | null
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
  documentType: DocumentType
  propertyId?: number | null
  propertyTitle?: string | null
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

export type PropertyDocumentItem = {
  name: string
  fileName: string
  fileUrl: string
  fileObjectName: string
  mimeType: string
  sizeBytes: number
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
  extraDescription: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  ownerExtraInfo?: string
  propertyDocuments?: PropertyDocumentItem[]
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
  extraDescription: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerExtraInfo: string
  propertyDocuments: PropertyDocumentItem[]
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
  interest: string
  timeline: string
  inBoard: boolean
  intelligenceClassifier?: string
  intelligenceConfidence?: number
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
  isRead?: boolean
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
  attachPropertyDocuments?: boolean
  attachmentMode?: "none" | "property" | "pdf" | "document"
  mediaUrls?: string[]
  templateId?: string
  pdfTemplateId?: string
  attachmentDocumentType?: DocumentType | ""
  attachmentDocumentCategory?: string
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
  attachPropertyDocuments?: boolean
  mediaUrls?: string[]
  templateId?: string
  pdfTemplateId?: string
  attachmentDocumentType?: DocumentType | ""
  attachmentDocumentCategory?: string
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
  leadProperty?: string
  leadPropertyId?: number | null
  leadStage?: LeadStage | ""
  leadPriority?: LeadPriority | ""
  kind: Extract<LeadHistoryKind, "Email" | "Sms" | "Call" | "MailInbox">
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider: string
  createdBy: string
  isRead?: boolean
  scheduledAt?: string | null
  occurredAt?: string | null
  createdAt: string
  updatedAt: string
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
  propertyId?: number | null
  propertyTitle?: string | null
  agentId?: number | null
  agentName?: string | null
  status: ContactRequestStatus
  leadId?: number | null
  createdAt: string
  updatedAt: string
}

export type RealtorShowingItem = {
  id: number
  realtorName: string
  realtorEmail: string
  realtorPhone: string
  showingAt?: string | null
  propertyText: string
  propertyId?: number | null
  propertyMatchScore: number
  propertyMatchMethod: "Auto" | "Manual" | "Unmatched"
  leadId?: number | null
  emailEnabled: boolean
  smsEnabled: boolean
  directTemplateId: string
  followUpEnabled: boolean
  followUpTemplateId: string
  followUpGapDays: number
  outreachAt?: string | null
  automationStatus: "Scheduled" | "StoppedByReply" | "NotScheduled"
  property?: { id: number; title: string; location: string } | null
  lead?: { id: number; followUpStatus: LeadFollowUpStatus } | null
  createdAt: string
  updatedAt: string
}

export type RealtorShowingImportInput = {
  rows: Array<Record<string, string>>
  mapping: {
    realtorName: string
    realtorEmail: string
    realtorPhone: string
    property: string
    showingAt: string
    visitorName: string
    visitorEmail: string
    visitorPhone: string
    leadId?: string
  }
  leadId?: number | null
  defaultPhoneCountry?: string
  emailEnabled: boolean
  smsEnabled: boolean
  directTemplateId: string
  outreachAt?: string | null
  followUpEnabled: boolean
  followUpTemplateId: string
  followUpGapDays: number
}

export type RealtorShowingImportResult = {
  createdCount: number
  failedCount: number
  failures: string[]
}

export type RealtorShowingAutomationInput = {
  id: number
  emailEnabled: boolean
  smsEnabled: boolean
  directTemplateId: string
  outreachAt?: string | null
  followUpEnabled: boolean
  followUpTemplateId: string
  followUpGapDays: number
}

export type RealtorShowingManualInput = Omit<RealtorShowingImportInput, "rows" | "mapping"> & {
  realtorName: string
  realtorEmail: string
  realtorPhone: string
  property: string
  showingAt?: string | null
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string
  leadId?: number | null
}

export type ShowingFeedbackPropertySummary = {
  propertyId: number
  propertyTitle: string
  propertyLocation: string
  feedbackCount: number
  latestFeedbackAt?: string | null
}

export type ShowingFeedbackItem = {
  id: number
  realtorShowingId: number
  propertyId: number
  leadId?: number | null
  realtorName: string
  realtorContact: string
  channel: "Email" | "Sms"
  sourceMessageId: string
  feedbackText: string
  sentiment: "positive" | "neutral" | "negative"
  confidence: number
  classifier: string
  firstMessageAt: string
  receivedAt: string
  createdAt: string
  updatedAt: string
}

export type ShowingFeedbackPreviewInput = {
  propertyId: number
  fromDate: string
  toDate: string
  templateId: string
  maxFeedback: number
  summarize: boolean
}

export type ShowingFeedbackSendInput = ShowingFeedbackPreviewInput & {
  channels: Array<"Email" | "Sms">
}

export type ShowingFeedbackRenderedReport = {
  subject: string
  body: string
  feedbackCount: number
  summarized: boolean
  sent?: string[]
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
  htmlBody?: string
  kind: MailInboxKind
  status: MailInboxStatus
  mailboxTag?: string
  leadId?: number | null
  extractedLead?: Record<string, unknown>
  extractionMethod?: string
  extractionConfidence?: number
  leadCollectionTemplateId?: number | null
  leadCollectionTemplateName?: string
  aiFallbackUsed?: boolean
  extractionDetails?: Record<string, unknown>
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

