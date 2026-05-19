import type {
  AgencyCommunicationChannel,
  LeadHistoryStatus,
  LeadStage,
  DealStage,
} from "@/@types/real-estate-api"

export type OutreachKind = "Email" | "Sms" | "Call"
export type AudienceType = "SingleLead" | "LeadStage" | "DealStage"
export type LeadFieldKey =
  | "name"
  | "email"
  | "phone"
  | "summary"
  | "property"
  | "budget"
  | "source"
  | "interest"
  | "timeline"
  | "agent"
  | "notes"

export type MessageStudioState = {
  audienceType: AudienceType
  leadId: string
  leadStage: "" | LeadStage
  dealStage: "" | DealStage
  kind: OutreachKind
  title: string
  message: string
  scheduledAt: string
}

export type TemplateEditorState = {
  id: string
  name: string
  subject: string
  body: string
  channels: AgencyCommunicationChannel[]
  variableTokensText: string
}

export type CsvPreviewState = {
  fileName: string
  headers: string[]
  rows: Array<Record<string, string>>
}

export type CampaignStudioState = {
  batchName: string
  templateId: string
  templateName: string
  leadFieldMappings: Record<LeadFieldKey, string>
  variableMappings: Record<string, string>
  initialKinds: OutreachKind[]
  initialTitle: string
  initialMessage: string
  initialScheduledAt: string
  enableFollowUp: boolean
  followUpKinds: OutreachKind[]
  followUpTitle: string
  followUpMessage: string
  followUpScheduledAt: string
}

export type FeedbackState = {
  message: string
  details: string[]
  tone: "success" | "warning"
}

export type TimelineFiltersState = {
  kind: "" | OutreachKind
  status: "" | LeadHistoryStatus
}
