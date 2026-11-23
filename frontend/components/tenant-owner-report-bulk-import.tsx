"use client"

import Link from "next/link"
import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileUp,
  Mail,
  MessageSquareText,
  RotateCcw,
  Search,
  Send,
  UploadCloud,
} from "lucide-react"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"
import { OwnerReportCsvReviewRow } from "@/components/owner-report-csv-review-row"
import { OwnerReportTemplateMapping } from "@/components/owner-report-template-mapping"
import {
  serializeOwnerDrafts,
  type ReportOwnerDraft,
} from "@/lib/owner-report-contacts"
import {
  buildPreparedRows,
  ownerDetails,
  replaceRow,
  rowIssue,
  templateValues,
  type PreparedRow,
} from "@/lib/owner-report-csv-workflow"
import {
  defaultTemplateSource,
  extractTemplateTokens,
  parseWeeklyOwnerReportCsv,
  renderTemplateWithMapping,
  type OwnerReportWeek,
  type TemplateValueKey,
} from "@/lib/owner-report-csv"
import {
  sendTenantOwnerReport,
  type TenantProperty,
} from "@/lib/tenant-dashboard-actions"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"

type ReviewFilter = "all" | "ready" | "attention" | "queued"
type TemplateMapping = Record<string, TemplateValueKey | "">

const MAX_CSV_BYTES = 10 * 1024 * 1024

function automaticMapping(template: AgencyCommunicationTemplateItem): TemplateMapping {
  const tokens = extractTemplateTokens(template.subject, template.body)
  // A new {{feedback}} condition must take priority over legacy feedback1/2/3
  // placeholders; otherwise the guard would always be mapped to an empty value.
  const primaryFeedbackToken = tokens.includes("feedback")
    ? "feedback"
    : tokens.find((token) => defaultTemplateSource(token) === "feedback")

  return Object.fromEntries(
    tokens.map((token) => {
      const source = defaultTemplateSource(token)
      // Several feedback placeholders must not copy the same feedback repeatedly.
      if (source === "feedback" && token !== primaryFeedbackToken) {
        return [token, "empty"]
      }
      return [token, source]
    })
  ) as TemplateMapping
}

