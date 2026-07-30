"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ReactSortable } from "react-sortablejs"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type {
  AgentUserOption,
  DealItem,
  DealStage,
  LeadItem,
} from "@/hooks/use-real-estate-api"
import { formatCompactCurrency } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"
import { cn } from "@/lib/utils"

import { DealDetailsPanel, DealKanbanCard } from "./deal-detail-components"
import { DealCancelDialog, DealFormDialog } from "./deal-dialogs"
import { DealOutreachDialog } from "./deal-outreach-dialog"
import {
  boardDealStages,
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
  onCommunicate: (
    dealId: number,
    mode: OutreachType,
    message: string,
  ) => Promise<string | null>
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedDealId, setSelectedDealId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<DealView>("board")
  const [dialogState, setDialogState] = useState<DealDialogState>(null)
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all")

  const selectedDealIdFromQuery = useMemo(() => {
    const rawDealId = searchParams.get("dealId")
    const parsedDealId = Number(rawDealId)

    return Number.isInteger(parsedDealId) && parsedDealId > 0 ? parsedDealId : null
  }, [searchParams])

  useEffect(() => {
    if (createDialogVersion > 0) {
      setDialogState({ type: "create" })
    }
  }, [createDialogVersion])

  useEffect(() => {
    if (!selectedDealIdFromQuery) return
    if (!deals.some((deal) => deal.id === selectedDealIdFromQuery)) return

    setSelectedDealId((current) => current ?? selectedDealIdFromQuery)
  }, [deals, selectedDealIdFromQuery])

  const dealColumns = useMemo(
    () =>
      boardDealStages.reduce((columns, stage) => {
        columns[stage] = deals.filter((deal) => deal.stage === stage)
        return columns
      }, {} as Record<DealStage, DealItem[]>),
    [deals],
  )

  const orderedDeals = useMemo(
    () =>
      [...deals]
        .filter((deal) => stageFilter === "all" || deal.stage === stageFilter)
        .sort(
        (left, right) =>
          dealStageOrder.indexOf(left.stage) - dealStageOrder.indexOf(right.stage),
      ),
    [deals, stageFilter],
  )

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  )

  const dialogDeal = useMemo(
    () => deals.find((deal) => deal.id === dialogState?.dealId) ?? null,
    [deals, dialogState?.dealId],
  )

  const dialogLead = useMemo(() =>
    dialogDeal?.sourceLeadId
      ? leadOptions.find((lead) => lead.id === dialogDeal.sourceLeadId) ?? null
      : null,
    [dialogDeal, leadOptions],
  )

  const stats = useMemo(
    () => [
      {
        label: "Active pipeline value",
        value: formatCompactCurrency(
          deals
            .filter((deal) => deal.stage !== "Canceled")
            .reduce((sum, deal) => sum + deal.value, 0),
        ),
        detail: `Across ${totalResults} tracked deals`,
        icon: "payments",
      },
      {
        label: "Linked leads",
        value: `${deals.filter((deal) => deal.sourceLeadId).length}`,
        detail: "Connected to the CRM",
        icon: "partner_exchange",
      },
      {
        label: "Closing soon",
        value: `${
          deals.filter((deal) => deal.stage === "Financing" || deal.stage === "Closing")
            .length
        }`,
        detail: "Financing or closing",
        icon: "event_available",
      },
      {
        label: "Canceled",
        value: `${deals.filter((deal) => deal.stage === "Canceled").length}`,
        detail: "Removed from active flow",
        icon: "block",
      },
    ],
    [deals, totalResults],
  )

  function buildDealRoute(dealId: number | null) {
    const params = new URLSearchParams(searchParams.toString())

    if (dealId) params.set("dealId", `${dealId}`)
    else params.delete("dealId")

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function openDealDetails(dealId: number) {
    setSelectedDealId(dealId)

    if (selectedDealIdFromQuery === dealId) return

    router.replace(buildDealRoute(dealId), { scroll: false })
  }

  function closeDealDetails() {
    setSelectedDealId(null)

    if (selectedDealIdFromQuery === null) return

    router.replace(buildDealRoute(null), { scroll: false })
  }

  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 pt-6 sm:p-6 sm:pt-7 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section>
          <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Deal Pipeline Board</h1>
          <p className="mt-2 text-base text-[var(--ether-on-surface-variant)]">Track every active transaction from offer to successful closing.</p>
        </section>
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
            className="h-10 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)] hover:bg-[var(--ether-primary-container)]"
            onClick={() => setDialogState({ type: "create" })}
            type="button"
          >
            <AppIcon name="add_business" />
            Create deal
          </Button>
        </div>
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card className={cn("relative h-[188px] overflow-hidden rounded-[24px] border-0 bg-white shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]", stat.label === "Canceled" && "border-b-4 border-b-[color-mix(in_srgb,var(--ether-error)_24%,transparent)]")} key={stat.label}>
              <CardHeader className="flex h-full flex-row items-start justify-between space-y-0 p-6">
                <div>
                  <CardDescription className={cn("ether-label-caps", stat.label === "Canceled" ? "text-[var(--ether-error)]" : "text-[var(--ether-on-surface-variant)]")}>{stat.label}</CardDescription>
                  <CardTitle className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">{stat.value}</CardTitle>
                  <p className="mt-3 max-w-36 text-sm leading-5 text-[var(--ether-on-surface-variant)]">{stat.detail}</p>
                </div>
                <span className={cn("flex size-12 items-center justify-center rounded-2xl", stat.label === "Closing soon" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_24%,white)] text-[var(--ether-secondary)]" : stat.label === "Canceled" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]")}>
                  <AppIcon className="text-xl" name={stat.icon} />
                </span>
              </CardHeader>
            </Card>
          ))}
        </section>

        {isLoading ? (
          <Alert>
            <AlertDescription>{"Loading deals..."}</AlertDescription>
          </Alert>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : viewMode === "board" ? (
          <div className="kanban-scroll overflow-x-auto pb-3">
            <div className="flex min-h-[35rem] min-w-max gap-4">
              {boardDealStages.map((stage) => (
                <Card className="w-[300px] shrink-0 gap-0 overflow-hidden rounded-2xl border-0 bg-[color-mix(in_srgb,var(--ether-surface-container)_32%,white)] py-0 shadow-none" key={stage}>
                  <CardHeader className="border-0 bg-transparent px-4 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            dealStageMeta[stage].accentClassName,
                          )}
                        />
                        <CardTitle className="text-sm font-bold uppercase tracking-tight text-[var(--ether-on-surface)]">{dealStageMeta[stage].label}</CardTitle>
                      </div>
                      <Badge className="rounded-full border-0 bg-white px-2.5 py-0.5 text-xs font-bold text-[var(--ether-primary)]" variant="secondary">{dealColumns[stage].length}</Badge>
                    </div>
                  </CardHeader>
                  <ReactSortable
                    animation={150}
                    className="min-h-[30rem] flex-1 space-y-3 px-4 pb-4"
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
                      <DealKanbanCard
                        deal={deal}
                        isActive={selectedDealId === deal.id}
                        key={deal.id}
                        onOpen={openDealDetails}
                      />
                    ))}
                  </ReactSortable>
                </Card>
              ))}
            </div>
          </div>
        ) : orderedDeals.length > 0 ? (
          <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="inline-flex self-start rounded-lg bg-[var(--ether-surface-container)] p-1">
                <button className="rounded-md bg-white px-4 py-2 text-sm font-bold text-[var(--ether-primary)] shadow-sm" onClick={() => setViewMode("list")} type="button"><AppIcon className="mr-2 inline text-base" name="view_list" />List View</button>
                <button className="rounded-md px-4 py-2 text-sm font-semibold text-[var(--ether-on-surface-variant)]" onClick={() => setViewMode("board")} type="button"><AppIcon className="mr-2 inline text-base" name="view_kanban" />Board View</button>
              </div>
              <Select onValueChange={(value) => setStageFilter((value ?? "all") as DealStage | "all")} value={stageFilter}>
                <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none sm:w-48"><SelectValue placeholder="Filter by stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {dealStageOrder.map((stage) => <SelectItem key={stage} value={stage}>{dealStageMeta[stage].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)]">
                  <tr>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Client Identity</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Property & Value</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Stage</th>
                    <th className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedDeals.map((deal, index) => {
                    const initials = (deal.client || deal.title).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
                    const avatarTone = index % 3 === 0 ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : index % 3 === 1 ? "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-tertiary)]" : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
                    return (
                      <tr className="group transition hover:bg-[var(--ether-surface-container-low)]" key={deal.id}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarTone)}>{initials || "DL"}</span>
                            <div>
                              <p className="text-base font-bold text-[var(--ether-on-surface)]">{deal.client || deal.title}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge className="rounded-full border-0 bg-[var(--ether-surface-container-high)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-on-surface-variant)]">{deal.type}</Badge>
                                {deal.sourceLeadId ? <Badge className="rounded-full border-0 bg-[color-mix(in_srgb,var(--ether-secondary-container)_32%,white)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-secondary)]">From lead</Badge> : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="max-w-64 font-semibold text-[var(--ether-on-surface)]">{deal.title}</p>
                          <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{formatCompactCurrency(deal.value)}</p>
                        </td>
                        <td className="px-6 py-5"><span className="rounded-lg bg-[var(--ether-primary-fixed)] px-3 py-1.5 text-sm font-bold text-[var(--ether-primary)]">{dealStageMeta[deal.stage].label}</span></td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1">
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => openDealDetails(deal.id)} title="View details" type="button"><AppIcon name="visibility" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => setDialogState({ type: "edit", dealId: deal.id })} title="Edit deal" type="button"><AppIcon name="edit" /></button>
                            {deal.sourceLeadId ? <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]" onClick={() => router.push(`${portalRoutes.leads}?leadId=${deal.sourceLeadId}`)} title="Open linked lead" type="button"><AppIcon name="partner_exchange" /></button> : null}
                            <span className="mx-2 h-5 w-px bg-[color-mix(in_srgb,var(--ether-outline-variant)_40%,transparent)]" />
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_25%,white)] hover:text-[var(--ether-secondary)]" onClick={() => setDialogState({ type: "email", dealId: deal.id })} title="Email" type="button"><AppIcon name="mail" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[color-mix(in_srgb,var(--ether-secondary-container)_25%,white)] hover:text-[var(--ether-secondary)]" onClick={() => setDialogState({ type: "message", dealId: deal.id })} title="Message" type="button"><AppIcon name="chat" /></button>
                            <button className="flex size-9 items-center justify-center rounded-lg text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-error-container)] hover:text-[var(--ether-error)]" onClick={() => setDialogState({ type: "cancel", dealId: deal.id })} title="Cancel deal" type="button"><AppIcon name="block" /></button>
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
            <p className="font-semibold">{"No deals found"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Create a deal to start populating the pipeline."}
            </p>
            <Button
              className="mt-4"
              onClick={() => setDialogState({ type: "create" })}
              type="button"
            >
              {"Create deal"}
            </Button>
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
        open={Boolean(selectedDeal)}
        onOpenChange={(open) => (!open ? closeDealDetails() : null)}
      >
        <SheetContent
          className="w-full gap-0 bg-background p-0 sm:max-w-none"
          showCloseButton={false}
          side="right"
        >
          {selectedDeal ? (
            <DealDetailsPanel
              deal={selectedDeal}
              leadHref={portalRoutes.leads}
              onClose={closeDealDetails}
              onDialogOpen={(type, dealId) => setDialogState({ type, dealId })}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <DealOutreachDialog
        deal={dialogDeal}
        isSubmitting={isMutating}
        lead={dialogLead}
        mode={
          dialogState?.type === "email" || dialogState?.type === "message"
            ? dialogState.type
            : null
        }
        onOpenChange={(open) => setDialogState(open ? dialogState : null)}
        onSubmit={(message) =>
          dialogDeal &&
          (dialogState?.type === "email" || dialogState?.type === "message")
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
        agentOptions={agentOptions}
        deal={dialogState?.type === "edit" ? dialogDeal : null}
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
