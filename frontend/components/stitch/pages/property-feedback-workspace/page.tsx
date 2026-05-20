"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import {
  type AgencyCommunicationTemplateItem,
  useDeleteLeadOutreachTemplate,
  type CreateShowingFeedbackRequestInput,
  type PropertyFeedbackAutomationSettings,
  type SavePropertyVisitFeedbackInput,
  useCreateShowingFeedbackRequest,
  useImportPropertyFeedback,
  useImportPropertyShowings,
  useLeads,
  useProperties,
  usePropertyFeedbackSettings,
  usePropertyVisitFeedbackEntries,
  useSaveLeadOutreachTemplate,
  useSavePropertyVisitFeedback,
  useShowingBookings,
  useShowingFeedbackRequests,
  useUpdatePropertyFeedbackSettings,
} from "@/hooks/use-real-estate-api"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"

import { CampaignTab, makeDefaultFeedbackCampaign, type FeedbackCampaignState } from "./campaign-tab"
import { FeedbackSettingsCard } from "./settings-card"
import { ImportsTab } from "./imports-tab"
import { ManualFeedbackTab } from "./manual-feedback-tab"
import { RequestsTab } from "./requests-tab"
import { makeDefaultFeedbackTemplateEditor, TemplatesTab, type FeedbackTemplateEditorState } from "./templates-tab"
import { feedbackTabItems, type FeedbackTab, autoMap, parseCsv } from "./utils"
import { PropertyFeedbackWorkspaceHeader } from "./workspace-header"

const showingAliases = {
  propertyTitle: ["property", "property title", "listing"],
  propertyId: ["property id", "listing id"],
  contactName: ["name", "contact name", "visitor"],
  contactEmail: ["email", "contact email", "visitor email"],
  contactPhone: ["phone", "contact phone", "visitor phone"],
  startAt: ["date", "showing date", "showing time", "start at"],
  endAt: ["end at", "end time"],
  showingAgentName: ["broker", "broker name", "showing agent"],
  showingAgentEmail: ["broker email", "showing agent email"],
  showingAgentPhone: ["broker phone", "showing agent phone"],
  notes: ["notes", "note"],
} satisfies Record<string, string[]>

const feedbackAliases = {
  propertyTitle: ["property", "property title", "listing"],
  propertyId: ["property id", "listing id"],
  leadEmail: ["lead email", "email"],
  leadPhone: ["lead phone", "phone"],
  contactName: ["name", "contact name", "broker name"],
  contactEmail: ["contact email", "broker email"],
  contactPhone: ["contact phone", "broker phone"],
  feedbackAt: ["feedback date", "date"],
  sentiment: ["sentiment"],
  summary: ["summary"],
  feedbackText: ["feedback", "feedback text", "message"],
  issues: ["issues", "issue tags"],
} satisfies Record<string, string[]>

const defaultFeedbackForm: SavePropertyVisitFeedbackInput = {
  propertyId: 0,
  showingBookingId: null,
  leadId: null,
  source: "ManualEntry",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  sentiment: "Negative",
  summary: "",
  feedbackText: "",
  issues: [],
  createdBy: "Admin",
}

const defaultRequestForm: CreateShowingFeedbackRequestInput = {
  propertyId: 0,
  showingBookingId: null,
  leadId: null,
  recipientType: "ShowingAgent",
  recipientName: "",
  recipientEmail: "",
  recipientPhone: "",
  channels: ["Email", "SMS"],
  subject: "Showing feedback request",
  message: "Please share feedback for the property visit.",
  followUpSubject: "Follow-up: showing feedback request",
  followUpMessage: "Quick follow-up on the showing feedback request. Please reply when ready.",
  scheduledAt: null,
  createdBy: "Admin",
}

