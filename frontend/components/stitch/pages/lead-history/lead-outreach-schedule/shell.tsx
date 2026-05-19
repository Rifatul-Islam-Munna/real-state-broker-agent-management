"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
  AgencyCommunicationTemplateItem,
  LeadCampaignImportInput,
  LeadHistoryStatus,
} from "@/@types/real-estate-api"
import {
  useCreateLeadCampaignImport,
  useDeleteLeadOutreachTemplate,
  useDeals,
  useLeadCampaignImports,
  useLeads,
  useSaveLeadOutreachTemplate,
} from "@/hooks/use-real-estate-api"
import {
  useDispatchBulkLeadOutreach,
  useDispatchLeadOutreach,
  useLeadOutreachSchedule,
  useLeadOutreachTemplates,
} from "@/hooks/use-lead-outreach-api"

import { CampaignTab } from "./campaign-tab"
import {
  makeDefaultCampaignStudio,
  makeDefaultMessageStudio,
  makeDefaultTemplateEditor,
  makeEmptyCsvPreview,
} from "./constants"
import { LeadOutreachHeader } from "./header"
import { ManualTab } from "./manual-tab"
import { TemplatesTab } from "./templates-tab"
import { TimelineTab } from "./timeline-tab"
import type {
  CampaignStudioState,
  FeedbackState,
  MessageStudioState,
  OutreachKind,
  TemplateEditorState,
} from "./types"
import {
  autoMapLeadFields,
  autoMapVariableTokens,
  buildImportSummary,
  extractTemplateTokens,
  parseCsv,
  parseVariableTokensText,
  removeEmptyEntries,
  slugify,
} from "./utils"

const tabItems = [
  { value: "campaign", label: "Campaign Studio", helper: "CSV + mapping + bulk schedule" },
  { value: "templates", label: "Template Vault", helper: "Reusable saved text" },
  { value: "manual", label: "Manual Schedule", helper: "Single lead or stage" },
  { value: "timeline", label: "Timeline", helper: "Queued, sent, skipped" },
] as const

