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
  leadStageMeta,
  leadStageOrder,
  type LeadFlowItem,
  type LeadPriority,
  type LeadStage,
  type OutreachType,
  useAdminFlowStore,
} from "@/stores/admin-flow-store"

type LeadView = "board" | "list"
type LeadDialogState =
  | {
      type: "cancel" | "edit" | "email" | "message"
      leadId: string
    }
  | null

const boardLeadStages = leadStageOrder.filter((stage) => stage !== "canceled")
const leadButtonClass =
  "border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"

function LeadCommunicationDialog({
  lead,
  mode,
  onOpenChange,
  open,
}: {
  lead: LeadFlowItem | null
  mode: OutreachType | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const logLeadCommunication = useAdminFlowStore((state) => state.logLeadCommunication)
  const [message, setMessage] = useState("")

  if (!lead || !mode) {
    return null
  }

  const title = mode === "email" ? "Send Email" : "Send Message"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {`Send a ${mode} update to ${lead.name}.`}
          </DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {lead.email}
          </div>
          <Textarea
            className="min-h-40 rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setMessage(event.target.value)}
            placeholder={`Write the ${mode} message here...`}
            value={message}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button
            className={leadButtonClass}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {"Close"}
          </button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            onClick={() => {
              logLeadCommunication(lead.id, mode, message)
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

function LeadCancelDialog({
  lead,
  onOpenChange,
  open,
}: {
  lead: LeadFlowItem | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const cancelLead = useAdminFlowStore((state) => state.cancelLead)
  const [reason, setReason] = useState("")

  if (!lead) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {"Cancel Lead"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {"Canceling here removes the lead from the active board and also cancels any linked deal."}
          </DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {lead.name}
          </div>
          <Textarea
            className="min-h-32 rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add a cancel reason"
            value={reason}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={leadButtonClass} onClick={() => onOpenChange(false)} type="button">
            {"Close"}
          </button>
          <button
            className="border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-700"
            onClick={() => {
              cancelLead(lead.id, reason)
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

function LeadEditDialog({
  lead,
  onOpenChange,
  open,
}: {
  lead: LeadFlowItem | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const updateLead = useAdminFlowStore((state) => state.updateLead)
  const [draft, setDraft] = useState({
    agent: lead?.agent ?? "",
    budget: lead?.budget ?? "",
    interest: lead?.interest ?? "",
    name: lead?.name ?? "",
    priority: (lead?.priority ?? "Warm") as LeadPriority,
    property: lead?.property ?? "",
    summary: lead?.summary ?? "",
    timeline: lead?.timeline ?? "",
  })

  if (!lead) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {"Edit Lead"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {"Update the lead details without leaving the CRM list."}
          </DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Lead name"
            value={draft.name}
          />
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, property: event.target.value }))}
            placeholder="Property"
            value={draft.property}
          />
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, budget: event.target.value }))}
            placeholder="Budget"
            value={draft.budget}
          />
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, agent: event.target.value }))}
            placeholder="Assigned agent"
            value={draft.agent}
          />
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, interest: event.target.value }))}
            placeholder="Interest"
            value={draft.interest}
          />
          <Input
            className="rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, timeline: event.target.value }))}
            placeholder="Timeline"
            value={draft.timeline}
          />
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Priority"}
            <select
              className="h-10 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as LeadPriority,
                }))
              }
              value={draft.priority}
            >
              <option value="High Priority">{"High Priority"}</option>
              <option value="Warm">{"Warm"}</option>
              <option value="Follow Up">{"Follow Up"}</option>
            </select>
          </label>
          <div className="hidden md:block"></div>
          <Textarea
            className="min-h-32 rounded-none border-slate-200 md:col-span-2 dark:border-white/10"
            onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            placeholder="Summary"
            value={draft.summary}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={leadButtonClass} onClick={() => onOpenChange(false)} type="button">
            {"Close"}
          </button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
            onClick={() => {
              updateLead(lead.id, draft)
              onOpenChange(false)
            }}
            type="button"
          >
            {"Save Lead"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LeadActions({
  dealHref,
  lead,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  lead: LeadFlowItem
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", leadId: string) => void
  onToggleBoard: (leadId: string, inBoard: boolean) => void
}) {
  const convertLeadToDeal = useAdminFlowStore((state) => state.convertLeadToDeal)

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={lead.inBoard ? "border border-primary bg-primary/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary" : leadButtonClass}
        onClick={() => onToggleBoard(lead.id, !lead.inBoard)}
        type="button"
      >
        {lead.inBoard ? "Remove Board" : "Set On Board"}
      </button>
      {lead.linkedDealId ? (
        <Link
          className="border border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
          href={dealHref}
        >
          {"Open Deal"}
        </Link>
      ) : (
        <button
          className="border border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
          onClick={() => convertLeadToDeal(lead.id)}
          type="button"
        >
          {"Create Deal"}
        </button>
      )}
      <button className={leadButtonClass} onClick={() => onDialogOpen("email", lead.id)} type="button">
        {"Send Mail"}
      </button>
      <button className={leadButtonClass} onClick={() => onDialogOpen("message", lead.id)} type="button">
        {"Send Message"}
      </button>
      <button className={leadButtonClass} onClick={() => onDialogOpen("edit", lead.id)} type="button">
        {"Edit"}
      </button>
      {lead.stage !== "canceled" ? (
        <button
          className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700"
          onClick={() => onDialogOpen("cancel", lead.id)}
          type="button"
        >
          {"Cancel"}
        </button>
      ) : null}
    </div>
  )
}

