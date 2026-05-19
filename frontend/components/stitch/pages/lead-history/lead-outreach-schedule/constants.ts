import type { AgencyCommunicationChannel } from "@/@types/real-estate-api"
import type {
  CampaignStudioState,
  CsvPreviewState,
  LeadFieldKey,
  MessageStudioState,
  OutreachKind,
  TemplateEditorState,
} from "./types"

export const leadFieldOptions: Array<{ key: LeadFieldKey; label: string; required?: boolean }> = [
  { key: "name", label: "Lead name" },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone" },
  { key: "summary", label: "Summary" },
  { key: "property", label: "Property" },
  { key: "budget", label: "Budget" },
  { key: "source", label: "Source" },
  { key: "interest", label: "Interest" },
  { key: "timeline", label: "Timeline" },
  { key: "agent", label: "Agent" },
  { key: "notes", label: "Notes" },
]

export const channelOptions: Array<{ kind: OutreachKind; label: string; helper: string }> = [
  { kind: "Email", label: "Email", helper: "Subject + body" },
  { kind: "Sms", label: "SMS", helper: "Body only" },
  { kind: "Call", label: "Call", helper: "Title + script" },
]

export const templateChannelOptions: AgencyCommunicationChannel[] = ["Email", "SMS", "WhatsApp"]

export function makeEmptyCsvPreview(): CsvPreviewState {
  return {
    fileName: "",
    headers: [],
    rows: [],
  }
}

export function makeDefaultTemplateEditor(): TemplateEditorState {
  return {
    id: "",
    name: "",
    subject: "",
    body: "",
    channels: ["Email"],
    variableTokensText: "{{client_name}}, {{property_address}}, {{agent_name}}",
  }
}

export function makeDefaultCampaignStudio(): CampaignStudioState {
  return {
    batchName: "",
    templateId: "",
    templateName: "Custom template",
    leadFieldMappings: {
      name: "",
      email: "",
      phone: "",
      summary: "",
      property: "",
      budget: "",
      source: "",
      interest: "",
      timeline: "",
      agent: "",
      notes: "",
    },
    variableMappings: {},
    initialKinds: ["Email"],
    initialTitle: "",
    initialMessage: "",
    initialScheduledAt: "",
    enableFollowUp: true,
    followUpKinds: ["Email"],
    followUpTitle: "",
    followUpMessage: "",
    followUpScheduledAt: "",
  }
}

export function makeDefaultMessageStudio(selectedLeadId: number): MessageStudioState {
  return {
    audienceType: "SingleLead",
    leadId: Number.isFinite(selectedLeadId) ? String(selectedLeadId) : "",
    leadStage: "",
    dealStage: "",
    kind: "Email",
    title: "",
    message: "",
    scheduledAt: "",
  }
}
