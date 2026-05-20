"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ImportTabProps = {
  feedbackMappings: Record<string, string>
  feedbackRows: Array<Record<string, string>>
  feedbackHeaders: string[]
  feedbackBatchName: string
  isFeedbackImporting: boolean
  isShowingImporting: boolean
  onFeedbackBatchNameChange: (value: string) => void
  onFeedbackMappingChange: (key: string, value: string) => void
  onFeedbackUpload: (file: File) => void
  onImportFeedback: () => void
  onImportShowings: () => void
  onShowingUpload: (file: File) => void
  showingBatchName: string
  showingHeaders: string[]
  showingMappings: Record<string, string>
  showingRows: Array<Record<string, string>>
  onShowingBatchNameChange: (value: string) => void
  onShowingMappingChange: (key: string, value: string) => void
}

const empty = "__empty__"

const showingFields = [
  ["propertyTitle", "Property title"],
  ["propertyId", "Property id"],
  ["contactName", "Visitor name"],
  ["contactEmail", "Visitor email"],
  ["contactPhone", "Visitor phone"],
  ["startAt", "Showing date/time"],
  ["endAt", "End date/time"],
  ["showingAgentName", "Broker name"],
  ["showingAgentEmail", "Broker email"],
  ["showingAgentPhone", "Broker phone"],
  ["notes", "Notes"],
] as const

const feedbackFields = [
  ["propertyTitle", "Property title"],
  ["propertyId", "Property id"],
  ["leadEmail", "Lead email"],
  ["leadPhone", "Lead phone"],
  ["contactName", "Reply name"],
  ["contactEmail", "Reply email"],
  ["contactPhone", "Reply phone"],
  ["feedbackAt", "Feedback date"],
  ["sentiment", "Sentiment"],
  ["summary", "Short summary"],
  ["feedbackText", "Feedback body"],
  ["issues", "Issue tags"],
] as const

const fieldLabelMap = new Map<string, string>([...showingFields, ...feedbackFields].map(([value, label]) => [value, label]))

export function ImportsTab({
  feedbackBatchName,
  feedbackHeaders,
  feedbackMappings,
  feedbackRows,
  isFeedbackImporting,
  isShowingImporting,
  onFeedbackBatchNameChange,
  onFeedbackMappingChange,
  onFeedbackUpload,
  onImportFeedback,
  onImportShowings,
  onShowingBatchNameChange,
  onShowingMappingChange,
  onShowingUpload,
  showingBatchName,
  showingHeaders,
  showingMappings,
  showingRows,
}: ImportTabProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ImportCard
        batchName={showingBatchName}
        fields={showingFields}
        headers={showingHeaders}
        isImporting={isShowingImporting}
        mappings={showingMappings}
        onBatchNameChange={onShowingBatchNameChange}
        onImport={onImportShowings}
        onMappingChange={onShowingMappingChange}
        onUpload={onShowingUpload}
        rows={showingRows}
        title="Lead CRM showing import"
        description="Upload showing rows from CSV, map broker details, create showings, then queue feedback follow-up."
      />
      <ImportCard
        batchName={feedbackBatchName}
        fields={feedbackFields}
        headers={feedbackHeaders}
        isImporting={isFeedbackImporting}
        mappings={feedbackMappings}
        onBatchNameChange={onFeedbackBatchNameChange}
        onImport={onImportFeedback}
        onMappingChange={onFeedbackMappingChange}
        onUpload={onFeedbackUpload}
        rows={feedbackRows}
        title="Feedback import"
        description="Upload visit comments from broker sheets, external CRMs, or spreadsheets with partial mapping."
      />
    </div>
  )
}

function ImportCard({
  batchName,
  description,
  fields,
  headers,
  isImporting,
  mappings,
  onBatchNameChange,
  onImport,
  onMappingChange,
  onUpload,
  rows,
  title,
}: {
  batchName: string
  description: string
  fields: readonly (readonly [string, string])[]
  headers: string[]
  isImporting: boolean
  mappings: Record<string, string>
  onBatchNameChange: (value: string) => void
  onImport: () => void
  onMappingChange: (key: string, value: string) => void
  onUpload: (file: File) => void
  rows: Array<Record<string, string>>
  title: string
}) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{title}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <button
          className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          disabled={isImporting || rows.length === 0}
          onClick={onImport}
          type="button"
        >
          {isImporting ? "Importing..." : "Run Import"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="rounded-full border border-dashed border-slate-300 bg-[#f7f5f1] px-4 py-2 text-sm font-semibold text-slate-700">
          <input
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                onUpload(file)
              }
            }}
            type="file"
          />
          {"Upload CSV"}
        </label>
        <input
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-slate-200 px-4 text-sm"
          onChange={(event) => onBatchNameChange(event.target.value)}
          placeholder="Batch name"
          value={batchName}
        />
        <p className="text-sm text-slate-500">{`${rows.length} rows loaded`}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map(([key, label]) => (
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500" key={key}>
            <span>{label}</span>
            <Select onValueChange={(value) => onMappingChange(key, value === empty ? "" : value)} value={mappings[key] || empty}>
              <SelectTrigger>
                <SelectValue>{mappings[key] || fieldLabelMap.get(key) || "Skip column"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={empty}>{"Skip column"}</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={`${key}-${header}`} value={header}>{header}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f5f1] text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th className="px-4 py-3 font-bold" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, index) => (
                <tr className="border-t border-slate-200" key={`${title}-${index}`}>
                  {headers.map((header) => (
                    <td className="px-4 py-3 text-slate-700" key={`${title}-${index}-${header}`}>
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
