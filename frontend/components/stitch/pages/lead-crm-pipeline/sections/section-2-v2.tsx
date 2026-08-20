"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ReactSortable } from "react-sortablejs"
import Papa from "papaparse"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type {
  AgentUserOption,
  LeadImportInput,
  LeadItem,
  LeadStage,
  PropertyItem,
} from "@/hooks/use-real-estate-api"
import { useImportLeads } from "@/hooks/use-real-estate-api"
import { formatLeadPriority } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"
import { cn } from "@/lib/utils"

import { LeadDetailsPanel, LeadKanbanCard } from "./lead-detail-components"
import { LeadCancelDialog, LeadFormDialog } from "./lead-dialogs"
import { LeadOutreachDialog } from "./lead-outreach-dialog"
import type { LeadOutreachComposerValues, LeadOutreachMode } from "./lead-outreach-types"
import {
  boardLeadStages,
  type LeadFormValues,
  type LeadListFilter,
  leadStageMeta,
  leadStageOrder,
} from "./lead-shared"

type LeadView = "board" | "list"
const BOARD_PAGE_SIZE = 8
const paginatedBoardStages = new Set<LeadStage>([
  "New",
  "Contacted",
  "FollowUp",
  "Replied",
])
type LeadMappingKey = keyof LeadImportInput["mapping"]
type LeadDialogState =
  | {
      type: "cancel" | "create" | "edit" | LeadOutreachMode
      leadId?: number
    }
  | null

const emptyLeadMapping: LeadImportInput["mapping"] = {
  budget: "",
  combinedCreditScore: "",
  combinedMonthlyEarning: "",
  creditScore: "",
  monthlyEarning: "",
  email: "",
  interest: "",
  name: "",
  phone: "",
  property: "",
  source: "",
  summary: "",
  timeline: "",
}

const leadCsvFields: Array<{ aliases: string[]; key: LeadMappingKey; label: string }> = [
  { key: "name", label: "Name", aliases: ["name", "lead", "client"] },
  { key: "email", label: "Email", aliases: ["email"] },
  { key: "phone", label: "Phone", aliases: ["phone", "mobile"] },
  { key: "property", label: "Property", aliases: ["property", "address"] },
  { key: "budget", label: "Budget", aliases: ["budget", "price"] },
  { key: "creditScore", label: "Credit score", aliases: ["credit score", "credit"] },
  { key: "combinedCreditScore", label: "Combined credit score", aliases: ["combined credit", "combined score"] },
  { key: "monthlyEarning", label: "Monthly earning", aliases: ["monthly earning", "monthly income", "income"] },
  { key: "combinedMonthlyEarning", label: "Combined monthly earning", aliases: ["combined monthly earning", "combined monthly income", "household income"] },
  { key: "source", label: "Source", aliases: ["source"] },
  { key: "interest", label: "Interest", aliases: ["interest"] },
  { key: "timeline", label: "Timeline", aliases: ["timeline"] },
  { key: "summary", label: "Summary", aliases: ["summary", "note"] },
]

type Section2SectionProps = {
  createDialogVersion: number
  currentPage: number
  agentOptions: AgentUserOption[]
  dateFilter?: string
  errorMessage?: string | null
  isLoading: boolean
  isMutating: boolean
  boardLeads: LeadItem[]
  leads: LeadItem[]
  onCancelLead: (leadId: number, reason: string) => Promise<string | null>
  onCommunicate: (
    leadId: number,
    mode: LeadOutreachMode,
    values: LeadOutreachComposerValues,
  ) => Promise<string | null>
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onDateFilterChange: (value: string) => void
  onDeleteLeads: (ids: number[]) => Promise<string | null>
  onCreateLead: (values: LeadFormValues) => Promise<string | null>
  onPageChange: (page: number) => void
  onSearchChange: (value: string) => void
  onStageFilterChange: (value: LeadListFilter) => void
  onSetLeadBoard: (leadId: number, inBoard: boolean) => Promise<void>
  onStageChange: (leadId: number, stage: LeadStage) => Promise<void>
  onUpdateLead: (leadId: number, values: LeadFormValues) => Promise<string | null>
  propertyOptions: PropertyItem[]
  searchTerm?: string
  stageFilter: LeadListFilter
  totalPages: number
  totalResults: number
}

