"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useShowingFeedback } from "@/hooks/use-realtor-showings-api"
import { formatDateTimeInZone } from "@/lib/time-zone"
import { cn } from "@/lib/utils"

import type { FeedbackPropertySummary } from "./feedback-dashboard"

type SentimentFilter = "all" | "positive" | "negative" | "neutral"

export function FeedbackRegistry({
  advancedOpen,
  fromDate,
  onFromDateChange,
  onPropertyChange,
  onToDateChange,
  propertyId,
  summaries,
  timeZone,
  toDate,
}: {
  advancedOpen: boolean
  fromDate: string
  onFromDateChange: (value: string) => void
  onPropertyChange: (value: number | null) => void
  onToDateChange: (value: string) => void
  propertyId: number | null
  summaries: FeedbackPropertySummary[]
  timeZone: string
  toDate: string
}) {
  const [page, setPage] = useState(1)
  const [sentiment, setSentiment] = useState<SentimentFilter>("all")
  const [propertySearch, setPropertySearch] = useState("")
  const selected = summaries.find((item) => item.propertyId === propertyId)
  const query = useShowingFeedback({
    propertyId,
    page,
    pageSize: 10,
    fromDate,
    toDate,
    sentiment: sentiment === "all" ? undefined : sentiment,
  })

  const visibleProperties = summaries.filter((item) =>
    item.propertyTitle.toLowerCase().includes(propertySearch.trim().toLowerCase()),
  )

  function resetPage(action: () => void) {
    action()
    setPage(1)
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-surface-1)]">
      <div className="border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-4 rounded-lg bg-[var(--ether-surface-container-low)] p-1">
              {(["all", "positive", "negative", "neutral"] as const).map((filter) => (
                <button
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-semibold capitalize transition",
                    sentiment === filter
                      ? "bg-white text-[var(--ether-primary)] shadow-sm"
                      : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]",
                  )}
                  key={filter}
                  onClick={() => resetPage(() => setSentiment(filter))}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>

            <Select
              value={propertyId ? String(propertyId) : "none"}
              onValueChange={(value) => resetPage(() => onPropertyChange(value === "none" ? null : Number(value)))}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-0 bg-transparent px-3 text-xs font-semibold shadow-none sm:w-[260px]"><span className="truncate">{selected?.propertyTitle ?? "Property: All"}</span></SelectTrigger>
              <SelectContent className="max-h-96">
                <div className="sticky top-0 z-10 bg-white p-2">
                  <div className="relative"><AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" /><Input className="h-9 rounded-lg border-[var(--ether-outline-variant)] pl-9" onChange={(event) => setPropertySearch(event.target.value)} onKeyDown={(event) => event.stopPropagation()} placeholder="Search properties..." value={propertySearch} /></div>
                </div>
                <SelectItem value="none">Property: All</SelectItem>
                {visibleProperties.map((item) => <SelectItem key={item.propertyId} value={String(item.propertyId)}>{item.propertyTitle} ? {item.feedbackCount}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-[var(--ether-on-surface-variant)] xl:justify-end">
            <span>{selected ? `${selected.feedbackCount} property replies` : `${summaries.length} properties`}</span>
            <Badge className="rounded-md border-0 bg-[var(--ether-primary-fixed)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-primary)]">{timeZone}</Badge>
          </div>
        </div>

        {advancedOpen ? (
          <div className="mt-4 grid gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] pt-4 sm:grid-cols-2 xl:max-w-xl">
            <DateField icon="calendar_month" value={fromDate} onChange={(value) => resetPage(() => onFromDateChange(value))} />
            <DateField icon="event" value={toDate} onChange={(value) => resetPage(() => onToDateChange(value))} />
          </div>
        ) : null}
      </div>

      {!propertyId ? (
        <EmptyState icon="home_work" text="Choose a property to open its feedback registry." />
      ) : query.isLoading ? (
        <EmptyState icon="progress_activity" text="Loading feedback..." />
      ) : query.error ? (
        <div className="p-6"><Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert></div>
      ) : !query.data?.items.length ? (
        <EmptyState icon="rate_review" text={`No ${sentiment === "all" ? "" : `${sentiment} `}feedback in this date range.`} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)]">
                  <TableHead className="px-5 py-3 ether-label-caps text-[var(--ether-on-surface-variant)]">Reply Received</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Realtor</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Channel</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Sentiment</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Classifier</TableHead>
                  <TableHead className="pr-6 ether-label-caps text-[var(--ether-on-surface-variant)]">Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item, index) => {
                  const initials = (item.realtorName || "Realtor").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
                  return (
                    <TableRow className="border-0 transition hover:bg-[var(--ether-surface-container-low)]/45" key={item.id}>
                      <TableCell className="px-5 py-4 whitespace-nowrap font-medium text-[var(--ether-on-surface)]">{formatDateTimeInZone(item.receivedAt, timeZone)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3"><span className={index % 2 === 0 ? "flex size-10 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-xs font-bold text-[var(--ether-primary)]" : "flex size-10 items-center justify-center rounded-full bg-[var(--ether-secondary-container)]/40 text-xs font-bold text-[var(--ether-secondary)]"}>{initials || "R"}</span><div><p className="font-bold text-[var(--ether-on-surface)]">{item.realtorName || "Realtor"}</p><p className="mt-1 max-w-52 truncate text-xs text-[var(--ether-on-surface-variant)]">{item.realtorContact || "No contact"}</p></div></div>
                      </TableCell>
                      <TableCell><Badge className="rounded-full border-0 bg-[var(--ether-surface-container-high)] px-3 py-1 text-[10px] font-bold text-[var(--ether-on-surface-variant)]">{item.channel === "Sms" ? "SMS" : "Email"}</Badge></TableCell>
                      <TableCell><SentimentBadge sentiment={item.sentiment} /></TableCell>
                      <TableCell><Badge className="rounded-full border-0 bg-[var(--ether-primary-fixed)] px-3 py-1 text-[10px] font-bold text-[var(--ether-primary)]">{item.classifier || "Unknown"}</Badge><p className="mt-2 text-xs text-[var(--ether-outline)]">{Math.round((item.confidence ?? 0) * 100)}% confidence</p></TableCell>
                      <TableCell className="max-w-[420px] whitespace-pre-wrap pr-5 py-4 leading-6 text-[var(--ether-on-surface-variant)]">{item.feedbackText}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_24%,transparent)] bg-[var(--ether-surface-container-low)]/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[var(--ether-on-surface-variant)]">{query.data.totalCount} matching items</span>
            <div className="flex items-center gap-2"><Button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} size="sm" variant="outline">Previous</Button><span className="min-w-24 text-center text-sm font-semibold text-[var(--ether-on-surface)]">Page {query.data.page} of {query.data.totalPages}</span><Button disabled={page >= query.data.totalPages} onClick={() => setPage((value) => value + 1)} size="sm" variant="outline">Next</Button></div>
          </div>
        </>
      )}
    </section>
  )
}

function DateField({ icon, value, onChange }: { icon: string; value: string; onChange: (value: string) => void }) {
  return <div className="relative"><AppIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name={icon} /><Input className="h-11 rounded-lg border-0 bg-[var(--ether-surface-container-low)] pl-9 shadow-none" type="date" value={value} onChange={(event) => onChange(event.target.value)} /></div>
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return <div className="m-6 rounded-[20px] border border-dashed border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)]/35 py-16 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-[var(--ether-outline)] shadow-sm"><AppIcon className="text-2xl" name={icon} /></span><p className="mt-4 text-sm text-[var(--ether-on-surface-variant)]">{text}</p></div>
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === "negative") return <Badge className="rounded-full border-0 bg-[var(--ether-error-container)] px-3 py-1 text-[10px] font-bold text-[var(--ether-error)]">Negative</Badge>
  if (sentiment === "positive") return <Badge className="rounded-full border-0 bg-[var(--ether-secondary-container)]/40 px-3 py-1 text-[10px] font-bold text-[var(--ether-secondary)]">Positive</Badge>
  return <Badge className="rounded-full border-0 bg-[var(--ether-surface-container-high)] px-3 py-1 text-[10px] font-bold text-[var(--ether-on-surface-variant)]">Neutral</Badge>
}
