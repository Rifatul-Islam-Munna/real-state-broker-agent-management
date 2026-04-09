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
  socialLinks: AgencySocialLink[]
}

export type AgencyCommunicationTemplateItem = {
  id: string
  name: string
  subject: string
  body: string
  channels: AgencyCommunicationChannel[]
  variableTokens: string[]
}

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
  preQuestions: PropertyPreQuestion[]
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  sellPrediction: PropertySellPrediction
  agent?: AgentSummary | null
  agentId?: number | null
}

export type PropertySaveInput = {
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
