"use client"

import Link from "next/link"
import { useActionState, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Mail,
  MessageSquareText,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  UserRoundCog,
  XCircle,
} from "lucide-react"

import {
  approveTenantShowingRequestAction,
  copyTenantShowingRequestLink,
  rejectTenantShowingRequestAction,
  type TenantActionState,
  type TenantProperty,
  type TenantShowingRequest,
} from "@/lib/tenant-dashboard-actions"

const initialState: TenantActionState = { ok: false, message: "" }

function toLocalDateTime(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function displayAnswer(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (value == null || value === "") return "Not provided"
  return String(value)
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700"
  if (status === "submitted") return "bg-amber-50 text-amber-800"
  if (status === "rejected" || status === "expired") return "bg-rose-50 text-rose-700"
  return "bg-sky-50 text-sky-700"
}

type TenantShowingRequestDetailProps = {
  request: TenantShowingRequest
  properties: TenantProperty[]
}

export function TenantShowingRequestDetail({ request, properties }: TenantShowingRequestDetailProps) {
  const [approveState, approveAction, approvePending] = useActionState(approveTenantShowingRequestAction, initialState)
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectTenantShowingRequestAction, initialState)
  const [localShowingAt, setLocalShowingAt] = useState("")
  const [propertyId, setPropertyId] = useState(String(request.requestedPropertyId ?? request.propertyId ?? ""))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLocalShowingAt(toLocalDateTime(request.preferredShowingAt))
  }, [request.preferredShowingAt])

  const showingAtIso = useMemo(() => {
    if (!localShowingAt) return ""
    const date = new Date(localShowingAt)
    return Number.isFinite(date.getTime()) ? date.toISOString() : ""
  }, [localShowingAt])

  const copyPublicLink = async () => {
    const link = await copyTenantShowingRequestLink(request.id, request.expiryHours)
    await navigator.clipboard.writeText(link.publicUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const answers = Object.entries(request.answers ?? {})
  const canReject = !["approved", "rejected", "expired"].includes(request.status)
  const publishedProperties = properties.filter((property) => property.status === "published")

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-5 sm:p-8 lg:p-10">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#946710]" href="/dashboard/showing-requests"><ArrowLeft className="size-4" /> Back to showing requests</Link>

      <header className="relative overflow-hidden rounded-[28px] bg-[#17213b] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,33,59,0.2)] sm:px-9">
        <div className="absolute right-0 top-0 size-64 bg-[radial-gradient(circle_at_center,rgba(242,192,80,0.18),transparent_65%)]" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f2c050]">Showing request #{request.id}</p><h1 className="mt-3 text-3xl font-bold tracking-[-0.045em]">{request.title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">Review the lead&apos;s response, confirm the property and time, then approve. Realtor details are optional and can be added when available.</p></div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(request.status)}`}>{request.status}</span>
        </div>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><UserRound className="size-5 text-[#946710]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Lead</p><p className="mt-1 font-bold">{request.leadName}</p><p className="mt-1 text-xs text-slate-500">{request.recipientEmail || request.recipientPhone || "No contact"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Building2 className="size-5 text-[#946710]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Property</p><p className="mt-1 font-bold">{request.requestedPropertyTitle || request.propertyTitle || "Awaiting selection"}</p><p className="mt-1 text-xs text-slate-500">{request.propertyMode === "respondent" ? "Selected by lead" : "Selected by realtor"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Clock3 className="size-5 text-[#946710]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Preferred time</p><p className="mt-1 font-bold">{request.preferredShowingAt ? new Date(request.preferredShowingAt).toLocaleString() : "Not supplied"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><ShieldCheck className="size-5 text-[#946710]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Link expiration</p><p className="mt-1 font-bold">{new Date(request.expiresAt).toLocaleString()}</p></article>
      </section>

      {request.publicUrl && !["submitted", "approved", "rejected"].includes(request.status) ? (
        <section className="rounded-[22px] border border-sky-200 bg-sky-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="font-bold text-sky-950">Secure public form</h2><p className="mt-1 text-xs leading-6 text-sky-800">Copy creates a fresh secure link and starts a new {request.expiryHours ?? 168}-hour countdown.</p></div><button className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-900 px-4 text-sm font-semibold text-white" onClick={copyPublicLink} type="button">{copied ? <Check className="size-4" /> : <Clipboard className="size-4" />} {copied ? "Copied" : "Copy fresh link"}</button></div>
        </section>
      ) : null}

      <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
        <div className="space-y-7">
          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="text-xl font-bold">Submitted answers</h2><p className="mt-1 text-sm text-slate-600">Responses are retained exactly with this request.</p><div className="mt-5 grid gap-3">{answers.length ? answers.map(([key, value]) => <div className="rounded-2xl bg-slate-50 p-4" key={key}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{request.fields?.find((field) => field.key === key)?.label ?? key.replaceAll("_", " ")}</p><p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{displayAnswer(value)}</p></div>) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No answers have been submitted yet.</div>}</div></article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><h2 className="text-xl font-bold">Delivery record</h2><div className="mt-5 grid gap-3">{request.deliveryResults?.map((result, index) => <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center" key={`${result.channel}-${index}`}><div className="flex items-start gap-3">{result.channel === "Email" ? <Mail className="mt-0.5 size-4 text-slate-500" /> : <MessageSquareText className="mt-0.5 size-4 text-slate-500" />}<div><p className="font-bold">{result.channel}</p><p className="mt-1 text-sm text-slate-600">{result.message}</p></div></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ${result.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{result.status}</span></div>) ?? <p className="text-sm text-slate-500">No delivery evidence recorded.</p>}</div></article>
        </div>

        <aside className="space-y-7">
          {request.status === "submitted" ? (
            <article className="rounded-[24px] border border-amber-200 bg-[#fffaf0] p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><UserRoundCog className="size-5" /></span><div><h2 className="text-xl font-bold">Approve showing</h2><p className="mt-1 text-sm leading-6 text-slate-600">Approval creates the showing immediately. Realtor name, email, and phone are optional.</p></div></div>
              <form action={approveAction} className="mt-6 grid gap-4">
                <input name="requestId" type="hidden" value={request.id} />
                <input name="showingAt" type="hidden" value={showingAtIso} />
                <label className="grid gap-2 text-sm font-semibold">Published property<select className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" name="propertyId" onChange={(event) => setPropertyId(event.target.value)} required value={propertyId}><option value="">Choose property</option>{publishedProperties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select></label>
                <label className="grid gap-2 text-sm font-semibold">Confirmed showing time<input className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" onChange={(event) => setLocalShowingAt(event.target.value)} required type="datetime-local" value={localShowingAt} /></label>
                <label className="grid gap-2 text-sm font-semibold">Showing realtor <span className="text-xs font-normal text-slate-500">(optional)</span><input className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" name="realtorName" placeholder="Realtor full name, if assigned" /></label>
                <label className="grid gap-2 text-sm font-semibold">Realtor email<input className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" name="realtorEmail" type="email" /></label>
                <label className="grid gap-2 text-sm font-semibold">Realtor phone<input className="h-11 rounded-xl border border-slate-300 bg-white px-3 font-normal" name="realtorPhone" /></label>
                <label className="grid gap-2 text-sm font-semibold">Internal notes<textarea className="min-h-24 rounded-xl border border-slate-300 bg-white p-3 font-normal" name="notes" /></label>
                {approveState.message ? <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${approveState.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{approveState.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}<span>{approveState.message}</span></div> : null}
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-semibold text-white disabled:opacity-60" disabled={approvePending} type="submit"><CalendarCheck2 className="size-4" /> {approvePending ? "Approving..." : "Approve and create showing"}</button>
              </form>
            </article>
          ) : request.status === "approved" ? (
            <article className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-6"><CheckCircle2 className="size-7 text-emerald-700" /><h2 className="mt-4 text-xl font-bold text-emerald-950">Showing created</h2><p className="mt-2 text-sm leading-6 text-emerald-900">{request.assignedRealtorName ? `Assigned to ${request.assignedRealtorName}. ` : "No realtor has been assigned yet. "}This appointment is now visible in Realtor Showings.</p><Link className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white" href="/dashboard/realtor-showings">Open Realtor Showings</Link></article>
          ) : null}

          {canReject ? (
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><XCircle className="size-5 text-rose-600" /><h2 className="font-bold">Reject request</h2></div><form action={rejectAction} className="mt-4 grid gap-3"><input name="requestId" type="hidden" value={request.id} /><textarea className="min-h-24 rounded-xl border border-slate-300 p-3 text-sm" name="reason" placeholder="Optional reason or internal note" />{rejectState.message ? <p className={`text-sm ${rejectState.ok ? "text-emerald-700" : "text-rose-700"}`}>{rejectState.message}</p> : null}<button className="h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60" disabled={rejectPending} type="submit">{rejectPending ? "Rejecting..." : "Reject request"}</button></form></article>
          ) : null}
        </aside>
      </section>
    </main>
  )
}
