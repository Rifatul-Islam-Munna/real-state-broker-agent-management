"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  FileClock,
  FilePlus2,
} from "lucide-react"

import type { TenantOwnerReport } from "@/lib/tenant-dashboard-actions"
import { OwnerReportDeleteButton } from "@/components/owner-report-delete-button"

function deliveryClass(status: string) {
  if (status === "sent")
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
  if (status === "partial")
    return "bg-amber-50 text-amber-700 ring-amber-600/15"
  if (status === "scheduled")
    return "bg-sky-50 text-sky-700 ring-sky-600/15"
  return "bg-rose-50 text-rose-700 ring-rose-600/15"
}

export function TenantOwnerReportsWorkspace({
  reports,
}: {
  reports: TenantOwnerReport[]
}) {
  return (
    <main className="mx-auto max-w-[1500px] space-y-8 p-5 sm:p-8 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-[#102a2d] px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,43,45,0.18)] sm:px-9">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border border-white/10" />
        <div className="absolute -bottom-28 right-24 size-52 rounded-full bg-[#d7f171]/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7f171]">
              Seller communication
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
              Owner report desk
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Review every owner report and its delivery result. Create a new
              report to send one property update manually or import a weekly CSV
              for multiple properties.
            </p>
          </div>

          <Link
            className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-[#d7f171] px-5 font-bold text-[#102a2d] transition hover:bg-[#e3f78c]"
            href="/dashboard/owner-reports/create"
          >
            <FilePlus2 className="size-4" />
            Create owner report
          </Link>
        </div>
      </header>

      <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.025em]">
              Report history
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Manual and CSV-imported reports appear together here. Open any row
              to review the exact recipient, message, and channel results.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {reports.length} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Property</th>
                <th className="px-6 py-4">Channels</th>
                <th className="px-6 py-4">Result</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length ? (
                reports.map((report) => (
                  <tr
                    className="border-t border-slate-100 transition hover:bg-[#f5faf9]"
                    key={report.id}
                  >
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900">
                        {report.ownerName || "Unnamed owner"}
                      </p>
                      {(report.owners?.length ?? 0) > 1 ? (
                        <p className="mt-1 text-xs font-semibold text-[#0d766e]">
                          {report.owners?.length} owners · one report
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        {report.ownerEmail ||
                          report.ownerPhone ||
                          "No address recorded"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="max-w-[220px] truncate font-medium">
                        {report.propertyTitle}
                      </p>
                      <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                        {report.subject}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {report.channels.map((channel) => (
                          <span
                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold"
                            key={channel}
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset " +
                          deliveryClass(report.deliveryStatus)
                        }
                      >
                        {report.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-600">
                      {new Date(report.sentAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          aria-label={
                            "Open report for " +
                            (report.ownerName || report.propertyTitle)
                          }
                          className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#0d766e] hover:text-[#0d766e]"
                          href={"/dashboard/owner-reports/" + report.id}
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                        <OwnerReportDeleteButton
                          reportId={report.id}
                          reportSubject={report.subject}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center" colSpan={6}>
                    <FileClock className="mx-auto size-8 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700">
                      No owner reports yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Create a manual report or import a weekly CSV to get
                      started.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </main>
  )
}
