"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, Send, TriangleAlert } from "lucide-react"

import { OwnerReportRecipientsEditor } from "@/components/owner-report-recipients-editor"
import {
  createOwnerDrafts,
  ownerContactIssue,
  ownerContactsFromProperty,
  serializeOwnerDrafts,
  type ReportOwnerDraft,
} from "@/lib/owner-report-contacts"
import {
  sendTenantOwnerReportAction,
  type TenantActionState,
  type TenantProperty,
} from "@/lib/tenant-dashboard-actions"

const initialState: TenantActionState = { ok: false, message: "" }

export function TenantOwnerReportSingleForm({
  properties,
}: {
  properties: TenantProperty[]
}) {
  const [state, formAction, isPending] = useActionState(
    sendTenantOwnerReportAction,
    initialState
  )
  const [propertyId, setPropertyId] = useState("")
  const [owners, setOwners] = useState<ReportOwnerDraft[]>([
    { id: "initial-owner", name: "", email: "", phone: "" },
  ])
  const [subject, setSubject] = useState("")
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const selectedProperty = properties.find(
    (item) => String(item.id) === propertyId
  )
  const issue = ownerContactIssue(owners, emailEnabled, smsEnabled)

  function handlePropertyChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value
    setPropertyId(nextId)
    const property = properties.find((item) => String(item.id) === nextId)
    if (!property) return
    setOwners(createOwnerDrafts(ownerContactsFromProperty(property)))
    setSubject("Property update · " + property.title)
  }

  const serialized = serializeOwnerDrafts(owners)
  const primary = serialized[0] ?? { name: "", email: "", phone: "" }

  return (
    <article className="max-w-4xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f7f4] text-[#0d766e]">
          <Send className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-[-0.025em]">
            Send one owner report
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Every owner receives the report through the selected channels.
            This still creates one report entry in Sent report history.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-7 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">
          Property
          <select
            className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-[#0d766e] focus:ring-4 focus:ring-[#0d766e]/10"
            name="propertyId"
            onChange={handlePropertyChange}
            required
            value={propertyId}
          >
            <option value="">Choose property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title} · {property.status}
              </option>
            ))}
          </select>
        </label>

        <input
          name="managedPropertyId"
          type="hidden"
          value={selectedProperty?.managedPropertyId ?? ""}
        />
        <input name="ownerName" type="hidden" value={primary.name} />
        <input name="ownerEmail" type="hidden" value={primary.email} />
        <input name="ownerPhone" type="hidden" value={primary.phone} />
        <input name="owners" type="hidden" value={JSON.stringify(serialized)} />

        <OwnerReportRecipientsEditor owners={owners} onChange={setOwners} />

        <label className="grid gap-2 text-sm font-semibold">
          Subject
          <input
            className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#0d766e]"
            name="subject"
            onChange={(event) => setSubject(event.target.value)}
            required
            value={subject}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Report message
          <textarea
            className="min-h-44 rounded-xl border border-slate-300 p-4 font-normal leading-7 outline-none focus:border-[#0d766e]"
            name="body"
            placeholder="Summarize showing activity, buyer feedback, next steps, or a market update."
            required
          />
        </label>

        <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold">Delivery channels</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                checked={emailEnabled}
                name="channels"
                onChange={(event) => setEmailEnabled(event.target.checked)}
                type="checkbox"
                value="Email"
              />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={smsEnabled}
                name="channels"
                onChange={(event) => setSmsEnabled(event.target.checked)}
                type="checkbox"
                value="SMS"
              />
              SMS
            </label>
          </div>
        </fieldset>

        {issue && propertyId ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            Needs manual fix: {issue}. No owner will receive this report until
            the selected channels have valid contact details.
          </p>
        ) : null}

        {state.message ? (
          <div
            className={
              "flex items-start gap-3 rounded-xl px-4 py-3 text-sm " +
              (state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")
            }
            role="status"
          >
            {state.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        ) : null}

        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0d766e] px-5 font-semibold text-white shadow-lg shadow-[#0d766e]/15 transition hover:bg-[#0a625c] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !propertyId || Boolean(issue) || (!emailEnabled && !smsEnabled)}
          type="submit"
        >
          <Send className="size-4" />
          {isPending ? "Queuing…" : "Send and record one report"}
        </button>
      </form>
    </article>
  )
}
