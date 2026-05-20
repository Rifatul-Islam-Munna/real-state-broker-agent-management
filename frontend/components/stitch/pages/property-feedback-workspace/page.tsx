"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import {
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
  useSavePropertyVisitFeedback,
  useShowingBookings,
  useShowingFeedbackRequests,
  useUpdatePropertyFeedbackSettings,
} from "@/hooks/use-real-estate-api"

import { FeedbackSettingsCard } from "./settings-card"
import { ImportsTab } from "./imports-tab"
import { ManualFeedbackTab } from "./manual-feedback-tab"
import { RequestsTab } from "./requests-tab"
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
  scheduledAt: null,
  createdBy: "Admin",
}

export function PropertyFeedbackWorkspacePage() {
  const pathname = usePathname()
  const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"
  const [activeTab, setActiveTab] = useState<FeedbackTab>("manual")
  const [settingsDraft, setSettingsDraft] = useState<PropertyFeedbackAutomationSettings | null>(null)
  const [manualForm, setManualForm] = useState<SavePropertyVisitFeedbackInput>({ ...defaultFeedbackForm, createdBy })
  const [requestForm, setRequestForm] = useState<CreateShowingFeedbackRequestInput>({ ...defaultRequestForm, createdBy })
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
  const saveSettingsMutation = useUpdatePropertyFeedbackSettings()
  const saveFeedbackMutation = useSavePropertyVisitFeedback()
  const createRequestMutation = useCreateShowingFeedbackRequest()
  const importShowingsMutation = useImportPropertyShowings()
  const importFeedbackMutation = useImportPropertyFeedback()

  const properties = propertiesQuery.data?.items ?? []
  const leads = leadsQuery.data?.items ?? []
  const showings = showingsQuery.data?.items ?? []
  const requests = requestsQuery.data ?? []
  const feedbackEntries = feedbackEntriesQuery.data ?? []

  const resolvedSettings = settingsDraft ?? settingsQuery.data ?? null

  useEffect(() => {
    if (settingsQuery.data && !settingsDraft) {
      setSettingsDraft(settingsQuery.data)
    }
  }, [settingsDraft, settingsQuery.data])

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(27,94,138,0.08),transparent_30%),linear-gradient(180deg,#f7f5f1,#f5f3ee)] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <PropertyFeedbackWorkspaceHeader
          feedbackCount={feedbackEntries.length}
          pendingCount={requests.filter((item) => item.status === "Pending" || item.status === "Sent").length}
          propertyCount={properties.length}
        />

        {resolvedSettings ? (
          <FeedbackSettingsCard
            isSaving={saveSettingsMutation.isPending}
            onChange={setSettingsDraft}
            onSave={handleSaveSettings}
            settings={resolvedSettings}
          />
        ) : null}

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
          />
        ) : null}
      </div>
    </main>
  )
}
