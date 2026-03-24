"use client"

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import type { DealItem } from "@/hooks/use-real-estate-api"
import {
  dealStageMeta,
  dealButtonClass,
  formatDealValue,
  type OutreachType,
} from "./deal-shared"
import { cn } from "@/lib/utils"
import { formatCommissionLabel, formatDateTimeLabel } from "@/lib/admin-portal"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

export function DealActions({
  deal,
  leadHref,
  onDialogOpen,
}: {
  deal: DealItem
  leadHref: string
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", dealId: number) => void
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
      {deal.stage !== "Canceled" ? (
        <button className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700" onClick={() => onDialogOpen("cancel", deal.id)} type="button">{"Cancel"}</button>
      ) : null}
    </div>
  )
}

export function DealKanbanCard({
  deal,
  isActive,
  onOpen,
}: {
  deal: DealItem
  isActive: boolean
  onOpen: (dealId: number) => void
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
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {displayText(deal.client, "Client not set")}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {displayText(deal.note, "No deal note yet.")}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span className="font-semibold">{formatDealValue(deal.value)}</span>
          <span>{displayText(deal.deadline)}</span>
        </div>
      </button>
    </article>
  )
}

export function DealDetailsPanel({
  deal,
  leadHref,
  onClose,
  onDialogOpen,
}: {
  deal: DealItem
  leadHref: string
  onClose: () => void
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message", dealId: number) => void
}) {
  const linkedLeadLabel = displayText(deal.sourceLeadName, "No linked lead")

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
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {displayText(deal.note, "No deal note yet.")}
              </p>
            </div>
            <div className="border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary">{deal.type}</div>
          </div>
          <div className="mt-5">
            <DealActions deal={deal} leadHref={leadHref} onDialogOpen={onDialogOpen} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Client"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(deal.client)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Agent"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayText(deal.agent, "No agent assigned")}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Value"}</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatDealValue(deal.value)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Commission"}</p><p className="mt-1 text-sm font-semibold text-primary">{formatCommissionLabel(deal.value, deal.commissionRate)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Deadline"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayText(deal.deadline)}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{"Linked Lead"}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{linkedLeadLabel}</p></div>
          </div>
        </div>
        <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">{"Deal Activity"}</h3>
          <div className="mt-5 space-y-5 border-l-2 border-slate-100 pl-5 dark:border-white/10">
            <div className="relative">
              <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900"></div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{"Deal Created"}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{displayText(deal.note, "No deal note yet.")}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(deal.createdAt)}</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[29px] top-1 size-3 bg-primary ring-4 ring-white dark:ring-slate-900"></div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{"Last Update"}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{`Stage is ${dealStageMeta[deal.stage].label}.`}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(deal.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
