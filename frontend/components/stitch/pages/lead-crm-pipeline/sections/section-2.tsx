"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { ReactSortable } from "react-sortablejs"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import type { AgentUserOption, LeadItem, LeadStage, PropertyItem } from "@/hooks/use-real-estate-api"
import { getPortalRoutes } from "@/lib/portal-routes"
import { AppIcon } from "@/components/ui/app-icon"
import { cn } from "@/lib/utils"

import { LeadActions, LeadDetailsPanel, LeadKanbanCard } from "./lead-detail-components"
import {
  LeadCancelDialog,
  LeadCommunicationDialog,
  LeadFormDialog,
} from "./lead-dialogs"
import {
  boardLeadStages,
  leadButtonClass,
  type LeadFormValues,
  leadStageMeta,
  leadStageOrder,
  type OutreachType,
} from "./lead-shared"

type LeadView = "board" | "list"
type LeadDialogState =
  | {
      type: "cancel" | "create" | "edit" | "email" | "message"
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
  onCommunicate: (leadId: number, mode: OutreachType, message: string) => Promise<string | null>
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
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<LeadView>("board")
  const [dialogState, setDialogState] = useState<LeadDialogState>(null)

  useEffect(() => {
    if (createDialogVersion > 0) {
      setDialogState({ type: "create" })
    }
  }, [createDialogVersion])

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
        const stageDelta = leadStageOrder.indexOf(left.stage) - leadStageOrder.indexOf(right.stage)
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
        label: "All Leads",
        value: `${totalResults}`,
        detail: "Tracked inside CRM",
        icon: "group",
      },
      {
        label: "On Board",
        value: `${leads.filter((lead) => lead.inBoard && lead.stage !== "Canceled").length}`,
        detail: "Active follow-up board",
        icon: "view_kanban",
      },
      {
        label: "Converted To Deal",
        value: `${leads.filter((lead) => lead.stage === "Deal").length}`,
        detail: "Already pushed into deal pipeline",
        icon: "partner_exchange",
      },
      {
        label: "Canceled",
        value: `${leads.filter((lead) => lead.stage === "Canceled").length}`,
        detail: "Removed by action modal",
        icon: "block",
      },
    ],
    [leads, totalResults],
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-background-dark md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{"Lead CRM"}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {"Only chosen leads sit on the board. Create, edit, cancel, convert, and follow up all happen inside the modal-driven CRM workflow."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-slate-200 dark:border-white/10">
                <button className={cn("border-r border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10", viewMode === "board" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("board")} type="button">{"Board"}</button>
                <button className={cn("px-4 py-2 text-sm font-semibold", viewMode === "list" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("list")} type="button">{"List"}</button>
              </div>
              <button className="border border-primary bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => setDialogState({ type: "create" })} type="button">{"Add Lead"}</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-2 xl:grid-cols-4 md:px-6">
          {stats.map((stat) => (
            <article key={stat.label} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                <AppIcon className="text-primary" name={stat.icon} />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{"Loading leads..."}</p>
            </div>
          ) : errorMessage ? (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-rose-600">{errorMessage}</p>
            </div>
          ) : viewMode === "board" ? (
            <div className="h-full overflow-x-auto px-4 py-5 md:px-6">
              {leads.some((lead) => lead.inBoard && lead.stage !== "Canceled") ? (
                <div className="flex min-h-full min-w-max gap-5">
                  {boardLeadStages.map((stage) => (
                    <section key={stage} className="flex w-80 shrink-0 flex-col border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                      <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2", leadStageMeta[stage].dotClassName)}></span>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{leadStageMeta[stage].label}</h3>
                          </div>
                          <span className="border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">{boardColumns[stage].length}</span>
                        </div>
                      </div>
                      <ReactSortable
                        animation={150}
                        className="min-h-[12rem] flex-1 space-y-3 bg-background-light p-4 dark:bg-background-dark"
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
                          <LeadKanbanCard key={lead.id} isActive={selectedLeadId === lead.id} lead={lead} onOpen={setSelectedLeadId} />
                        ))}
                      </ReactSortable>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{"No leads on the active board"}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {"Add a lead or move one onto the board from the list view."}
                  </p>
                  <button className="mt-4 border border-primary bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => setDialogState({ type: "create" })} type="button">
                    {"Add Lead"}
                  </button>
                </div>
              )}
            </div>
          ) : orderedLeads.length > 0 ? (
            <div className="overflow-y-auto px-4 py-5 md:px-6">
              <div className="space-y-3">
                {orderedLeads.map((lead) => (
                  <article key={lead.id} className={cn("border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900", selectedLeadId === lead.id && "border-primary")}>
                    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_auto] xl:items-center">
                      <button className="text-left" onClick={() => setSelectedLeadId(lead.id)} type="button">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</h3>
                          <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{lead.priority}</span>
                          {lead.inBoard ? (
                            <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{"On Board"}</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{lead.summary}</p>
                      </button>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Property / Stage"}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lead.property}</p>
                        <p className="text-sm text-primary">{leadStageMeta[lead.stage].label}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button className={leadButtonClass} onClick={() => setSelectedLeadId(lead.id)} type="button">
                          {"View Details"}
                        </button>
                        <LeadActions
                          dealHref={portalRoutes.deals}
                          lead={lead}
                          onConvertLeadToDeal={onConvertLeadToDeal}
                          onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
                          onToggleBoard={onSetLeadBoard}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{"No leads found"}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {"Create a lead from the modal to start populating the CRM."}
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 md:px-6">
          <PagePagination currentPage={currentPage} onPageChange={onPageChange} totalPages={totalPages} />
        </div>
      </section>

      <Sheet open={Boolean(selectedLead)} onOpenChange={(open) => (!open ? setSelectedLeadId(null) : null)}>
        <SheetContent
          className="w-full gap-0 border-slate-200 bg-background-light p-0 shadow-none sm:max-w-2xl dark:border-white/10 dark:bg-background-dark"
          showCloseButton={false}
          side="right"
        >
          {selectedLead ? (
            <LeadDetailsPanel
              dealHref={portalRoutes.deals}
              lead={selectedLead}
              onClose={() => setSelectedLeadId(null)}
              onConvertLeadToDeal={onConvertLeadToDeal}
              onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
              onToggleBoard={onSetLeadBoard}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <LeadCommunicationDialog
        key={dialogLead ? `${dialogLead.id}-${dialogState?.type}` : "lead-communication"}
        isSubmitting={isMutating}
        lead={dialogLead}
        mode={dialogState?.type === "email" || dialogState?.type === "message" ? dialogState.type : null}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(message) =>
          dialogLead && (dialogState?.type === "email" || dialogState?.type === "message")
            ? onCommunicate(dialogLead.id, dialogState.type, message)
            : Promise.resolve("Lead not found.")
        }
        open={dialogState?.type === "email" || dialogState?.type === "message"}
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
        isSubmitting={isMutating}
        lead={dialogState?.type === "edit" ? dialogLead : null}
        mode={dialogState?.type === "create" ? "create" : "edit"}
        agentOptions={agentOptions}
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
