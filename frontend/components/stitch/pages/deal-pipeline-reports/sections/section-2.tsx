"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { ReactSortable } from "react-sortablejs"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import type { AgentUserOption, DealItem, DealStage, LeadItem } from "@/hooks/use-real-estate-api"
import { getPortalRoutes } from "@/lib/portal-routes"
import { AppIcon } from "@/components/ui/app-icon"
import { formatCompactCurrency } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

import { DealActions, DealDetailsPanel, DealKanbanCard } from "./deal-detail-components"
import { DealCancelDialog, DealCommunicationDialog, DealFormDialog } from "./deal-dialogs"
import {
  boardDealStages,
  dealButtonClass,
  type DealFormValues,
  dealStageMeta,
  dealStageOrder,
  type OutreachType,
} from "./deal-shared"

type DealView = "board" | "list"
type DealDialogState =
  | {
      type: "cancel" | "create" | "edit" | "email" | "message"
      dealId?: number
    }
  | null

type Section2SectionProps = {
  createDialogVersion: number
  currentPage: number
  deals: DealItem[]
  agentOptions: AgentUserOption[]
  errorMessage?: string | null
  isLoading: boolean
  isMutating: boolean
  leadOptions: LeadItem[]
  onCancelDeal: (dealId: number, reason: string) => Promise<string | null>
  onCommunicate: (dealId: number, mode: OutreachType, message: string) => Promise<string | null>
  onCreateDeal: (values: DealFormValues) => Promise<string | null>
  onPageChange: (page: number) => void
  onStageChange: (dealId: number, stage: DealStage) => Promise<void>
  onUpdateDeal: (dealId: number, values: DealFormValues) => Promise<string | null>
  totalPages: number
  totalResults: number
}

