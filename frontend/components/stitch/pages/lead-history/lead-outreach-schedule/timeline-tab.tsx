import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import type { LeadHistoryStatus, LeadItem, LeadOutreachScheduleItem } from "@/@types/real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

import type { OutreachKind } from "./types"
import { SectionIntro, StatusBadge, buildHistoryHref } from "./utils"

export function TimelineTab({
  isLoading,
  leads,
  onKindFilterChange,
  onLeadChange,
  onStatusFilterChange,
  pathname,
  selectedLeadId,
  statusFilter,
  timelineItems,
  timelineKindFilter,
}: {
  isLoading: boolean
  leads: LeadItem[]
  onKindFilterChange: (value: "" | OutreachKind) => void
  onLeadChange: (value: string) => void
  onStatusFilterChange: (value: "" | LeadHistoryStatus) => void
  pathname: string
  selectedLeadId: number
  statusFilter: "" | LeadHistoryStatus
  timelineItems: LeadOutreachScheduleItem[]
  timelineKindFilter: "" | OutreachKind
}) {
  return (
    <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
      <CardHeader className="border-b border-border">
        <SectionIntro
          eyebrow="Operational log"
          helper="Track scheduled, sent, failed, and reply-skipped work."
          title="Timeline"
        />
      </CardHeader>
      <CardContent className="py-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <select
            className="h-10 rounded-full border border-input bg-background px-4 text-sm font-semibold text-foreground"
            onChange={(event) => onKindFilterChange((event.target.value || "") as "" | OutreachKind)}
            value={timelineKindFilter}
          >
            <option value="">{"All channels"}</option>
            <option value="Email">{"Email"}</option>
            <option value="Sms">{"SMS"}</option>
            <option value="Call">{"Call"}</option>
          </select>
          <select
            className="h-10 rounded-full border border-input bg-background px-4 text-sm font-semibold text-foreground"
            onChange={(event) => onStatusFilterChange((event.target.value || "") as "" | LeadHistoryStatus)}
            value={statusFilter}
          >
            <option value="">{"All statuses"}</option>
            <option value="Scheduled">{"Scheduled"}</option>
            <option value="Sent">{"Sent"}</option>
            <option value="Completed">{"Completed"}</option>
            <option value="Failed">{"Failed"}</option>
          </select>
          <select
            className="h-10 rounded-full border border-input bg-background px-4 text-sm font-semibold text-foreground"
            onChange={(event) => onLeadChange(event.target.value)}
            value={Number.isFinite(selectedLeadId) ? String(selectedLeadId) : ""}
          >
            <option value="">{"All leads"}</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name || `Lead #${lead.id}`}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm font-semibold text-muted-foreground">{"Loading timeline..."}</p>
        ) : timelineItems.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-muted-foreground">{"No items for current filter."}</p>
        ) : (
          <div className="space-y-4">
            {timelineItems.map((entry) => (
              <article className="rounded-[1.6rem] border border-border/70 bg-background p-5 transition-colors duration-200 hover:border-primary/20" key={`${entry.id}-${entry.updatedAt}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-foreground">{entry.title}</p>
                      <Badge className="rounded-full bg-primary/10 px-2 py-1 text-primary" variant="secondary">
                        {entry.kind}
                      </Badge>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{entry.leadName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
                  </div>
                  <Link
                    className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-foreground"
                    href={buildHistoryHref(pathname, entry.leadId)}
                  >
                    {"Open History"}
                  </Link>
                </div>
                {entry.body ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{entry.body}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{`Email ${entry.leadEmail || "-"}`}</span>
                  <span>{`Phone ${entry.leadPhone || "-"}`}</span>
                  <span>{`Provider ${entry.provider || "-"}`}</span>
                  {entry.scheduledAt ? <span>{`Scheduled ${formatDateTimeLabel(entry.scheduledAt)}`}</span> : null}
                  {entry.occurredAt ? <span>{`Occurred ${formatDateTimeLabel(entry.occurredAt)}`}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
