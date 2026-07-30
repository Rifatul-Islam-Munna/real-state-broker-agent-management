"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

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
import { cn } from "@/lib/utils"

export type SequenceAudience = "realtor" | "visitor"

type SequenceStatus = "active" | "paused" | "cancelled" | "completed"
type SequenceFilter = "all" | "active" | "stopped"

type Showing = {
  id: number
  realtorName?: string
  realtorEmail?: string
  realtorPhone?: string
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string
  propertyText?: string
  showingAt?: string | null
  outreachAt?: string | null
  directTemplateId?: string
  followUpTemplateId?: string
  followUpGapDays?: number
  followUpEnabled?: boolean
  replyReceived?: boolean
  replyReceivedAt?: string | null
  sequenceStatus?: SequenceStatus
  sequenceStep?: string
  emailEnabled?: boolean
  smsEnabled?: boolean
  lead?: { id: number; name?: string; email?: string; phone?: string; followUpStatus?: string } | null
  property?: { id: number; title?: string; location?: string } | null
}

type PageResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

type SequenceSummary = {
  total: number
  active: number
  paused: number
  cancelled: number
  completed: number
  replied: number
  replyRate: number
  stopRate: number
  emailOnly: number
  smsOnly: number
  multiChannel: number
  followUpEnabled: number
  averageGapDays: number
  generatedAt: string
  tips: Array<{
    id: string
    title: string
    detail: string
    tone: "primary" | "secondary" | "tertiary"
  }>
}

const EMPTY_RESULT: PageResult<Showing> = {
  items: [],
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error((await response.text()) || "Request failed")
  return response.json()
}

