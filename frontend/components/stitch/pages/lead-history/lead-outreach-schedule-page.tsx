"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import type { DealStage, LeadHistoryStatus, LeadOutreachScheduleItem, LeadStage } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
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
import { cn } from "@/lib/utils"
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
  void leadStagePreviewItems
  void dealStagePreview
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
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Lead Outreach Management</h1>
            <p className="mt-2 text-base text-[var(--ether-on-surface-variant)]">Track and coordinate high-velocity lead outreach from a unified command center.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="h-11 rounded-lg border-[var(--ether-primary)] bg-[var(--ether-primary-fixed)] px-5 font-semibold text-[var(--ether-primary)]" render={<Link href="/dashboard/mail" />} variant="outline">Open Mail</Button>
            <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)] hover:bg-[var(--ether-primary-container)]" onClick={() => setComposerOpen(true)} type="button"><AppIcon name="add" /> New Outreach</Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <ActionMetric icon="schedule" label="Scheduled now" value={actionCounts.scheduled} tone="primary" />
          <ActionMetric icon="check_circle" label="Sent / completed" value={actionCounts.completed} tone="secondary" />
          <ActionMetric icon="error" label="Paused / failed" value={actionCounts.cancelled} tone="tertiary" />
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <AppIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
              <Input className="h-12 rounded-xl border-[var(--ether-outline-variant)] bg-white pl-11 shadow-none" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search people, email, phone, message..." value={searchTerm} />
            </div>
            <Select modal={false} onValueChange={(value) => setStageFilter(value === "all" ? "" : (value as LeadStage))} value={stageFilter || "all"}><SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-44"><span>{stageFilter ? formatLeadStage(stageFilter) : "Lead Stage"}</span></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All stages</SelectItem>{leadStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{formatLeadStage(stage)}</SelectItem>)}</SelectGroup></SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setKindFilter(value === "all" ? "" : (value as OutreachKind))} value={kindFilter || "all"}><SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-40"><span>{kindFilter ? formatKindLabel(kindFilter) : "Channel"}</span></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All channels</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Sms">SMS</SelectItem><SelectItem value="Call">Call</SelectItem></SelectGroup></SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setStatusFilter(value === "all" ? "" : (value as LeadHistoryStatus))} value={statusFilter || "all"}><SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-40"><span>{statusFilter || "Status"}</span></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All states</SelectItem>{["Scheduled","Sent","Completed","Received","Failed"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectGroup></SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setFollowUpFilter(value === "all" ? "" : (value as FollowUpFilter))} value={followUpFilter || "all"}><SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-40"><span>{followUpFilter || "Follow-up"}</span></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All follow-up</SelectItem><SelectItem value="Direct">Direct only</SelectItem><SelectItem value="FollowUp">Follow-up only</SelectItem></SelectGroup></SelectContent></Select>
          </div>

          <div className="overflow-x-auto">
            {scheduleQuery.isLoading ? <div className="p-10 text-center text-sm font-semibold text-[var(--ether-outline)]">Loading schedule...</div> : scheduleQuery.error ? <div className="m-6 rounded-xl bg-[var(--ether-error-container)] p-4 text-sm font-semibold text-[var(--ether-error)]">{scheduleQuery.error.message}</div> : filteredSchedule.length === 0 ? <div className="p-10 text-center text-sm font-semibold text-[var(--ether-outline)]">No lead activity matches the current filters.</div> : (
              <Table className="min-w-[1180px]">
                <TableHeader><TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)]"><TableHead className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Lead / Property</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Channel</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">State</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Follow-up</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">When</TableHead><TableHead className="pr-6 text-right ether-label-caps text-[var(--ether-on-surface-variant)]">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{paginatedSchedule.map((entry, index) => { const isFollowUp = isFollowUpScheduleEntry(entry); const initials = displayText(entry.leadName, `Lead #${entry.leadId}`).split(" ").filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase(); return <TableRow className="border-0 transition hover:bg-[var(--ether-surface-container-low)]" key={`${entry.id}-${entry.updatedAt}`}><TableCell className="px-6 py-5"><div className="flex items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", index % 3 === 0 ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : index % 3 === 1 ? "bg-[var(--ether-secondary-container)] text-[var(--ether-on-secondary-container)]" : "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-tertiary)]")}>{initials || "LD"}</span><div className="min-w-0"><p className="font-bold text-[var(--ether-on-surface)]">{displayText(entry.leadName, `Lead #${entry.leadId}`)}</p><p className="mt-1 max-w-64 truncate text-xs text-[var(--ether-on-surface-variant)]">{displayText(entry.leadProperty, "No property linked")} ? {displayText(entry.leadEmail || entry.leadPhone, "No contact")}</p><div className="mt-2 flex flex-wrap gap-1">{entry.leadStage ? <Badge className="rounded-md border-0 bg-[var(--ether-surface-container-high)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-on-surface-variant)]">{formatLeadStage(entry.leadStage as LeadStage)}</Badge> : null}{entry.leadPriority ? <Badge className="rounded-md border-0 bg-[var(--ether-primary-fixed)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-primary)]">{entry.leadPriority}</Badge> : null}</div></div></div></TableCell><TableCell><Badge className="rounded-full border-0 bg-[var(--ether-surface-container-high)] px-3 py-1.5 text-xs font-semibold text-[var(--ether-on-surface-variant)]">{formatKindLabel(entry.kind)}</Badge></TableCell><TableCell><Badge className={cn("rounded-full border-0 px-3 py-1.5 text-xs font-semibold", entry.status === "Failed" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : entry.status === "Scheduled" ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]")}>{entry.status}</Badge></TableCell><TableCell className="text-sm italic text-[var(--ether-on-surface-variant)]">{isFollowUp ? "Automated Follow-up" : "Direct Outreach"}</TableCell><TableCell className="min-w-48"><p className="font-semibold text-[var(--ether-on-surface)]">{entry.scheduledAt ? formatDateTimeLabel(entry.scheduledAt) : entry.occurredAt ? formatDateTimeLabel(entry.occurredAt) : "Pending review"}</p><p className="mt-1 text-xs text-[var(--ether-outline)]">Saved: {formatDateTimeLabel(entry.createdAt)}</p></TableCell><TableCell className="pr-6"><div className="flex flex-wrap justify-end gap-2"><Button className="h-9 rounded-lg px-3 text-xs font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" render={<Link href={buildHistoryHref(pathname, entry.leadId)} />} variant="ghost"><AppIcon name="timeline" /> History</Button><Button className="h-9 rounded-lg px-3 text-xs font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => setSelectedDetail(entry)} type="button" variant="ghost"><AppIcon name="visibility" /> Details</Button><Button className="h-9 rounded-lg px-3 text-xs font-semibold text-[var(--ether-on-surface-variant)] hover:bg-amber-100 hover:text-amber-700" disabled={entry.status !== "Scheduled" || scheduleStatusMutation.isPending} onClick={() => void scheduleStatusMutation.mutateAsync({ id: entry.id, status: "paused" })} type="button" variant="ghost"><AppIcon name="pause_circle" /> Pause</Button><Button className="h-9 rounded-lg px-3 text-xs font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] hover:text-[var(--ether-secondary)]" disabled={entry.status === "Scheduled" || !entry.scheduledAt || scheduleStatusMutation.isPending} onClick={() => void scheduleStatusMutation.mutateAsync({ id: entry.id, status: "active" })} type="button" variant="ghost"><AppIcon name="play_circle" /> Resume</Button></div></TableCell></TableRow>})}</TableBody>
              </Table>
            )}
          </div>
          {filteredSchedule.length > 0 ? <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[var(--ether-on-surface-variant)]">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredSchedule.length)} of {filteredSchedule.length}</p><div className="flex items-center gap-2"><Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} size="sm" variant="outline">Previous</Button><span className="text-sm font-semibold">Page {page} of {totalPages}</span><Button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} size="sm" variant="outline">Next</Button></div></div> : null}
        </section>

        <Sheet open={composerOpen} onOpenChange={setComposerOpen}>
          <SheetContent className="!w-full overflow-hidden border-0 bg-[var(--ether-surface)] p-0 shadow-[-20px_0_60px_rgba(11,28,48,0.16)] sm:!max-w-none lg:!w-[44vw] lg:!max-w-[44vw]" side="right">
            <SheetHeader className="bg-white px-6 pb-5 pt-6 text-left"><SheetTitle className="text-2xl font-bold tracking-[-0.02em]">New Outreach</SheetTitle><SheetDescription>Send now or schedule email plus SMS/MMS from one place.</SheetDescription></SheetHeader>
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
              <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]"><h3 className="ether-headline-sm">Audience</h3><div className="mt-4 grid gap-2 sm:grid-cols-3">{[{icon:"person",label:"Single Lead",value:"SingleLead" as const},{icon:"group",label:"Lead Stage",value:"LeadStage" as const},{icon:"contract",label:"Deal Stage",value:"DealStage" as const}].map((option) => <Button className={cn("rounded-lg", composer.audienceType === option.value ? "bg-[var(--ether-primary)] text-white" : "bg-[var(--ether-surface-container-low)] text-[var(--ether-on-surface-variant)]")} key={option.value} onClick={() => updateComposer({ audienceType: option.value })} type="button" variant="ghost"><AppIcon name={option.icon} />{option.label}</Button>)}</div></section>
              <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
                {composer.audienceType === "SingleLead" ? <div className="space-y-3"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Lead</label><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search name, email, phone, property" value={leadSearch} /><Select modal={false} onValueChange={(value) => updateComposer({ leadId: value === "none" ? "" : value })} value={composer.leadId || "none"}><SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)]"><span>{selectedLead ? displayText(selectedLead.name, `Lead #${selectedLead.id}`) : "Choose a lead"}</span></SelectTrigger><SelectContent><SelectItem value="none">Choose a lead</SelectItem>{filteredLeadOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{`${displayText(item.name, `Lead #${item.id}`)} - ${displayText(item.phone || item.email, "No contact")}`}</SelectItem>)}</SelectContent></Select></div> : null}
                {composer.audienceType === "LeadStage" ? <Select modal={false} onValueChange={(value) => updateComposer({ leadStage: value === "none" ? "" : (value as LeadStage) })} value={composer.leadStage || "none"}><SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)]"><span>{composer.leadStage ? formatLeadStage(composer.leadStage) : "Choose a lead stage"}</span></SelectTrigger><SelectContent><SelectItem value="none">Choose a lead stage</SelectItem>{leadStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{formatLeadStage(stage)}</SelectItem>)}</SelectContent></Select> : null}
                {composer.audienceType === "DealStage" ? <Select modal={false} onValueChange={(value) => updateComposer({ dealStage: value === "none" ? "" : (value as DealStage) })} value={composer.dealStage || "none"}><SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)]"><span>{composer.dealStage ? formatDealStage(composer.dealStage) : "Choose a deal stage"}</span></SelectTrigger><SelectContent><SelectItem value="none">Choose a deal stage</SelectItem>{dealStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{formatDealStage(stage)}</SelectItem>)}</SelectContent></Select> : null}
              </section>
              <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]"><div className="grid gap-4 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-lg bg-[var(--ether-surface-container-low)] p-3 text-sm font-semibold"><Checkbox checked={composer.sendEmail} onCheckedChange={(checked) => updateComposer({ sendEmail: checked === true })} />Email</label><label className="flex items-center gap-3 rounded-lg bg-[var(--ether-surface-container-low)] p-3 text-sm font-semibold"><Checkbox checked={composer.sendSms} onCheckedChange={(checked) => updateComposer({ sendSms: checked === true })} />SMS / MMS</label></div><div className="mt-4 grid gap-4"><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateComposer({ scheduledAt: event.target.value })} type="datetime-local" value={composer.scheduledAt} /><Select modal={false} onValueChange={(value) => { const nextTemplateId = value === "none" ? "" : value; const template = availableTemplates.find((item) => item.id === nextTemplateId); updateComposer({ sendEmail: template ? template.channels.includes("Email") : composer.sendEmail, sendSms: template ? template.channels.includes("SMS") : composer.sendSms, templateId: nextTemplateId, title: template ? resolveTemplateTokens(template.subject, selectedLead) : composer.title, message: template ? resolveTemplateTokens(template.body, selectedLead) : composer.message }) }} value={composer.templateId || "none"}><SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)]"><span>{composer.templateId ? availableTemplates.find((item) => item.id === composer.templateId)?.name ?? "Template" : "No template"}</span></SelectTrigger><SelectContent><SelectItem value="none">No template</SelectItem>{availableTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>{composer.sendEmail ? <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateComposer({ title: event.target.value })} placeholder="Email subject" value={composer.title} /> : null}{composer.sendSms ? <Textarea className="min-h-20 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateComposer({ mediaUrls: event.target.value })} placeholder="MMS attachment URLs" value={composer.mediaUrls} /> : null}<Textarea className="min-h-40 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateComposer({ message: event.target.value })} placeholder="Write the email/SMS message" value={composer.message} /></div></section>
              {submitError ? <div className="rounded-xl bg-[var(--ether-error-container)] p-4 text-sm font-semibold text-[var(--ether-error)]">{submitError}</div> : null}{submitFeedback ? <div className={cn("rounded-xl p-4 text-sm", submitFeedback.tone === "warning" ? "bg-amber-100 text-amber-800" : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]")}>{submitFeedback.message}</div> : null}
            </div>
            <SheetFooter className="bg-white px-6 py-4 shadow-[0_-10px_30px_rgba(11,28,48,0.06)]"><Button className="h-11 w-full rounded-lg bg-[var(--ether-primary)] font-semibold text-white" disabled={isSaving} onClick={() => void handleSaveSchedule()} type="button"><AppIcon name="calendar_today" />{isSaving ? "Saving..." : composer.scheduledAt ? "Schedule Outreach" : "Send Outreach"}</Button></SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={selectedDetail !== null} onOpenChange={(open) => !open && setSelectedDetail(null)}>
          <SheetContent className="w-full border-0 bg-[var(--ether-surface)] p-0 sm:max-w-[40rem]"><SheetHeader className="bg-white px-6 py-6 text-left"><SheetTitle className="text-2xl font-bold">Activity Details</SheetTitle><SheetDescription>{selectedDetail ? `${displayText(selectedDetail.leadName, `Lead #${selectedDetail.leadId}`)} ? ${formatKindLabel(selectedDetail.kind)}` : ""}</SheetDescription></SheetHeader>{selectedDetail ? <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6"><div className="grid grid-cols-2 gap-3"><DetailPill label="State" value={selectedDetail.status} /><DetailPill label="Stage" value={selectedDetail.leadStage ? formatLeadStage(selectedDetail.leadStage as LeadStage) : "No stage"} /><DetailPill label="Channel" value={formatKindLabel(selectedDetail.kind)} /><DetailPill label="Type" value={isFollowUpScheduleEntry(selectedDetail) ? "Follow-up" : "Direct / reply"} /></div><div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]"><p className="ether-label-caps text-[var(--ether-outline)]">Contact</p><p className="mt-3 font-bold">{displayText(selectedDetail.leadName, `Lead #${selectedDetail.leadId}`)}</p><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{displayText(selectedDetail.leadEmail)}</p><p className="text-sm text-[var(--ether-on-surface-variant)]">{displayText(selectedDetail.leadPhone)}</p><p className="mt-3 text-sm font-semibold">{displayText(selectedDetail.leadProperty, "No property linked")}</p></div><div className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]"><p className="ether-label-caps text-[var(--ether-outline)]">Message / Reply</p><p className="mt-3 font-bold">{displayText(selectedDetail.title, "Untitled")}</p><p className="mt-2 text-sm text-[var(--ether-on-surface-variant)]">{displayText(selectedDetail.summary, "No summary")}</p><div className="mt-3 whitespace-pre-wrap rounded-xl bg-[var(--ether-surface-container-low)] p-4 text-sm leading-6">{displayText(selectedDetail.body, "No message body saved.")}</div></div><div className="rounded-[24px] bg-white p-5 text-sm shadow-[var(--shadow-surface-1)]"><p className="ether-label-caps text-[var(--ether-outline)]">Timing</p>{selectedDetail.scheduledAt ? <p className="mt-3">Scheduled: {formatDateTimeLabel(selectedDetail.scheduledAt)}</p> : null}{selectedDetail.occurredAt ? <p className="mt-2">Occurred: {formatDateTimeLabel(selectedDetail.occurredAt)}</p> : null}<p className="mt-2">Saved: {formatDateTimeLabel(selectedDetail.createdAt)}</p></div></div> : null}<SheetFooter className="bg-white px-6 py-4"><Button className="w-full" render={selectedDetail ? <Link href={buildHistoryHref(pathname, selectedDetail.leadId)} /> : <span />} variant="outline">Open full lead history</Button></SheetFooter></SheetContent>
        </Sheet>
      </div>
    </main>
  )
}

function ActionMetric({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: "primary" | "secondary" | "tertiary" }) {
  const toneClass = tone === "secondary" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  const bars = [28, 48, 36, 60, 42, 72, 50]
  return (
    <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex size-12 items-center justify-center rounded-2xl ${toneClass}`}><AppIcon name={icon} /></span>
        <div className="text-right"><p className="ether-label-caps text-[var(--ether-on-surface-variant)]">{label}</p><p className={cn("ether-numeric-lg mt-2", tone === "secondary" ? "text-[var(--ether-secondary)]" : tone === "tertiary" ? "text-[var(--ether-error)]" : "text-[var(--ether-primary)]")}>{value.toLocaleString("en-US")}</p></div>
      </div>
      <div className="mt-6 flex h-8 items-end gap-1.5">{bars.map((height, index) => <span className={cn("flex-1 rounded-t", tone === "secondary" ? "bg-[var(--ether-secondary)]/25" : tone === "tertiary" ? "bg-[var(--ether-error)]/18" : "bg-[var(--ether-primary)]/18", index === 5 && (tone === "secondary" ? "bg-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error)]" : "bg-[var(--ether-primary)]"))} key={index} style={{ height: `${height}%` }} />)}</div>
    </article>
  )
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-surface-1)]">
      <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--ether-on-surface)]">{value}</p>
    </div>
  )
}