const defaultAutomationSettings: PropertyFeedbackAutomationSettings = {
  ownerReportEnabled: true,
  ownerReportFrequency: "Weekly",
  ownerReportDayOfWeek: 1,
  ownerReportDayOfMonth: 1,
  ownerReportSendHourUtc: 8,
  ownerReportChannels: ["Email"],
  ownerReportSubject: "Owner update for {{property_title}}",
  ownerReportBody:
    "Hello {{owner_name}}, here is your {{report_frequency}} report for {{property_title}}.\n\n{{feedback_summary}}\n\n{{issue_list}}\n\n{{recommendation_summary}}",
  feedbackRequestEnabled: true,
  feedbackRequestDelayHours: 2,
  feedbackRequestFollowUpDelayHours: 24,
  feedbackRequestMaxFollowUps: 2,
  feedbackRequestSendWindowStartHourUtc: null,
  feedbackRequestSendWindowEndHourUtc: null,
  feedbackRequestChannels: ["Email", "SMS"],
  feedbackRequestSubject: "Showing feedback for {{property_title}}",
  feedbackRequestBody:
    "Hello {{recipient_name}}, please share visit feedback for {{property_title}} shown on {{showing_time}}. Reply with objections, price concerns, location issues, condition notes, and next-step readiness.",
  autoCaptureMailFeedback: true,
  lastOwnerReportRunAt: null,
  updatedAt: new Date(0).toISOString(),
}
const emptyTimeValue = "__empty__"
const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}))

function hourLabel(value?: number | null) {
  if (value === null || value === undefined) {
    return "Any time"
  }

  return hourOptions.find((option) => option.value === String(value))?.label ?? "Any time"
}

