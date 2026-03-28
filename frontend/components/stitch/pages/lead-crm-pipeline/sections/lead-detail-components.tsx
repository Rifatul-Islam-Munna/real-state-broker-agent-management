"use client"

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { type LeadItem, useLeadHistory } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel, formatLeadPriority, formatRelativeTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

import { leadButtonClass, leadStageMeta, type OutreachType } from "./lead-shared"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

function getLeadNotes(notes?: string[] | null) {
  return (notes ?? []).filter((note) => (note?.trim() ?? "").length > 0)
}

export function LeadActions({
  dealHref,
  historyHref,
  lead,
  onConvertLeadToDeal,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  historyHref: string
  lead: LeadItem
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message" | "call", leadId: number) => void
  onToggleBoard: (leadId: number, inBoard: boolean) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className={lead.inBoard ? "border border-primary bg-primary/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary" : leadButtonClass}
        onClick={() => void onToggleBoard(lead.id, !lead.inBoard)}
        type="button"
      >
        {lead.inBoard ? "Remove Board" : "Set On Board"}
      </button>
      {lead.linkedDealId ? (
        <Link
          className="border border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
          href={`${dealHref}?dealId=${lead.linkedDealId}`}
        >
          {"Open Deal"}
        </Link>
      ) : (
        <button
          className="border border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
          onClick={() => void onConvertLeadToDeal(lead.id)}
          type="button"
        >
          {"Create Deal"}
        </button>
      )}
      <Link className={leadButtonClass} href={historyHref}>
        {"History"}
      </Link>
      <button className={leadButtonClass} onClick={() => onDialogOpen("email", lead.id)} type="button">
        {"Send Mail"}
      </button>
      <button className={leadButtonClass} onClick={() => onDialogOpen("message", lead.id)} type="button">
        {"Send Message"}
      </button>
      <button className={leadButtonClass} onClick={() => onDialogOpen("call", lead.id)} type="button">
        {"Call"}
      </button>
      <button className={leadButtonClass} onClick={() => onDialogOpen("edit", lead.id)} type="button">
        {"Edit"}
      </button>
      {lead.stage !== "Canceled" ? (
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

export function LeadKanbanCard({
  isActive,
  lead,
  onOpen,
}: {
  isActive: boolean
  lead: LeadItem
  onOpen: (leadId: number) => void
}) {
  const lastActivityLabel = formatRelativeTimeLabel(
    lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt ?? new Date().toISOString(),
  )

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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {displayText(lead.property, "No property selected")}
          </p>
        </div>
        <button
          className="drag-handle cursor-grab border border-slate-200 px-2 py-1 text-slate-400 active:cursor-grabbing dark:border-white/10"
          type="button"
        >
          <AppIcon className="text-sm" name="drag_indicator" />
        </button>
      </div>
      <button className="block w-full px-4 py-4 text-left" onClick={() => onOpen(lead.id)} type="button">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {displayText(lead.budget, "Budget not set")}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {displayText(lead.summary, "No summary yet.")}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="font-semibold">{displayText(lead.agent, "No agent assigned")}</span>
          <span>{lastActivityLabel}</span>
        </div>
      </button>
    </article>
  )
}

export function LeadDetailsPanel({
  dealHref,
  historyHref,
  lead,
  onClose,
  onConvertLeadToDeal,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  historyHref: string
  lead: LeadItem
  onClose: () => void
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message" | "call", leadId: number) => void
  onToggleBoard: (leadId: number, inBoard: boolean) => Promise<void>
}) {
  const leadNotes = getLeadNotes(lead.notes)
  const sourceLabel = displayText(lead.source)
  const historyQuery = useLeadHistory(lead.id)

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
                <span className={cn("size-2", leadStageMeta[lead.stage].dotClassName)} />
                {leadStageMeta[lead.stage].label}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {displayText(lead.summary, "No summary yet.")}
              </p>
            </div>
            <div className="border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">
              {formatLeadPriority(lead.priority)}
            </div>
          </div>
          <div className="mt-5">
            <LeadActions
              dealHref={dealHref}
              historyHref={historyHref}
              lead={lead}
              onConvertLeadToDeal={onConvertLeadToDeal}
              onDialogOpen={onDialogOpen}
              onToggleBoard={onToggleBoard}
            />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Property"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(lead.property)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Budget"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(lead.budget)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Assigned Agent"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(lead.agent, "No agent assigned")}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Timeline"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(lead.timeline)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Email"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayText(lead.email)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Phone"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayText(lead.phone)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Source"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sourceLabel}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Interest"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayText(lead.interest)}</p></div>
          </div>
        </div>
        <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{"Notes & Activity"}</h3>
          <div className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5 dark:border-white/10">
            <div className="relative">
              <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{"Lead Created"}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{`${sourceLabel} intake created this lead.`}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(lead.createdAt)}</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{"Last Update"}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{`Stage is ${leadStageMeta[lead.stage].label}.`}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(lead.updatedAt)}</p>
            </div>
            {historyQuery.isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{"Loading history..."}</p>
            ) : historyQuery.error ? (
              <p className="text-sm font-semibold text-rose-600">{historyQuery.error.message}</p>
            ) : historyQuery.data && historyQuery.data.length > 0 ? (
              historyQuery.data.map((entry) => (
                <div key={`${lead.id}-history-${entry.id}-${entry.createdAt}`} className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.title}</p>
                    <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">
                      {entry.kind}
                    </span>
                    <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                      {entry.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.summary}</p>
                  {entry.provider ? (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {`Provider: ${entry.provider}`}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {formatDateTimeLabel(entry.scheduledAt ?? entry.occurredAt ?? entry.createdAt)}
                  </p>
                </div>
              ))
            ) : null}
            {leadNotes.length > 0 ? (
              leadNotes.map((note, index) => (
                <div key={`${lead.id}-note-${index}`} className="relative">
                  <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{`Note ${index + 1}`}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{"No notes yet for this lead."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