export function LeadOutreachScheduleShell() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedLeadId = Number(searchParams.get("leadId") ?? Number.NaN)

  const [activeTab, setActiveTab] = useState<(typeof tabItems)[number]["value"]>("campaign")
  const [timelineKindFilter, setTimelineKindFilter] = useState<"" | OutreachKind>("")
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<"" | LeadHistoryStatus>("")
  const [messageStudio, setMessageStudio] = useState<MessageStudioState>(makeDefaultMessageStudio(selectedLeadId))
  const [campaignStudio, setCampaignStudio] = useState<CampaignStudioState>(makeDefaultCampaignStudio)
  const [templateEditor, setTemplateEditor] = useState<TemplateEditorState>(makeDefaultTemplateEditor)
  const [csvPreview, setCsvPreview] = useState(makeEmptyCsvPreview)
  const [templateFeedback, setTemplateFeedback] = useState<FeedbackState | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [messageFeedback, setMessageFeedback] = useState<FeedbackState | null>(null)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [campaignFeedback, setCampaignFeedback] = useState<FeedbackState | null>(null)
  const [campaignError, setCampaignError] = useState<string | null>(null)

  const templatesQuery = useLeadOutreachTemplates()
  const leadsQuery = useLeads({ page: 1, pageSize: 200 })
  const leadStagePreviewQuery = useLeads({
    page: 1,
    pageSize: messageStudio.audienceType === "LeadStage" ? 200 : 1,
    stage: messageStudio.audienceType === "LeadStage" ? messageStudio.leadStage || undefined : undefined,
  })
  const dealsQuery = useDeals({
    page: 1,
    pageSize: messageStudio.audienceType === "DealStage" ? 200 : 1,
    stage: messageStudio.audienceType === "DealStage" ? messageStudio.dealStage || undefined : undefined,
  })
  const scheduleQuery = useLeadOutreachSchedule({
    kind: timelineKindFilter || undefined,
    leadId: Number.isFinite(selectedLeadId) ? selectedLeadId : undefined,
    status: timelineStatusFilter || undefined,
  })
  const importHistoryQuery = useLeadCampaignImports({ take: 8 })
  const saveTemplateMutation = useSaveLeadOutreachTemplate()
  const deleteTemplateMutation = useDeleteLeadOutreachTemplate()
  const dispatchMutation = useDispatchLeadOutreach()
  const bulkDispatchMutation = useDispatchBulkLeadOutreach()
  const createImportMutation = useCreateLeadCampaignImport()

  const templates = templatesQuery.data ?? []
  const leads = leadsQuery.data?.items ?? []
  const selectedLead = leads.find((item) => String(item.id) === messageStudio.leadId) ?? null
  const timelineItems = scheduleQuery.data ?? []
  const importHistory = importHistoryQuery.data ?? []

  const campaignTokens = useMemo(() => {
    const template = templates.find((item) => item.id === campaignStudio.templateId) ?? null
    const inlineTokens = [
      ...extractTemplateTokens(campaignStudio.initialTitle),
      ...extractTemplateTokens(campaignStudio.initialMessage),
      ...extractTemplateTokens(campaignStudio.followUpTitle),
      ...extractTemplateTokens(campaignStudio.followUpMessage),
    ]

    return Array.from(new Set([...(template?.variableTokens ?? []), ...inlineTokens])).sort((left, right) =>
      left.localeCompare(right),
    )
  }, [
    campaignStudio.followUpMessage,
    campaignStudio.followUpTitle,
    campaignStudio.initialMessage,
    campaignStudio.initialTitle,
    campaignStudio.templateId,
    templates,
  ])

  const dashboardMetrics = {
    templates: templates.length,
    imports: importHistory.length,
    queued: timelineItems.filter((item) => item.status === "Scheduled").length,
    sent: timelineItems.filter((item) => item.status === "Sent" || item.status === "Completed").length,
  }

  function updateLeadSelection(nextLeadId: string) {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextLeadId) {
      nextParams.set("leadId", nextLeadId)
    } else {
      nextParams.delete("leadId")
    }

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  function selectTemplateForEditor(template: AgencyCommunicationTemplateItem) {
    setTemplateError(null)
    setTemplateFeedback(null)
    setTemplateEditor({
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      channels: [...template.channels],
      variableTokensText: (template.variableTokens ?? []).join(", "),
    })
  }

  function startFreshTemplate() {
    setTemplateError(null)
    setTemplateFeedback(null)
    setTemplateEditor(makeDefaultTemplateEditor())
  }

  async function handleTemplateTextFile(file: File) {
    const text = await file.text()
    setTemplateEditor((current) => ({
      ...current,
      body: text.trim(),
      name: current.name || file.name.replace(/\.[^/.]+$/, ""),
    }))
    setTemplateError(null)
  }

  async function handleSaveTemplate() {
    if (templateEditor.name.trim().length < 2) {
      setTemplateError("Template name needed.")
      return
    }

    if (templateEditor.body.trim().length < 5) {
      setTemplateError("Template text too short.")
      return
    }

    if (templateEditor.channels.length === 0) {
      setTemplateError("Choose at least one channel.")
      return
    }

    const payload: AgencyCommunicationTemplateItem = {
      id: templateEditor.id.trim() || slugify(templateEditor.name),
      name: templateEditor.name.trim(),
      subject: templateEditor.subject.trim(),
      body: templateEditor.body.trim(),
      channels: templateEditor.channels,
      variableTokens: parseVariableTokensText(templateEditor.variableTokensText),
    }

    const response = await saveTemplateMutation.mutateAsync(payload)
    if (response.error) {
      setTemplateError(response.error.message || "Template save failed.")
      return
    }

    setTemplateError(null)
    setTemplateFeedback({
      message: `Saved template "${payload.name}".`,
      details: [`Channels: ${payload.channels.join(", ")}`],
      tone: "success",
    })
    setTemplateEditor((current) => ({ ...current, id: payload.id }))
  }

  async function handleDeleteTemplate() {
    if (!templateEditor.id) {
      setTemplateError("Pick saved template first.")
      return
    }

    const response = await deleteTemplateMutation.mutateAsync({ id: templateEditor.id })
    if (response.error) {
      setTemplateError(response.error.message || "Template delete failed.")
      return
    }

    setTemplateError(null)
    setTemplateFeedback({
      message: "Template deleted.",
      details: [],
      tone: "warning",
    })
    setTemplateEditor(makeDefaultTemplateEditor())
  }

  function applyTemplateToCampaign(templateId: string) {
    const template = templates.find((item) => item.id === templateId) ?? null

    setCampaignStudio((current) => ({
      ...current,
      templateId,
      templateName: template?.name ?? "Custom template",
      initialTitle: template?.subject ?? current.initialTitle,
      initialMessage: template?.body ?? current.initialMessage,
      followUpTitle: current.followUpTitle || template?.subject || "",
      followUpMessage: current.followUpMessage || template?.body || "",
      variableMappings: autoMapVariableTokens(
        current.variableMappings,
        template?.variableTokens ?? campaignTokens,
        csvPreview.headers,
      ),
    }))
  }

  async function handleCsvUpload(file: File) {
    const parsed = parseCsv(await file.text())
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setCampaignError("CSV empty or invalid.")
      return
    }

    setCsvPreview({
      fileName: file.name,
      headers: parsed.headers,
      rows: parsed.rows,
    })
    setCampaignStudio((current) => ({
      ...current,
      batchName: current.batchName || file.name.replace(/\.[^/.]+$/, ""),
      leadFieldMappings: autoMapLeadFields(current.leadFieldMappings, parsed.headers),
      variableMappings: autoMapVariableTokens(current.variableMappings, campaignTokens, parsed.headers),
    }))
    setCampaignError(null)
  }

  async function handleSaveMessageStudio() {
    if (messageStudio.audienceType === "SingleLead" && !messageStudio.leadId) {
      setMessageError("Choose one lead.")
      return
    }

    if (messageStudio.audienceType === "LeadStage" && !messageStudio.leadStage) {
      setMessageError("Choose lead stage.")
      return
    }

    if (messageStudio.audienceType === "DealStage" && !messageStudio.dealStage) {
      setMessageError("Choose deal stage.")
      return
    }

    if (!messageStudio.scheduledAt) {
      setMessageError("Choose send time.")
      return
    }

    if (messageStudio.kind !== "Sms" && messageStudio.title.trim().length < 3) {
      setMessageError(messageStudio.kind === "Email" ? "Email subject needed." : "Call title needed.")
      return
    }

    if (messageStudio.message.trim().length < 5) {
      setMessageError("Message too short.")
      return
    }

    setMessageError(null)
    setMessageFeedback(null)
    const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"

    if (messageStudio.audienceType === "SingleLead") {
      const response = await dispatchMutation.mutateAsync({
        leadId: Number(messageStudio.leadId),
        kind: messageStudio.kind,
        title: messageStudio.title.trim(),
        message: messageStudio.message.trim(),
        scheduledAt: messageStudio.scheduledAt,
        createdBy,
      })

      if (response.error) {
        setMessageError(response.error.message || "Could not save schedule.")
        return
      }

      setMessageFeedback({
        message: `Scheduled ${messageStudio.kind.toLowerCase()} for ${selectedLead?.name ?? "lead"}.`,
        details: [],
        tone: "success",
      })
      setMessageStudio((current) => ({ ...current, title: "", message: "", scheduledAt: "" }))
      return
    }

    const response = await bulkDispatchMutation.mutateAsync({
      audienceType: messageStudio.audienceType,
      leadStage: messageStudio.audienceType === "LeadStage" ? messageStudio.leadStage || null : null,
      dealStage: messageStudio.audienceType === "DealStage" ? messageStudio.dealStage || null : null,
      kind: messageStudio.kind,
      title: messageStudio.title.trim(),
      message: messageStudio.message.trim(),
      scheduledAt: messageStudio.scheduledAt,
      createdBy,
    })

    if (response.error || !response.data) {
      setMessageError(response.error?.message || "Could not save bulk schedule.")
      return
    }

    setMessageFeedback({
      message: `Saved ${response.data.savedCount} outreach items.`,
      details: response.data.failures.slice(0, 3),
      tone: response.data.failedCount > 0 || response.data.skippedCount > 0 ? "warning" : "success",
    })
    setMessageStudio((current) => ({ ...current, title: "", message: "", scheduledAt: "" }))
  }

  async function handleCreateCampaign() {
    if (csvPreview.rows.length === 0) {
      setCampaignError("Upload CSV first.")
      return
    }

    if (!campaignStudio.leadFieldMappings.email) {
      setCampaignError("Map email column first.")
      return
    }

    if (campaignStudio.initialKinds.length === 0 && !campaignStudio.enableFollowUp) {
      setCampaignError("Choose first touch or follow-up.")
      return
    }

    if (campaignStudio.initialKinds.includes("Email") && campaignStudio.initialTitle.trim().length < 3) {
      setCampaignError("Initial email subject needed.")
      return
    }

    if (campaignStudio.initialKinds.length > 0 && campaignStudio.initialMessage.trim().length < 5) {
      setCampaignError("Initial message needed.")
      return
    }

    if (campaignStudio.enableFollowUp) {
      if (campaignStudio.followUpKinds.length === 0) {
        setCampaignError("Choose follow-up channel.")
        return
      }

      if (!campaignStudio.followUpScheduledAt) {
        setCampaignError("Choose follow-up time.")
        return
      }

      if (campaignStudio.followUpKinds.includes("Email") && campaignStudio.followUpTitle.trim().length < 3) {
        setCampaignError("Follow-up email subject needed.")
        return
      }

      if (campaignStudio.followUpMessage.trim().length < 5) {
        setCampaignError("Follow-up message needed.")
        return
      }
    }

    const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"
    const payload: LeadCampaignImportInput = {
      batchName: campaignStudio.batchName.trim() || csvPreview.fileName || "Lead campaign",
      templateId: campaignStudio.templateId || null,
      templateName: campaignStudio.templateName.trim() || "Custom template",
      leadFieldMappings: removeEmptyEntries(campaignStudio.leadFieldMappings),
      variableMappings: removeEmptyEntries(campaignStudio.variableMappings),
      rows: csvPreview.rows,
      initialKinds: campaignStudio.initialKinds,
      initialTitle: campaignStudio.initialTitle.trim(),
      initialMessage: campaignStudio.initialMessage.trim(),
      initialScheduledAt: campaignStudio.initialScheduledAt || null,
      enableFollowUp: campaignStudio.enableFollowUp,
      followUpKinds: campaignStudio.enableFollowUp ? campaignStudio.followUpKinds : [],
      followUpTitle: campaignStudio.followUpTitle.trim(),
      followUpMessage: campaignStudio.followUpMessage.trim(),
      followUpScheduledAt: campaignStudio.enableFollowUp ? campaignStudio.followUpScheduledAt || null : null,
      createdBy,
    }

    const response = await createImportMutation.mutateAsync(payload)
    if (response.error || !response.data) {
      setCampaignError(response.error?.message || "Campaign import failed.")
      return
    }

    setCampaignError(null)
    setCampaignFeedback({
      message: buildImportSummary(response.data),
      details: response.data.items
        .filter((item) => item.skipReason)
        .slice(0, 4)
        .map((item) => `Row ${item.rowNumber}: ${item.skipReason}`),
      tone: response.data.failedCount > 0 || response.data.skippedCount > 0 ? "warning" : "success",
    })
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(27,94,138,0.08),transparent_32%),linear-gradient(180deg,rgba(247,245,241,1),rgba(247,245,241,0.96))] text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <LeadOutreachHeader
          imports={dashboardMetrics.imports}
          pathname={pathname}
          queued={dashboardMetrics.queued}
          sent={dashboardMetrics.sent}
          templates={dashboardMetrics.templates}
        />

        <section className="mt-8 space-y-6">
          <div className="rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.92))] p-3 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/70">{"Workspace Sections"}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{"Full-width, compact layout. Pick section below."}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {tabItems.map((tab, index) => {
                  const active = activeTab === tab.value

                  return (
                    <button
                      className={`flex min-h-24 w-full cursor-pointer items-start gap-3 rounded-[1.35rem] border px-4 py-4 text-left transition-colors duration-200 ${
                        active
                          ? "border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_12%,white),color-mix(in_oklab,var(--color-accent)_8%,white))] text-foreground"
                          : "border-border/60 bg-background/80 hover:border-primary/15 hover:bg-primary/5"
                      }`}
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      <div
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {`0${index + 1}`}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black tracking-tight text-foreground">{tab.label}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {tab.helper}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {activeTab === "campaign" ? (
            <CampaignTab
              campaignError={campaignError}
              campaignFeedback={campaignFeedback}
              campaignStudio={campaignStudio}
              campaignTokens={campaignTokens}
              createImportPending={createImportMutation.isPending}
              csvPreview={csvPreview}
              importHistory={importHistory}
              onCampaignChange={setCampaignStudio}
              onCsvUpload={handleCsvUpload}
              onLeadFieldChange={(key, value) =>
                setCampaignStudio((current) => ({
                  ...current,
                  leadFieldMappings: {
                    ...current.leadFieldMappings,
                    [key]: value,
                  },
                }))
              }
              onSubmit={handleCreateCampaign}
              onTemplateApply={applyTemplateToCampaign}
              onVariableMappingChange={(token, value) =>
                setCampaignStudio((current) => ({
                  ...current,
                  variableMappings: {
                    ...current.variableMappings,
                    [token]: value,
                  },
                }))
              }
              templates={templates}
            />
            ) : null}

            {activeTab === "templates" ? (
            <TemplatesTab
              deletePending={deleteTemplateMutation.isPending}
              onDelete={handleDeleteTemplate}
              onEditorChange={setTemplateEditor}
              onLoadTemplate={selectTemplateForEditor}
              onNewTemplate={startFreshTemplate}
              onSave={handleSaveTemplate}
              onTextUpload={handleTemplateTextFile}
              savePending={saveTemplateMutation.isPending}
              templateEditor={templateEditor}
              templateError={templateError}
              templateFeedback={templateFeedback}
              templates={templates}
            />
            ) : null}

            {activeTab === "manual" ? (
            <ManualTab
              bulkPending={bulkDispatchMutation.isPending}
              deals={dealsQuery.data}
              dispatchPending={dispatchMutation.isPending}
              leads={leads}
              leadStageCount={leadStagePreviewQuery.data}
              messageError={messageError}
              messageFeedback={messageFeedback}
              messageStudio={messageStudio}
              onMessageChange={setMessageStudio}
              onSubmit={handleSaveMessageStudio}
              selectedLead={selectedLead}
            />
            ) : null}

            {activeTab === "timeline" ? (
            <TimelineTab
              isLoading={scheduleQuery.isLoading}
              leads={leads}
              onKindFilterChange={setTimelineKindFilter}
              onLeadChange={updateLeadSelection}
              onStatusFilterChange={setTimelineStatusFilter}
              pathname={pathname}
              selectedLeadId={selectedLeadId}
              statusFilter={timelineStatusFilter}
              timelineItems={timelineItems}
              timelineKindFilter={timelineKindFilter}
            />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
