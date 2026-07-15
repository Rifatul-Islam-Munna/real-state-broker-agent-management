"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import type { DealStage, LeadHistoryStatus, LeadOutreachScheduleItem, LeadStage } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDeals, useLeads } from "@/hooks/use-real-estate-api"
import {
  useDispatchBulkLeadOutreach,
  useDispatchLeadOutreach,
  useLeadOutreachSchedule,
  useLeadOutreachTemplates,
  useUpdateLeadOutreachScheduleStatus,
} from "@/hooks/use-lead-outreach-api"
import {
  dealStageOrder,
  formatDateTimeLabel,
  formatDealStage,
  formatLeadStage,
  leadStageOrder,
} from "@/lib/admin-portal"

type ComposerAudienceType = "SingleLead" | "LeadStage" | "DealStage"
type OutreachKind = "Email" | "Sms" | "Call"
type FollowUpFilter = "" | "Direct" | "FollowUp"

type ComposerState = {
  audienceType: ComposerAudienceType
  leadId: string
  leadStage: "" | LeadStage
  dealStage: "" | DealStage
  sendEmail: boolean
  sendSms: boolean
  title: string
  message: string
  mediaUrls: string
  scheduledAt: string
  templateId: string
}

type SubmitFeedback = {
  details: string[]
  message: string
  tone: "success" | "warning"
}

function displayText(value?: string | null, fallback = "Not set") {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : fallback
}

function buildHistoryHref(pathname: string, leadId: number) {
  return `/dashboard/lead-history?leadId=${leadId}`
}

function formatRecipientCount(count: number) {
  return `${count} recipient${count === 1 ? "" : "s"}`
}

function resolveTemplateTokens(templateText: string, lead?: { name?: string | null; property?: string | null; agent?: string | null; timeline?: string | null } | null) {
  const replacements: Record<string, string> = {
    "{{client_name}}": lead?.name || "Client",
    "{{property_address}}": lead?.property || "the property",
    "{{agent_name}}": lead?.agent || "our agent",
    "{{agency_name}}": "EstateBlue",
    "{{showing_time}}": lead?.timeline || "the requested time",
    "{{closing_date}}": lead?.timeline || "the scheduled date",
  }

  return Object.entries(replacements).reduce((current, [token, value]) => current.replaceAll(token, value), templateText)
}

function isFollowUpScheduleEntry(entry: { body?: string | null; createdBy?: string | null; provider?: string | null; summary?: string | null; title?: string | null }) {
  return [entry.title, entry.summary, entry.body, entry.provider, entry.createdBy]
    .some((value) => /follow[-\s]?up/i.test(`${value ?? ""}`))
}

function formatKindLabel(kind: string) {
  if (kind === "MailInbox") return "Email reply"
  return kind === "Sms" ? "SMS" : kind
}