function buildHistoryHref(baseHref: string, leadId: number) {
  return `${baseHref}${baseHref.includes("?") ? "&" : "?"}leadId=${leadId}`
}

export function Section2Section({
  agentOptions,
  createDialogVersion,
  currentPage,
  dateFilter,
  errorMessage,
  isLoading,
  isMutating,
  boardLeads,
  leads,
  onCancelLead,
  onCommunicate,
  onConvertLeadToDeal,
  onDateFilterChange,
  onDeleteLeads,
  onCreateLead,
  onPageChange,
  onSearchChange,
  onStageFilterChange,
  onSetLeadBoard,
  onStageChange,
  onUpdateLead,
  propertyOptions,
  searchTerm,
  stageFilter,
  totalPages,
  totalResults,
}: Section2SectionProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<LeadView>("list")
  const [boardStagePages, setBoardStagePages] = useState<Partial<Record<LeadStage, number>>>({})
  const [dialogState, setDialogState] = useState<LeadDialogState>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([])
  const [csvMapping, setCsvMapping] = useState({ ...emptyLeadMapping })
  const [csvMessage, setCsvMessage] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const importLeadsMutation = useImportLeads()

  useEffect(() => {
    if (createDialogVersion > 0) {
      setDialogState({ type: "create" })
    }
  }, [createDialogVersion])

  useEffect(() => {
    const existing = new Set(leads.map((lead) => lead.id))
    setSelectedIds((current) => current.filter((id) => existing.has(id)))
  }, [leads])

  useEffect(() => {
    const rawLeadId = searchParams.get("leadId")
    const parsedLeadId = rawLeadId ? Number(rawLeadId) : Number.NaN

    if (!Number.isFinite(parsedLeadId)) return

    setSelectedLeadId(parsedLeadId)
  }, [searchParams])

  function toggleSelect(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  function toggleSelectPage() {
    setSelectedIds((current) => {
      const present = pageIds.filter((id) => current.includes(id))
      if (present.length === pageIds.length && pageIds.length > 0) {
        return current.filter((id) => !pageIds.includes(id))
      }
      return [...new Set([...current, ...pageIds])]
    })
  }

  async function confirmDeleteLeads() {
    const error = await onDeleteLeads(selectedIds)
    if (error) {
      setDeleteMessage(error)
      return
    }
    setDeleteMessage(null)
    setSelectedIds([])
    setSelectedLeadId((current) => current && selectedIds.includes(current) ? null : current)
    setDeleteConfirmOpen(false)
  }

  function downloadLeadsCsv(rows: LeadItem[], fileName: string) {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Date",
      "Property",
      "Stage",
      "Priority",
      "Source",
      "Interest",
      "Budget",
      "Credit Score",
      "Monthly Earning",
      "Timeline",
      "Last Activity",
      "Notes",
    ]
    const escapeCell = (value: unknown) => {
      const text = `${value ?? ""}`
      return `"${text.replace(/"/g, "\"\"")}"`
    }
    const lines = [headers.map(escapeCell).join(",")]
    for (const lead of rows) {
      lines.push(
        [
          lead.name,
          lead.email,
          lead.phone,
          lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "",
          lead.property,
          lead.stage,
          lead.priority,
          lead.source,
          lead.interest,
          lead.budget,
          lead.creditScore,
          lead.monthlyEarning,
          lead.timeline,
          lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString() : "",
          (lead.notes ?? []).join(" | "),
        ].map(escapeCell).join(","),
      )
    }
    const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportSelectedLeadsCsv() {
    const selected = leads.filter((lead) => selectedIds.includes(lead.id))
    if (!selected.length) {
      setCsvMessage("Select at least one lead to export.")
      return
    }
    downloadLeadsCsv(selected, `selected-leads-${new Date().toISOString().slice(0, 10)}.csv`)
    setCsvMessage(`Exported ${selected.length} selected lead${selected.length === 1 ? "" : "s"} to CSV.`)
  }

  async function setSelectedBoard(inBoard: boolean) {
    await Promise.all(selectedIds.map((leadId) => onSetLeadBoard(leadId, inBoard)))
  }

  async function exportLeadsCsv() {
    setExporting(true)
    try {
      const rows: LeadItem[] = []
      const pageSize = 200
      let page = 1
      let totalCount = Infinity
      while (rows.length < totalCount && page <= 200) {
        const params = new URLSearchParams()
        if (searchTerm?.trim()) params.set("search", searchTerm.trim())
        if (dateFilter) params.set("date", dateFilter)
        params.set("page", String(page))
        params.set("pageSize", String(pageSize))
        const response = await fetch(`/api/proxy/leads?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch leads for export.")
        const data = await response.json()
        const items = Array.isArray(data?.items) ? data.items : []
        totalCount = Number(data?.totalCount ?? items.length)
        rows.push(...items)
        if (items.length < pageSize) break
        page += 1
      }
      if (rows.length === 0) {
        setCsvMessage("No leads match the current filters to export.")
        return
      }
      downloadLeadsCsv(rows, dateFilter
        ? `leads-${dateFilter}.csv`
        : `leads-export-${new Date().toISOString().slice(0, 10)}.csv`)
      setCsvMessage(`Exported ${rows.length} lead${rows.length === 1 ? "" : "s"} to CSV.`)
    } catch (error) {
      setCsvMessage(error instanceof Error ? error.message : "Export failed.")
    } finally {
      setExporting(false)
    }
  }

  function downloadLeadSample() {
    const sample = "name,email,phone,property,budget,creditScore,combinedCreditScore,monthlyEarning,combinedMonthlyEarning,source,interest,timeline,summary\nBradley Weneck,bradley@example.com,754-223-9582,6750 Royal Palm Blvd #209E,$2500/mo,710,690,$6500,$11000,Zillow,Rent,Immediate,Interested in applying\n"
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "leads-sample.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  function parseLeadCsv(file?: File) {
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      complete: (result) => {
        const headers = result.meta.fields ?? []
        const normalized = headers.map((header) => ({ header, text: header.toLowerCase().replace(/[_-]+/g, " ").trim() }))
        setCsvHeaders(headers)
        setCsvRows(result.data.filter((row) => Object.values(row).some((value) => `${value ?? ""}`.trim())))
        setCsvMapping(leadCsvFields.reduce((next, field) => {
          next[field.key] = normalized.find((item) => field.aliases.some((alias) => item.text === alias || item.text.includes(alias)))?.header ?? ""
          return next
        }, { ...emptyLeadMapping }))
      },
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    })
  }

  async function importLeadRows() {
    const response = await importLeadsMutation.mutateAsync({ mapping: csvMapping, rows: csvRows })
    if (response.error) {
      setCsvMessage(response.error.message)
      return
    }
    setCsvMessage(response.data ? `${response.data.createdCount} leads saved. ${response.data.failedCount} failed.` : null)
    setCsvHeaders([])
    setCsvRows([])
    setCsvMapping({ ...emptyLeadMapping })
  }

  const boardColumns = useMemo(
    () =>
      boardLeadStages.reduce((columns, stage) => {
        columns[stage] = boardLeads.filter((lead) => lead.inBoard && lead.stage === stage)
        return columns
      }, {} as Record<LeadStage, LeadItem[]>),
    [boardLeads],
  )

  const availableLeads = useMemo(() => {
    const byId = new Map<number, LeadItem>()
    boardLeads.forEach((lead) => byId.set(lead.id, lead))
    leads.forEach((lead) => byId.set(lead.id, lead))
    return [...byId.values()]
  }, [boardLeads, leads])

  function removeLeadFromBoard(leadId: number) {
    return onSetLeadBoard(leadId, false)
  }

  function setBoardStagePage(stage: LeadStage, page: number) {
    setBoardStagePages((current) => ({ ...current, [stage]: Math.max(1, page) }))
  }

  const orderedLeads = useMemo(
    () =>
      [...leads]
        .filter((lead) =>
          stageFilter === "all" ||
          (stageFilter === "not-listed"
            ? lead.propertyListingStatus === "NotListed"
            : lead.stage === stageFilter),
        )
        .sort((left, right) => {
          const leftDate = new Date(left.lastActivityAt ?? left.createdAt ?? 0).getTime()
          const rightDate = new Date(right.lastActivityAt ?? right.createdAt ?? 0).getTime()
          const dateDelta =
            (Number.isFinite(rightDate) ? rightDate : 0) -
            (Number.isFinite(leftDate) ? leftDate : 0)
          if (dateDelta !== 0) return dateDelta
          return right.id - left.id
        }),
    [leads, stageFilter],
  )

  const pageIds = useMemo(
    () => orderedLeads.map((lead) => lead.id),
    [orderedLeads],
  )
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  const selectedLead = useMemo(
    () => availableLeads.find((lead) => lead.id === selectedLeadId) ?? null,
    [availableLeads, selectedLeadId],
  )

  const dialogLead = useMemo(
    () => availableLeads.find((lead) => lead.id === dialogState?.leadId) ?? null,
    [availableLeads, dialogState?.leadId],
  )

  const stats = useMemo(
    () => [
      {
        label: "All leads",
        value: `${totalResults}`,
        detail: "Tracked inside CRM",
        icon: "group",
      },
      {
        label: "On board",
        value: `${boardLeads.filter((lead) => lead.inBoard && lead.stage !== "Canceled").length}`,
        detail: "Active follow-up board",
        icon: "view_kanban",
      },
      {
        label: "Converted to deal",
        value: `${leads.filter((lead) => lead.stage === "Deal").length}`,
        detail: "Pushed into deal pipeline",
        icon: "partner_exchange",
      },
      {
        label: "Overdue",
        value: `${leads.filter((lead) => lead.isFollowUpOverdue).length}`,
        detail: "Need follow-up now",
        icon: "notification_important",
      },
    ],
    [boardLeads, leads, totalResults],
  )

  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 pt-6 sm:p-6 sm:pt-7 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1">
            <div className="inline-flex self-start rounded-lg bg-[var(--ether-surface-container)] p-1">
            <button
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
                viewMode === "board"
                  ? "bg-white text-[var(--ether-on-surface)] shadow-sm"
                  : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]",
              )}
              onClick={() => setViewMode("board")}
              type="button"
            >
              <AppIcon className="text-lg" name="view_kanban" />
              Board
            </button>
            <button
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-white text-[var(--ether-on-surface)] shadow-sm"
                  : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]",
              )}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <AppIcon className="text-lg" name="view_list" />
              List
            </button>
          </div>
            <div className="relative min-w-0 flex-1">
              <AppIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--ether-outline)]" name="search" />
              <Input
                aria-label="Search leads"
                className="h-10 w-full rounded-lg border-[var(--ether-outline-variant)] bg-white pl-9 text-sm shadow-[var(--shadow-surface-1)]"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name, email, phone, property…"
                value={searchTerm ?? ""}
              />
            </div>
            <div className="flex items-center gap-2 md:w-auto">
              <Label className="shrink-0 text-xs font-bold text-[var(--ether-on-surface-variant)]" htmlFor="lead-mail-date-filter">Mail date</Label>
              <Input
                aria-label="Filter leads by mail date"
                className="h-10 w-full rounded-lg border-[var(--ether-outline-variant)] bg-white text-sm shadow-[var(--shadow-surface-1)] md:w-44"
                id="lead-mail-date-filter"
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => onDateFilterChange(event.target.value)}
                title="Show leads whose latest mail activity happened on this day"
                type="date"
                value={dateFilter ?? ""}
              />
              {dateFilter ? <Button onClick={() => onDateFilterChange("")} size="sm" type="button" variant="ghost">Clear</Button> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-10 rounded-lg border-[var(--ether-secondary)] bg-transparent px-4 font-semibold text-[var(--ether-secondary)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_20%,white)]"
              onClick={() => void exportLeadsCsv()}
              type="button"
              variant="outline"
            >
              <AppIcon name="download" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button
              className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold text-[var(--ether-on-surface-variant)] shadow-[var(--shadow-surface-1)]"
              onClick={downloadLeadSample}
              type="button"
              variant="outline"
            >
              <AppIcon name="description" />
              Sample CSV
            </Button>
            <Button
              className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold text-[var(--ether-on-surface-variant)] shadow-[var(--shadow-surface-1)]"
              onClick={() => setImportOpen(true)}
              type="button"
              variant="outline"
            >
              <AppIcon name="upload_file" />
              Import CSV
            </Button>
            <Button
              className="h-10 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)] hover:bg-[var(--ether-primary-container)]"
              onClick={() => setDialogState({ type: "create" })}
              type="button"
            >
              <AppIcon name="person_add" />
              Add lead
            </Button>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card className={cn("relative h-[188px] overflow-hidden rounded-[24px] border-0 bg-white shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]", stat.label === "Overdue" && "border-b-4 border-b-[color-mix(in_srgb,var(--ether-error)_24%,transparent)]")} key={stat.label}>
              <CardHeader className="flex h-full flex-row items-start justify-between space-y-0 p-6">
                <div>
                  <CardDescription className={cn("ether-label-caps", stat.label === "Overdue" ? "text-[var(--ether-error)]" : "text-[var(--ether-on-surface-variant)]")}>{stat.label}</CardDescription>
                  <CardTitle className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">{stat.value}</CardTitle>
                  <p className="mt-3 max-w-44 pr-2 text-sm leading-5 text-[var(--ether-on-surface-variant)]">{stat.detail}</p>
                </div>
                <span className={cn("flex size-12 items-center justify-center rounded-2xl", stat.label === "On board" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_24%,white)] text-[var(--ether-secondary)]" : stat.label === "Overdue" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]")}>
                  <AppIcon className="text-xl" name={stat.icon} />
                </span>
              </CardHeader>
            </Card>
          ))}
        </section>

        {csvMessage ? (
          <Alert variant={csvMessage.startsWith("Exported") ? undefined : "destructive"}>
            <AlertDescription>{csvMessage}</AlertDescription>
          </Alert>
        ) : null}
        {isLoading && viewMode === "board" ? (
          <Alert>
            <AlertDescription>{"Loading leads..."}</AlertDescription>
          </Alert>
        ) : errorMessage && viewMode === "board" ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : viewMode === "board" ? (
          <div className="kanban-scroll overflow-x-auto pb-3">
            {boardLeads.some((lead) => lead.inBoard && lead.stage !== "Canceled") ? (
              <div className="flex min-h-[35rem] min-w-max gap-4">
                {boardLeadStages.map((stage) => {
                  const stageLeads = boardColumns[stage]
                  const isPaginated = paginatedBoardStages.has(stage)
                  const totalStagePages = isPaginated
                    ? Math.max(1, Math.ceil(stageLeads.length / BOARD_PAGE_SIZE))
                    : 1
                  const stagePage = Math.min(
                    boardStagePages[stage] ?? 1,
                    totalStagePages,
                  )
                  const visibleStageLeads = isPaginated
                    ? stageLeads.slice(
                        (stagePage - 1) * BOARD_PAGE_SIZE,
                        stagePage * BOARD_PAGE_SIZE,
                      )
                    : stageLeads
                  return (
                  <Card className="w-[300px] shrink-0 gap-0 overflow-hidden rounded-2xl border-0 bg-[color-mix(in_srgb,var(--ether-surface-container)_32%,white)] py-0 shadow-none" key={stage}>
                    <CardHeader className="border-0 bg-transparent px-4 pb-2 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              leadStageMeta[stage].dotClassName,
                            )}
                          />
                          <CardTitle className="text-sm font-bold uppercase tracking-tight text-[var(--ether-on-surface)]">{leadStageMeta[stage].label}</CardTitle>
                        </div>
                        <Badge className="rounded-full border-0 bg-white px-2.5 py-0.5 text-xs font-bold text-[var(--ether-primary)]" variant="secondary">{boardColumns[stage].length}</Badge>
                      </div>
                    </CardHeader>
                    <ReactSortable
                      animation={150}
                      className="min-h-[30rem] flex-1 space-y-3 px-4 pb-4"
                      ghostClass="opacity-40"
                      group="lead-board"
                      handle=".drag-handle"
                      list={visibleStageLeads}
                      setList={(newList) => {
                        newList
                          .filter((lead) => lead.stage !== stage || !lead.inBoard)
                          .forEach((lead) => {
                            void onStageChange(lead.id, stage)
                          })
                      }}
                    >
                      {stageLeads.length === 0 ? (
                        <div className="flex min-h-[470px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] bg-white/30 px-6 text-center opacity-70">
                          <AppIcon className="text-4xl text-[var(--ether-outline-variant)]" name="move_to_inbox" />
                          <p className="mt-3 text-xs font-semibold text-[var(--ether-on-surface-variant)]">Ready for {leadStageMeta[stage].label.toLowerCase()}</p>
                        </div>
                      ) : visibleStageLeads.map((lead) => (
                        <LeadKanbanCard
                          isActive={selectedLeadId === lead.id}
                          key={lead.id}
                          lead={lead}
                          onOpen={setSelectedLeadId}
                          onRemove={removeLeadFromBoard}
                        />
                      ))}
                    </ReactSortable>
                    {isPaginated && totalStagePages > 1 ? (
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--ether-outline-variant)] bg-white/70 px-4 py-3">
                        <Button
                          disabled={stagePage === 1}
                          onClick={() => setBoardStagePage(stage, stagePage - 1)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Previous
                        </Button>
                        <span className="text-[10px] font-bold text-[var(--ether-outline)]">
                          {stagePage} / {totalStagePages}
                        </span>
                        <Button
                          disabled={stagePage === totalStagePages}
                          onClick={() => setBoardStagePage(stage, stagePage + 1)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {stagePage === 1 ? "Show more" : "Next"}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[24px] bg-white p-10 text-center shadow-[var(--shadow-surface-1)]">
                <p className="font-semibold">{"No leads on the active board"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {"Add a lead or move one onto the board from the list view."}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setDialogState({ type: "create" })}
                  type="button"
                >
                  {"Add lead"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
            <div className="flex justify-end px-5 py-5 sm:px-6">
              <Select onValueChange={(value) => onStageFilterChange((value ?? "all") as LeadListFilter)} value={stageFilter}>
                <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none sm:w-48"><SelectValue placeholder="Filter by stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="not-listed">Not listed</SelectItem>
                  {leadStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{leadStageMeta[stage].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--ether-outline-variant)] bg-[var(--ether-primary-fixed)]/40 px-5 py-3 sm:px-6">
                <p className="text-sm font-semibold text-[var(--ether-on-surface)]">
                  {selectedIds.length} selected
                </p>
                <div className="flex items-center gap-2">
                  <Button disabled={isMutating} onClick={() => void setSelectedBoard(true)} size="sm" type="button">Add to board</Button>
                  <Button disabled={isMutating} onClick={() => void setSelectedBoard(false)} size="sm" type="button" variant="outline">Remove from board</Button>
                  <Button onClick={exportSelectedLeadsCsv} size="sm" type="button" variant="outline">Export selected CSV</Button>
                  <Button
                    className="h-9 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 text-sm font-semibold text-[var(--ether-on-surface-variant)]"
                    onClick={() => setSelectedIds([])}
                    type="button"
                    variant="outline"
                  >
                    Clear
                  </Button>
                  <Button
                    className="h-9 rounded-lg bg-[var(--ether-error)] px-4 text-sm font-semibold text-white hover:bg-[color-mix(in_srgb,var(--ether-error)_85%,black)]"
                    onClick={() => {
                      setDeleteMessage(null)
                      setDeleteConfirmOpen(true)
                    }}
                    type="button"
                  >
                    <AppIcon className="text-base" name="delete" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)]">
                  <tr>
                    <th className="w-14 px-6 py-4">
                      <input
                        aria-label="Select all leads on this page"
                        checked={allPageSelected}
                        className="size-4 cursor-pointer accent-[var(--ether-primary)]"
                        onChange={toggleSelectPage}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Client Identity</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Property & Interest</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Stage</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading || errorMessage || orderedLeads.length === 0 ? (
                    <tr>
                      <td className="px-6 py-16 text-center" colSpan={5}>
                        <AppIcon className="mx-auto text-3xl text-[var(--ether-outline)]" name={errorMessage ? "error" : isLoading ? "hourglass_top" : "inbox"} />
                        <p className="mt-3 text-sm font-semibold text-[var(--ether-on-surface)]">
                          {errorMessage ? "Could not load leads" : isLoading ? "Please wait, loading leads..." : "No leads found"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ether-on-surface-variant)]">
                          {errorMessage ?? (isLoading ? "Your lead list will appear here." : "No leads match the current filters.")}
                        </p>
                      </td>
                    </tr>
                  ) : orderedLeads.map((lead, index) => {
                    const initials = `${lead.name ?? ""}`.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
                    const avatarTone = index % 3 === 0 ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : index % 3 === 1 ? "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-tertiary)]" : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
                    const isSelected = selectedIds.includes(lead.id)
                    const stageMeta = leadStageMeta[lead.stage] ?? { label: lead.stage, dotClassName: "bg-slate-400" }
                    return (
                      <tr className={`group transition hover:bg-[var(--ether-surface-container-low)] ${isSelected ? "bg-[var(--ether-primary-fixed)]/30" : ""}`} key={lead.id}>
                        <td className="px-6 py-5">
                          <input
                            aria-label={`Select ${lead.name ?? "lead"}`}
                            checked={isSelected}
                            className="size-4 cursor-pointer accent-[var(--ether-primary)]"
                            onChange={() => toggleSelect(lead.id)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarTone)}>{initials || "LD"}</span>
                            <div>
                              <p className="text-base font-bold text-[var(--ether-on-surface)]">{lead.name}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge className="rounded-full border-0 bg-[var(--ether-surface-container-high)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-on-surface-variant)]">{formatLeadPriority(lead.priority)}</Badge>
                                {lead.inBoard ? <Badge className="rounded-full border-0 bg-[color-mix(in_srgb,var(--ether-secondary-container)_32%,white)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-secondary)]">On board</Badge> : null}
                                {lead.isFollowUpOverdue ? <Badge className="rounded-full border-0 bg-[var(--ether-error-container)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-error)]">Overdue</Badge> : null}
                              </div>
                              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--ether-on-surface-variant)]" title="Latest mail date">
                                <AppIcon className="text-sm text-[var(--ether-outline)]" name="mail" />
                                {lead.lastActivityAt ?? lead.createdAt
                                  ? new Date(lead.lastActivityAt ?? lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                                  : "No date"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="max-w-64 font-semibold text-[var(--ether-on-surface)]">{lead.property || "No property selected"}</p>
                          {lead.propertyListingStatus === "NotListed" ? <Badge className="mt-1 rounded-full border-amber-200 bg-amber-50 text-amber-800" variant="outline">Not listed · manual send only</Badge> : null}
                          <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{lead.interest || "General interest"} ? {lead.budget || "Budget not set"}</p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge className="gap-2 rounded-lg px-3 py-1.5 text-sm font-bold" variant="outline">
                            <span className={cn("size-2 rounded-full", stageMeta.dotClassName)} />
                            {stageMeta.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Button
                              aria-pressed={lead.inBoard}
                              disabled={isMutating}
                              onClick={() => void onSetLeadBoard(lead.id, !lead.inBoard)}
                              size="sm"
                              type="button"
                              variant={lead.inBoard ? "secondary" : "default"}
                            >
                              {lead.inBoard ? "Remove from board" : "Add to board"}
                            </Button>
                            <Button onClick={() => setDialogState({ type: "both", leadId: lead.id })} size="sm" type="button" variant="outline">Send</Button>
                            <Button onClick={() => setSelectedLeadId(lead.id)} size="sm" type="button" variant="outline">View</Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button aria-label={`More actions for ${lead.name}`} size="sm" type="button" variant="ghost">More</Button>} />
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => void onConvertLeadToDeal(lead.id)}>{lead.linkedDealId ? "Open deal" : "Create deal"}</DropdownMenuItem>
                                  <DropdownMenuItem render={<Link href={buildHistoryHref(portalRoutes.leadHistory, lead.id)} />}>View history</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDialogState({ type: "email", leadId: lead.id })}>Send email</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDialogState({ type: "message", leadId: lead.id })}>Send message</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDialogState({ type: "call", leadId: lead.id })}>Log call</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDialogState({ type: "cancel", leadId: lead.id })} variant="destructive">Cancel lead</DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="rounded-[24px] bg-white p-3 shadow-[var(--shadow-surface-1)]">
          <PagePagination
            currentPage={currentPage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
        </div>
      </div>

      <Sheet
        open={Boolean(selectedLead)}
        onOpenChange={(open) => (!open ? setSelectedLeadId(null) : null)}
      >
        <SheetContent
          className="!w-full !max-w-full gap-0 overflow-hidden bg-background p-0 sm:!w-[42rem] sm:!max-w-[calc(100vw-2rem)]"
          showCloseButton={false}
          side="right"
        >
          {selectedLead ? (
            <LeadDetailsPanel
              dealHref={portalRoutes.deals}
              historyHref={buildHistoryHref(portalRoutes.leadHistory, selectedLead.id)}
              lead={selectedLead}
              onClose={() => setSelectedLeadId(null)}
              onConvertLeadToDeal={onConvertLeadToDeal}
              onDeletePermanently={(leadId) => {
                setDeleteMessage(null)
                setSelectedIds([leadId])
                setDeleteConfirmOpen(true)
              }}
              onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
              onToggleBoard={onSetLeadBoard}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <LeadOutreachDialog
        key={dialogLead ? `${dialogLead.id}-${dialogState?.type}` : "lead-outreach"}
        isSubmitting={isMutating}
        lead={dialogLead}
        mode={
          dialogState?.type === "both" ||
          dialogState?.type === "email" ||
          dialogState?.type === "message" ||
          dialogState?.type === "call"
            ? dialogState.type
            : null
        }
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(values, deliveryMode) =>
          dialogLead &&
          (deliveryMode === "both" ||
            deliveryMode === "email" ||
            deliveryMode === "message" ||
            deliveryMode === "call")
            ? onCommunicate(dialogLead.id, deliveryMode, values)
            : Promise.resolve("Lead not found.")
        }
        open={
          dialogState?.type === "both" ||
          dialogState?.type === "email" ||
          dialogState?.type === "message" ||
          dialogState?.type === "call"
        }
      />
      <LeadCancelDialog
        key={dialogLead ? `${dialogLead.id}-cancel` : "lead-cancel"}
        isSubmitting={isMutating}
        lead={dialogLead}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(reason) =>
          dialogLead ? onCancelLead(dialogLead.id, reason) : Promise.resolve("Lead not found.")
        }
        open={dialogState?.type === "cancel"}
      />
      <LeadFormDialog
        key={dialogLead ? `${dialogLead.id}-edit` : "lead-edit"}
        agentOptions={agentOptions}
        isSubmitting={isMutating}
        lead={dialogState?.type === "edit" ? dialogLead : null}
        mode={dialogState?.type === "create" ? "create" : "edit"}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(values) =>
          dialogState?.type === "create"
            ? onCreateLead(values)
            : dialogLead
              ? onUpdateLead(dialogLead.id, values)
              : Promise.resolve("Lead not found.")
        }
        open={dialogState?.type === "create" || dialogState?.type === "edit"}
        propertyOptions={propertyOptions}
      />
      <Dialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{"Delete leads"}</DialogTitle>
            <DialogDescription>
              {`This permanently deletes ${selectedIds.length} selected lead${selectedIds.length === 1 ? "" : "s"}, outreach, inbox history, showings, property links, and connected records. Old imported messages will not recreate the lead. A future new inquiry can create it again. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {deleteMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{deleteMessage}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              className="rounded-lg border-[var(--ether-outline-variant)] bg-white font-semibold text-[var(--ether-on-surface-variant)]"
              onClick={() => setDeleteConfirmOpen(false)}
              type="button"
              variant="outline"
            >
              {"Cancel"}
            </Button>
            <Button
              className="rounded-lg bg-[var(--ether-error)] font-semibold text-white hover:bg-[color-mix(in_srgb,var(--ether-error)_85%,black)]"
              onClick={() => void confirmDeleteLeads()}
              type="button"
            >
              {"Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setImportOpen} open={importOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{"Import leads"}</DialogTitle>
            <DialogDescription>{"Upload CSV, map columns manually, then import."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {csvMessage ? <Alert><AlertDescription>{csvMessage}</AlertDescription></Alert> : null}
            <Input accept=".csv,text/csv" onChange={(event) => parseLeadCsv(event.target.files?.[0])} type="file" />
            <div className="grid max-h-80 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {leadCsvFields.map((field) => (
                <label className="grid gap-1.5" key={field.key}>
                  <Label>{field.label}</Label>
                  <Select
                    onValueChange={(value) => setCsvMapping((current) => ({ ...current, [field.key]: value === "none" ? "" : value }))}
                    value={csvMapping[field.key] || "none"}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{"Do not import"}</SelectItem>
                      {csvHeaders.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>
            <Button
              disabled={csvRows.length === 0 || importLeadsMutation.isPending}
              onClick={() => void importLeadRows()}
              type="button"
            >
              {`Import ${csvRows.length} row${csvRows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
