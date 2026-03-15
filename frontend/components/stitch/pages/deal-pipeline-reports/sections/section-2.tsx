"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { ReactSortable } from "react-sortablejs"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { getPortalRoutes } from "@/lib/portal-routes"
import { cn } from "@/lib/utils"
import {
  dealStageMeta,
  dealStageOrder,
  type DealFlowItem,
  type DealStage,
  type DealType,
  type OutreachType,
  useAdminFlowStore,
} from "@/stores/admin-flow-store"
import { AppIcon } from "@/components/ui/app-icon"

type DealView = "board" | "list"
type DealDialogState =
  | {
      type: "cancel" | "edit" | "email" | "message"
      dealId: string
    }
  | null

const boardDealStages = dealStageOrder.filter((stage) => stage !== "canceled")
const dealButtonClass =
  "border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value)
}

function DealCommunicationDialog({
  deal,
  mode,
  onOpenChange,
  open,
}: {
  deal: DealFlowItem | null
  mode: OutreachType | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const logDealCommunication = useAdminFlowStore((state) => state.logDealCommunication)
  const [message, setMessage] = useState("")

  if (!deal || !mode) {
    return null
  }

  const title = mode === "email" ? "Send Email" : "Send Message"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">{`Send a ${mode} update for ${deal.title}.`}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{deal.client}</div>
          <Textarea className="min-h-40 rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setMessage(event.target.value)} placeholder={`Write the ${mode} message here...`} value={message} />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            onClick={() => {
              logDealCommunication(deal.id, mode, message)
              onOpenChange(false)
            }}
            type="button"
          >
            {title}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DealCancelDialog({
  deal,
  onOpenChange,
  open,
}: {
  deal: DealFlowItem | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const cancelDeal = useAdminFlowStore((state) => state.cancelDeal)
  const [reason, setReason] = useState("")

  if (!deal) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">{"Cancel Deal"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">{"Canceling here removes the deal from the active pipeline board and updates the linked lead if one exists."}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{deal.title}</div>
          <Textarea className="min-h-32 rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setReason(event.target.value)} placeholder="Add a cancel reason" value={reason} />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-700"
            onClick={() => {
              cancelDeal(deal.id, reason)
              onOpenChange(false)
            }}
            type="button"
          >
            {"Confirm Cancel"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DealEditDialog({
  deal,
  onOpenChange,
  open,
}: {
  deal: DealFlowItem | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const updateDeal = useAdminFlowStore((state) => state.updateDeal)
  const [draft, setDraft] = useState({
    agent: deal?.agent ?? "",
    client: deal?.client ?? "",
    deadline: deal?.deadline ?? "",
    note: deal?.note ?? "",
    title: deal?.title ?? "",
    type: (deal?.type ?? "Residential") as DealType,
    valueLabel: deal?.valueLabel ?? "",
  })

  if (!deal) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">{"Edit Deal"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">{"Update the deal details directly from the pipeline list."}</DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Deal title" value={draft.title} />
          <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, client: event.target.value }))} placeholder="Client" value={draft.client} />
          <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, valueLabel: event.target.value }))} placeholder="Value" value={draft.valueLabel} />
          <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, agent: event.target.value }))} placeholder="Agent" value={draft.agent} />
          <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))} placeholder="Deadline" value={draft.deadline} />
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Deal Type"}
            <select
              className="h-10 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as DealType }))}
              value={draft.type}
            >
              <option value="Residential">{"Residential"}</option>
              <option value="Commercial">{"Commercial"}</option>
              <option value="Industrial">{"Industrial"}</option>
            </select>
          </label>
          <Textarea className="min-h-32 rounded-none border-slate-200 md:col-span-2 dark:border-white/10" onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Deal note" value={draft.note} />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            onClick={() => {
              updateDeal(deal.id, draft)
              onOpenChange(false)
            }}
            type="button"
          >
            {"Save Deal"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DealActions({
  leadHref,
  deal,
  onDialogOpen,
}: {
  leadHref: string
  deal: DealFlowItem
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", dealId: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {deal.sourceLeadId ? (
        <Link className="border border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white" href={leadHref}>
          {"Open Lead"}
        </Link>
      ) : null}
      <button className={dealButtonClass} onClick={() => onDialogOpen("email", deal.id)} type="button">{"Send Mail"}</button>
      <button className={dealButtonClass} onClick={() => onDialogOpen("message", deal.id)} type="button">{"Send Message"}</button>
      <button className={dealButtonClass} onClick={() => onDialogOpen("edit", deal.id)} type="button">{"Edit"}</button>
      {deal.stage !== "canceled" ? (
        <button className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700" onClick={() => onDialogOpen("cancel", deal.id)} type="button">{"Cancel"}</button>
      ) : null}
    </div>
  )
}

