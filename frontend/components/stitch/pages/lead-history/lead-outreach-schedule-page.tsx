"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { useLeads } from "@/hooks/use-real-estate-api"
import { useDispatchLeadOutreach, useLeadOutreachSchedule } from "@/hooks/use-lead-outreach-api"
import type { LeadHistoryStatus } from "@/@types/real-estate-api"

function displayText(value?: string | null, fallback = "Not set") {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : fallback
}

function buildHistoryHref(pathname: string, leadId: number) {
  return pathname.startsWith("/agent")
    ? `/agent/lead?view=history&leadId=${leadId}`
    : `/admin/lead-history?leadId=${leadId}`
}

export function LeadOutreachSchedulePage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawLeadId = searchParams.get("leadId")
  const selectedLeadId = rawLeadId ? Number(rawLeadId) : NaN
  const [kindFilter, setKindFilter] = useState<"" | "Email" | "Sms" | "Call">("")
  const [statusFilter, setStatusFilter] = useState<"" | LeadHistoryStatus>("")
  const [composer, setComposer] = useState({
    leadId: Number.isFinite(selectedLeadId) ? String(selectedLeadId) : "",
    kind: "Call" as "Email" | "Sms" | "Call",
    title: "",
    message: "",
    scheduledAt: "",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const leadsQuery = useLeads({ page: 1, pageSize: 200 })
  const scheduleQuery = useLeadOutreachSchedule({
    kind: kindFilter || undefined,
    leadId: Number.isFinite(selectedLeadId) ? selectedLeadId : undefined,
    status: statusFilter || undefined,
  })
  const dispatchMutation = useDispatchLeadOutreach()

  const leadOptions = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items])

  function updateLeadSelection(nextLeadId: string) {
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextLeadId) {
      nextParams.set("leadId", nextLeadId)
    } else {
      nextParams.delete("leadId")
    }

    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    setComposer((current) => ({ ...current, leadId: nextLeadId }))
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
          <Link className="inline-flex border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={pathname.startsWith("/agent") ? "/agent/mail" : "/admin/mail-monitor"}>
            {"Open Mail"}
          </Link>
          <Link className="inline-flex border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href={pathname.startsWith("/agent") ? "/agent/lead" : "/admin/lead-crm-pipeline"}>
            {"Back To Lead CRM"}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{"Add Scheduled Follow-Up"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {"Use this to queue a reminder email, SMS, or call for any lead. It will move itself from Scheduled to Sent or Failed when the time arrives."}
          </p>

          <div className="mt-5 space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Lead"}</span>
              <select
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                onChange={(event) => setComposer((current) => ({ ...current, leadId: event.target.value }))}
                value={composer.leadId}
              >
                <option value="">{"Choose a lead"}</option>
                {leadOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.name} - ${displayText(item.phone || item.email, "No contact")}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Channel"}</span>
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  onChange={(event) => setComposer((current) => ({ ...current, kind: event.target.value as "Email" | "Sms" | "Call" }))}
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
                  onChange={(event) => setComposer((current) => ({ ...current, scheduledAt: event.target.value }))}
                  type="datetime-local"
                  value={composer.scheduledAt}
                />
              </label>
            </div>

            {composer.kind !== "Sms" ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{composer.kind === "Email" ? "Subject" : "Title"}</span>
                <Input
                  onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                  placeholder={composer.kind === "Email" ? "Viewing follow-up" : "Reminder call"}
                  value={composer.title}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Message"}</span>
              <Textarea
                className="min-h-32 rounded-xl border-slate-200"
                onChange={(event) => setComposer((current) => ({ ...current, message: event.target.value }))}
                placeholder={composer.kind === "Call" ? "What should the call say?" : "Write the reminder message"}
                value={composer.message}
              />
            </label>

            {submitError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {submitError}
              </div>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={dispatchMutation.isPending}
              onClick={async () => {
                if (!composer.leadId) {
                  setSubmitError("Choose a lead first.")
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
                const response = await dispatchMutation.mutateAsync({
                  leadId: Number(composer.leadId),
                  kind: composer.kind,
                  title: composer.title.trim(),
                  message: composer.message.trim(),
                  scheduledAt: composer.scheduledAt,
                  createdBy: pathname.startsWith("/agent") ? "Agent" : "Admin",
                })

                if (response.error) {
                  setSubmitError(response.error.message || "Unable to save the schedule item.")
                  return
                }

                setComposer({
                  leadId: composer.leadId,
                  kind: "Call",
                  title: "",
                  message: "",
                  scheduledAt: "",
                })
              }}
              type="button"
            >
              <AppIcon className="text-base" name="event" />
              {dispatchMutation.isPending ? "Saving..." : "Save Scheduled Outreach"}
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
                onChange={(event) => setKindFilter((event.target.value || "") as "" | "Email" | "Sms" | "Call")}
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
                  <option key={item.id} value={item.id}>{item.name}</option>
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
                      <Link className="border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={buildHistoryHref(pathname, entry.leadId)}>
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
