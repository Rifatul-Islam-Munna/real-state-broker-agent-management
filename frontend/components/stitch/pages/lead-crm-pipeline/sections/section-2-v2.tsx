"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ReactSortable } from "react-sortablejs"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type {
  AgentUserOption,
  LeadItem,
  LeadStage,
  PropertyItem,
} from "@/hooks/use-real-estate-api"
import { formatLeadPriority } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"
import { cn } from "@/lib/utils"

import { LeadActions, LeadDetailsPanel, LeadKanbanCard } from "./lead-detail-components"
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
type LeadDialogState =
  | {
      type: "cancel" | "create" | "edit" | LeadOutreachMode
      leadId?: number
    }
  | null

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
  const [dialogState, setDialogState] = useState<LeadDialogState>(null)

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
      [...leads].sort((left, right) => {
        const stageDelta =
          leadStageOrder.indexOf(left.stage) - leadStageOrder.indexOf(right.stage)
        if (stageDelta !== 0) return stageDelta
        return Number(right.inBoard) - Number(left.inBoard)
      }),
    [leads],
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
    <main className="min-w-0 flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{"Pipeline"}</CardTitle>
              <CardDescription>
                {"Move selected leads across the board, or review every record in a detailed list."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border bg-background p-1 shadow-xs">
                <Button
                  onClick={() => setViewMode("board")}
                  size="sm"
                  type="button"
                  variant={viewMode === "board" ? "secondary" : "ghost"}
                >
                  <AppIcon name="view_kanban" />
                  {"Board"}
                </Button>
                <Button
                  onClick={() => setViewMode("list")}
                  size="sm"
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                >
                  <AppIcon name="view_list" />
                  {"List"}
                </Button>
              </div>
              <Button onClick={() => setDialogState({ type: "create" })} type="button">
                <AppIcon name="person_add" />
                {"Add lead"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="mt-2 text-3xl">{stat.value}</CardTitle>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <AppIcon className="text-xl" name={stat.icon} />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{stat.detail}</p>
              </CardContent>
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
          <div className="overflow-x-auto pb-2">
            {leads.some((lead) => lead.inBoard && lead.stage !== "Canceled") ? (
              <div className="flex min-h-[28rem] min-w-max gap-4">
                {boardLeadStages.map((stage) => (
                  <Card className="w-80 shrink-0 gap-0 py-0" key={stage}>
                    <CardHeader className="border-b py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2 rounded-full",
                              leadStageMeta[stage].dotClassName,
                            )}
                          />
                          <CardTitle className="text-sm">{leadStageMeta[stage].label}</CardTitle>
                        </div>
                        <Badge variant="secondary">{boardColumns[stage].length}</Badge>
                      </div>
                    </CardHeader>
                    <ReactSortable
                      animation={150}
                      className="min-h-[20rem] flex-1 space-y-3 bg-muted/30 p-3"
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
                      {boardColumns[stage].map((lead) => (
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
              <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
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
          <div className="space-y-3">
            {orderedLeads.map((lead) => (
              <Card
                className={cn(selectedLeadId === lead.id && "border-primary")}
                key={lead.id}
              >
                <CardContent className="grid gap-5 pt-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{lead.name}</h3>
                      <Badge variant="outline">{formatLeadPriority(lead.priority)}</Badge>
                      {lead.isFollowUpOverdue ? (
                        <Badge variant="destructive">{"Overdue"}</Badge>
                      ) : null}
                      {lead.inBoard ? <Badge variant="secondary">{"On board"}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {lead.summary}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/45 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {"Property / stage"}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{lead.property}</p>
                    <p className="text-sm text-primary">{leadStageMeta[lead.stage].label}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button
                      onClick={() => setSelectedLeadId(lead.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {"View details"}
                    </Button>
                    <LeadActions
                      dealHref={portalRoutes.deals}
                      historyHref={buildHistoryHref(portalRoutes.leadHistory, lead.id)}
                      lead={lead}
                      onConvertLeadToDeal={onConvertLeadToDeal}
                      onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
                      onToggleBoard={onSetLeadBoard}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="font-semibold">{"No leads found"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Create a lead to start populating the CRM."}
            </p>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-3 shadow-sm">
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
          className="w-full gap-0 bg-background p-0 sm:max-w-none"
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
    </main>
  )
}