export function ShowingSequenceMonitor({ audience }: { audience: SequenceAudience }) {
  const [result, setResult] = useState<PageResult<Showing>>(EMPTY_RESULT)
  const [summary, setSummary] = useState<SequenceSummary | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("25")
  const [filter, setFilter] = useState<SequenceFilter>("all")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    setPage(1)
  }, [search, pageSize, filter])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      const payload = await api<SequenceSummary>(`/realtor-showings/sequences/summary?${params}`)
      setSummary(payload)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load sequence summary.")
    } finally {
      setSummaryLoading(false)
    }
  }, [search])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ page: String(page), pageSize })
      if (search.trim()) params.set("search", search.trim())
      try {
        const payload = await api<PageResult<Showing> | Showing[]>(`/realtor-showings?${params}`)
        const normalized = Array.isArray(payload)
          ? {
              items: payload,
              page,
              pageSize: Number(pageSize),
              totalCount: payload.length,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            }
          : payload
        if (alive) setResult(normalized)
      } catch (reason) {
        if (alive) setError(reason instanceof Error ? reason.message : "Unable to load showing sequences.")
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [page, pageSize, search])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 180)
    return () => window.clearTimeout(timer)
  }, [loadSummary])

  async function setStatus(item: Showing, status: "active" | "paused" | "cancelled") {
    setUpdatingId(item.id)
    setError(null)
    try {
      const updated = await api<Showing>(`/realtor-showings/${item.id}/sequence`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      setResult((current) => ({
        ...current,
        items: current.items.map((entry) => (entry.id === item.id ? { ...entry, ...updated } : entry)),
      }))
      await loadSummary()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update sequence.")
    } finally {
      setUpdatingId(null)
    }
  }

  const visibleItems = useMemo(
    () =>
      result.items.filter((item) => {
        const status = getSequenceStatus(item)
        if (filter === "active") return status === "active"
        if (filter === "stopped") return status === "paused" || status === "cancelled" || status === "completed"
        return true
      }),
    [filter, result.items],
  )

  const title = audience === "realtor" ? "Realtor Message Sequences" : "Lead Showing Message Sequences"

  function exportData() {
    const rows = [
      ["Name", "Contact", "Property", "Status", "Sequence", "Next Step", "Channels", "Gap Days"],
      ...visibleItems.map((item) => {
        const person = audience === "realtor" ? item.realtorName : item.visitorName || item.lead?.name
        const contact = audience === "realtor"
          ? item.realtorEmail || item.realtorPhone
          : item.visitorEmail || item.visitorPhone || item.lead?.email || item.lead?.phone
        return [
          person || "Unknown contact",
          contact || "",
          item.property?.title || item.property?.location || item.propertyText || "",
          getSequenceStatus(item),
          item.directTemplateId || "Default reminder",
          item.outreachAt || item.showingAt || "Immediate",
          formatChannels(item),
          String(item.followUpGapDays || 0),
        ]
      }),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    link.download = "realtor-message-sequences.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
              <span>Lead Tracking</span>
              <AppIcon className="text-sm" name="chevron_right" />
              <span className="text-[var(--ether-primary)]">Message Sequences</span>
            </div>
            <h1 className="ether-display-lg mt-2 text-[var(--ether-on-surface)]">{title}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold"
              onClick={() => setAdvancedOpen((current) => !current)}
              type="button"
              variant="outline"
            >
              <AppIcon name="filter_list" />
              Advanced Filters
            </Button>
            <Button
              className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)]"
              onClick={exportData}
              type="button"
            >
              <AppIcon name="download" />
              Export Data
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)] sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric icon="all_inclusive" label="Total" loading={summaryLoading} tone="primary" value={summary?.total ?? result.totalCount} />
          <SummaryMetric icon="check_circle" label="Active" loading={summaryLoading} tone="secondary" value={summary?.active ?? 0} />
          <SummaryMetric icon="pause_circle" label="Stopped" loading={summaryLoading} tone="tertiary" value={(summary?.paused ?? 0) + (summary?.cancelled ?? 0)} />
          <div className="flex items-center justify-between rounded-2xl bg-[var(--ether-surface-container-low)] px-5 py-4">
            <div>
              <p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Reply Rate</p>
              <p className="mt-2 text-2xl font-bold text-[var(--ether-secondary)]">{summaryLoading ? "—" : `${summary?.replyRate ?? 0}%`}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]"><AppIcon name="trending_up" /></span>
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 rounded-xl bg-[var(--ether-surface-container)] p-1">
                {([
                  ["all", "All Realtors"],
                  ["active", "Active"],
                  ["stopped", "Stopped"],
                ] as Array<[SequenceFilter, string]>).map(([value, label]) => (
                  <button
                    className={cn(
                      "rounded-lg px-4 py-2 text-xs font-semibold transition",
                      filter === value
                        ? "bg-white text-[var(--ether-primary)] shadow-sm"
                        : "text-[var(--ether-on-surface-variant)]",
                    )}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-10 w-36 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4">
                  <span>{pageSize} per page</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-[var(--ether-on-surface-variant)]">
              Showing {visibleItems.length} of {result.totalCount} records
            </p>
          </div>

          {advancedOpen ? (
            <div className="mt-4 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_30%,transparent)] pt-4">
              <div className="relative max-w-2xl">
                <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
                <Input
                  className="h-11 rounded-lg border-0 bg-[var(--ether-surface-container-low)] pl-9 shadow-none"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search realtor, email, phone, property..."
                  value={search}
                />
              </div>
            </div>
          ) : null}
        </section>

        {error ? <div className="rounded-xl bg-[var(--ether-error-container)] p-4 text-sm font-semibold text-[var(--ether-error)]">{error}</div> : null}

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-[color-mix(in_srgb,var(--ether-surface-container-low)_72%,white)]">
                  <TableHeading>Realtor</TableHeading>
                  <TableHeading>Status</TableHeading>
                  <TableHeading>Sequence</TableHeading>
                  <TableHeading>Next Step</TableHeading>
                  <TableHeading>Channel</TableHeading>
                  <TableHeading className="text-right">Actions</TableHeading>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="h-32 text-center text-sm text-[var(--ether-outline)]" colSpan={6}>Loading sequences...</td></tr>
                ) : visibleItems.length === 0 ? (
                  <tr><td className="h-32 text-center text-sm text-[var(--ether-outline)]" colSpan={6}>No showing sequences match the current filters.</td></tr>
                ) : visibleItems.map((item, index) => (
                  <SequenceRow
                    audience={audience}
                    index={index}
                    item={item}
                    key={`${audience}-${item.id}`}
                    onStatus={setStatus}
                    updating={updatingId === item.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            onPage={setPage}
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            totalPages={result.totalPages}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Sequence Health</h2>
              <AppIcon className="text-[var(--ether-primary)]" name="analytics" />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <HealthBar label="Reply Rate" tone="secondary" value={summary?.replyRate ?? 0} />
              <HealthBar label="Paused / Cancelled" tone="tertiary" value={summary?.stopRate ?? 0} />
            </div>
            <div className="mt-6 grid gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] pt-5 sm:grid-cols-3">
              <SmallStat label="Multi-channel" value={summary?.multiChannel ?? 0} />
              <SmallStat label="Follow-up enabled" value={summary?.followUpEnabled ?? 0} />
              <SmallStat label="Average gap" value={`${summary?.averageGapDays ?? 0}d`} />
            </div>
          </article>

          <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Sequence Optimization Tips</h2>
              <AppIcon className="text-[var(--ether-secondary)]" name="lightbulb" />
            </div>
            <div className="mt-6 space-y-4">
              {summaryLoading ? <p className="text-sm text-[var(--ether-outline)]">Analyzing live sequence data...</p> : summary?.tips.map((tip) => (
                <div className="flex gap-3" key={tip.id}>
                  <span className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    tip.tone === "secondary"
                      ? "bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]"
                      : tip.tone === "tertiary"
                        ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]"
                        : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]",
                  )}><AppIcon className="text-sm" name="info" /></span>
                  <div>
                    <p className="text-sm font-bold text-[var(--ether-on-surface)]">{tip.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ether-on-surface-variant)]">{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}

function SequenceRow({
  audience,
  index,
  item,
  onStatus,
  updating,
}: {
  audience: SequenceAudience
  index: number
  item: Showing
  onStatus: (item: Showing, status: "active" | "paused" | "cancelled") => Promise<void>
  updating: boolean
}) {
  const person = audience === "realtor" ? item.realtorName : item.visitorName || item.lead?.name
  const contact = audience === "realtor"
    ? item.realtorEmail || item.realtorPhone
    : item.visitorEmail || item.visitorPhone || item.lead?.email || item.lead?.phone
  const status = getSequenceStatus(item)
  const property = item.property?.title || item.property?.location || item.propertyText || "No property"
  const nextStep = item.outreachAt || item.showingAt
  const leadHistoryHref = item.lead?.id ? `/dashboard/lead-history?leadId=${item.lead.id}` : "/dashboard/lead-history"
  const initials = (person || "Unknown")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return (
    <tr className="border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_22%,transparent)] transition hover:bg-[var(--ether-surface-container-low)]/45">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            index % 2 === 0
              ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
              : "bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]",
          )}>{initials || "R"}</span>
          <div className="min-w-0">
            <p className="truncate font-bold text-[var(--ether-on-surface)]">{person || "Unknown contact"}</p>
            <p className="mt-1 max-w-52 truncate text-xs text-[var(--ether-on-surface-variant)]">{contact || "No contact"}</p>
            <p className="mt-1 max-w-52 truncate text-[10px] text-[var(--ether-outline)]">{property}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><StatusBadge status={status} /></td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ether-on-surface)]"><AppIcon className="text-[var(--ether-primary)]" name="send" />{item.directTemplateId || "Default reminder"}</div>
        <p className="mt-1 text-xs text-[var(--ether-outline)]">{item.followUpEnabled ? `Follow-up: ${item.followUpTemplateId || "Default"}` : "No follow-up"}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-[var(--ether-on-surface)]">{nextStep ? new Date(nextStep).toLocaleString() : "Immediate"}</p>
        <p className="mt-1 text-xs font-semibold text-[var(--ether-error)]">Gap: {item.followUpGapDays || 0}d</p>
      </td>
      <td className="px-4 py-4"><span className="inline-flex items-center gap-2 text-sm text-[var(--ether-on-surface-variant)]"><AppIcon name={item.emailEnabled && item.smsEnabled ? "forum" : item.emailEnabled ? "mail" : "chat"} />{formatChannels(item)}</span></td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap justify-end gap-2">
          <Button className="h-9 rounded-lg px-3 text-xs font-semibold" render={<Link href={leadHistoryHref} />} variant="outline"><AppIcon name="timeline" />History</Button>
          {status !== "active" && status !== "completed" ? <Button className="h-9 rounded-lg px-3 text-xs font-semibold" disabled={updating} onClick={() => void onStatus(item, "active")} variant="outline"><AppIcon name="play_circle" />Resume</Button> : null}
          {status === "active" ? <Button className="h-9 rounded-lg px-3 text-xs font-semibold" disabled={updating} onClick={() => void onStatus(item, "paused")} variant="outline"><AppIcon name="pause_circle" />Pause</Button> : null}
          {status !== "cancelled" && status !== "completed" ? <Button className="h-9 rounded-lg px-3 text-xs font-semibold text-[var(--ether-error)]" disabled={updating} onClick={() => void onStatus(item, "cancelled")} variant="outline"><AppIcon name="cancel" />Cancel</Button> : null}
        </div>
      </td>
    </tr>
  )
}

