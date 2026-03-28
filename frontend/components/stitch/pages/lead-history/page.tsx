"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type CreateLeadHistoryEntryInput,
  type LeadHistoryDirection,
  type LeadHistoryKind,
  type LeadHistoryStatus,
  useCreateLeadHistory,
  useLead,
  useLeadHistory,
  useLeads,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"

type HistoryFormState = {
  kind: LeadHistoryKind
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider: string
  createdBy: string
  scheduledAt: string
}

function blankHistoryForm(): HistoryFormState {
  return {
    kind: "Call",
    direction: "Internal",
    status: "Logged",
    title: "",
    summary: "",
    body: "",
    provider: "",
    createdBy: "Admin",
    scheduledAt: "",
  }
}

function displayText(value?: string | null, fallback = "Not set") {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : fallback
}

function sortHistory(kind: LeadHistoryKind) {
  switch (kind) {
    case "Call":
      return "Call"
    case "Sms":
      return "SMS"
    case "Email":
      return "Email"
    case "PropertyChat":
      return "Property Chat"
    case "ContactForm":
      return "Contact Form"
    case "MailInbox":
      return "Mail Inbox"
    case "System":
      return "System"
    default:
      return "Note"
  }
}

export function LeadHistoryPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)
  const rawLeadId = searchParams.get("leadId")
  const leadId = rawLeadId ? Number(rawLeadId) : NaN

  const leadsQuery = useLeads({ page: 1, pageSize: 200 })
  const leadQuery = useLead(Number.isFinite(leadId) ? leadId : undefined)
  const historyQuery = useLeadHistory(Number.isFinite(leadId) ? leadId : undefined)
  const createHistoryMutation = useCreateLeadHistory()
  const [formState, setFormState] = useState<HistoryFormState>(() => blankHistoryForm())
  const [submitError, setSubmitError] = useState<string | null>(null)

  const leadOptions = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items])
  const timeline = useMemo(() => historyQuery.data ?? [], [historyQuery.data])

  function updateLeadSelection(nextLeadId: string) {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextLeadId) {
      nextParams.set("leadId", nextLeadId)
    }
    else {
      nextParams.delete("leadId")
    }

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  async function handleCreateHistory() {
    if (!Number.isFinite(leadId)) {
      setSubmitError("Lead id is missing.")
      return
    }

    if (!formState.title.trim() && !formState.summary.trim() && !formState.body.trim()) {
      setSubmitError("Add a title, summary, or full note before saving.")
      return
    }

    setSubmitError(null)

    const payload: CreateLeadHistoryEntryInput = {
      leadId,
      kind: formState.kind,
      direction: formState.direction,
      status: formState.status,
      title: formState.title.trim(),
      summary: formState.summary.trim(),
      body: formState.body.trim(),
      provider: formState.provider.trim() || undefined,
      createdBy: formState.createdBy.trim() || undefined,
      scheduledAt: formState.scheduledAt || undefined,
    }

    const response = await createHistoryMutation.mutateAsync(payload)
    if (response.error) {
      setSubmitError(response.error.message || "Unable to save the history entry.")
      return
    }

    setFormState(blankHistoryForm())
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{"Lead History"}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            {leadQuery.data ? leadQuery.data.name : `Lead #${leadId}`}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {"Manual notes, scheduled calls/SMS, property chat summaries, and linked inbox activity stay together here."}
          </p>
        </div>
        <Link className="inline-flex border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href={portalRoutes.leads}>
          {"Back To Leads"}
        </Link>
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_auto] lg:items-end">
          <div className="space-y-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Select Lead"}</span>
              <select
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                onChange={(event) => updateLeadSelection(event.target.value)}
                value={Number.isFinite(leadId) ? String(leadId) : ""}
              >
                <option value="">
                  {"Choose a lead timeline"}
                </option>
                {leadOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.name} - ${displayText(item.property, "No property")}`}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-slate-500">
              {"Pick any lead here to review calls, SMS, emails, chat summaries, and manual notes in one place."}
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center border border-primary bg-primary px-4 text-xs font-bold uppercase tracking-wide text-white"
            href={portalRoutes.leads}
          >
            {"Open Lead CRM"}
          </Link>
        </div>

        {leadsQuery.isLoading ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">{"Loading available leads..."}</p>
        ) : null}

        {leadsQuery.error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {leadsQuery.error.message}
          </div>
        ) : null}
      </section>

      {!Number.isFinite(leadId) ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-bold text-amber-900">{"Pick a lead first"}</p>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            {"Use the dropdown above to open any lead timeline directly from this page."}
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{"Add History Item"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {"Use this for phone conversations, scheduled reminders, manual email notes, or any lead activity that should stay visible."}
          </p>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Type"}</span>
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  onChange={(event) => setFormState((current) => ({ ...current, kind: event.target.value as LeadHistoryKind }))}
                  value={formState.kind}
                >
                  <option value="Call">{"Call"}</option>
                  <option value="Sms">{"SMS"}</option>
                  <option value="Email">{"Email"}</option>
                  <option value="Note">{"Note"}</option>
                  <option value="System">{"System"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Direction"}</span>
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  onChange={(event) => setFormState((current) => ({ ...current, direction: event.target.value as LeadHistoryDirection }))}
                  value={formState.direction}
                >
                  <option value="Internal">{"Internal"}</option>
                  <option value="Incoming">{"Incoming"}</option>
                  <option value="Outgoing">{"Outgoing"}</option>
                  <option value="Scheduled">{"Scheduled"}</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Status"}</span>
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as LeadHistoryStatus }))}
                  value={formState.status}
                >
                  <option value="Logged">{"Logged"}</option>
                  <option value="Scheduled">{"Scheduled"}</option>
                  <option value="Sent">{"Sent"}</option>
                  <option value="Completed">{"Completed"}</option>
                  <option value="Failed">{"Failed"}</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Scheduled Time"}</span>
                <Input
                  onChange={(event) => setFormState((current) => ({ ...current, scheduledAt: event.target.value }))}
                  type="datetime-local"
                  value={formState.scheduledAt}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Title"}</span>
              <Input
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                placeholder="Viewing reminder call"
                value={formState.title}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Summary"}</span>
              <Input
                onChange={(event) => setFormState((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Client asked for a visit this month"
                value={formState.summary}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Details"}</span>
              <Textarea
                className="min-h-36 rounded-xl border-slate-200"
                onChange={(event) => setFormState((current) => ({ ...current, body: event.target.value }))}
                placeholder="Add the full conversation, follow-up note, or reminder instructions."
                value={formState.body}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Provider / Channel"}</span>
                <Input
                  onChange={(event) => setFormState((current) => ({ ...current, provider: event.target.value }))}
                  placeholder="Twilio, Plivo, Gmail, Manual"
                  value={formState.provider}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Created By"}</span>
                <Input
                  onChange={(event) => setFormState((current) => ({ ...current, createdBy: event.target.value }))}
                  placeholder="Admin or Agent"
                  value={formState.createdBy}
                />
              </label>
            </div>

            {submitError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {submitError}
              </div>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!Number.isFinite(leadId) || createHistoryMutation.isPending}
              onClick={() => void handleCreateHistory()}
              type="button"
            >
              <AppIcon className="text-base" name="history" />
              {createHistoryMutation.isPending ? "Saving..." : "Save History Item"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">{"Timeline"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {"Inbound mail and contact form items already linked to this lead also show up here."}
              </p>
            </div>
            {leadQuery.data ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p><span className="font-bold text-slate-900">{"Email: "}</span>{displayText(leadQuery.data.email)}</p>
                <p className="mt-1"><span className="font-bold text-slate-900">{"Phone: "}</span>{displayText(leadQuery.data.phone)}</p>
              </div>
            ) : null}
          </div>

          {historyQuery.isLoading ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              {"Loading history..."}
            </div>
          ) : historyQuery.error ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {historyQuery.error.message}
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              {"No history yet for this lead."}
            </div>
          ) : (
            <div className="mt-6 space-y-5 border-l-2 border-slate-100 pl-5">
              {timeline.map((entry) => (
                <article key={`${entry.id}-${entry.createdAt}`} className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 rounded-full bg-primary ring-4 ring-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{entry.title}</p>
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                      {sortHistory(entry.kind)}
                    </span>
                    <span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{entry.summary}</p>
                  {entry.body ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{entry.body}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    <span>{`Direction: ${entry.direction}`}</span>
                    <span>{`By: ${displayText(entry.createdBy)}`}</span>
                    {entry.provider ? <span>{`Provider: ${entry.provider}`}</span> : null}
                    {entry.scheduledAt ? <span>{`Scheduled: ${formatDateTimeLabel(entry.scheduledAt)}`}</span> : null}
                    <span>{formatDateTimeLabel(entry.occurredAt ?? entry.createdAt)}</span>
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