export function PropertyFeedbackWorkspacePage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"
  const [activeTab, setActiveTab] = useState<FeedbackTab>("manual")
  const [settingsDraft, setSettingsDraft] = useState<PropertyFeedbackAutomationSettings | null>(null)
  const [manualForm, setManualForm] = useState<SavePropertyVisitFeedbackInput>({ ...defaultFeedbackForm, createdBy })
  const [requestForm, setRequestForm] = useState<CreateShowingFeedbackRequestInput>({ ...defaultRequestForm, createdBy })
  const [templateEditor, setTemplateEditor] = useState<FeedbackTemplateEditorState>(makeDefaultFeedbackTemplateEditor)
  const [campaign, setCampaign] = useState<FeedbackCampaignState>(makeDefaultFeedbackCampaign)
  const [showingImportHeaders, setShowingImportHeaders] = useState<string[]>([])
  const [showingImportRows, setShowingImportRows] = useState<Array<Record<string, string>>>([])
  const [showingImportMappings, setShowingImportMappings] = useState<Record<string, string>>({})
  const [showingBatchName, setShowingBatchName] = useState("")
  const [feedbackImportHeaders, setFeedbackImportHeaders] = useState<string[]>([])
  const [feedbackImportRows, setFeedbackImportRows] = useState<Array<Record<string, string>>>([])
  const [feedbackImportMappings, setFeedbackImportMappings] = useState<Record<string, string>>({})
  const [feedbackBatchName, setFeedbackBatchName] = useState("")

  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const leadsQuery = useLeads({ page: 1, pageSize: 300 })
  const showingsQuery = useShowingBookings({ page: 1, pageSize: 300 })
  const settingsQuery = usePropertyFeedbackSettings()
  const requestsQuery = useShowingFeedbackRequests()
  const feedbackEntriesQuery = usePropertyVisitFeedbackEntries()
  const templatesQuery = useLeadOutreachTemplates()
  const saveSettingsMutation = useUpdatePropertyFeedbackSettings()
  const saveFeedbackMutation = useSavePropertyVisitFeedback()
  const createRequestMutation = useCreateShowingFeedbackRequest()
  const importShowingsMutation = useImportPropertyShowings()
  const importFeedbackMutation = useImportPropertyFeedback()
  const saveTemplateMutation = useSaveLeadOutreachTemplate()
  const deleteTemplateMutation = useDeleteLeadOutreachTemplate()

  const properties = propertiesQuery.data?.items ?? []
  const leads = leadsQuery.data?.items ?? []
  const showings = showingsQuery.data?.items ?? []
  const requests = requestsQuery.data ?? []
  const feedbackEntries = feedbackEntriesQuery.data ?? []
  const templates = templatesQuery.data ?? []
  const feedbackTemplates = templates.filter(
    (item) =>
      item.id.startsWith("feedback-request-") ||
      item.name.toLowerCase().includes("feedback request") ||
      item.name.toLowerCase().includes("showing feedback"),
  )

  const resolvedSettings = settingsDraft ?? settingsQuery.data ?? defaultAutomationSettings

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "campaign" || tab === "templates" || tab === "manual" || tab === "imports" || tab === "requests") {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsDraft((current) => current ?? settingsQuery.data)
    }
  }, [settingsQuery.data])

  async function handleSaveSettings() {
    if (!resolvedSettings) {
      return
    }

    await saveSettingsMutation.mutateAsync({
      ownerReportEnabled: resolvedSettings.ownerReportEnabled,
      ownerReportFrequency: resolvedSettings.ownerReportFrequency,
      ownerReportDayOfWeek: resolvedSettings.ownerReportDayOfWeek,
      ownerReportDayOfMonth: resolvedSettings.ownerReportDayOfMonth,
      ownerReportSendHourUtc: resolvedSettings.ownerReportSendHourUtc,
      ownerReportChannels: resolvedSettings.ownerReportChannels,
      ownerReportSubject: resolvedSettings.ownerReportSubject,
      ownerReportBody: resolvedSettings.ownerReportBody,
      feedbackRequestEnabled: resolvedSettings.feedbackRequestEnabled,
      feedbackRequestDelayHours: resolvedSettings.feedbackRequestDelayHours,
      feedbackRequestFollowUpDelayHours: resolvedSettings.feedbackRequestFollowUpDelayHours,
      feedbackRequestMaxFollowUps: resolvedSettings.feedbackRequestMaxFollowUps,
      feedbackRequestSendWindowStartHourUtc: resolvedSettings.feedbackRequestSendWindowStartHourUtc ?? null,
      feedbackRequestSendWindowEndHourUtc: resolvedSettings.feedbackRequestSendWindowEndHourUtc ?? null,
      feedbackRequestChannels: resolvedSettings.feedbackRequestChannels,
      feedbackRequestSubject: resolvedSettings.feedbackRequestSubject,
      feedbackRequestBody: resolvedSettings.feedbackRequestBody,
      autoCaptureMailFeedback: resolvedSettings.autoCaptureMailFeedback,
    })
  }

  async function handleSaveManualFeedback() {
    if (!manualForm.propertyId || !manualForm.summary.trim() || !manualForm.feedbackText.trim()) {
      return
    }

    await saveFeedbackMutation.mutateAsync({
      ...manualForm,
      createdBy,
    })
    setManualForm({ ...defaultFeedbackForm, createdBy })
  }

  async function handleShowingUpload(file: File) {
    const parsed = parseCsv(await file.text())
    setShowingImportHeaders(parsed.headers)
    setShowingImportRows(parsed.rows)
    setShowingImportMappings(autoMap(parsed.headers, showingAliases))
    setShowingBatchName(file.name.replace(/\.[^/.]+$/, ""))
  }

  async function handleFeedbackUpload(file: File) {
    const parsed = parseCsv(await file.text())
    setFeedbackImportHeaders(parsed.headers)
    setFeedbackImportRows(parsed.rows)
    setFeedbackImportMappings(autoMap(parsed.headers, feedbackAliases))
    setFeedbackBatchName(file.name.replace(/\.[^/.]+$/, ""))
  }

  async function handleImportShowings() {
    await importShowingsMutation.mutateAsync({
      batchName: showingBatchName || "Showing import",
      fieldMappings: showingImportMappings,
      rows: showingImportRows,
      scheduleFeedbackRequest: true,
      createdBy,
    })
  }

  async function handleImportFeedback() {
    await importFeedbackMutation.mutateAsync({
      batchName: feedbackBatchName || "Feedback import",
      fieldMappings: feedbackImportMappings,
      rows: feedbackImportRows,
      createdBy,
    })
  }

  async function handleSaveRequest() {
    if (!requestForm.propertyId || !requestForm.recipientName.trim() || !requestForm.message.trim()) {
      return
    }

    await createRequestMutation.mutateAsync({
      ...requestForm,
      createdBy,
    })
    setRequestForm({ ...defaultRequestForm, createdBy, propertyId: requestForm.propertyId })
  }

  function loadFeedbackTemplate(template: AgencyCommunicationTemplateItem) {
    setTemplateEditor({
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      followUpSubject: template.followUpSubject || template.subject,
      followUpBody: template.followUpBody || template.body,
      channels: template.channels.filter((item): item is "Email" | "SMS" | "WhatsApp" => item === "Email" || item === "SMS" || item === "WhatsApp"),
    })
  }

  async function handleSaveFeedbackTemplate() {
    await saveTemplateMutation.mutateAsync({
      id: templateEditor.id.trim() || `feedback-request-${templateEditor.name.trim().toLowerCase().replace(/\s+/g, "-")}`,
      name: templateEditor.name.trim() || "Feedback request template",
      subject: templateEditor.subject.trim(),
      body: templateEditor.body.trim(),
      followUpSubject: templateEditor.followUpSubject.trim(),
      followUpBody: templateEditor.followUpBody.trim(),
      channels: templateEditor.channels,
      variableTokens: [
        "{{property_title}}",
        "{{property_address}}",
        "{{showing_date}}",
        "{{showing_end}}",
        "{{showing_time}}",
        "{{recipient_name}}",
        "{{client_name}}",
        "{{broker_name}}",
        "{{broker_email}}",
        "{{broker_phone}}",
        "{{visitor_name}}",
        "{{assigned_agent}}",
        "{{issue_list}}",
      ],
    })
  }

  async function handleDeleteFeedbackTemplate() {
    if (!templateEditor.id) {
      return
    }
    await deleteTemplateMutation.mutateAsync({ id: templateEditor.id })
    setTemplateEditor(makeDefaultFeedbackTemplateEditor())
  }

  async function handleRunCampaign() {
    const renderTemplate = (template: string, replacements: Record<string, string>) =>
      Object.entries(replacements).reduce((output, [token, tokenValue]) => output.replaceAll(token, tokenValue || ""), template)

    if (campaign.audienceType === "showings") {
      const selectedShowings = showings.filter((item) => campaign.selectedShowingIds.includes(item.id))

      for (const showing of selectedShowings) {
        const recipientName = showing.showingAgentName || showing.contactName
        const replacements: Record<string, string> = {
          "{{property_title}}": showing.propertyTitle,
          "{{property_address}}": properties.find((item) => item.id === showing.propertyId)?.exactLocation || "",
          "{{showing_date}}": new Date(showing.startAt).toLocaleString(),
          "{{showing_end}}": showing.endAt ? new Date(showing.endAt).toLocaleString() : "",
          "{{showing_time}}": new Date(showing.startAt).toLocaleString(),
          "{{recipient_name}}": recipientName,
          "{{client_name}}": showing.contactName,
          "{{broker_name}}": recipientName,
          "{{broker_email}}": showing.showingAgentEmail || showing.contactEmail,
          "{{broker_phone}}": showing.showingAgentPhone || showing.contactPhone,
          "{{visitor_name}}": showing.contactName,
          "{{assigned_agent}}": showing.assignedAgent,
          "{{issue_list}}": "",
        }

        await createRequestMutation.mutateAsync({
          showingBookingId: showing.id,
          propertyId: showing.propertyId,
          leadId: showing.leadId ?? null,
          recipientType: "ShowingAgent",
          recipientName,
          recipientEmail: showing.showingAgentEmail || showing.contactEmail,
          recipientPhone: showing.showingAgentPhone || showing.contactPhone,
          channels: campaign.channels,
          subject: renderTemplate(campaign.subject, replacements),
          message: renderTemplate(campaign.message, replacements),
          followUpSubject: renderTemplate(campaign.followUpSubject, replacements),
          followUpMessage: renderTemplate(campaign.followUpMessage, replacements),
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null,
          createdBy,
        })
      }

      return
    }

    if (campaign.audienceType === "propertyVisits") {
      const selectedLeads = leads.filter((item) => campaign.selectedLeadIds.includes(item.id))

      for (const lead of selectedLeads) {
        const property = properties.find((item) => item.title === lead.property) ?? properties.find((item) => item.id === campaign.propertyId)
        if (!property) {
          continue
        }

        const recipientName = lead.showingAgentName || lead.name
        const replacements: Record<string, string> = {
          "{{property_title}}": property.title,
          "{{property_address}}": property.exactLocation || property.location,
          "{{showing_date}}": lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleString() : "",
          "{{showing_end}}": "",
          "{{showing_time}}": lead.nextActionDate ? new Date(lead.nextActionDate).toLocaleString() : "",
          "{{recipient_name}}": recipientName,
          "{{client_name}}": lead.name,
          "{{broker_name}}": recipientName,
          "{{broker_email}}": lead.showingAgentEmail || lead.email,
          "{{broker_phone}}": lead.showingAgentPhone || lead.phone,
          "{{visitor_name}}": lead.name,
          "{{assigned_agent}}": lead.agent,
          "{{issue_list}}": "",
        }

        await createRequestMutation.mutateAsync({
          propertyId: property.id,
          leadId: lead.id,
          recipientType: "ShowingAgent",
          recipientName,
          recipientEmail: lead.showingAgentEmail || lead.email,
          recipientPhone: lead.showingAgentPhone || lead.phone,
          channels: campaign.channels,
          subject: renderTemplate(campaign.subject, replacements),
          message: renderTemplate(campaign.message, replacements),
          followUpSubject: renderTemplate(campaign.followUpSubject, replacements),
          followUpMessage: renderTemplate(campaign.followUpMessage, replacements),
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null,
          createdBy,
        })
      }

      return
    }

    for (const row of campaign.csvRows) {
      const propertyIdRaw = campaign.csvMappings.propertyId ? row[campaign.csvMappings.propertyId] : ""
      const propertyTitleRaw = campaign.csvMappings.propertyTitle ? row[campaign.csvMappings.propertyTitle] : ""
      const property =
        properties.find((item) => item.id === Number(propertyIdRaw)) ??
        properties.find((item) => item.title.trim().toLowerCase() === (propertyTitleRaw || "").trim().toLowerCase()) ??
        properties.find((item) => (propertyTitleRaw || "").trim() && item.title.toLowerCase().includes((propertyTitleRaw || "").trim().toLowerCase()))

      if (!property) {
        continue
      }

      const recipientName = campaign.csvMappings.recipientName ? row[campaign.csvMappings.recipientName] || "" : ""
      const recipientEmail = campaign.csvMappings.recipientEmail ? row[campaign.csvMappings.recipientEmail] || "" : ""
      const recipientPhone = campaign.csvMappings.recipientPhone ? row[campaign.csvMappings.recipientPhone] || "" : ""
      const showingDateRaw = campaign.csvMappings.showingDate ? row[campaign.csvMappings.showingDate] || "" : ""
      const leadNameRaw = campaign.csvMappings.leadName ? row[campaign.csvMappings.leadName] || "" : ""
      const showingDate = showingDateRaw ? new Date(showingDateRaw) : null

      const replacements: Record<string, string> = {
        "{{property_title}}": property.title,
        "{{property_address}}": property.exactLocation || property.location,
        "{{showing_date}}": showingDate && !Number.isNaN(showingDate.getTime()) ? showingDate.toLocaleString() : "",
        "{{showing_end}}": "",
        "{{showing_time}}": showingDate && !Number.isNaN(showingDate.getTime()) ? showingDate.toLocaleString() : "",
        "{{recipient_name}}": recipientName,
        "{{client_name}}": leadNameRaw,
        "{{broker_name}}": recipientName,
        "{{broker_email}}": recipientEmail,
        "{{broker_phone}}": recipientPhone,
        "{{visitor_name}}": leadNameRaw,
        "{{assigned_agent}}": property.agent?.fullName || "",
        "{{issue_list}}": "",
      }

      await createRequestMutation.mutateAsync({
        propertyId: property.id,
        recipientType: "ShowingAgent",
        recipientName,
        recipientEmail,
        recipientPhone,
        channels: campaign.channels,
        subject: renderTemplate(campaign.subject, replacements),
        message: renderTemplate(campaign.message, replacements),
        followUpSubject: renderTemplate(campaign.followUpSubject, replacements),
        followUpMessage: renderTemplate(campaign.followUpMessage, replacements),
        scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString() : null,
        createdBy,
      })
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(27,94,138,0.08),transparent_30%),linear-gradient(180deg,#f7f5f1,#f5f3ee)] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <PropertyFeedbackWorkspaceHeader
          feedbackCount={feedbackEntries.length}
          pendingCount={requests.filter((item) => item.status === "Pending" || item.status === "Sent").length}
          propertyCount={properties.length}
        />

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[1.7rem] border border-[#1b5e8a]/18 bg-[linear-gradient(180deg,rgba(27,94,138,0.08),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/75">{"Top control"}</p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">{"AI email feedback capture"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {"Turn AI email reply parsing on or off here."}
                </p>
              </div>
              <Switch
                checked={resolvedSettings.autoCaptureMailFeedback}
                onCheckedChange={(checked) =>
                  setSettingsDraft((current) => ({ ...(current ?? resolvedSettings), autoCaptureMailFeedback: checked }))
                }
              />
            </div>
          </article>

          <article className="rounded-[1.7rem] border border-[#c18b2f]/18 bg-[linear-gradient(180deg,rgba(193,139,47,0.08),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b6722]/80">{"Top control"}</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">{"Broker SMS / email send window"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {"Set allowed send hours for broker feedback messages. Leave blank for any time."}
              </p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Start UTC"}</span>
                <Select
                  onValueChange={(value) =>
                    setSettingsDraft((current) => ({
                      ...(current ?? resolvedSettings),
                      feedbackRequestSendWindowStartHourUtc: value === emptyTimeValue ? null : Number(value),
                    }))
                  }
                  value={resolvedSettings.feedbackRequestSendWindowStartHourUtc === null || resolvedSettings.feedbackRequestSendWindowStartHourUtc === undefined ? emptyTimeValue : String(resolvedSettings.feedbackRequestSendWindowStartHourUtc)}
                >
                  <SelectTrigger><SelectValue>{hourLabel(resolvedSettings.feedbackRequestSendWindowStartHourUtc)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptyTimeValue}>{"Any time"}</SelectItem>
                    {hourOptions.map((option) => (
                      <SelectItem key={`top-window-start-${option.value}`} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"End UTC"}</span>
                <Select
                  onValueChange={(value) =>
                    setSettingsDraft((current) => ({
                      ...(current ?? resolvedSettings),
                      feedbackRequestSendWindowEndHourUtc: value === emptyTimeValue ? null : Number(value),
                    }))
                  }
                  value={resolvedSettings.feedbackRequestSendWindowEndHourUtc === null || resolvedSettings.feedbackRequestSendWindowEndHourUtc === undefined ? emptyTimeValue : String(resolvedSettings.feedbackRequestSendWindowEndHourUtc)}
                >
                  <SelectTrigger><SelectValue>{hourLabel(resolvedSettings.feedbackRequestSendWindowEndHourUtc)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptyTimeValue}>{"Any time"}</SelectItem>
                    {hourOptions.map((option) => (
                      <SelectItem key={`top-window-end-${option.value}`} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </article>
        </section>

        <FeedbackSettingsCard
          isSaving={saveSettingsMutation.isPending}
          onChange={setSettingsDraft}
          onSave={handleSaveSettings}
          settings={resolvedSettings}
        />

        <section className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 md:grid-cols-3">
            {feedbackTabItems.map((tab) => {
              const active = activeTab === tab.value
              return (
                <button
                  className={`rounded-[1.25rem] border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-[#1b5e8a]/20 bg-[#1b5e8a]/8"
                      : "border-slate-200 bg-[#f7f5f1]/65 hover:border-[#1b5e8a]/15"
                  }`}
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  type="button"
                >
                  <p className="text-sm font-black tracking-tight text-slate-900">{tab.label}</p>
                </button>
              )
            })}
          </div>
        </section>

        {activeTab === "campaign" ? (
          <CampaignTab
            campaign={campaign}
            isSending={createRequestMutation.isPending}
            leads={leads}
            onChange={(updater) => setCampaign((current) => updater(current))}
            onSend={handleRunCampaign}
            properties={properties}
            showings={showings}
            templates={feedbackTemplates}
          />
        ) : null}

        {activeTab === "templates" ? (
          <TemplatesTab
            deletePending={deleteTemplateMutation.isPending}
            editor={templateEditor}
            onChange={(updater) => setTemplateEditor((current) => updater(current))}
            onDelete={handleDeleteFeedbackTemplate}
            onLoadTemplate={loadFeedbackTemplate}
            onNew={() => setTemplateEditor(makeDefaultFeedbackTemplateEditor())}
            onSave={handleSaveFeedbackTemplate}
            savePending={saveTemplateMutation.isPending}
            templates={feedbackTemplates}
          />
        ) : null}

        {activeTab === "manual" ? (
          <ManualFeedbackTab
            feedbackEntries={feedbackEntries}
            form={manualForm}
            isSaving={saveFeedbackMutation.isPending}
            leads={leads}
            onChange={setManualForm}
            onSave={handleSaveManualFeedback}
            properties={properties}
            showings={showings}
          />
        ) : null}

        {activeTab === "imports" ? (
          <ImportsTab
            feedbackBatchName={feedbackBatchName}
            feedbackHeaders={feedbackImportHeaders}
            feedbackMappings={feedbackImportMappings}
            feedbackRows={feedbackImportRows}
            isFeedbackImporting={importFeedbackMutation.isPending}
            isShowingImporting={importShowingsMutation.isPending}
            onFeedbackBatchNameChange={setFeedbackBatchName}
            onFeedbackMappingChange={(key, value) => setFeedbackImportMappings((current) => ({ ...current, [key]: value }))}
            onFeedbackUpload={handleFeedbackUpload}
            onImportFeedback={handleImportFeedback}
            onImportShowings={handleImportShowings}
            onShowingBatchNameChange={setShowingBatchName}
            onShowingMappingChange={(key, value) => setShowingImportMappings((current) => ({ ...current, [key]: value }))}
            onShowingUpload={handleShowingUpload}
            showingBatchName={showingBatchName}
            showingHeaders={showingImportHeaders}
            showingMappings={showingImportMappings}
            showingRows={showingImportRows}
          />
        ) : null}

        {activeTab === "requests" ? (
          <RequestsTab
            feedbackEntries={feedbackEntries}
            form={requestForm}
            isSaving={createRequestMutation.isPending}
            leads={leads}
            onChange={setRequestForm}
            onSave={handleSaveRequest}
            properties={properties}
            requests={requests}
            showings={showings}
            templates={feedbackTemplates}
          />
        ) : null}
      </div>
    </main>
  )
}