function getSequenceStatus(item: Showing): SequenceStatus {
  if (item.replyReceived) return "completed"
  return item.sequenceStatus || (item.followUpEnabled ? "active" : "paused")
}

function formatChannels(item: Showing) {
  return [item.emailEnabled ? "Email" : null, item.smsEnabled ? "SMS" : null].filter(Boolean).join(" + ") || "No channel"
}

function StatusBadge({ status }: { status: SequenceStatus }) {
  return <Badge className={cn(
    "rounded-full border-0 px-3 py-1 text-[10px] font-bold uppercase",
    status === "active"
      ? "bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]"
      : status === "completed"
        ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
        : "bg-[var(--ether-error-container)] text-[var(--ether-error)]",
  )}>{status}</Badge>
}

function SummaryMetric({ icon, label, loading, tone, value }: { icon: string; label: string; loading: boolean; tone: "primary" | "secondary" | "tertiary"; value: number }) {
  const toneClass = tone === "secondary"
    ? "bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]"
    : tone === "tertiary"
      ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]"
      : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return <div className="flex items-center gap-4 rounded-2xl px-4 py-3"><span className={`flex size-10 items-center justify-center rounded-xl ${toneClass}`}><AppIcon name={icon} /></span><div><p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{label}</p><p className="mt-1 text-2xl font-bold text-[var(--ether-on-surface)]">{loading ? "—" : value.toLocaleString()}</p></div></div>
}