function DealKanbanCard({
  deal,
  isActive,
  onOpen,
}: {
  deal: DealFlowItem
  isActive: boolean
  onOpen: (dealId: string) => void
}) {
  return (
    <article className={cn("border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900", isActive && "border-primary")}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div>
          <span className={cn("inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", dealStageMeta[deal.stage].badgeClassName)}>{deal.type}</span>
          <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{deal.title}</h4>
        </div>
        <button className="drag-handle cursor-grab border border-slate-200 px-2 py-1 text-slate-400 active:cursor-grabbing dark:border-white/10" type="button">
          <AppIcon className="text-sm" name="drag_indicator" />
        </button>
      </div>
      <button className="block w-full px-4 py-4 text-left" onClick={() => onOpen(deal.id)} type="button">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{deal.client}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{deal.note}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="font-semibold">{deal.valueLabel}</span>
          <span>{deal.deadline}</span>
        </div>
      </button>
    </article>
  )
}

function DealDetailsPanel({
  leadHref,
  deal,
  onClose,
  onDialogOpen,
}: {
  leadHref: string
  deal: DealFlowItem
  onClose: () => void
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", dealId: string) => void
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{"Deal Details"}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{deal.title}</h2>
        </div>
        <button className={dealButtonClass} onClick={onClose} type="button">
          {"Close Details"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={cn("inline-flex items-center gap-2 border px-3 py-1 text-[11px] font-bold uppercase tracking-wide", dealStageMeta[deal.stage].badgeClassName)}>
                <span className={cn("size-2", dealStageMeta[deal.stage].accentClassName)}></span>
                {dealStageMeta[deal.stage].label}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{deal.note}</p>
            </div>
            <div className="border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">{deal.type}</div>
          </div>
          <div className="mt-5">
            <DealActions deal={deal} leadHref={leadHref} onDialogOpen={onDialogOpen} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Client"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{deal.client}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Agent"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{deal.agent}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Value"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{deal.valueLabel}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Commission"}</p><p className="mt-1 text-sm font-semibold text-primary">{deal.commissionLabel}</p></div>
          </div>
        </div>
        <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{"Deal History"}</h3>
          <div className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5 dark:border-white/10">
            {deal.history.map((item) => (
              <div key={`${deal.id}-${item.label}-${item.time}`} className="relative">
                <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900"></div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Section2Section() {
  const pathname = usePathname()
  const deals = useAdminFlowStore((state) => state.deals)
  const replaceDealStage = useAdminFlowStore((state) => state.replaceDealStage)
  const resetFlow = useAdminFlowStore((state) => state.resetFlow)
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<DealView>("board")
  const [dialogState, setDialogState] = useState<DealDialogState>(null)

  const dealColumns = useMemo(
    () =>
      boardDealStages.reduce((columns, stage) => {
        columns[stage] = deals.filter((deal) => deal.stage === stage)
        return columns
      }, {} as Record<DealStage, DealFlowItem[]>),
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
          deals.filter((deal) => deal.stage !== "canceled").reduce((sum, deal) => sum + deal.value, 0),
        ),
        detail: "Visible across open deal stages",
        icon: "payments",
      },
      {
        label: "Lead Conversions",
        value: `${deals.filter((deal) => deal.sourceLeadId).length}`,
        detail: "Created from Lead CRM",
        icon: "partner_exchange",
      },
      {
        label: "Closing Soon",
        value: `${deals.filter((deal) => deal.stage === "financing" || deal.stage === "closing").length}`,
        detail: "Financing or closing stage",
        icon: "event_available",
      },
      {
        label: "Canceled",
        value: `${deals.filter((deal) => deal.stage === "canceled").length}`,
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
                {"Deals move across the board, but cancel is always a modal action. Email, message, edit, and linked lead access all sit in the same action row."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-slate-200 dark:border-white/10">
                <button className={cn("border-r border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10", viewMode === "board" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("board")} type="button">{"Board"}</button>
                <button className={cn("px-4 py-2 text-sm font-semibold", viewMode === "list" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("list")} type="button">{"List"}</button>
              </div>
              <button className="border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200" onClick={resetFlow} type="button">{"Reset Flow"}</button>
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
          {viewMode === "board" ? (
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
                      setList={(newList) => replaceDealStage(stage, newList)}
                    >
                      {dealColumns[stage].map((deal) => (
                        <DealKanbanCard key={deal.id} deal={deal} isActive={selectedDealId === deal.id} onOpen={setSelectedDealId} />
                      ))}
                    </ReactSortable>
                  </section>
                ))}
              </div>
            </div>
          ) : (
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
                      <p className="text-sm text-primary">{deal.valueLabel}</p>
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
          )}
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

      <DealCommunicationDialog key={dialogDeal ? `${dialogDeal.id}-${dialogState?.type}` : "deal-communication"} deal={dialogDeal} mode={dialogState?.type === "email" || dialogState?.type === "message" ? dialogState.type : null} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "email" || dialogState?.type === "message"} />
      <DealCancelDialog key={dialogDeal ? `${dialogDeal.id}-cancel` : "deal-cancel"} deal={dialogDeal} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "cancel"} />
      <DealEditDialog key={dialogDeal ? `${dialogDeal.id}-edit` : "deal-edit"} deal={dialogDeal} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "edit"} />
    </main>
  )
}
