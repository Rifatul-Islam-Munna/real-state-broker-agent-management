import Link from "next/link"
import { ArrowLeft, Building2, CalendarClock, Mail, MessageSquareText, UserRound } from "lucide-react"

import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getTenantOwnerReport } from "@/lib/tenant-dashboard-actions"

type OwnerReportDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function OwnerReportDetailPage({ params }: OwnerReportDetailPageProps) {
  await requireDashboardAccess("lead")
  const { id } = await params
  const report = await getTenantOwnerReport(Number(id))

  return (
    <main className="mx-auto max-w-5xl space-y-7 p-5 sm:p-8 lg:p-10">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0d766e]" href="/dashboard/owner-reports"><ArrowLeft className="size-4" /> Back to owner reports</Link>

      <header className="rounded-[28px] bg-[#102a2d] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,43,45,0.18)] sm:px-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7f171]">Report #{report.id}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em]">{report.subject}</h1>
        <p className="mt-3 text-sm text-white/65">Sent by {report.sentByName || "Tenant user"} on {new Date(report.sentAt).toLocaleString()}</p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><UserRound className="size-5 text-[#0d766e]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Recipient</p><p className="mt-1 font-bold">{report.ownerName || "Unnamed owner"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Building2 className="size-5 text-[#0d766e]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Property</p><p className="mt-1 font-bold">{report.propertyTitle}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Mail className="size-5 text-[#0d766e]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Email</p><p className="mt-1 break-all text-sm font-semibold">{report.ownerEmail || "Not supplied"}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><MessageSquareText className="size-5 text-[#0d766e]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Phone</p><p className="mt-1 text-sm font-semibold">{report.ownerPhone || "Not supplied"}</p></article>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><CalendarClock className="size-5 text-[#0d766e]" /><h2 className="text-xl font-bold">Report message</h2></div>
        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{report.body}</div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">Delivery results</h2>
        <div className="mt-5 grid gap-3">
          {report.deliveryResults.map((result, index) => (
            <article className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center" key={`${result.channel}-${index}`}>
              <div><p className="font-bold">{result.channel}</p><p className="mt-1 text-sm text-slate-600">{result.message}</p></div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${result.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{result.status}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