function HealthBar({ label, tone, value }: { label: string; tone: "secondary" | "tertiary"; value: number }) {
  return <div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-[var(--ether-on-surface-variant)]">{label}</span><span className={tone === "secondary" ? "font-bold text-[var(--ether-secondary)]" : "font-bold text-[var(--ether-error)]"}>{value}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ether-surface-container-high)]"><div className={tone === "secondary" ? "h-full rounded-full bg-[var(--ether-secondary)]" : "h-full rounded-full bg-[var(--ether-error)]"} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>
}

function SmallStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-[var(--ether-surface-container-low)] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ether-outline)]">{label}</p><p className="mt-2 text-lg font-bold text-[var(--ether-on-surface)]">{value}</p></div>
}

function TableHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]", className)}>{children}</th>
}

function Pagination({ page, totalPages, totalCount, pageSize, onPage }: { page: number; totalPages: number; totalCount: number; pageSize: number; onPage: (page: number) => void }) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(totalCount, page * pageSize)
  return <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_24%,transparent)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-[var(--ether-on-surface-variant)]">Showing {start}-{end} of {totalCount}</span><div className="flex items-center gap-2"><Button disabled={page <= 1} onClick={() => onPage(page - 1)} size="sm" variant="outline">Previous</Button><span className="px-2 text-sm font-semibold text-[var(--ether-on-surface)]">Page {page} of {totalPages}</span><Button disabled={page >= totalPages} onClick={() => onPage(page + 1)} size="sm" variant="outline">Next</Button></div></div>
}
