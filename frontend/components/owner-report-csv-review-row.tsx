"use client"

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageSquareText,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"

import { OwnerReportRecipientsEditor } from "@/components/owner-report-recipients-editor"
import type { ReportOwnerDraft } from "@/lib/owner-report-contacts"
import type { PreparedRow } from "@/lib/owner-report-csv-workflow"
import type { TenantProperty } from "@/lib/tenant-dashboard-actions"

type ReviewRowProps = {
  row: PreparedRow
  issue: string
  expanded: boolean
  disabled: boolean
  properties: TenantProperty[]
  matchedProperty?: TenantProperty
  previewSubject: string
  previewBody: string
  hasTemplate: boolean
  onToggle: () => void
  onSelect: (checked: boolean) => void
  onPropertyChange: (propertyId: number | null) => void
  onOwnersChange: (owners: ReportOwnerDraft[]) => void
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
        {value || "—"}
      </p>
    </div>
  )
}

function RowStatus({
  row,
  issue,
}: {
  row: PreparedRow
  issue: string
}) {
  if (row.deliveryStatus === "queued") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
        <Check className="size-3.5" /> Queued
      </span>
    )
  }
  if (row.deliveryStatus === "sending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
        <Clock3 className="size-3.5" /> Preparing
      </span>
    )
  }
  if (issue) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        <TriangleAlert className="size-3.5" /> Needs fix
      </span>
    )
  }
  if (row.deliveryStatus === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
        <RotateCcw className="size-3.5" /> Retry available
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      <Check className="size-3.5" /> Ready
    </span>
  )
}

export function OwnerReportCsvReviewRow({
  row,
  issue,
  expanded,
  disabled,
  properties,
  matchedProperty,
  previewSubject,
  previewBody,
  hasTemplate,
  onToggle,
  onSelect,
  onPropertyChange,
  onOwnersChange,
}: ReviewRowProps) {
  const locked = disabled || row.deliveryStatus === "queued"
  const ownerCount = row.owners.length

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
        expanded
          ? "border-teal-300 shadow-[0_8px_25px_rgba(15,23,42,0.045)]"
          : issue
            ? "border-amber-200"
            : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5">
        <label className="flex shrink-0 items-center self-center">
          <input
            aria-label={`Select report for ${row.propertyName}`}
            checked={row.selected}
            className="size-4 accent-teal-700"
            disabled={locked}
            onChange={(event) => onSelect(event.target.checked)}
            type="checkbox"
          />
        </label>

        <div className="min-w-[180px] flex-1">
          <p className="text-sm font-bold leading-5 text-slate-900 sm:text-base">
            {row.propertyName}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {matchedProperty
              ? `Matched: ${matchedProperty.title}`
              : "No property matched yet"}{" "}
            · {ownerCount} owner{ownerCount === 1 ? "" : "s"} · CSV row {row.sourceRow}
          </p>
          {issue && !expanded ? (
            <p className="mt-1.5 text-xs font-medium text-amber-800">
              {issue}
            </p>
          ) : null}
          {row.deliveryMessage ? (
            <p className="mt-1.5 text-xs text-slate-600" role="status">
              {row.deliveryMessage}
            </p>
          ) : null}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          {[
            ["Inquiries", row.inquiries],
            ["Appointments", row.appointments],
            ["Showings", row.showings],
            ["Applications", row.applications],
          ].map(([label, value]) => (
            <div className="min-w-[72px] text-center" key={label}>
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <p className="text-sm font-bold tabular-nums text-slate-800">
                {value || "—"}
              </p>
            </div>
          ))}
        </div>

        <RowStatus issue={issue} row={row} />

        <button
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-600"
          onClick={onToggle}
          type="button"
        >
          {expanded ? "Close" : issue ? "Fix details" : "Review"}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {expanded ? (
        <div className="grid gap-6 border-t border-slate-200 bg-slate-50/60 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-xs font-bold text-slate-700">
                Matched property
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 disabled:bg-slate-100"
                  disabled={locked}
                  onChange={(event) =>
                    onPropertyChange(
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  value={row.propertyId ?? ""}
                >
                  <option value="">Select the correct property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Owner contact details are loaded from the selected property.
                You can correct them for this report below.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <OwnerReportRecipientsEditor
                disabled={locked}
                onChange={onOwnersChange}
                owners={row.owners}
              />
            </div>
            {issue ? (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800" role="status">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {issue}. This property will not be sent until corrected.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-bold text-slate-800">Selected week activity</h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric label="Inquiries" value={row.inquiries} />
                <Metric label="Appointments" value={row.appointments} />
                <Metric label="Showings" value={row.showings} />
                <Metric label="Applications" value={row.applications} />
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <MessageSquareText className="size-4" /> Feedback
                </p>
                <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {row.feedback || "No feedback was entered for this week."}
                </p>
              </div>
            </div>

            {hasTemplate ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-800">Message preview</p>
                <p className="mt-1 text-xs text-slate-500">
                  This is what the selected template will produce for this property.
                </p>
                <p className="mt-3 break-words text-sm font-semibold text-slate-900">
                  {previewSubject || "Add a subject to the template"}
                </p>
                <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {previewBody || "No message body"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