export function LeadOutreachSchedulePage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawLeadId = searchParams.get("leadId")
  const selectedLeadId = rawLeadId ? Number(rawLeadId) : NaN
  const [kindFilter, setKindFilter] = useState<"" | OutreachKind>("")
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("")
  const [composerOpen, setComposerOpen] = useState(false)
  const [leadSearch, setLeadSearch] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDetail, setSelectedDetail] = useState<LeadOutreachScheduleItem | null>(null)
  const [stageFilter, setStageFilter] = useState<"" | LeadStage>("")
  const [statusFilter, setStatusFilter] = useState<"" | LeadHistoryStatus>("")
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [composer, setComposer] = useState<ComposerState>({
    audienceType: "SingleLead",
    leadId: Number.isFinite(selectedLeadId) ? String(selectedLeadId) : "",
    leadStage: "",
    dealStage: "",
    sendEmail: true,
    sendSms: false,
    title: "",
    message: "",
    mediaUrls: "",
    scheduledAt: "",
    templateId: "",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null)

  const leadsQuery = useLeads({ page: 1, pageSize: 200 })
  const leadStagePreviewQuery = useLeads({
    page: 1,
    pageSize: composer.audienceType === "LeadStage" ? 200 : 1,
    stage: composer.audienceType === "LeadStage" ? composer.leadStage || undefined : undefined,
  })
  const dealStagePreviewQuery = useDeals({
    page: 1,
    pageSize: composer.audienceType === "DealStage" ? 200 : 1,
    stage: composer.audienceType === "DealStage" ? composer.dealStage || undefined : undefined,
  })
  const scheduleQuery = useLeadOutreachSchedule({
    kind: kindFilter || undefined,
    status: statusFilter || undefined,
  })
  const templatesQuery = useLeadOutreachTemplates()
  const dispatchMutation = useDispatchLeadOutreach()
  const bulkDispatchMutation = useDispatchBulkLeadOutreach()
  const scheduleStatusMutation = useUpdateLeadOutreachScheduleStatus()

  const leadOptions = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items])
  const filteredLeadOptions = useMemo(() => {
    const term = leadSearch.trim().toLowerCase()
    if (!term) return leadOptions
    return leadOptions.filter((lead) =>
      [lead.name, lead.email, lead.phone, lead.property].some((value) => `${value ?? ""}`.toLowerCase().includes(term)),
    )
  }, [leadOptions, leadSearch])
  const selectedLead = useMemo(
    () => leadOptions.find((item) => String(item.id) === composer.leadId) ?? null,
    [composer.leadId, leadOptions],
  )
  const availableTemplates = useMemo(() => {
    const templates = templatesQuery.data ?? []
    return templates.filter(
      (template) =>
        template.isActive !== false
        && template.audience !== "Realtor"
        && template.channels.some((channel) => channel === "Email" || channel === "SMS"),
    )
  }, [templatesQuery.data])
  const leadStagePreviewItems = useMemo(
    () => leadStagePreviewQuery.data?.items ?? [],
    [leadStagePreviewQuery.data?.items],
  )
  const dealStagePreview = useMemo(() => {
    const items = dealStagePreviewQuery.data?.items ?? []
    const leadMap = new Map<number, string>()

    items.forEach((item) => {
      if (!item.sourceLeadId || leadMap.has(item.sourceLeadId)) {
        return
      }

      leadMap.set(item.sourceLeadId, displayText(item.sourceLeadName, `Lead #${item.sourceLeadId}`))
    })

    return {
      linkedLeadCount: leadMap.size,
      previewLeadNames: Array.from(leadMap.values()).slice(0, 4),
      totalDeals: dealStagePreviewQuery.data?.totalCount ?? 0,
      truncated: (dealStagePreviewQuery.data?.totalCount ?? 0) > items.length,
    }
  }, [dealStagePreviewQuery.data?.items, dealStagePreviewQuery.data?.totalCount])
  const isSaving = dispatchMutation.isPending || bulkDispatchMutation.isPending
  const filteredSchedule = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const rows = scheduleQuery.data ?? []
    return rows.filter((entry) => {
      const isFollowUp = isFollowUpScheduleEntry(entry)

      if (followUpFilter === "FollowUp" && !isFollowUp) return false
      if (followUpFilter === "Direct" && isFollowUp) return false
      if (stageFilter && entry.leadStage !== stageFilter) return false
      if (!term) return true

      return [
        entry.leadName,
        entry.leadEmail,
        entry.leadPhone,
        entry.leadProperty,
        entry.title,
        entry.summary,
        entry.body,
        entry.status,
        entry.kind,
      ].some((value) => `${value ?? ""}`.toLowerCase().includes(term))
    })
  }, [followUpFilter, scheduleQuery.data, searchTerm, stageFilter])
  const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / pageSize))
  const paginatedSchedule = useMemo(() => filteredSchedule.slice((page - 1) * pageSize, page * pageSize), [filteredSchedule, page])
  const actionCounts = useMemo(
    () => ({
      cancelled: filteredSchedule.filter((entry) => entry.status === "Failed").length,
      completed: filteredSchedule.filter((entry) => entry.status === "Completed" || entry.status === "Sent").length,
      scheduled: filteredSchedule.filter((entry) => entry.status === "Scheduled").length,
    }),
    [filteredSchedule],
  )
  const stageActivity = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of scheduleQuery.data ?? []) {
      const key = entry.leadStage || "No stage"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
  }, [scheduleQuery.data])

  function updateComposer(patch: Partial<ComposerState>) {
    setSubmitError(null)
    setSubmitFeedback(null)
    setComposer((current) => ({ ...current, ...patch }))
  }

  async function handleSaveSchedule() {
    if (composer.audienceType === "SingleLead" && !composer.leadId) {
      setSubmitError("Choose a lead first.")
      return
    }

    if (composer.audienceType === "LeadStage" && !composer.leadStage) {
      setSubmitError("Choose a lead stage first.")
      return
    }

    if (composer.audienceType === "DealStage" && !composer.dealStage) {
      setSubmitError("Choose a deal stage first.")
      return
    }

    if (!composer.sendEmail && !composer.sendSms) {
      setSubmitError("Choose email, SMS, or both.")
      return
    }

    if (composer.sendEmail && composer.title.trim().length < 3) {
      setSubmitError("Email subject is required.")
      return
    }

    if (composer.message.trim().length < 5) {
      setSubmitError("Message must be at least 5 characters.")
      return
    }

    setSubmitError(null)
    setSubmitFeedback(null)

    const createdBy = pathname.startsWith("/dashboard") ? "Dashboard" : "Admin"
    const mediaUrls = composer.mediaUrls
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    const selectedKinds: Array<"Email" | "Sms"> = [
      composer.sendEmail ? "Email" : null,
      composer.sendSms ? "Sms" : null,
    ].filter((item): item is "Email" | "Sms" => Boolean(item))
    const titleForKind = (kind: "Email" | "Sms") => kind === "Email" ? composer.title.trim() : composer.title.trim() || "SMS follow-up"

    if (composer.audienceType === "SingleLead") {
      const responses = await Promise.all(selectedKinds.map((kind) =>
        dispatchMutation.mutateAsync({
          leadId: Number(composer.leadId),
          kind,
          title: titleForKind(kind),
          message: composer.message.trim(),
          mediaUrls: kind === "Sms" ? mediaUrls : undefined,
          scheduledAt: composer.scheduledAt,
          createdBy,
          templateId: composer.templateId || undefined,
        }),
      ))

      const failed = responses.find((response) => response.error)
      if (failed) {
        setSubmitError(failed.error?.message || "Unable to save the schedule item.")
        return
      }

      setSubmitFeedback({
        details: [],
        message: `Saved ${selectedKinds.map((kind) => kind === "Sms" ? "SMS" : "email").join(" + ")} outreach for ${displayText(selectedLead?.name, "the selected lead")}.`,
        tone: "success",
      })
      setComposer((current) => ({
        ...current,
        title: "",
        message: "",
        mediaUrls: "",
        scheduledAt: "",
      }))
      setComposerOpen(false)
      return
    }

    const responses = await Promise.all(selectedKinds.map((kind) =>
      bulkDispatchMutation.mutateAsync({
        audienceType: composer.audienceType,
        leadStage: composer.audienceType === "LeadStage" ? composer.leadStage || null : null,
        dealStage: composer.audienceType === "DealStage" ? composer.dealStage || null : null,
        kind,
        title: titleForKind(kind),
        message: composer.message.trim(),
        mediaUrls: kind === "Sms" ? mediaUrls : undefined,
        scheduledAt: composer.scheduledAt,
        createdBy,
        templateId: composer.templateId || undefined,
      }),
    ))

    const failed = responses.find((response) => response.error)
    if (failed) {
      setSubmitError(failed.error?.message || "Unable to save the bulk schedule items.")
      return
    }

    const results = responses.map((response) => response.data).filter(Boolean)
    if (results.length === 0) {
      setSubmitError("Unable to save the bulk schedule items.")
      return
    }

    const failures = results.flatMap((result) => result?.failures ?? [])
    const detailLines = failures.slice(0, 3)
    if (failures.length > detailLines.length) {
      detailLines.push(`+${failures.length - detailLines.length} more failure(s)`)
    }

    const summaryParts = [
      `Saved ${formatRecipientCount(results.reduce((sum, result) => sum + (result?.savedCount ?? 0), 0))}.`,
      failures.length > 0 ? `${failures.length} failed.` : null,
    ].filter(Boolean)

    setSubmitFeedback({
      details: detailLines,
      message: summaryParts.join(" "),
      tone: failures.length > 0 ? "warning" : "success",
    })
    setComposer((current) => ({
      ...current,
      title: "",
      message: "",
      mediaUrls: "",
      scheduledAt: "",
    }))
    setComposerOpen(false)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{"Lead Activity"}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{"Lead Email, SMS & Call Table"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {"Track every sent, scheduled, failed, and received lead outreach item from one searchable table."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href="/dashboard/mail" />} variant="outline">
            {"Open Mail"}
          </Button>
          <Button render={<Link href="/dashboard/leads" />}>
            {"Back To Lead CRM"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <CardTitle>{"Outreach Composer"}</CardTitle>
              <CardDescription>{"Open a flexible sheet to send or schedule email, SMS, or MMS for one lead, a lead stage, or a deal stage."}</CardDescription>
            </div>
            <Button onClick={() => setComposerOpen(true)} type="button">
              <AppIcon data-icon="inline-start" name="add" />
              {"New Outreach"}
            </Button>
          </CardHeader>
        </Card>
        <section className="grid gap-3 md:grid-cols-3">
          <ActionMetric icon="calendar_today" label="Scheduled now" value={actionCounts.scheduled} />
          <ActionMetric icon="done" label="Sent / completed" value={actionCounts.completed} />
          <ActionMetric icon="event_busy" label="Paused / canceled / failed" value={actionCounts.cancelled} />
        </section>
        <Card className="shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{"Stage activity"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{"Send batch outreach from New Outreach -> Lead Stage. Replies appear here and stop pending automation."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {stageActivity.length ? stageActivity.map(([stage, count]) => (
                <Badge key={stage} variant="outline">
                  {stage === "No stage" ? stage : formatLeadStage(stage as LeadStage)}: {count}
                </Badge>
              )) : <Badge variant="outline">{"No activity yet"}</Badge>}
            </div>
          </CardContent>
        </Card>
        <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
          <SheetContent className="!w-[100vw] overflow-hidden p-0 sm:!max-w-none md:!w-[60vw] xl:!w-[50vw]" side="right">
            <SheetHeader className="border-b pr-12">
              <SheetTitle>{"New Outreach"}</SheetTitle>
              <SheetDescription>{"Send now or schedule email plus SMS/MMS from one place."}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Audience"}</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: "person", label: "Single Lead", value: "SingleLead" as const },
                  { icon: "group", label: "Lead Stage", value: "LeadStage" as const },
                  { icon: "contract", label: "Deal Stage", value: "DealStage" as const },
                ].map((option) => {
                  const isActive = composer.audienceType === option.value

                  return (
                    <Button
                      key={option.value}
                      onClick={() => updateComposer({ audienceType: option.value })}
                      size="sm"
                      type="button"
                      variant={isActive ? "default" : "outline"}
                    >
                      <AppIcon data-icon="inline-start" name={option.icon} />
                      <span>{option.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {composer.audienceType === "SingleLead" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Lead"}</span>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <Input
                      onChange={(event) => setLeadSearch(event.target.value)}
                      placeholder="Search name, email, phone, property"
                      value={leadSearch}
                    />
                    <Select
                      modal={false}
                      onValueChange={(value) => updateComposer({ leadId: value === "none" ? "" : value })}
                      value={composer.leadId || "none"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">{"Choose a lead"}</SelectItem>
                          {filteredLeadOptions.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {`${displayText(item.name, `Lead #${item.id}`)} - ${displayText(item.phone || item.email, "No contact")}`}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </label>

                {selectedLead ? (
                  <Card className="bg-slate-50">
                    <CardContent className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Selected Lead"}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{displayText(selectedLead.name, `Lead #${selectedLead.id}`)}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {`Phone: ${displayText(selectedLead.phone)} | Email: ${displayText(selectedLead.email)}`}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : null}

            {composer.audienceType === "LeadStage" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Lead Stage"}</span>
                  <Select
                    modal={false}
                    onValueChange={(value) => updateComposer({ leadStage: value === "none" ? "" : (value as LeadStage) })}
                    value={composer.leadStage || "none"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a lead stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{"Choose a lead stage"}</SelectItem>
                        {leadStageOrder.map((stage) => (
                          <SelectItem key={stage} value={stage}>{formatLeadStage(stage)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>

                {composer.leadStage ? (
                  <Card className="border-sky-200 bg-sky-50">
                    <CardContent className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">{"Stage Preview"}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {`${leadStagePreviewQuery.data?.totalCount ?? 0} leads in ${formatLeadStage(composer.leadStage)}`}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {leadStagePreviewQuery.isLoading
                          ? "Loading matching leads..."
                          : leadStagePreviewItems.length > 0
                            ? `Examples: ${leadStagePreviewItems
                                .slice(0, 4)
                                .map((item) => displayText(item.name, `Lead #${item.id}`))
                                .join(", ")}`
                            : "No leads are currently in this stage."}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : null}

            {composer.audienceType === "DealStage" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Deal Stage"}</span>
                  <Select
                    modal={false}
                    onValueChange={(value) => updateComposer({ dealStage: value === "none" ? "" : (value as DealStage) })}
                    value={composer.dealStage || "none"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a deal stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{"Choose a deal stage"}</SelectItem>
                        {dealStageOrder.map((stage) => (
                          <SelectItem key={stage} value={stage}>{formatDealStage(stage)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>

                {composer.dealStage ? (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">{"Stage Preview"}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {`${dealStagePreview.totalDeals} deals in ${formatDealStage(composer.dealStage)}`}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {dealStagePreviewQuery.isLoading
                          ? "Loading matching deals..."
                          : dealStagePreview.linkedLeadCount > 0
                            ? dealStagePreview.truncated
                              ? `Showing ${dealStagePreview.linkedLeadCount} linked leads from the first 200 deals.`
                              : `${dealStagePreview.linkedLeadCount} linked leads can receive outreach.`
                            : "No linked leads were found in this deal stage yet."}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {dealStagePreview.previewLeadNames.length > 0
                          ? `Examples: ${dealStagePreview.previewLeadNames.join(", ")}`
                          : "Deals without a linked lead will be skipped automatically."}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Channels"}</span>
                <label className="flex items-center gap-2 rounded-lg border p-2.5 text-sm font-semibold">
                  <Checkbox
                    checked={composer.sendEmail}
                    onCheckedChange={(checked) => updateComposer({ sendEmail: checked === true })}
                  />
                  {"Email"}
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-2.5 text-sm font-semibold">
                  <Checkbox
                    checked={composer.sendSms}
                    onCheckedChange={(checked) => updateComposer({ sendSms: checked === true })}
                  />
                  {"SMS / MMS"}
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Scheduled Time"}</span>
                <Input
                  onChange={(event) => updateComposer({ scheduledAt: event.target.value })}
                  type="datetime-local"
                  value={composer.scheduledAt}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-700">
                  {"Template"}
                </div>
                <Select
                  modal={false}
                  onValueChange={(value) => {
                    const nextTemplateId = value === "none" ? "" : value
                    const template = availableTemplates.find((item) => item.id === nextTemplateId)
                    updateComposer({
                      sendEmail: template ? template.channels.includes("Email") : composer.sendEmail,
                      sendSms: template ? template.channels.includes("SMS") : composer.sendSms,
                      templateId: nextTemplateId,
                      title: template ? resolveTemplateTokens(template.subject, selectedLead) : composer.title,
                      message: template ? resolveTemplateTokens(template.body, selectedLead) : composer.message,
                    })
                  }}
                  value={composer.templateId || "none"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">{"No template"}</SelectItem>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{`${template.name} - ${template.sequenceType ?? "Direct"}`}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button render={<Link href="/dashboard/settings" />} size="sm" variant="outline">
                {"Manage Templates"}
              </Button>
            </div>

            {composer.sendEmail ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Email Subject"}</span>
                <Input
                  onChange={(event) => updateComposer({ title: event.target.value })}
                  placeholder="Viewing follow-up"
                  value={composer.title}
                />
              </label>
            ) : null}

            {composer.sendSms ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"MMS Attachment URLs"}</span>
                <Textarea
                  className="min-h-16 rounded-xl border-slate-200"
                  onChange={(event) => updateComposer({ mediaUrls: event.target.value })}
                  placeholder="One URL per line, or comma separated"
                  value={composer.mediaUrls}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Message"}</span>
              <Textarea
                className="min-h-28 rounded-xl border-slate-200"
                onChange={(event) => updateComposer({ message: event.target.value })}
                placeholder="Write the email/SMS message"
                value={composer.message}
              />
            </label>

            {submitError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {submitError}
              </div>
            ) : null}

            {submitFeedback ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  submitFeedback.tone === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <p className="font-semibold">{submitFeedback.message}</p>
                {submitFeedback.details.map((detail) => (
                  <p key={detail} className="mt-1 text-xs font-medium">
                    {detail}
                  </p>
                ))}
              </div>
            ) : null}

            </div>
            <SheetFooter className="border-t bg-background">
              <Button
                className="w-full"
                disabled={isSaving}
                onClick={() => void handleSaveSchedule()}
                type="button"
              >
                <AppIcon data-icon="inline-start" name="calendar_today" />
                {isSaving
                  ? "Saving..."
                  : composer.scheduledAt
                    ? "Schedule Outreach"
                    : "Send Outreach"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Sheet open={selectedDetail !== null} onOpenChange={(open) => !open && setSelectedDetail(null)}>
          <SheetContent className="sm:w-[34rem] sm:max-w-[34rem]">
            <SheetHeader className="border-b">
              <SheetTitle>{"Activity details"}</SheetTitle>
              <SheetDescription>
                {selectedDetail ? `${displayText(selectedDetail.leadName, `Lead #${selectedDetail.leadId}`)} - ${formatKindLabel(selectedDetail.kind)}` : ""}
              </SheetDescription>
            </SheetHeader>
            {selectedDetail ? (
              <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
                <div className="grid grid-cols-2 gap-2">
                  <DetailPill label="State" value={selectedDetail.status} />
                  <DetailPill label="Stage" value={selectedDetail.leadStage ? formatLeadStage(selectedDetail.leadStage as LeadStage) : "No stage"} />
                  <DetailPill label="Channel" value={formatKindLabel(selectedDetail.kind)} />
                  <DetailPill label="Type" value={isFollowUpScheduleEntry(selectedDetail) ? "Follow-up" : "Direct / reply"} />
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Contact"}</p>
                  <p className="mt-2 font-semibold">{displayText(selectedDetail.leadName, `Lead #${selectedDetail.leadId}`)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{displayText(selectedDetail.leadEmail)}</p>
                  <p className="text-sm text-muted-foreground">{displayText(selectedDetail.leadPhone)}</p>
                  <p className="mt-2 text-sm font-medium">{displayText(selectedDetail.leadProperty, "No property linked")}</p>
                </div>
                <div className="rounded-xl border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Message / reply"}</p>
                  <p className="mt-2 font-semibold">{displayText(selectedDetail.title, "Untitled")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{displayText(selectedDetail.summary, "No summary")}</p>
                  <div className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-6">
                    {displayText(selectedDetail.body, "No message body saved.")}
                  </div>
                </div>
                <div className="rounded-xl border bg-background p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Timing"}</p>
                  {selectedDetail.scheduledAt ? <p className="mt-2">{`Scheduled: ${formatDateTimeLabel(selectedDetail.scheduledAt)}`}</p> : null}
                  {selectedDetail.occurredAt ? <p className="mt-2">{`Occurred: ${formatDateTimeLabel(selectedDetail.occurredAt)}`}</p> : null}
                  <p className="mt-2">{`Saved: ${formatDateTimeLabel(selectedDetail.createdAt)}`}</p>
                  <p className="mt-2 text-muted-foreground">{`Provider: ${displayText(selectedDetail.provider)}`}</p>
                  <p className="mt-1 text-muted-foreground">{`Created by: ${displayText(selectedDetail.createdBy)}`}</p>
                </div>
              </div>
            ) : null}
            <SheetFooter className="border-t">
              {selectedDetail ? (
                <Button className="w-full" render={<Link href={buildHistoryHref(pathname, selectedDetail.leadId)} />} variant="outline">
                  {"Open full lead history"}
                </Button>
              ) : null}
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Card>
          <CardHeader className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200">
            <div>
              <CardTitle>{"Schedule Timeline"}</CardTitle>
              <CardDescription>
                {"This shows pending outreach first, then sent, completed, and failed items so you can see exactly what happened."}
              </CardDescription>
            </div>
            <div className="grid w-full gap-3 md:grid-cols-[minmax(220px,1fr)_150px_150px_170px_170px]">
              <Input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search people, email, phone, message..."
                value={searchTerm}
              />
              <Select modal={false} onValueChange={(value) => setKindFilter(value === "all" ? "" : (value as OutreachKind))} value={kindFilter || "all"}>
                <SelectTrigger><SelectValue placeholder="All channels" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{"All channels"}</SelectItem>
                    <SelectItem value="Email">{"Email"}</SelectItem>
                    <SelectItem value="Sms">{"SMS"}</SelectItem>
                    <SelectItem value="Call">{"Call"}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setStatusFilter(value === "all" ? "" : (value as LeadHistoryStatus))} value={statusFilter || "all"}>
                <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{"All states"}</SelectItem>
                    <SelectItem value="Scheduled">{"Scheduled"}</SelectItem>
                    <SelectItem value="Sent">{"Sent"}</SelectItem>
                    <SelectItem value="Completed">{"Completed"}</SelectItem>
                    <SelectItem value="Received">{"Received"}</SelectItem>
                    <SelectItem value="Failed">{"Failed"}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setStageFilter(value === "all" ? "" : (value as LeadStage))} value={stageFilter || "all"}>
                <SelectTrigger><SelectValue placeholder="All stages" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{"All stages"}</SelectItem>
                    {leadStageOrder.map((stage) => (
                      <SelectItem key={stage} value={stage}>{formatLeadStage(stage)}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setFollowUpFilter(value === "all" ? "" : (value as FollowUpFilter))} value={followUpFilter || "all"}>
                <SelectTrigger><SelectValue placeholder="All follow-up" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">{"All follow-up"}</SelectItem>
                    <SelectItem value="Direct">{"Direct only"}</SelectItem>
                    <SelectItem value="FollowUp">{"Follow-up only"}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">

          {scheduleQuery.isLoading ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">{"Loading schedule..."}</div>
          ) : scheduleQuery.error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {scheduleQuery.error.message}
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">{"No lead activity matches the current filters."}</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{"Lead / property"}</TableHead>
                    <TableHead>{"Channel"}</TableHead>
                    <TableHead>{"State"}</TableHead>
                    <TableHead>{"Follow-Up"}</TableHead>
                    <TableHead>{"When"}</TableHead>
                    <TableHead className="text-right">{"Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSchedule.map((entry) => {
                    const isFollowUp = isFollowUpScheduleEntry(entry)

                    return (
                      <TableRow key={`${entry.id}-${entry.updatedAt}`}>
                        <TableCell className="max-w-[220px]">
                          <p className="font-medium">{displayText(entry.leadName, `Lead #${entry.leadId}`)}</p>
                          <p className="truncate text-xs font-semibold text-foreground">{displayText(entry.leadProperty, "No property linked")}</p>
                          <p className="truncate text-muted-foreground">{displayText(entry.leadEmail)}</p>
                          <p className="text-muted-foreground">{displayText(entry.leadPhone)}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {entry.leadStage ? <Badge variant="outline">{formatLeadStage(entry.leadStage as LeadStage)}</Badge> : null}
                            {entry.leadPriority ? <Badge variant="secondary">{entry.leadPriority}</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatKindLabel(entry.kind)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "Failed" ? "destructive" : entry.status === "Scheduled" ? "outline" : "secondary"}>{entry.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isFollowUp ? "secondary" : "outline"}>{isFollowUp ? "Follow-up" : "Direct"}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[190px] text-muted-foreground">
                          <p className="max-w-[260px] truncate font-medium text-foreground">{entry.title}</p>
                          {entry.scheduledAt ? <p>{`Scheduled: ${formatDateTimeLabel(entry.scheduledAt)}`}</p> : null}
                          {entry.occurredAt ? <p>{`Occurred: ${formatDateTimeLabel(entry.occurredAt)}`}</p> : null}
                          <p>{`Saved: ${formatDateTimeLabel(entry.createdAt)}`}</p>
                        </TableCell>
                        <TableCell className="min-w-[320px] text-right">
                          <div className="flex flex-col items-end gap-2">
                            <div className="grid w-full grid-cols-2 gap-2">
                              <Button render={<Link href={buildHistoryHref(pathname, entry.leadId)} />} size="sm" variant="outline">
                                <AppIcon data-icon="inline-start" name="visibility" />
                                {"History"}
                              </Button>
                              <Button onClick={() => setSelectedDetail(entry)} size="sm" type="button" variant="outline">
                                <AppIcon data-icon="inline-start" name="description" />
                                {"Details"}
                              </Button>
                              <Button
                                disabled={entry.status === "Scheduled" || !entry.scheduledAt || scheduleStatusMutation.isPending}
                                onClick={() => void scheduleStatusMutation.mutateAsync({ id: entry.id, status: "active" })}
                                size="sm"
                                variant="outline"
                              >
                                <AppIcon data-icon="inline-start" name="rocket_launch" />
                                {"Resume"}
                              </Button>
                              <Button
                                disabled={entry.status !== "Scheduled" || scheduleStatusMutation.isPending}
                                onClick={() => void scheduleStatusMutation.mutateAsync({ id: entry.id, status: "paused" })}
                                size="sm"
                                variant="outline"
                              >
                                <AppIcon data-icon="inline-start" name="event_busy" />
                                {"Pause"}
                              </Button>
                              <Button
                                disabled={entry.status !== "Scheduled" || scheduleStatusMutation.isPending}
                                onClick={() => void scheduleStatusMutation.mutateAsync({ id: entry.id, status: "cancelled" })}
                                size="sm"
                                variant="destructive"
                              >
                                <AppIcon data-icon="inline-start" name="close" />
                                {"Cancel"}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {entry.status === "Scheduled"
                                ? "Pause or cancel before it sends."
                                : entry.scheduledAt
                                  ? "Resume only if this item still has a scheduled time."
                                  : "Sent items stay in history."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredSchedule.length > 0 ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredSchedule.length)} of {filteredSchedule.length}</p>
            <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="text-sm font-medium">Page {page} of {totalPages}</span><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button></div>
          </div> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ActionMetric({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
          <AppIcon name={icon} />
        </span>
      </CardContent>
    </Card>
  )
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
