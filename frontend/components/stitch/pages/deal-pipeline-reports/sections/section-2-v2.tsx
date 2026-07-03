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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

import { DealActions, DealDetailsPanel, DealKanbanCard } from "./deal-detail-components"
import { DealCancelDialog, DealCommunicationDialog, DealFormDialog } from "./deal-dialogs"
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
      [...deals].sort(
        (left, right) =>
          dealStageOrder.indexOf(left.stage) - dealStageOrder.indexOf(right.stage),
      ),
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
        label: "Active pipeline value",
        value: formatCompactCurrency(
          deals
            .filter((deal) => deal.stage !== "Canceled")
            .reduce((sum, deal) => sum + deal.value, 0),
        ),
        detail: "Across open deal stages",
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
    [deals],
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
    <main className="min-w-0 flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{"Deal pipeline"}</CardTitle>
              <CardDescription>
                {"Move deals across stages and manage every action from focused dialogs."}
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
                <AppIcon name="add_business" />
                {"Create deal"}
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
            <AlertDescription>{"Loading deals..."}</AlertDescription>
          </Alert>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : viewMode === "board" ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-h-[28rem] min-w-max gap-4">
              {boardDealStages.map((stage) => (
                <Card className="w-80 shrink-0 gap-0 py-0" key={stage}>
                  <CardHeader className="border-b py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            dealStageMeta[stage].accentClassName,
                          )}
                        />
                        <CardTitle className="text-sm">{dealStageMeta[stage].label}</CardTitle>
                      </div>
                      <Badge variant="secondary">{dealColumns[stage].length}</Badge>
                    </div>
                  </CardHeader>
                  <ReactSortable
                    animation={150}
                    className="min-h-[20rem] flex-1 space-y-3 bg-muted/30 p-3"
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
          <div className="space-y-3">
            {orderedDeals.map((deal) => (
              <Card
                className={cn(selectedDealId === deal.id && "border-primary")}
                key={deal.id}
              >
                <CardContent className="grid gap-5 pt-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.8fr)_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{deal.title}</h3>
                      <Badge variant="outline">{dealStageMeta[deal.stage].label}</Badge>
                      {deal.sourceLeadId ? <Badge variant="secondary">{"From lead"}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{deal.note}</p>
                  </div>
                  <div className="rounded-xl bg-muted/45 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {"Client / value"}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{deal.client}</p>
                    <p className="text-sm text-primary">{formatCompactCurrency(deal.value)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Button
                      onClick={() => openDealDetails(deal.id)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {"View details"}
                    </Button>
                    <DealActions
                      deal={deal}
                      leadHref={portalRoutes.leads}
                      onDialogOpen={(type, dealId) => setDialogState({ type, dealId })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
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

        <div className="rounded-2xl border bg-card p-3 shadow-sm">
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

      <DealCommunicationDialog
        deal={dialogDeal}
        isSubmitting={isMutating}
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