export function Section2Section({
  agentOptions,
  createDialogVersion,
  currentPage,
  deals,
  errorMessage,
  isLoading,
  isMutating,
  leadOptions,
  onCancelDeal,
  onCommunicate,
  onCreateDeal,
  onPageChange,
  onStageChange,
  onUpdateDeal,
  totalPages,
  totalResults,
}: Section2SectionProps) {
  const pathname = usePathname()
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedDealId, setSelectedDealId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<DealView>("board")
  const [dialogState, setDialogState] = useState<DealDialogState>(null)

  useEffect(() => {
    if (createDialogVersion > 0) {
      setDialogState({ type: "create" })
    }
  }, [createDialogVersion])

  const dealColumns = useMemo(
    () =>
      boardDealStages.reduce((columns, stage) => {
        columns[stage] = deals.filter((deal) => deal.stage === stage)
        return columns
      }, {} as Record<DealStage, DealItem[]>),
    [deals],
  )

  const orderedDeals = useMemo(
    () => [...deals].sort((left, right) => dealStageOrder.indexOf(left.stage) - dealStageOrder.indexOf(right.stage)),
    [deals],
  )

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  )

  const dialogDeal = useMemo(
    () => deals.find((deal) => deal.id === dialogState?.dealId) ?? null,
    [deals, dialogState?.dealId],
  )

  const stats = useMemo(
    () => [
      {
        label: "Active Pipeline Value",
        value: formatCompactCurrency(
          deals.filter((deal) => deal.stage !== "Canceled").reduce((sum, deal) => sum + deal.value, 0),
        ),
        detail: "Visible across open deal stages",
        icon: "payments",
      },
      {
        label: "Linked Leads",
        value: `${deals.filter((deal) => deal.sourceLeadId).length}`,
        detail: "Connected to the CRM",
        icon: "partner_exchange",
      },
      {
        label: "Closing Soon",
        value: `${deals.filter((deal) => deal.stage === "Financing" || deal.stage === "Closing").length}`,
        detail: "Financing or closing stage",
        icon: "event_available",
      },
      {
        label: "Canceled",
        value: `${deals.filter((deal) => deal.stage === "Canceled").length}`,
        detail: "Removed by action modal",
        icon: "block",
      },
    ],
    [deals],
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{"Deal Pipeline"}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                {"Deals move across the board, but create, edit, cancel, and communication stay modal-driven inside the original pipeline layout."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-slate-200 dark:border-white/10">
                <button className={cn("border-r border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10", viewMode === "board" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("board")} type="button">{"Board"}</button>
                <button className={cn("px-4 py-2 text-sm font-semibold", viewMode === "list" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("list")} type="button">{"List"}</button>
              </div>
              <button className="border border-primary bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => setDialogState({ type: "create" })} type="button">{"Create Deal"}</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-2 xl:grid-cols-4 md:px-6">
          {stats.map((stat) => (
            <article key={stat.label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                <AppIcon className="text-primary" name={stat.icon} />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="min-h-0 flex-1 px-4 py-6 md:px-6">
          {isLoading ? (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{"Loading deals..."}</p>
            </div>
          ) : errorMessage ? (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-rose-600">{errorMessage}</p>
            </div>
          ) : viewMode === "board" ? (
            <div className="h-full overflow-x-auto">
              <div className="flex min-h-full min-w-max gap-5">
                {boardDealStages.map((stage) => (
                  <section key={stage} className="flex w-80 shrink-0 flex-col border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-4 py-4 dark:border-white/10">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2", dealStageMeta[stage].accentClassName)}></span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dealStageMeta[stage].label}</h3>
                        </div>
                        <span className="border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">{dealColumns[stage].length}</span>
                      </div>
                    </div>
                    <ReactSortable
                      animation={150}
                      className="min-h-[12rem] flex-1 space-y-3 bg-background-light p-4 dark:bg-background-dark"
                      ghostClass="opacity-40"
                      group="deal-board"
                      handle=".drag-handle"
                      list={dealColumns[stage]}
                      setList={(newList) => {
                        newList
                          .filter((deal) => deal.stage !== stage)
                          .forEach((deal) => {
                            void onStageChange(deal.id, stage)
                          })
                      }}
                    >
                      {dealColumns[stage].map((deal) => (
                        <DealKanbanCard key={deal.id} deal={deal} isActive={selectedDealId === deal.id} onOpen={setSelectedDealId} />
                      ))}
                    </ReactSortable>
                  </section>
                ))}
              </div>
            </div>
          ) : orderedDeals.length > 0 ? (
            <div className="space-y-3">
              {orderedDeals.map((deal) => (
                <article key={deal.id} className={cn("border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900", selectedDealId === deal.id && "border-primary")}>
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.8fr_auto] xl:items-center">
                    <button className="text-left" onClick={() => setSelectedDealId(deal.id)} type="button">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{deal.title}</h3>
                        <span className={cn("inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", dealStageMeta[deal.stage].badgeClassName)}>{dealStageMeta[deal.stage].label}</span>
                        {deal.sourceLeadId ? (
                          <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{"From Lead"}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{deal.note}</p>
                    </button>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Client / Value"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{deal.client}</p>
                      <p className="text-sm text-primary">{formatCompactCurrency(deal.value)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button className={dealButtonClass} onClick={() => setSelectedDealId(deal.id)} type="button">
                        {"View Details"}
                      </button>
                      <DealActions
                        deal={deal}
                        leadHref={portalRoutes.leads}
                        onDialogOpen={(type, dealId) => setDialogState({ type, dealId })}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{"No deals found"}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {"Create a deal from the modal to start populating the pipeline."}
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 md:px-6">
          <PagePagination currentPage={currentPage} onPageChange={onPageChange} totalPages={totalPages} />
        </div>
      </section>

      <Sheet open={Boolean(selectedDeal)} onOpenChange={(open) => (!open ? setSelectedDealId(null) : null)}>
        <SheetContent
          className="w-full gap-0 border-slate-200 bg-background-light p-0 shadow-none sm:max-w-2xl dark:border-white/10 dark:bg-background-dark"
          showCloseButton={false}
          side="right"
        >
          {selectedDeal ? (
            <DealDetailsPanel
              deal={selectedDeal}
              leadHref={portalRoutes.leads}
              onClose={() => setSelectedDealId(null)}
              onDialogOpen={(type, dealId) => setDialogState({ type, dealId })}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <DealCommunicationDialog
        deal={dialogDeal}
        isSubmitting={isMutating}
        mode={dialogState?.type === "email" || dialogState?.type === "message" ? dialogState.type : null}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(message) =>
          dialogDeal && (dialogState?.type === "email" || dialogState?.type === "message")
            ? onCommunicate(dialogDeal.id, dialogState.type, message)
            : Promise.resolve("Deal not found.")
        }
        open={dialogState?.type === "email" || dialogState?.type === "message"}
      />
      <DealCancelDialog
        deal={dialogDeal}
        isSubmitting={isMutating}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(reason) =>
          dialogDeal ? onCancelDeal(dialogDeal.id, reason) : Promise.resolve("Deal not found.")
        }
        open={dialogState?.type === "cancel"}
      />
      <DealFormDialog
        deal={dialogState?.type === "edit" ? dialogDeal : null}
        agentOptions={agentOptions}
        isSubmitting={isMutating}
        leadOptions={leadOptions}
        mode={dialogState?.type === "create" ? "create" : "edit"}
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(values) =>
          dialogState?.type === "create"
            ? onCreateDeal(values)
            : dialogDeal
              ? onUpdateDeal(dialogDeal.id, values)
              : Promise.resolve("Deal not found.")
        }
        open={dialogState?.type === "create" || dialogState?.type === "edit"}
      />
    </main>
  )
}
