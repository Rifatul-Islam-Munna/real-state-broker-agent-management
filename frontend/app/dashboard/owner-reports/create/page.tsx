import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Layers3 } from "lucide-react"

import { OwnerReportCreateWorkspace } from "@/components/owner-report-create-workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getOwnerReportProperties } from "@/lib/tenant-dashboard-actions"

export const metadata: Metadata = { title: "Create Owner Report" }

export default async function CreateOwnerReportPage() {
  await requireDashboardAccess("lead")
  const properties = await getOwnerReportProperties()

  return (
    <main className="mx-auto max-w-[1240px] space-y-7 px-4 py-6 sm:px-7 sm:py-8 lg:py-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-teal-800"
          href="/dashboard/owner-reports"
        >
          <ArrowLeft className="size-4" />
          Owner reports
        </Link>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 hover:underline"
          href="/dashboard/owner-reports"
        >
          Sent report history <ArrowUpRight className="size-3.5" />
        </Link>
      </nav>

      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-[0_12px_40px_rgba(15,23,42,0.035)] sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">
              <Layers3 className="size-4" />
              Owner communication
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Create owner report
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Turn your weekly spreadsheet into individual property updates,
              ready for every owner. Start with a CSV or write one report.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm">
              <Layers3 className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-slate-900">{properties.length}</p>
              <p className="text-xs font-medium text-slate-500">Available properties</p>
            </div>
          </div>
        </div>
      </header>

      <OwnerReportCreateWorkspace properties={properties} />
    </main>
  )
}
