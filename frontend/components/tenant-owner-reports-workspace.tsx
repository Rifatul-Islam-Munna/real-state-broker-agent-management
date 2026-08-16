"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { ArrowUpRight, CheckCircle2, FileClock, Mail, MessageSquareText, Send, TriangleAlert } from "lucide-react"

import {
  sendTenantOwnerReportAction,
  type TenantActionState,
  type TenantOwnerReport,
  type TenantProperty,
} from "@/lib/tenant-dashboard-actions"

const initialState: TenantActionState = { ok: false, message: "" }

function payloadValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function deliveryClass(status: string) {
  if (status === "sent") return "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
  if (status === "partial") return "bg-amber-50 text-amber-700 ring-amber-600/15"
  return "bg-rose-50 text-rose-700 ring-rose-600/15"
}

type OwnerReportsWorkspaceProps = {
  properties: TenantProperty[]
  reports: TenantOwnerReport[]
}

export function TenantOwnerReportsWorkspace({ properties, reports }: OwnerReportsWorkspaceProps) {
  const [state, formAction, isPending] = useActionState(sendTenantOwnerReportAction, initialState)
  const [propertyId, setPropertyId] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [subject, setSubject] = useState("")

  const handlePropertyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value
    setPropertyId(nextId)
    const property = properties.find((item) => String(item.id) === nextId)
    if (!property) return
    setOwnerName(payloadValue(property.payload, ["ownerName", "owner_name", "sellerName", "seller_name"]))
    setOwnerEmail(payloadValue(property.payload, ["ownerEmail", "owner_email", "sellerEmail", "seller_email"]))
    setOwnerPhone(payloadValue(property.payload, ["ownerPhone", "owner_phone", "sellerPhone", "seller_phone"]))
    setSubject(`Property update · ${property.title}`)
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-8 p-5 sm:p-8 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-[#102a2d] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,43,45,0.18)] sm:px-9">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-28 right-24 size-52 rounded-full bg-[#d7f171]/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7f171]">Seller communication</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Owner report desk</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
            Send a property update by email, SMS, or both. Every attempt is retained below with the exact recipient, message, channel, and delivery result.
          </p>
        </div>
      </header>

      <section className="grid gap-7 xl:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.4fr)]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f7f4] text-[#0d766e]"><Send className="size-5" /></span>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.025em]">Send owner report</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Owner details are prefilled from the property when available and remain editable before sending.</p>
            </div>
          </div>

          <form action={formAction} className="mt-7 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold">
              Property
              <select className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none transition focus:border-[#0d766e] focus:ring-4 focus:ring-[#0d766e]/10" name="propertyId" onChange={handlePropertyChange} required value={propertyId}>
                <option value="">Choose property</option>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.title} · {property.status}</option>)}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Owner name<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#0d766e]" name="ownerName" onChange={(event) => setOwnerName(event.target.value)} value={ownerName} /></label>
              <label className="grid gap-2 text-sm font-semibold">Owner email<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#0d766e]" name="ownerEmail" onChange={(event) => setOwnerEmail(event.target.value)} type="email" value={ownerEmail} /></label>
              <label className="grid gap-2 text-sm font-semibold">Owner phone<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#0d766e]" name="ownerPhone" onChange={(event) => setOwnerPhone(event.target.value)} value={ownerPhone} /></label>
            </div>

            <label className="grid gap-2 text-sm font-semibold">Subject<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#0d766e]" name="subject" onChange={(event) => setSubject(event.target.value)} required value={subject} /></label>
            <label className="grid gap-2 text-sm font-semibold">Report message<textarea className="min-h-44 rounded-xl border border-slate-300 p-4 font-normal leading-7 outline-none focus:border-[#0d766e]" name="body" placeholder="Summarize showing activity, buyer feedback, next steps, or a market update." required /></label>

            <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <legend className="px-1 text-sm font-semibold">Delivery channels</legend>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input defaultChecked name="channels" type="checkbox" value="Email" /><Mail className="size-4 text-slate-500" /> Email</label>
                <label className="flex items-center gap-2"><input name="channels" type="checkbox" value="SMS" /><MessageSquareText className="size-4 text-slate-500" /> SMS</label>
              </div>
            </fieldset>

            {state.message ? (
              <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">
                {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
                <span>{state.message}</span>
              </div>
            ) : null}

            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0d766e] px-5 font-semibold text-white shadow-lg shadow-[#0d766e]/15 transition hover:bg-[#0a625c] disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending} type="submit">
              <Send className="size-4" /> {isPending ? "Sending…" : "Send and record report"}
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.025em]">Sent report history</h2>
              <p className="mt-1 text-sm text-slate-600">Open any row to review the exact report and channel results.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{reports.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <tr><th className="px-6 py-4">Recipient</th><th className="px-6 py-4">Property</th><th className="px-6 py-4">Channels</th><th className="px-6 py-4">Result</th><th className="px-6 py-4">Sent</th><th className="px-6 py-4"><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody>
                {reports.length ? reports.map((report) => (
                  <tr className="border-t border-slate-100 transition hover:bg-[#f5faf9]" key={report.id}>
                    <td className="px-6 py-5"><p className="font-bold text-slate-900">{report.ownerName || "Unnamed owner"}</p><p className="mt-1 text-xs text-slate-500">{report.ownerEmail || report.ownerPhone || "No address recorded"}</p></td>
                    <td className="px-6 py-5"><p className="max-w-[220px] truncate font-medium">{report.propertyTitle}</p><p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{report.subject}</p></td>
                    <td className="px-6 py-5"><div className="flex flex-wrap gap-1.5">{report.channels.map((channel) => <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold" key={channel}>{channel}</span>)}</div></td>
                    <td className="px-6 py-5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${deliveryClass(report.deliveryStatus)}`}>{report.deliveryStatus}</span></td>
                    <td className="px-6 py-5 text-xs text-slate-600">{new Date(report.sentAt).toLocaleString()}</td>
                    <td className="px-6 py-5"><Link aria-label={`Open report for ${report.ownerName || report.propertyTitle}`} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#0d766e] hover:text-[#0d766e]" href={`/dashboard/owner-reports/${report.id}`}><ArrowUpRight className="size-4" /></Link></td>
                  </tr>
                )) : (
                  <tr><td className="px-6 py-16 text-center" colSpan={6}><FileClock className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No owner reports yet</p><p className="mt-1 text-sm text-slate-500">The first sent report will appear here.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  )
}
