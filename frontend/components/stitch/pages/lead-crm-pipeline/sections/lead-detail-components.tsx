"use client"

import Link from "next/link"
import { useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { type LeadItem, useLeadHistory } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"
import { formatDateTimeInZone } from "@/lib/time-zone"
import { formatDateTimeLabel, formatLeadPriority, formatRelativeTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

import { leadButtonClass, leadStageMeta } from "./lead-shared"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

function getLeadNotes(notes?: string[] | null) {
  return (notes ?? []).filter((note) => (note?.trim() ?? "").length > 0)
}

function cleanFeedText(value?: string | null) {
  return (value ?? "")
    .replace(/&nbsp;|&#xa0;|&#xA0;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\r\\n/g, "\\n")
    .trim()
}

function activityTitle(title: string, status?: string, kind?: string, direction?: string) {
  if ((kind === "MailInbox" || kind === "ContactForm") && direction === "Incoming") {
    return `Original inquiry · ${title}`
  }
  if (status === "Scheduled") return `Scheduled · ${title}`
  if (status === "Sent") return `Sent · ${title}`
  if (status === "Received") return `Received reply · ${title}`
  if (status === "Failed") return `Failed · ${title}`
  return title
}

function activityDescription(entry: { summary?: string | null; body?: string | null; status?: string; scheduledAt?: string | null }, timeZone: string) {
  const description = cleanFeedText(entry.summary || entry.body)
  if (entry.status === "Scheduled" && entry.scheduledAt) {
    return `This message is queued and will send on ${formatDateTimeInZone(entry.scheduledAt, timeZone)}.\\n\\n${description}`.trim()
  }
  return description || "No message details recorded."
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
  onRemove,
}: {
  isActive: boolean
  lead: LeadItem
  onOpen: (leadId: number) => void
  onRemove: (leadId: number) => Promise<void>
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const lastActivityLabel = formatRelativeTimeLabel(
    lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt ?? new Date().toISOString(),
  )

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl bg-white shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]",
        lead.isFollowUpOverdue && "border-l-4 border-l-[var(--ether-error)]",
        isActive && "ring-2 ring-[var(--ether-primary)]/25",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
        <button
          aria-expanded={isExpanded}
          className="min-w-0 flex-1 text-left"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          type="button"
        >
          <h4 className="truncate text-lg font-bold text-[var(--ether-on-surface)]">{lead.name}</h4>
          <p className="mt-1 flex items-center gap-1 text-xs text-[var(--ether-on-surface-variant)]">
            <AppIcon className="text-sm" name="location_on" />
            <span className="truncate">{displayText(lead.property, "No property selected")}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--ether-on-surface-variant)]">
            <AppIcon className="text-sm text-[var(--ether-outline)]" name="calendar_today" />
            {lead.createdAt
              ? new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "No date"}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="rounded-md bg-[var(--ether-surface-container)] px-2 py-1 text-[10px] font-semibold text-[var(--ether-on-surface-variant)]">
              {lastActivityLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ether-primary)]">
              {isExpanded ? "Show less" : "Show more"}
              <AppIcon className="text-sm" name={isExpanded ? "expand_less" : "expand_more"} />
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={`Remove ${lead.name} from board`}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--ether-outline)] transition hover:bg-[var(--ether-error-container)] hover:text-[var(--ether-error)]"
            onClick={() => void onRemove(lead.id)}
            title="Remove from board"
            type="button"
          >
            <AppIcon className="text-lg" name="remove_from_queue" />
          </button>
          <button
            aria-label="Drag lead card"
            className="drag-handle flex size-8 cursor-grab items-center justify-center rounded-lg text-[var(--ether-outline)] transition hover:bg-[var(--ether-surface-container-low)] hover:text-[var(--ether-on-surface)] active:cursor-grabbing"
            type="button"
          >
            <AppIcon className="text-lg" name="drag_indicator" />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] px-5 pb-5 pt-4">
          <button className="block w-full text-left" onClick={() => onOpen(lead.id)} type="button">
            <p className="text-2xl font-extrabold tracking-[-0.03em] text-[var(--ether-primary)]">
              {displayText(lead.budget, "Budget not set")}
            </p>
            <p className="mt-3 line-clamp-2 text-xs italic leading-5 text-[var(--ether-on-surface-variant)]">
              {displayText(lead.summary, "No summary yet.")}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] pt-3 text-xs text-[var(--ether-on-surface-variant)]">
              <span className="flex min-w-0 items-center gap-1 font-semibold">
                <AppIcon className="text-sm" name="person" />
                <span className="truncate">{displayText(lead.agent, "No agent assigned")}</span>
              </span>
              <span className="text-[10px] font-semibold text-[var(--ether-primary)]">Open details</span>
            </div>

            {lead.nextActionDate ? (
              <div
                className={cn(
                  "mt-4 flex items-center gap-3 rounded-lg p-3",
                  lead.isFollowUpOverdue
                    ? "bg-[var(--ether-error)] text-white"
                    : "bg-[color-mix(in_srgb,var(--ether-secondary-container)_28%,white)] text-[var(--ether-secondary)]",
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", lead.isFollowUpOverdue ? "bg-white/20" : "bg-[var(--ether-secondary-container)]")}>
                  <AppIcon className="text-lg" name={lead.isFollowUpOverdue ? "priority_high" : "calendar_today"} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em]">{lead.isFollowUpOverdue ? "Overdue action" : "Next step"}</p>
                  <p className="mt-1 truncate text-xs font-semibold">{displayText(lead.nextActionType, "Follow up")} ? {formatDateTimeLabel(lead.nextActionDate)}</p>
                </div>
              </div>
            ) : null}
          </button>
        </div>
      ) : null}
    </article>
  )
}

