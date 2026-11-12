"use client"

import { AlertCircle, Check, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"

import { templateValueOptions, type TemplateValueKey } from "@/lib/owner-report-csv"

type Mapping = Record<string, TemplateValueKey | "">

const sourceGroups: Array<{ label: string; values: TemplateValueKey[] }> = [
  { label: "Property / owner", values: ["propertyName", "ownerName", "ownerEmail", "ownerPhone"] },
  { label: "Weekly report", values: ["inquiries", "appointments", "showings", "applications", "feedback", "feedbackCount", "totalActivity"] },
  { label: "Dates", values: ["week", "reportPeriod", "fromDate", "toDate"] },
  { label: "Other", values: ["empty"] },
]

const sourceLabels = new Map(templateValueOptions.map((option) => [option.value, option.label]))

export function OwnerReportTemplateMapping({
  tokens,
  mapping,
  exampleValues,
  isSending,
  expanded,
  onToggle,
  onChange,
  onResetSuggestions,
}: {
  tokens: string[]
  mapping: Mapping
  exampleValues: Record<TemplateValueKey, string>
  isSending: boolean
  expanded: boolean
  onToggle: () => void
  onChange: (token: string, source: TemplateValueKey | "") => void
  onResetSuggestions: () => void
}) {
  const missing = tokens.filter((token) => !mapping[token])
  const ordered = [...missing, ...tokens.filter((token) => Boolean(mapping[token]))]

  if (!tokens.length) return null

  return (
    <section aria-label="Template variables" className="mt-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900">Variables</span>
          {missing.length ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
              <AlertCircle className="size-3.5" />
              {missing.length} needs matching
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700">
              <Check className="size-3.5" /> All matched
            </span>
          )}
          <span className="text-xs text-slate-400">{tokens.length} total</span>
        </div>
        <button
          aria-controls="owner-template-mapping-details"
          aria-expanded={expanded}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
          onClick={onToggle}
          type="button"
        >
          {expanded ? "Hide" : "Edit mapping"}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100" id="owner-template-mapping-details">
          <div className="divide-y divide-slate-100">
            {ordered.map((token) => {
              const source = mapping[token] ?? ""
              const example = source === "empty" ? "Removed from message" : source
                ? exampleValues[source] || "No value available" : "Choose a value"
              return (
                <div
                  className="grid items-center gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-4"
                  key={token}
                >
                  <label className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-700" htmlFor={"owner-field-source-" + token}>
                    <code className="break-all font-mono text-[11px] text-slate-800">{"{{" + token + "}}"}</code>
                    {!source ? <span className="text-[11px] text-amber-700">Required</span> : null}
                  </label>
                  <div className="flex min-w-0 items-center gap-2">
                    <select
                      aria-label={"Value for " + token}
                      className={"h-9 min-w-0 flex-1 rounded-lg border bg-white px-2.5 text-xs text-slate-800 outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 " +
                        (source ? "border-slate-200" : "border-amber-300")}
                      disabled={isSending}
                      id={"owner-field-source-" + token}
                      onChange={(event) => onChange(token, event.target.value as TemplateValueKey | "")}
                      value={source}
                    >
                      <option value="">Choose value...</option>
                      {sourceGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.values.map((value) => (
                            <option key={value} value={value}>{sourceLabels.get(value) ?? value}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <span className="hidden max-w-40 truncate text-[11px] text-slate-400 lg:block" title={example}>
                      {example}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
            <p className="text-[11px] text-slate-400">Owner details from properties · weekly data from CSV</p>
            <button
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:opacity-50"
              disabled={isSending}
              onClick={onResetSuggestions}
              type="button"
            >
              <RotateCcw className="size-3" /> Auto-match
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