function LeadKanbanCard({
  isActive,
  lead,
  onOpen,
}: {
  isActive: boolean
  lead: LeadFlowItem
  onOpen: (leadId: string) => void
}) {
  return (
    <article
      className={cn(
        "border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900",
        isActive && "border-primary",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{lead.name}</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lead.property}</p>
        </div>
        <button
          className="drag-handle cursor-grab border border-slate-200 px-2 py-1 text-slate-400 active:cursor-grabbing dark:border-white/10"
          type="button"
        >
          <span className="material-symbols-outlined text-sm">{"drag_indicator"}</span>
        </button>
      </div>
      <button className="block w-full px-4 py-4 text-left" onClick={() => onOpen(lead.id)} type="button">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{lead.budget}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{lead.summary}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="font-semibold">{lead.agent}</span>
          <span>{lead.lastActivity}</span>
        </div>
      </button>
    </article>
  )
}

function LeadDetailsPanel({
  dealHref,
  lead,
  onClose,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  lead: LeadFlowItem
  onClose: () => void
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", leadId: string) => void
  onToggleBoard: (leadId: string, inBoard: boolean) => void
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-900">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{"Lead Details"}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{lead.name}</h2>
        </div>
        <button className={leadButtonClass} onClick={onClose} type="button">
          {"Close Details"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                <span className={cn("size-2", leadStageMeta[lead.stage].dotClassName)}></span>
                {leadStageMeta[lead.stage].label}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{lead.summary}</p>
            </div>
            <div className="border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
              {lead.priority}
            </div>
          </div>
          <div className="mt-5">
            <LeadActions
              dealHref={dealHref}
              lead={lead}
              onDialogOpen={onDialogOpen}
              onToggleBoard={onToggleBoard}
            />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Property"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lead.property}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Budget"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lead.budget}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Assigned Agent"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lead.agent}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Timeline"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{lead.timeline}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Email"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{lead.email}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Phone"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{lead.phone}</p></div>
          </div>
        </div>
        <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{"Interaction History"}</h3>
          <div className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5 dark:border-white/10">
            {lead.history.map((item) => (
              <div key={`${lead.id}-${item.label}-${item.time}`} className="relative">
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
  const leads = useAdminFlowStore((state) => state.leads)
  const replaceLeadStage = useAdminFlowStore((state) => state.replaceLeadStage)
  const resetFlow = useAdminFlowStore((state) => state.resetFlow)
  const setLeadBoard = useAdminFlowStore((state) => state.setLeadBoard)
  const portalRoutes = getPortalRoutes(pathname)

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<LeadView>("board")
  const [dialogState, setDialogState] = useState<LeadDialogState>(null)

  const boardColumns = useMemo(
    () =>
      boardLeadStages.reduce((columns, stage) => {
        columns[stage] = leads.filter((lead) => lead.inBoard && lead.stage === stage)
        return columns
      }, {} as Record<LeadStage, LeadFlowItem[]>),
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
        value: `${leads.filter((lead) => lead.stage !== "canceled").length}`,
        detail: "Tracked inside CRM",
        icon: "group",
      },
      {
        label: "On Board",
        value: `${leads.filter((lead) => lead.inBoard && lead.stage !== "canceled").length}`,
        detail: "Active follow-up board",
        icon: "view_kanban",
      },
      {
        label: "Converted To Deal",
        value: `${leads.filter((lead) => lead.stage === "deal").length}`,
        detail: "Already pushed into deal pipeline",
        icon: "partner_exchange",
      },
      {
        label: "Canceled",
        value: `${leads.filter((lead) => lead.stage === "canceled").length}`,
        detail: "Removed by action modal",
        icon: "block",
      },
    ],
    [leads],
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-background-dark md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{"Lead CRM"}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {"Only chosen leads sit on the board. Cancel, email, message, edit, and deal conversion all happen from actions, not from a final board column."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-slate-200 dark:border-white/10">
                <button className={cn("border-r border-slate-200 px-4 py-2 text-sm font-semibold dark:border-white/10", viewMode === "board" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("board")} type="button">{"Board"}</button>
                <button className={cn("px-4 py-2 text-sm font-semibold", viewMode === "list" ? "bg-primary text-white" : "bg-white text-slate-500 dark:bg-slate-900")} onClick={() => setViewMode("list")} type="button">{"List"}</button>
              </div>
              <button className="border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200" onClick={resetFlow} type="button">{"Load Demo Data"}</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-2 xl:grid-cols-4 md:px-6">
          {stats.map((stat) => (
            <article key={stat.label} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                <span className="material-symbols-outlined text-primary">{stat.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {viewMode === "board" ? (
            <div className="h-full overflow-x-auto px-4 py-5 md:px-6">
              {leads.some((lead) => lead.inBoard && lead.stage !== "canceled") ? (
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
                        setList={(newList) => replaceLeadStage(stage, newList)}
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
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{"No board demo leads yet"}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {"Load the demo data or move leads onto the board from the list view."}
                  </p>
                  <button className="mt-4 border border-primary bg-primary px-4 py-2 text-sm font-bold text-white" onClick={resetFlow} type="button">
                    {"Load Demo Data"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto px-4 py-5 md:px-6">
              {orderedLeads.length > 0 ? (
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
                            onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
                            onToggleBoard={setLeadBoard}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{"No lead demo data found"}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {"Click below to restore the seeded Lead CRM demo data."}
                  </p>
                  <button className="mt-4 border border-primary bg-primary px-4 py-2 text-sm font-bold text-white" onClick={resetFlow} type="button">
                    {"Load Demo Data"}
                  </button>
                </div>
              )}
            </div>
          )}
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
              onDialogOpen={(type, leadId) => setDialogState({ type, leadId })}
              onToggleBoard={setLeadBoard}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <LeadCommunicationDialog key={dialogLead ? `${dialogLead.id}-${dialogState?.type}` : "lead-communication"} lead={dialogLead} mode={dialogState?.type === "email" || dialogState?.type === "message" ? dialogState.type : null} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "email" || dialogState?.type === "message"} />
      <LeadCancelDialog key={dialogLead ? `${dialogLead.id}-cancel` : "lead-cancel"} lead={dialogLead} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "cancel"} />
      <LeadEditDialog key={dialogLead ? `${dialogLead.id}-edit` : "lead-edit"} lead={dialogLead} onOpenChange={(open) => setDialogState(open ? dialogState : null)} open={dialogState?.type === "edit"} />
    </main>
  )
}
