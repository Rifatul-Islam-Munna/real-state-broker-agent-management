"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { DealStage, LeadHistoryStatus, LeadStage } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useDeals, useLeads } from "@/hooks/use-real-estate-api"
import {
  useDispatchBulkLeadOutreach,
  useDispatchLeadOutreach,
  useLeadOutreachSchedule,
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

type ComposerState = {
  audienceType: ComposerAudienceType
  leadId: string
  leadStage: "" | LeadStage
  dealStage: "" | DealStage
  kind: OutreachKind
  title: string
  message: string
  scheduledAt: string
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
  return pathname.startsWith("/agent")
    ? `/agent/lead?view=history&leadId=${leadId}`
    : `/admin/lead-history?leadId=${leadId}`
}

function formatRecipientCount(count: number) {
  return `${count} recipient${count === 1 ? "" : "s"}`
}

export function LeadOutreachSchedulePage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawLeadId = searchParams.get("leadId")
  const selectedLeadId = rawLeadId ? Number(rawLeadId) : NaN
  const [kindFilter, setKindFilter] = useState<"" | OutreachKind>("")
  const [statusFilter, setStatusFilter] = useState<"" | LeadHistoryStatus>("")
  const [composer, setComposer] = useState<ComposerState>({
    audienceType: "SingleLead",
    leadId: Number.isFinite(selectedLeadId) ? String(selectedLeadId) : "",
    leadStage: "",
    dealStage: "",
    kind: "Call",
    title: "",
    message: "",
    scheduledAt: "",
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
    leadId: Number.isFinite(selectedLeadId) ? selectedLeadId : undefined,
    status: statusFilter || undefined,
  })
  const dispatchMutation = useDispatchLeadOutreach()
  const bulkDispatchMutation = useDispatchBulkLeadOutreach()

  const leadOptions = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items])
  const selectedLead = useMemo(
    () => leadOptions.find((item) => String(item.id) === composer.leadId) ?? null,
    [composer.leadId, leadOptions],
  )
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

    if (composer.kind !== "Sms" && composer.title.trim().length < 3) {
      setSubmitError(composer.kind === "Email" ? "Email subject is required." : "Call title is required.")
      return
    }

    if (composer.message.trim().length < 5) {
      setSubmitError("Message must be at least 5 characters.")
      return
    }

    if (!composer.scheduledAt) {
      setSubmitError("Choose the schedule time.")
      return
    }

    setSubmitError(null)
    setSubmitFeedback(null)

    const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"

    if (composer.audienceType === "SingleLead") {
      const response = await dispatchMutation.mutateAsync({
        leadId: Number(composer.leadId),
        kind: composer.kind,
        title: composer.title.trim(),
        message: composer.message.trim(),
        scheduledAt: composer.scheduledAt,
        createdBy,
      })

      if (response.error) {
        setSubmitError(response.error.message || "Unable to save the schedule item.")
        return
      }

      setSubmitFeedback({
        details: [],
        message: `Scheduled ${composer.kind.toLowerCase()} outreach for ${displayText(selectedLead?.name, "the selected lead")}.`,
        tone: "success",
      })
      setComposer((current) => ({
        ...current,
        title: "",
        message: "",
        scheduledAt: "",
      }))
      return
    }

    const response = await bulkDispatchMutation.mutateAsync({
      audienceType: composer.audienceType,
      leadStage: composer.audienceType === "LeadStage" ? composer.leadStage || null : null,
      dealStage: composer.audienceType === "DealStage" ? composer.dealStage || null : null,
      kind: composer.kind,
      title: composer.title.trim(),
      message: composer.message.trim(),
      scheduledAt: composer.scheduledAt,
      createdBy,
    })

    if (response.error) {
      setSubmitError(response.error.message || "Unable to save the bulk schedule items.")
      return
    }

    const result = response.data
    if (!result) {
      setSubmitError("Unable to save the bulk schedule items.")
      return
    }

    const detailLines = result.failures.slice(0, 3)
    if (result.failures.length > detailLines.length) {
      detailLines.push(`+${result.failures.length - detailLines.length} more failure(s)`)
    }

    const summaryParts = [
      `Saved ${formatRecipientCount(result.savedCount)} from ${result.audienceLabel}.`,
      result.skippedCount > 0 ? `${result.skippedCount} skipped.` : null,
      result.failedCount > 0 ? `${result.failedCount} failed.` : null,
    ].filter(Boolean)

    setSubmitFeedback({
      details: detailLines,
      message: summaryParts.join(" "),
      tone: result.skippedCount > 0 || result.failedCount > 0 ? "warning" : "success",
    })
    setComposer((current) => ({
      ...current,
      title: "",
      message: "",
      scheduledAt: "",
    }))
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{"Lead Schedule"}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">{"Scheduled Calls, SMS & Email"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {"Track what is scheduled, what has already gone out, and what failed for each lead from one page."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700"
            href={pathname.startsWith("/agent") ? "/agent/mail" : "/admin/mail-monitor"}
          >
            {"Open Mail"}
          </Link>
          <Link
            className="inline-flex border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            href={pathname.startsWith("/agent") ? "/agent/lead" : "/admin/lead-crm-pipeline"}
          >
            {"Back To Lead CRM"}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{"Add Scheduled Follow-Up"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {"Use this to queue a reminder email, SMS, or call for one lead, a lead stage, or a deal stage. It will move itself from Scheduled to Sent or Failed when the time arrives."}
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-700">{"Audience"}</span>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  { icon: "person", label: "Single Lead", value: "SingleLead" as const },
                  { icon: "group", label: "Lead Stage", value: "LeadStage" as const },
                  { icon: "contract", label: "Deal Stage", value: "DealStage" as const },
                ].map((option) => {
                  const isActive = composer.audienceType === option.value

                  return (
                    <button
                      key={option.value}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      }`}
                      onClick={() => updateComposer({ audienceType: option.value })}
                      type="button"
                    >
                      <AppIcon className="text-base" name={option.icon} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {composer.audienceType === "SingleLead" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Lead"}</span>
                  <select
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                    onChange={(event) => updateComposer({ leadId: event.target.value })}
                    value={composer.leadId}
                  >
                    <option value="">{"Choose a lead"}</option>
                    {leadOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {`${displayText(item.name, `Lead #${item.id}`)} - ${displayText(item.phone || item.email, "No contact")}`}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedLead ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Selected Lead"}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{displayText(selectedLead.name, `Lead #${selectedLead.id}`)}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {`Phone: ${displayText(selectedLead.phone)} | Email: ${displayText(selectedLead.email)}`}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            {composer.audienceType === "LeadStage" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Lead Stage"}</span>
                  <select
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                    onChange={(event) => updateComposer({ leadStage: event.target.value as "" | LeadStage })}
                    value={composer.leadStage}
                  >
                    <option value="">{"Choose a lead stage"}</option>
                    {leadStageOrder.map((stage) => (
                      <option key={stage} value={stage}>
                        {formatLeadStage(stage)}
                      </option>
                    ))}
                  </select>
                </label>

                {composer.leadStage ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
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
                  </div>
                ) : null}
              </>
            ) : null}

            {composer.audienceType === "DealStage" ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Deal Stage"}</span>
                  <select
                    className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                    onChange={(event) => updateComposer({ dealStage: event.target.value as "" | DealStage })}
                    value={composer.dealStage}
                  >
                    <option value="">{"Choose a deal stage"}</option>
                    {dealStageOrder.map((stage) => (
                      <option key={stage} value={stage}>
                        {formatDealStage(stage)}
                      </option>
                    ))}
                  </select>
                </label>

                {composer.dealStage ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
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
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Channel"}</span>
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  onChange={(event) => updateComposer({ kind: event.target.value as OutreachKind })}
                  value={composer.kind}
                >
                  <option value="Call">{"Call"}</option>
                  <option value="Sms">{"SMS"}</option>
                  <option value="Email">{"Email"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Scheduled Time"}</span>
                <Input
                  onChange={(event) => updateComposer({ scheduledAt: event.target.value })}
                  type="datetime-local"
                  value={composer.scheduledAt}
                />
              </label>
            </div>

            {composer.kind !== "Sms" ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{composer.kind === "Email" ? "Subject" : "Title"}</span>
                <Input
                  onChange={(event) => updateComposer({ title: event.target.value })}
                  placeholder={composer.kind === "Email" ? "Viewing follow-up" : "Reminder call"}
                  value={composer.title}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Message"}</span>
              <Textarea
                className="min-h-32 rounded-xl border-slate-200"
                onChange={(event) => updateComposer({ message: event.target.value })}
                placeholder={composer.kind === "Call" ? "What should the call say?" : "Write the reminder message"}
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

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              onClick={() => void handleSaveSchedule()}
              type="button"
            >
              <AppIcon className="text-base" name="calendar_today" />
              {isSaving
                ? "Saving..."
                : composer.audienceType === "SingleLead"
                  ? "Save Scheduled Outreach"
                  : "Save Bulk Scheduled Outreach"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">{"Schedule Timeline"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {"This shows pending outreach first, then sent, completed, and failed items so you can see exactly what happened."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                onChange={(event) => setKindFilter((event.target.value || "") as "" | OutreachKind)}
                value={kindFilter}
              >
                <option value="">{"All channels"}</option>
                <option value="Email">{"Email"}</option>
                <option value="Sms">{"SMS"}</option>
                <option value="Call">{"Call"}</option>
              </select>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                onChange={(event) => setStatusFilter((event.target.value || "") as "" | LeadHistoryStatus)}
                value={statusFilter}
              >
                <option value="">{"All statuses"}</option>
                <option value="Scheduled">{"Scheduled"}</option>
                <option value="Sent">{"Sent"}</option>
                <option value="Completed">{"Completed"}</option>
                <option value="Failed">{"Failed"}</option>
              </select>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                onChange={(event) => updateLeadSelection(event.target.value)}
                value={Number.isFinite(selectedLeadId) ? String(selectedLeadId) : ""}
              >
                <option value="">{"All leads"}</option>
                {leadOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {displayText(item.name, `Lead #${item.id}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {scheduleQuery.isLoading ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">{"Loading schedule..."}</div>
          ) : scheduleQuery.error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {scheduleQuery.error.message}
            </div>
          ) : (scheduleQuery.data?.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">{"No scheduled outreach matches the current filters."}</div>
          ) : (
            <div className="mt-6 space-y-4">
              {scheduleQuery.data?.map((entry) => (
                <article key={`${entry.id}-${entry.updatedAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{entry.title}</p>
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{entry.kind}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${entry.status === "Failed" ? "border-rose-200 bg-rose-50 text-rose-700" : entry.status === "Scheduled" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{entry.status}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{entry.leadName}</p>
                      <p className="mt-1 text-sm text-slate-600">{entry.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700"
                        href={buildHistoryHref(pathname, entry.leadId)}
                      >
                        {"Open History"}
                      </Link>
                    </div>
                  </div>

                  {entry.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">{entry.body}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <span>{`Lead Email: ${displayText(entry.leadEmail)}`}</span>
                    <span>{`Lead Phone: ${displayText(entry.leadPhone)}`}</span>
                    <span>{`Provider: ${displayText(entry.provider)}`}</span>
                    {entry.scheduledAt ? <span>{`Scheduled: ${formatDateTimeLabel(entry.scheduledAt)}`}</span> : null}
                    {entry.occurredAt ? <span>{`Occurred: ${formatDateTimeLabel(entry.occurredAt)}`}</span> : null}
                    <span>{`Saved: ${formatDateTimeLabel(entry.createdAt)}`}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
