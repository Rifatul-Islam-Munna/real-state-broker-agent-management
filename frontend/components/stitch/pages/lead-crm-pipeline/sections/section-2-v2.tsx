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
  leadStageMeta,
  leadStageOrder,
} from "./lead-shared"

type LeadView = "board" | "list"
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
  errorMessage?: string | null
  isLoading: boolean
  isMutating: boolean
  leads: LeadItem[]
  onCancelLead: (leadId: number, reason: string) => Promise<string | null>
  onCommunicate: (
    leadId: number,
    mode: LeadOutreachMode,
    values: LeadOutreachComposerValues,
  ) => Promise<string | null>
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onCreateLead: (values: LeadFormValues) => Promise<string | null>
  onPageChange: (page: number) => void
  onSetLeadBoard: (leadId: number, inBoard: boolean) => Promise<void>
  onStageChange: (leadId: number, stage: LeadStage) => Promise<void>
  onUpdateLead: (leadId: number, values: LeadFormValues) => Promise<string | null>
  propertyOptions: PropertyItem[]
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
  errorMessage,
  isLoading,
  isMutating,
  leads,
  onCancelLead,
  onCommunicate,
  onConvertLeadToDeal,
  onCreateLead,
  onPageChange,
  onSetLeadBoard,
  onStageChange,
  onUpdateLead,
  propertyOptions,
  totalPages,
  totalResults,
}: Section2SectionProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<LeadView>("board")
  const [stageFilter, setStageFilter] = useState<LeadStage | "all">("all")
  const [dialogState, setDialogState] = useState<LeadDialogState>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([])
  const [csvMapping, setCsvMapping] = useState({ ...emptyLeadMapping })
  const [csvMessage, setCsvMessage] = useState<string | null>(null)
  const importLeadsMutation = useImportLeads()

  useEffect(() => {
    if (createDialogVersion > 0) {
      setDialogState({ type: "create" })
    }
  }, [createDialogVersion])

  useEffect(() => {
    const rawLeadId = searchParams.get("leadId")
    const parsedLeadId = rawLeadId ? Number(rawLeadId) : Number.NaN

    if (!Number.isFinite(parsedLeadId)) return

    setSelectedLeadId(parsedLeadId)
  }, [searchParams])

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
        columns[stage] = leads.filter((lead) => lead.inBoard && lead.stage === stage)
        return columns
      }, {} as Record<LeadStage, LeadItem[]>),
    [leads],
  )

  const orderedLeads = useMemo(
    () =>
      [...leads]
        .filter((lead) => stageFilter === "all" || lead.stage === stageFilter)
        .sort((left, right) => {
          const stageDelta =
            leadStageOrder.indexOf(left.stage) - leadStageOrder.indexOf(right.stage)
          if (stageDelta !== 0) return stageDelta
          return Number(right.inBoard) - Number(left.inBoard)
        }),
    [leads, stageFilter],
  )

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  )

  const dialogLead = useMemo(
    () => leads.find((lead) => lead.id === dialogState?.leadId) ?? null,
    [dialogState?.leadId, leads],
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
        value: `${leads.filter((lead) => lead.inBoard && lead.stage !== "Canceled").length}`,
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
    [leads, totalResults],
  )

  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 pt-6 sm:p-6 sm:pt-7 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-3 lg:-mt-[86px] lg:flex-row lg:items-center lg:justify-end">
          <div className="inline-flex self-start rounded-lg bg-[var(--ether-surface-container)] p-1 lg:self-auto">
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
          <Button
            className="h-10 rounded-lg border-[var(--ether-secondary)] bg-transparent px-4 font-semibold text-[var(--ether-secondary)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_20%,white)]"
            onClick={downloadLeadSample}
            type="button"
            variant="outline"
          >
            <AppIcon name="download" />
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

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card className={cn("relative h-[188px] overflow-hidden rounded-[24px] border-0 bg-white shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]", stat.label === "Overdue" && "border-b-4 border-b-[color-mix(in_srgb,var(--ether-error)_24%,transparent)]")} key={stat.label}>
              <CardHeader className="flex h-full flex-row items-start justify-between space-y-0 p-6">
                <div>
                  <CardDescription className={cn("ether-label-caps", stat.label === "Overdue" ? "text-[var(--ether-error)]" : "text-[var(--ether-on-surface-variant)]")}>{stat.label}</CardDescription>
                  <CardTitle className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">{stat.value}</CardTitle>
                  <p className="mt-3 max-w-32 text-sm leading-5 text-[var(--ether-on-surface-variant)]">{stat.detail}</p>
                </div>
                <span className={cn("flex size-12 items-center justify-center rounded-2xl", stat.label === "On board" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_24%,white)] text-[var(--ether-secondary)]" : stat.label === "Overdue" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]")}>
                  <AppIcon className="text-xl" name={stat.icon} />
                </span>
              </CardHeader>
            </Card>
          ))}
        </section>

        {isLoading ? (
          <Alert>
            <AlertDescription>{"Loading leads..."}</AlertDescription>
          </Alert>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : viewMode === "board" ? (
          <div className="kanban-scroll overflow-x-auto pb-3">
            {leads.some((lead) => lead.inBoard && lead.stage !== "Canceled") ? (
              <div className="flex min-h-[35rem] min-w-max gap-4">
                {boardLeadStages.map((stage) => (
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
                      list={boardColumns[stage]}
                      setList={(newList) => {
                        newList
                          .filter((lead) => lead.stage !== stage || !lead.inBoard)
                          .forEach((lead) => {
                            void onStageChange(lead.id, stage)
                          })
                      }}
                    >
                      {boardColumns[stage].length === 0 ? (
                        <div className="flex min-h-[470px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] bg-white/30 px-6 text-center opacity-70">
                          <AppIcon className="text-4xl text-[var(--ether-outline-variant)]" name="move_to_inbox" />
                          <p className="mt-3 text-xs font-semibold text-[var(--ether-on-surface-variant)]">Ready for {leadStageMeta[stage].label.toLowerCase()}</p>
                        </div>
                      ) : boardColumns[stage].map((lead) => (
                        <LeadKanbanCard
                          isActive={selectedLeadId === lead.id}
                          key={lead.id}
                          lead={lead}
                          onOpen={setSelectedLeadId}
                        />
                      ))}
                    </ReactSortable>
                  </Card>
                ))}
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
        ) : orderedLeads.length > 0 ? (
          <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg bg-[var(--ether-surface-container)] p-1">
                  <button className="rounded-md bg-white px-4 py-2 text-sm font-bold text-[var(--ether-primary)] shadow-sm" onClick={() => setViewMode("list")} type="button"><AppIcon className="mr-2 inline text-base" name="view_list" />List View</button>
                  <button className="rounded-md px-4 py-2 text-sm font-semibold text-[var(--ether-on-surface-variant)]" onClick={() => setViewMode("board")} type="button"><AppIcon className="mr-2 inline text-base" name="view_kanban" />Board View</button>
                </div>
              </div>
              <Select onValueChange={(value) => setStageFilter((value ?? "all") as LeadStage | "all")} value={stageFilter}>
                <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none sm:w-48"><SelectValue placeholder="Filter by stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {leadStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{leadStageMeta[stage].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)]">
                  <tr>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Client Identity</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Property & Interest</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Stage</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedLeads.map((lead, index) => {
                    const initials = `${lead.name ?? ""}`.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
                    const avatarTone = index % 3 === 0 ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : index % 3 === 1 ? "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-tertiary)]" : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
                    return (
                      <tr className="group transition hover:bg-[var(--ether-surface-container-low)]" key={lead.id}>
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="max-w-64 font-semibold text-[var(--ether-on-surface)]">{lead.property || "No property selected"}</p>
                          <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{lead.interest || "General interest"} ? {lead.budget || "Budget not set"}</p>
                        </td>
                        <td className="px-6 py-5"><span className="rounded-lg bg-[var(--ether-primary-fixed)] px-3 py-1.5 text-sm font-bold text-[var(--ether-primary)]">{leadStageMeta[lead.stage].label}</span></td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1">
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => setSelectedLeadId(lead.id)} title="View details" type="button"><AppIcon name="visibility" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => void onConvertLeadToDeal(lead.id)} title={lead.linkedDealId ? "Open deal" : "Create deal"} type="button"><AppIcon name="handshake" /></button>
                            <Link className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" href={buildHistoryHref(portalRoutes.leadHistory, lead.id)} title="History"><AppIcon name="history" /></Link>
                            <span className="mx-2 h-5 w-px bg-[color-mix(in_srgb,var(--ether-outline-variant)_40%,transparent)]" />
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_25%,white)] hover:text-[var(--ether-secondary)]" onClick={() => setDialogState({ type: "email", leadId: lead.id })} title="Email" type="button"><AppIcon name="mail" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_25%,white)] hover:text-[var(--ether-secondary)]" onClick={() => setDialogState({ type: "message", leadId: lead.id })} title="Message" type="button"><AppIcon name="chat" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_25%,white)] hover:text-[var(--ether-secondary)]" onClick={() => setDialogState({ type: "call", leadId: lead.id })} title="Call" type="button"><AppIcon name="call" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="rounded-[24px] bg-white p-10 text-center shadow-[var(--shadow-surface-1)]">
            <p className="font-semibold">{"No leads found"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Create a lead to start populating the CRM."}
            </p>
          </div>
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
          dialogState?.type === "email" ||
          dialogState?.type === "message" ||
          dialogState?.type === "call"
            ? dialogState.type
            : null
        }
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(values) =>
          dialogLead &&
          (dialogState?.type === "email" ||
            dialogState?.type === "message" ||
            dialogState?.type === "call")
            ? onCommunicate(dialogLead.id, dialogState.type, values)
            : Promise.resolve("Lead not found.")
        }
        open={
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