function StepHeading({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-xs font-bold text-white">
        {String(step).padStart(2, "0")}
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string
  value: number
  detail: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${
      accent ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"
    }`}>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${
        accent ? "text-teal-800" : "text-slate-900"
      }`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

export function TenantOwnerReportBulkImport({
  properties,
}: {
  properties: TenantProperty[]
}) {
  const templatesQuery = useLeadOutreachTemplates()
  const ownerTemplates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (item) => item.audience === "OwnerFeedback" && item.isActive !== false
      ),
    [templatesQuery.data]
  )

  const [templateId, setTemplateId] = useState("")
  const [week, setWeek] = useState<OwnerReportWeek>(1)
  const selectedWeekRef = useRef<OwnerReportWeek>(1)
  const [csvText, setCsvText] = useState("")
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<PreparedRow[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [parseError, setParseError] = useState("")
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [mapping, setMapping] = useState<TemplateMapping>({})
  const [showMapping, setShowMapping] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [visibleLimit, setVisibleLimit] = useState(25)
  const [isDragging, setIsDragging] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ done: 0, total: 0 })
  const [sendSummary, setSendSummary] = useState("")

  const propertyLookup = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties]
  )
  const selectedTemplate = ownerTemplates.find((item) => item.id === templateId)
  const previewRow = rows.find((row) => row.selected) ?? rows[0]
  const previewValues = previewRow
    ? { ...templateValues(previewRow, week), fromDate, toDate }
    : {
        propertyName: "Example property",
        inquiries: "5",
        appointments: "3",
        showings: "2",
        applications: "1",
        feedback: "Example buyer feedback for this property.",
        week: String(week),
        reportPeriod: `Week ${week}`,
        ownerName: "Example owner",
        ownerEmail: "owner@example.com",
        ownerPhone: "Example phone number",
        fromDate: fromDate || "Start date",
        toDate: toDate || "End date",
        totalActivity: "11",
        feedbackCount: "1",
        empty: "",
      }
  const previewSubject = selectedTemplate
    ? renderTemplateWithMapping(selectedTemplate.subject, mapping, previewValues)
    : ""
  const previewBody = selectedTemplate
    ? renderTemplateWithMapping(selectedTemplate.body, mapping, previewValues)
    : ""
  const templateTokens = useMemo(
    () =>
      selectedTemplate
        ? extractTemplateTokens(selectedTemplate.subject, selectedTemplate.body)
        : [],
    [selectedTemplate]
  )

  const applyTemplate = useCallback((template: AgencyCommunicationTemplateItem) => {
    const nextMapping = automaticMapping(template)
    setMapping(nextMapping)
    setShowMapping(Object.values(nextMapping).some((value) => !value))
    setEmailEnabled(template.channels?.includes("Email") ?? true)
    setSmsEnabled(template.channels?.includes("SMS") ?? false)
    setSendSummary("")
  }, [])

  // Most workspaces have just one active owner feedback template.
  // Pick it automatically so uploading a CSV is the first real task.
  useEffect(() => {
    if (templateId || !ownerTemplates.length) return
    const first = ownerTemplates[0]
    setTemplateId(first.id)
    applyTemplate(first)
  }, [applyTemplate, ownerTemplates, templateId])

  const unresolvedTokens = templateTokens.filter((token) => !mapping[token])
  const needsFromDate = templateTokens.some(
    (token) => mapping[token] === "fromDate"
  )
  const needsToDate = templateTokens.some(
    (token) => mapping[token] === "toDate"
  )
  const missingPeriodDates =
    (needsFromDate && !fromDate) ||
    (needsToDate && !toDate) ||
    Boolean(fromDate && toDate && fromDate > toDate)

  const readyRows = rows.filter(
    (row) =>
      row.deliveryStatus !== "queued" &&
      !rowIssue(row, emailEnabled, smsEnabled)
  )
  const attentionRows = rows.filter(
    (row) =>
      row.deliveryStatus !== "queued" &&
      Boolean(rowIssue(row, emailEnabled, smsEnabled))
  )
  const queuedCount = rows.filter(
    (row) => row.deliveryStatus === "queued"
  ).length
  const sendableRows = readyRows.filter((row) => row.selected)
  const selectedBlockedCount = attentionRows.filter((row) => row.selected).length

  const visibleRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return rows.filter((row) => {
      const issue = rowIssue(row, emailEnabled, smsEnabled)
      if (reviewFilter === "attention" && !issue) return false
      if (
        reviewFilter === "ready" &&
        (issue || row.deliveryStatus === "queued")
      ) return false
      if (
        reviewFilter === "queued" &&
        row.deliveryStatus !== "queued"
      ) return false

      const matchedTitle = propertyLookup.get(row.propertyId ?? 0)?.title ?? ""
      return (
        !search ||
        row.propertyName.toLowerCase().includes(search) ||
        matchedTitle.toLowerCase().includes(search)
      )
    })
  }, [rows, reviewFilter, searchTerm, emailEnabled, smsEnabled, propertyLookup])

  function importCsv(text: string, nextWeek: OwnerReportWeek) {
    try {
      const parsed = parseWeeklyOwnerReportCsv(text, nextWeek)
      const prepared = buildPreparedRows(parsed.rows, properties)

      if (!prepared.length) {
        throw new Error(
          "No property rows were found. Check that the CSV has an address column and weekly activity."
        )
      }

      setRows(prepared)
      setWarnings(parsed.warnings)
      setParseError("")
      setReviewFilter("all")
      setSearchTerm("")
      setVisibleLimit(25)
      setSendSummary("")
      setSendProgress({ done: 0, total: 0 })
      setExpandedRowId(
        prepared.find((row) => rowIssue(row, emailEnabled, smsEnabled))?.id ??
          null
      )
    } catch (error) {
      setRows([])
      setWarnings([])
      setExpandedRowId(null)
      setParseError(
        error instanceof Error ? error.message : "Could not read this CSV."
      )
    }
  }

  async function handleFile(file?: File) {
    if (!file || isSending) return

    setParseError("")
    if (file.size > MAX_CSV_BYTES) {
      setParseError(
        "This file is over 10 MB. Split it into smaller CSV files before importing."
      )
      return
    }
    if (file.size === 0) {
      setParseError("This CSV is empty. Add your property rows and try again.")
      return
    }

    try {
      const text = await file.text()
      setCsvText(text)
      setFileName(file.name)
      // Reading a large CSV is asynchronous: use the latest chosen week,
      // not the week captured when the file read started.
      importCsv(text, selectedWeekRef.current)
    } catch {
      setParseError("Could not open this file. Export it as CSV and try again.")
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  function changeWeek(nextWeek: OwnerReportWeek) {
    if (isSending || nextWeek === week) return
    selectedWeekRef.current = nextWeek
    setWeek(nextWeek)
    if (csvText) importCsv(csvText, nextWeek)
  }

  function resetImport() {
    if (isSending) return
    setCsvText("")
    setFileName("")
    setRows([])
    setWarnings([])
    setParseError("")
    setSearchTerm("")
    setVisibleLimit(25)
    setExpandedRowId(null)
    setSendSummary("")
  }

  function updateProperty(row: PreparedRow, propertyId: number | null) {
    const property = propertyLookup.get(propertyId ?? 0)
    setRows((current) =>
      replaceRow(current, row.id, {
        propertyId,
        ...ownerDetails(property),
        deliveryStatus: "idle",
        deliveryMessage: "",
      })
    )
  }

  function updateOwners(row: PreparedRow, nextOwners: ReportOwnerDraft[]) {
    const primary = nextOwners[0] ?? { name: "", email: "", phone: "" }
    setRows((current) =>
      replaceRow(current, row.id, {
        owners: nextOwners,
        ownerName: primary.name,
        ownerEmail: primary.email,
        ownerPhone: primary.phone,
        deliveryStatus: "idle",
        deliveryMessage: "",
      })
    )
  }

  async function sendReadyRows() {
    if (isSending) return
    setSendSummary("")

    if (!selectedTemplate) {
      setSendSummary("Select an Owner Feedback template before sending.")
      return
    }
    if (!emailEnabled && !smsEnabled) {
      setSendSummary("Choose Email, SMS, or both.")
      return
    }
    if (unresolvedTokens.length) {
      setShowMapping(true)
      setSendSummary("Match the remaining template variables before sending.")
      return
    }
    if (missingPeriodDates) {
      setSendSummary("Complete the required reporting period dates.")
      return
    }

    const candidates = rows.filter(
      (row) =>
        row.selected &&
        row.deliveryStatus !== "queued" &&
        !rowIssue(row, emailEnabled, smsEnabled)
    )

    if (!candidates.length) {
      setSendSummary("No ready, unsent properties are selected.")
      return
    }

    setIsSending(true)
    setSendProgress({ done: 0, total: candidates.length })

    let queued = 0
    let failed = 0

    for (const [index, row] of candidates.entries()) {
      setRows((current) =>
        replaceRow(current, row.id, {
          deliveryStatus: "sending",
          deliveryMessage: "Adding this property's report to the queue…",
        })
      )

      const values = { ...templateValues(row, week), fromDate, toDate }
      const subject = renderTemplateWithMapping(
        selectedTemplate.subject,
        mapping,
        values
      ).trim()
      const body = renderTemplateWithMapping(
        selectedTemplate.body,
        mapping,
        values
      )

      try {
        const report = await sendTenantOwnerReport({
          propertyId: row.propertyId && row.propertyId > 0 ? row.propertyId : null,
          managedPropertyId:
            propertyLookup.get(row.propertyId ?? 0)?.managedPropertyId ?? null,
          owners: serializeOwnerDrafts(row.owners),
          ownerName: row.ownerName.trim(),
          ownerEmail: row.ownerEmail.trim(),
          ownerPhone: row.ownerPhone.trim(),
          subject,
          body,
          channels: [
            ...(emailEnabled ? ["Email"] : []),
            ...(smsEnabled ? ["SMS"] : []),
          ],
        })

        queued += 1
        setRows((current) =>
          replaceRow(current, row.id, {
            deliveryStatus: "queued",
            deliveryMessage: `Report #${report.id} queued for ${row.owners.length} owner${row.owners.length === 1 ? "" : "s"}.`,
          })
        )
      } catch (error) {
        failed += 1
        setRows((current) =>
          replaceRow(current, row.id, {
            deliveryStatus: "failed",
            deliveryMessage:
              error instanceof Error ? error.message : "Could not queue this report.",
          })
        )
      }
      setSendProgress({ done: index + 1, total: candidates.length })
    }

    setIsSending(false)
    setSendSummary(
      `${queued} property report${queued === 1 ? "" : "s"} queued.` +
        (failed
          ? ` ${failed} failed; open those rows and retry.`
          : " You can track delivery in Sent report history.")
    )
  }

  const canSend =
    Boolean(selectedTemplate) &&
    sendableRows.length > 0 &&
    unresolvedTokens.length === 0 &&
    !missingPeriodDates &&
    (emailEnabled || smsEnabled) &&
    !isSending

  return (
    <section aria-label="CSV owner report import" className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { number: "01", title: "Set up CSV", done: rows.length > 0 },
          { number: "02", title: "Check properties", done: rows.length > 0 && attentionRows.length === 0 },
          { number: "03", title: "Send reports", done: rows.length > 0 && queuedCount === rows.length },
        ].map((step) => (
          <div
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-4"
            key={step.number}
          >
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              step.done ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {step.done ? <Check className="size-3.5" /> : step.number}
            </span>
            <span className="text-[11px] font-semibold text-slate-700 sm:text-sm">
              {step.title}
            </span>
          </div>
        ))}
      </div>

      <section aria-labelledby="csv-setup-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div id="csv-setup-title">
          <StepHeading
            description="Choose the message, select the week, and drop in your spreadsheet export."
            step={1}
            title="Set up your CSV"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
          <span className="mr-1 text-xs font-semibold text-slate-600">CSV templates</span>
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            download="owner-report-blank.csv"
            href="/owner-report-blank.csv"
          >
            <Download className="size-3.5" /> Blank
          </a>
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            download="owner-report-demo.csv"
            href="/owner-report-demo.csv"
          >
            <Download className="size-3.5" /> Example
          </a>
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-teal-700"
            download="owner-report-grouped.csv"
            href="/owner-report-grouped.csv"
          >
            Grouped format
          </a>
          <span className="ml-auto text-[11px] text-slate-400">Weeks 1–4</span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="owner-csv-template">
              Owner feedback template
            </label>
            <select
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 disabled:bg-slate-100"
              disabled={isSending || templatesQuery.isLoading}
              id="owner-csv-template"
              onChange={(event) => {
                const nextId = event.target.value
                const template = ownerTemplates.find((item) => item.id === nextId)
                setTemplateId(nextId)
                if (template) applyTemplate(template)
              }}
              value={templateId}
            >
              {!templateId ? <option value="">Choose a template</option> : null}
              {ownerTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {!templatesQuery.isLoading && ownerTemplates.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-amber-800">
                No active Owner Feedback template found. Create one in Agency Settings.
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">
              Which week should be sent?
            </legend>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as OwnerReportWeek[]).map((value) => (
                <button
                  aria-pressed={week === value}
                  className={`h-10 rounded-lg border text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    week === value
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-400"
                  }`}
                  disabled={isSending}
                  key={value}
                  onClick={() => changeWeek(value)}
                  type="button"
                >
                  Week {value}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {selectedTemplate ? (
          <OwnerReportTemplateMapping
            tokens={templateTokens}
            mapping={mapping}
            exampleValues={previewValues}
            isSending={isSending}
            expanded={showMapping}
            onToggle={() => setShowMapping((current) => !current)}
            onChange={(token, source) =>
              setMapping((current) => ({ ...current, [token]: source }))
            }
            onResetSuggestions={() => setMapping(automaticMapping(selectedTemplate))}
          />
        ) : null}

        {(needsFromDate || needsToDate) ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {needsFromDate ? (
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Report period starts
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  disabled={isSending}
                  max={toDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  type="date"
                  value={fromDate}
                />
              </label>
            ) : null}
            {needsToDate ? (
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Report period ends
                <input
                  className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  disabled={isSending}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  type="date"
                  value={toDate}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {missingPeriodDates ? (
          <p className="mt-3 text-xs font-semibold text-amber-800">
            Complete the reporting dates used by your template before sending.
          </p>
        ) : null}

        {selectedTemplate ? (
          <details className="group mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <Mail className="size-4 shrink-0 text-teal-700" />
                <span className="shrink-0 font-semibold text-slate-900">Email preview</span>
                <span className="hidden truncate text-slate-500 sm:inline">{previewSubject || "No subject"}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-slate-500">
                {previewRow ? "CSV data" : "Sample data"}
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Subject:</span>
                <span className="break-words font-medium text-slate-900">{previewSubject || "No subject"}</span>
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-700">
                {previewBody || "No message body"}
              </div>
              {unresolvedTokens.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  Match the remaining variables before sending: {unresolvedTokens.join(", ")}.
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-slate-400">Preview only — nothing is sent until you confirm.</p>
            </div>
          </details>
        ) : null}

        <label
          className={`mt-4 flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-dashed px-3 py-3 text-left transition-colors focus-within:ring-2 focus-within:ring-teal-700/20 sm:px-4 ${
            isDragging
              ? "border-teal-600 bg-teal-50"
              : fileName
                ? "border-teal-200 bg-teal-50/60"
                : "border-slate-300 bg-slate-50 hover:border-teal-500 hover:bg-teal-50/50"
          }`}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700">
            {fileName ? <FileSpreadsheet className="size-4.5" /> : <UploadCloud className="size-4.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-all text-sm font-semibold text-slate-900">
              {fileName || "Upload your weekly CSV"}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {fileName ? `${rows.length} properties imported` : "Drag and drop, or choose a CSV · Max 10 MB"}
            </span>
          </span>
          <input
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            disabled={isSending}
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.target.value = ""
            }}
            type="file"
          />
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-800">
            <FileUp className="size-3.5" />
            {fileName ? "Replace" : "Choose file"}
          </span>
        </label>

        {fileName ? (
          <div className="mt-3 flex justify-end">
            <button
              className="text-xs font-semibold text-slate-500 transition-colors hover:text-rose-700"
              disabled={isSending}
              onClick={resetImport}
              type="button"
            >
              Remove uploaded file
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-700">Send via</p>
          <div className="flex flex-wrap gap-2">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
              emailEnabled
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}>
              <input
                checked={emailEnabled}
                className="accent-teal-700"
                disabled={isSending}
                onChange={(event) => setEmailEnabled(event.target.checked)}
                type="checkbox"
              />
              <Mail className="size-4" /> Email
            </label>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
              smsEnabled
                ? "border-teal-200 bg-teal-50 text-teal-900"
                : "border-slate-200 bg-white text-slate-600"
            }`}>
              <input
                checked={smsEnabled}
                className="accent-teal-700"
                disabled={isSending}
                onChange={(event) => setSmsEnabled(event.target.checked)}
                type="checkbox"
              />
              <MessageSquareText className="size-4" /> SMS
            </label>
          </div>
          <p className="w-full text-[11px] text-slate-400">
            One report per property, even with multiple owners.
          </p>
          {!emailEnabled && !smsEnabled ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Select at least one delivery channel to continue.
            </p>
          ) : null}
        </div>

        {templatesQuery.error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            Could not load templates: {templatesQuery.error.message}
          </p>
        ) : null}
        {parseError ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {parseError}
          </p>
        ) : null}
        {warnings.length ? (
          <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-amber-900">
              {warnings.length} CSV import note{warnings.length === 1 ? "" : "s"} — view details
            </summary>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {rows.length > 0 ? (
        <section aria-labelledby="csv-review-title" className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)] sm:p-7">
            <div id="csv-review-title">
              <StepHeading
                description="Matched properties are ready to go. Open only the rows that need a correction."
                step={2}
                title="Check your properties"
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryTile detail="From your CSV" label="Imported" value={rows.length} />
              <SummaryTile accent detail="Valid contact details" label="Ready to send" value={readyRows.length} />
              <SummaryTile detail="Correct before sending" label="Need attention" value={attentionRows.length} />
              <SummaryTile detail="Already added to queue" label="Queued" value={queuedCount} />
            </div>

            {attentionRows.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">
                  {attentionRows.length} {attentionRows.length === 1 ? "property needs" : "properties need"} attention.
                  These rows will not be sent until fixed.
                </p>
                <button
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline underline-offset-2"
                  onClick={() => setReviewFilter("attention")}
                  type="button"
                >
                  Show only problems <ArrowRight className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CircleCheck className="size-4" />
                All imported properties have valid contacts for the chosen channels.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div aria-label="Filter imported rows" className="flex flex-wrap gap-2">
                {([
                  ["all", "All", rows.length],
                  ["attention", "Needs fix", attentionRows.length],
                  ["ready", "Ready", readyRows.length],
                  ["queued", "Queued", queuedCount],
                ] as const).map(([value, label, count]) => (
                  <button
                    aria-pressed={reviewFilter === value}
                    className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                      reviewFilter === value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    key={value}
                    onClick={() => {
                      setReviewFilter(value)
                      setVisibleLimit(25)
                    }}
                    type="button"
                  >
                    {label} <span className="ml-1 tabular-nums opacity-70">{count}</span>
                  </button>
                ))}
              </div>

              <label className="relative block w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <span className="sr-only">Search imported properties</span>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-600"
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setVisibleLimit(25)
                  }}
                  placeholder="Find a property…"
                  type="search"
                  value={searchTerm}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500">
                {rows.filter((row) => row.selected && row.deliveryStatus !== "queued").length} properties selected
                {" · "}Only selected, ready properties will be queued
              </p>
              <div className="flex gap-3">
                <button
                  className="text-xs font-bold text-teal-800 hover:underline disabled:opacity-40"
                  disabled={isSending}
                  onClick={() =>
                    setRows((current) =>
                      current.map((row) => row.deliveryStatus === "queued"
                        ? row
                        : { ...row, selected: !rowIssue(row, emailEnabled, smsEnabled) })
                    )
                  }
                  type="button"
                >
                  Select all ready
                </button>
                <button
                  className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-40"
                  disabled={isSending}
                  onClick={() =>
                    setRows((current) =>
                      current.map((row) =>
                        row.deliveryStatus === "queued" ? row : { ...row, selected: false }
                      )
                    )
                  }
                  type="button"
                >
                  Deselect all
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {visibleRows.slice(0, visibleLimit).map((row) => {
              const issue = rowIssue(row, emailEnabled, smsEnabled)
              const property = propertyLookup.get(row.propertyId ?? 0)
              const expanded = row.id === expandedRowId
              const values = expanded
                ? { ...templateValues(row, week), fromDate, toDate }
                : null

              return (
                <OwnerReportCsvReviewRow
                  disabled={isSending}
                  expanded={expanded}
                  hasTemplate={Boolean(selectedTemplate)}
                  issue={issue}
                  key={row.id}
                  matchedProperty={property}
                  onOwnersChange={(nextOwners) => updateOwners(row, nextOwners)}
                  onPropertyChange={(id) => updateProperty(row, id)}
                  onSelect={(selected) =>
                    setRows((current) =>
                      replaceRow(current, row.id, { selected })
                    )
                  }
                  onToggle={() =>
                    setExpandedRowId((current) =>
                      current === row.id ? null : row.id
                    )
                  }
                  previewBody={
                    selectedTemplate && values
                      ? renderTemplateWithMapping(
                          selectedTemplate.body,
                          mapping,
                          values
                        )
                      : ""
                  }
                  previewSubject={
                    selectedTemplate && values
                      ? renderTemplateWithMapping(
                          selectedTemplate.subject,
                          mapping,
                          values
                        )
                      : ""
                  }
                  properties={properties}
                  row={row}
                />
              )
            })}
            {visibleRows.length > visibleLimit ? (
              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-teal-800 hover:border-teal-300 hover:bg-teal-50"
                onClick={() => setVisibleLimit((current) => current + 25)}
                type="button"
              >
                Show more properties
                <span className="text-xs font-medium text-slate-500">
                  ({Math.min(visibleLimit, visibleRows.length)} of {visibleRows.length})
                </span>
                <ChevronDown className="size-4" />
              </button>
            ) : null}
            {!visibleRows.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <Search className="mx-auto size-6 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No properties match this filter.
                </p>
                <button
                  className="mt-2 text-xs font-bold text-teal-800 hover:underline"
                  onClick={() => {
                    setSearchTerm("")
                    setReviewFilter("all")
                  }}
                  type="button"
                >
                  Show all properties
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section aria-labelledby="csv-send-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.035)] sm:p-7">
          <div id="csv-send-title">
            <StepHeading
              description="Only the ready, selected properties below will be added to your delivery queue."
              step={3}
              title="Review and send"
            />
          </div>

          <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-teal-100 bg-teal-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-teal-950">
                {sendableRows.length} <span className="text-base">property report{sendableRows.length === 1 ? "" : "s"}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-teal-900/75">
                {emailEnabled && smsEnabled ? "Email and SMS" : emailEnabled ? "Email" : smsEnabled ? "SMS" : "No delivery channel"}
                {" · "}One report per property, delivered to all listed owners
              </p>
              {selectedBlockedCount ? (
                <p className="mt-2 text-xs font-semibold text-amber-800">
                  {selectedBlockedCount} selected {selectedBlockedCount === 1 ? "row needs" : "rows need"} fixing and will be skipped.
                </p>
              ) : null}
            </div>

            <button
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSend}
              onClick={() => void sendReadyRows()}
              type="button"
            >
              {isSending ? (
                <RotateCcw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isSending
                ? `Queuing ${sendProgress.done} of ${sendProgress.total}…`
                : `Queue ${sendableRows.length} report${sendableRows.length === 1 ? "" : "s"}`}
            </button>
          </div>

          {(!selectedTemplate || unresolvedTokens.length > 0 || missingPeriodDates || (!emailEnabled && !smsEnabled)) ? (
            <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-amber-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Complete the template, variable mapping, reporting dates, and delivery channel before sending.
            </p>
          ) : null}

          {sendSummary ? (
            <div aria-live="polite" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ClipboardCheck className="size-5 text-teal-700" />
                {sendSummary}
              </p>
              <Link className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline" href="/dashboard/owner-reports">
                Open report history <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Reports are queued, not marked delivered immediately. You can check each
            owner&apos;s delivery status in Sent report history.
          </p>
        </section>
      ) : null}
    </section>
  )
}