export function LeadDetailsPanel({
  dealHref,
  historyHref,
  lead,
  onClose,
  onConvertLeadToDeal,
  onDeletePermanently,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  historyHref: string
  lead: LeadItem
  onClose: () => void
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onDeletePermanently: (leadId: number) => void
  onDialogOpen: (type: "cancel" | "edit" | "email" | "message" | "call", leadId: number) => void
  onToggleBoard: (leadId: number, inBoard: boolean) => Promise<void>
}) {
  const leadNotes = getLeadNotes(lead.notes)
  const sourceLabel = displayText(lead.source)
  const schedulingQuery = useSchedulingSettings()
  const workspaceTimeZone = schedulingQuery.data?.timeZone || "UTC"
  const historyQuery = useLeadHistory(lead.id, 50)
  const historyEntries = Array.isArray(historyQuery.data) ? historyQuery.data : []
  const happenedEntries = (() => {
    const nonScheduled = historyEntries
      .filter((entry) => entry.status !== "Scheduled")
      .sort((left, right) => new Date(right.occurredAt ?? right.createdAt).getTime() - new Date(left.occurredAt ?? left.createdAt).getTime())
    const smsEntries = nonScheduled.filter((entry) => entry.kind === "Sms").slice(0, 3)
    const otherEntries = nonScheduled.filter((entry) => entry.kind !== "Sms")
    return [...smsEntries, ...otherEntries]
  })()
  const nextStepEntries = historyEntries
    .filter((entry) => entry.status === "Scheduled")
    .sort((left, right) => new Date(left.scheduledAt ?? left.createdAt).getTime() - new Date(right.scheduledAt ?? right.createdAt).getTime())

  const agentInitials = displayText(lead.agent, "NA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-white [overflow-wrap:anywhere]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--ether-outline-variant)] px-6 py-4">
        <div className="min-w-0 flex-1">
          <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Lead Management</p>
          <h2 className="mt-1 break-words text-xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">{lead.name}</h2>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--ether-outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-low)]"
          onClick={onClose}
          type="button"
        >
          <AppIcon name="close" />
          Close Details
        </button>
      </header>

      <div className="custom-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <section className="space-y-4 border-b border-[var(--ether-outline-variant)] bg-[color-mix(in_srgb,var(--ether-surface-container-low)_40%,white)] px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[var(--ether-primary)]/20 bg-[var(--ether-primary-fixed)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-primary)]">
              <span className={cn("mr-1.5 size-1.5 rounded-full", leadStageMeta[lead.stage].dotClassName)} />
              {leadStageMeta[lead.stage].label}
            </span>
            <span className="inline-flex rounded-full bg-[var(--ether-surface-container)] px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--ether-on-surface-variant)]">
              {formatLeadPriority(lead.priority)} interest
            </span>
          </div>

          <p className="text-xs leading-6 text-[var(--ether-on-surface-variant)]">
            {displayText(lead.summary, "No lead summary is available yet.")}
          </p>

          <div className="grid grid-cols-12 gap-2">
            {lead.linkedDealId ? (
              <Link className="col-span-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ether-primary)] px-4 py-3 text-xs font-bold text-white" href={`${dealHref}?dealId=${lead.linkedDealId}`}>
                <AppIcon name="rocket_launch" /> Open Deal
              </Link>
            ) : (
              <button className="col-span-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ether-primary)] px-4 py-3 text-xs font-bold text-white" onClick={() => void onConvertLeadToDeal(lead.id)} type="button">
                <AppIcon name="rocket_launch" /> Create Deal
              </button>
            )}
            <Link className="col-span-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ether-outline-variant)] px-4 py-3 text-xs font-bold text-[var(--ether-on-surface)]" href={historyHref}>
              <AppIcon name="history" /> Logs
            </Link>

            <button className="col-span-3 inline-flex items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] py-3 text-[var(--ether-primary)] hover:bg-[var(--ether-surface-container-low)]" onClick={() => onDialogOpen("email", lead.id)} type="button" title="Email">
              <AppIcon name="mail" />
            </button>
            <button className="col-span-3 inline-flex items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] py-3 text-[var(--ether-primary)] hover:bg-[var(--ether-surface-container-low)]" onClick={() => onDialogOpen("message", lead.id)} type="button" title="Message">
              <AppIcon name="chat_bubble" />
            </button>
            <button className="col-span-3 inline-flex items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] py-3 text-[var(--ether-primary)] hover:bg-[var(--ether-surface-container-low)]" onClick={() => onDialogOpen("call", lead.id)} type="button" title="Call">
              <AppIcon name="call" />
            </button>
            <button className="col-span-3 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ether-outline-variant)] py-3 text-xs font-bold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-low)]" onClick={() => onDialogOpen("edit", lead.id)} type="button">
              <AppIcon name="edit" /> Edit
            </button>
          </div>
        </section>

        <div className="space-y-8 px-6 py-7">
          <section>
            <h3 className="ether-label-caps flex items-center gap-2 text-[10px] text-[var(--ether-outline)]"><AppIcon name="person" /> Client Information</h3>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
              <div className="min-w-0"><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Email Address</p><p className="mt-1 break-all text-xs font-semibold text-[var(--ether-on-surface)]">{displayText(lead.email)}</p></div>
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Phone</p><p className="mt-1 text-xs font-semibold text-[var(--ether-on-surface)]">{displayText(lead.phone)}</p></div>
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Source</p><p className="mt-1 text-xs font-semibold text-[var(--ether-on-surface)]">{sourceLabel}</p></div>
              <div>
                <p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Assigned Agent</p>
                <div className="mt-1 flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[var(--ether-secondary-container)] text-[9px] font-bold text-[var(--ether-on-secondary-container)]">{agentInitials || "NA"}</span><p className="text-xs font-semibold text-[var(--ether-primary)]">{displayText(lead.agent, "No agent assigned")}</p></div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="ether-label-caps flex items-center gap-2 text-[10px] text-[var(--ether-outline)]"><AppIcon name="real_estate_agent" /> Property Interest</h3>
            {lead.reEngagement?.isReEngagement ? (
              <div className="mt-4 rounded-lg border border-[var(--ether-primary)]/20 bg-[var(--ether-primary-fixed)]/35 p-4">
                <p className="text-xs font-bold text-[var(--ether-on-surface)]">Re-engaged for a different property</p>
                <p className="mt-1 text-[10px] leading-5 text-[var(--ether-on-surface-variant)]">Previous: <strong>{displayText(lead.reEngagement.previousPropertyName, "Previous property")}</strong>{" → "}Current: <strong>{displayText(lead.reEngagement.currentPropertyName, lead.property || "Current property")}</strong></p>
                {lead.reEngagement.restartedAt ? <p className="mt-1 text-[9px] font-semibold text-[var(--ether-outline)]">Lifecycle restarted {formatDateTimeInZone(lead.reEngagement.restartedAt, workspaceTimeZone)}</p> : null}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-[var(--ether-outline-variant)]/40 bg-[var(--ether-surface-container-low)]/60 p-4">
              <div className="col-span-2"><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Primary Property</p><p className="mt-1 text-xs font-bold text-[var(--ether-on-surface)]">{displayText(lead.property)}</p></div>
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Interest Type</p><p className="mt-1 text-xs font-semibold text-[var(--ether-on-surface)]">{displayText(lead.interest)}</p></div>
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Budget</p><p className="mt-1 text-xs font-bold text-[var(--ether-secondary)]">{displayText(lead.budget)}</p></div>
            </div>
          </section>

          <section>
            <h3 className="ether-label-caps flex items-center gap-2 text-[10px] text-[var(--ether-outline)]"><AppIcon name="event_available" /> Deal Logistics</h3>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Timeline</p><p className="mt-1 text-xs font-semibold text-[var(--ether-on-surface)]">{displayText(lead.timeline)}</p></div>
              <div><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Follow-up Status</p><span className="mt-1 inline-block rounded bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-secondary)]">{`${lead.followUpStatus ?? "Open"}`.replace(/([A-Z])/g, " $1").trim()}</span></div>
              <div className={cn("col-span-2 rounded-r-lg border-l-4 p-3", lead.isFollowUpOverdue ? "border-[var(--ether-error)] bg-[var(--ether-error-container)]" : "border-[var(--ether-primary)] bg-[var(--ether-surface-container-low)]")}>
                <p className={cn("ether-label-caps text-[9px]", lead.isFollowUpOverdue ? "text-[var(--ether-error)]" : "text-[var(--ether-primary)]")}>Immediate Next Action</p>
                <p className="mt-1 text-xs font-bold text-[var(--ether-on-surface)]">{displayText(lead.nextActionType, "No next action")}</p>
                <p className="mt-1 text-[10px] font-semibold text-[var(--ether-on-surface-variant)]">{lead.nextActionDate ? `Due ${formatDateTimeInZone(lead.nextActionDate, workspaceTimeZone)}` : "No due date"}</p>
              </div>
            </div>
          </section>

          {nextStepEntries.length > 0 ? (
            <section className="rounded-xl border border-[var(--ether-primary)]/15 bg-[var(--ether-primary-fixed)]/35 p-4">
              <h3 className="ether-label-caps flex items-center gap-2 text-[10px] text-[var(--ether-primary)]"><AppIcon name="schedule" /> Next Steps</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--ether-on-surface-variant)]">These are queued actions. They are not shown as completed activity.</p>
              <div className="mt-3 space-y-3">
                {nextStepEntries.map((entry) => (
                  <div className="rounded-lg border border-[var(--ether-primary)]/10 bg-white/75 p-3" key={`next-${lead.id}-${entry.id}-${entry.createdAt}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-bold text-[var(--ether-on-surface)]">{entry.title}</p>
                      <span className="whitespace-nowrap text-[9px] font-bold uppercase text-[var(--ether-primary)]">Queued</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold text-[var(--ether-on-surface-variant)]">Will send {formatDateTimeInZone(entry.scheduledAt ?? entry.createdAt, workspaceTimeZone)}</p>
                      <Link
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--ether-primary)]/20 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[var(--ether-primary)] hover:bg-[var(--ether-primary-fixed)]"
                        href={`/dashboard/lead-schedule?leadId=${lead.id}&scheduleId=${entry.id}`}
                      >
                        <AppIcon name="event_note" /> View in Lead Schedule
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="ether-label-caps flex items-center gap-2 text-[10px] text-[var(--ether-outline)]"><AppIcon name="analytics" /> Notes & Activity Feed</h3>
            <div className="relative ml-3 mt-5 space-y-6 border-l border-[var(--ether-outline-variant)] pl-6">
              
              {historyQuery.isLoading ? <p className="text-xs text-[var(--ether-outline)]">Loading history...</p> : null}
              {historyQuery.error ? <p className="text-xs font-semibold text-[var(--ether-error)]">{historyQuery.error?.message}</p> : null}
              {happenedEntries.map((entry) => (
                <ActivityItem
                  actionHref={entry.kind === "Sms" && entry.direction === "Incoming" ? `/dashboard/text-messages/${entry.id}` : undefined}
                  actionLabel={entry.kind === "Sms" && entry.direction === "Incoming" ? "Open conversation" : undefined}
                  key={`${lead.id}-${entry.id}-${entry.createdAt}`}
                  title={activityTitle(entry.title, entry.status, entry.kind, entry.direction)}
                  description={activityDescription(entry, workspaceTimeZone)}
                  date={entry.occurredAt ?? entry.createdAt}
                  timeZone={workspaceTimeZone}
                />
              ))}
              {leadNotes.map((note, index) => <ActivityItem key={`${lead.id}-note-${index}`} title={`Note ${index + 1}`} description={note} />)}
            </div>
          </section>
        </div>
      </div>

      <footer className="flex min-w-0 items-center justify-between gap-4 border-t border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-5 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ether-error)] hover:underline" onClick={() => onDialogOpen("cancel", lead.id)} type="button">
            <AppIcon name="archive" /> Archive Lead
          </button>
          <button className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ether-error)] hover:underline" onClick={() => onDeletePermanently(lead.id)} type="button">
            <AppIcon name="delete_forever" /> Delete permanently
          </button>
          <button className="text-xs font-semibold text-[var(--ether-on-surface-variant)]" onClick={() => void onToggleBoard(lead.id, !lead.inBoard)} type="button">
            {lead.inBoard ? "Remove from board" : "Add to board"}
          </button>
        </div>
        <div className="shrink-0 text-right"><p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Managed By</p><p className="text-xs font-bold text-[var(--ether-on-surface)]">Estate Operations</p></div>
      </footer>
    </div>
  )
}

function ActivityItem({ actionHref, actionLabel, title, description, date, timeZone = "UTC" }: { actionHref?: string; actionLabel?: string; title: string; description: string; date?: string | null; timeZone?: string }) {
  return (
    <div className="relative">
      <span className="absolute -left-[29px] top-1 size-2 rounded-full bg-[var(--ether-primary)] ring-2 ring-white" />
      <div className="flex items-start justify-between gap-4"><h4 className="text-xs font-bold text-[var(--ether-on-surface)]">{title}</h4>{date ? <span className="whitespace-nowrap text-[9px] font-bold uppercase text-[var(--ether-outline)]">{formatDateTimeInZone(date, timeZone)}</span> : null}</div>
      <p className="mt-1 text-xs leading-5 text-[var(--ether-on-surface-variant)]">{description}</p>
      {actionHref && actionLabel ? <Link className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--ether-outline-variant)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--ether-primary)] hover:bg-[var(--ether-surface-container-low)]" href={actionHref}><AppIcon name="forum" />{actionLabel}</Link> : null}
    </div>
  )
}
