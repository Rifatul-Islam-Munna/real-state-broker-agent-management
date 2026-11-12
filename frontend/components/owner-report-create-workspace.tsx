"use client"

import { type KeyboardEvent, useRef, useState } from "react"
import {
  FileSpreadsheet,
  ListChecks,
  MailPlus,
} from "lucide-react"

import { TenantOwnerReportBulkImport } from "@/components/tenant-owner-report-bulk-import"
import { TenantOwnerReportSingleForm } from "@/components/tenant-owner-report-single-form"
import type { TenantProperty } from "@/lib/tenant-dashboard-actions"

type ReportMode = "csv" | "single"

export function OwnerReportCreateWorkspace({
  properties,
}: {
  properties: TenantProperty[]
}) {
  const [mode, setMode] = useState<ReportMode>("csv")
  const csvTabRef = useRef<HTMLButtonElement>(null)
  const singleTabRef = useRef<HTMLButtonElement>(null)

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: ReportMode | null = null

    if (event.key === "Home") next = "csv"
    if (event.key === "End") next = "single"
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      next = mode === "csv" ? "single" : "csv"
    }

    if (next) {
      event.preventDefault()
      setMode(next)
      const target = next === "csv" ? csvTabRef : singleTabRef
      target.current?.focus()
    }
  }

  return (
    <div className="space-y-6">
      <div
        aria-label="Choose how to create a report"
        className="grid gap-3 sm:grid-cols-2"
        onKeyDown={handleTabKeyDown}
        role="tablist"
      >
        <button
          aria-controls="csv-report-panel"
          aria-selected={mode === "csv"}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
            mode === "csv"
              ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700/15"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
          id="csv-report-tab"
          onClick={() => setMode("csv")}
          ref={csvTabRef}
          tabIndex={mode === "csv" ? 0 : -1}
          role="tab"
          type="button"
        >
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
            mode === "csv" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            <FileSpreadsheet className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900 sm:text-base">
              Import from CSV
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
              Best for weekly reports across multiple properties
            </span>
          </span>
          {mode === "csv" ? <ListChecks className="size-5 text-teal-700" /> : null}
        </button>

        <button
          aria-controls="single-report-panel"
          aria-selected={mode === "single"}
          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
            mode === "single"
              ? "border-teal-700 bg-teal-50 ring-1 ring-teal-700/15"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
          id="single-report-tab"
          onClick={() => setMode("single")}
          ref={singleTabRef}
          tabIndex={mode === "single" ? 0 : -1}
          role="tab"
          type="button"
        >
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
            mode === "single" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
          }`}>
            <MailPlus className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900 sm:text-base">
              Write one report
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-600">
              Send a personal update for one property
            </span>
          </span>
        </button>
      </div>

      <div
        aria-labelledby="csv-report-tab"
        hidden={mode !== "csv"}
        id="csv-report-panel"
        role="tabpanel"
      >
        <TenantOwnerReportBulkImport properties={properties} />
      </div>
      <div
        aria-labelledby="single-report-tab"
        hidden={mode !== "single"}
        id="single-report-panel"
        role="tabpanel"
      >
        <TenantOwnerReportSingleForm properties={properties} />
      </div>
    </div>
  )
}
