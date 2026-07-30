"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ContactRound,
  Download,
  History,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Feedback = {
  id: number
  leadId: number | null
  feedbackText: string
  sentiment: "positive" | "neutral" | "negative"
  intent: "apply" | "offer" | "interested" | "not_interested" | "unknown"
  priorityScore: number
  applyLikelihood: number
  confidence: number
  classifier: string
  channel: string
  sourceMessageId: string
  isRead: boolean
  receivedAt: string
  property?: { id: number; title?: string; location?: string }
  realtorShowing?: {
    visitorName?: string
    visitorEmail?: string
    visitorPhone?: string
    realtorName?: string
    replyReceived?: boolean
    lead?: { id: number; name?: string; email?: string; phone?: string }
  }
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

const today = new Date().toISOString().slice(0, 10)
const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error((await response.text()) || "Request failed")
  return response.status === 204 ? (undefined as T) : response.json()
}

export default function LeadShowingFeedbackPage() {
  const [result, setResult] = useState<PageResult<Feedback>>({
    items: [],
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [fromDate, setFromDate] = useState(monthAgo)
  const [toDate, setToDate] = useState(today)
  const [sentiment, setSentiment] = useState("all")
  const intent = "all"
  const readStatus = "all"
  const [minimumPriority] = useState("0")
  const [page, setPage] = useState(1)
  const [pageSize] = useState("25")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("recent")

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, readStatus, sentiment, intent, minimumPriority, pageSize])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: String(page),
        pageSize,
      })
      if (readStatus !== "all") params.set("readStatus", readStatus)
      if (sentiment !== "all") params.set("sentiment", sentiment)
      if (intent !== "all") params.set("intent", intent)
      if (Number(minimumPriority) > 0) params.set("minimumPriority", minimumPriority)
      try {
        const payload = await api<PageResult<Feedback>>(
          `/showing-feedback/lead-inbox?${params}`
        )
        if (alive) setResult(payload)
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => {
      alive = false
    }
  }, [fromDate, intent, minimumPriority, page, pageSize, readStatus, sentiment, toDate])

  const items = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? result.items.filter((item) => {
          const lead = item.realtorShowing?.lead
          const haystack = [
            lead?.name,
            lead?.email,
            item.realtorShowing?.visitorName,
            item.realtorShowing?.visitorEmail,
            item.property?.title,
            item.property?.location,
            item.feedbackText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          return haystack.includes(term)
        })
      : result.items

    return [...filtered].sort((a, b) => {
      if (sort === "confidence") return b.confidence - a.confidence
      if (sort === "priority") return b.priorityScore - a.priorityScore
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    })
  }, [result.items, search, sort])

  const summary = useMemo(() => {
    const positive = result.items.filter((item) => item.sentiment === "positive").length
    const neutral = result.items.filter((item) => item.sentiment === "neutral").length
    const negative = result.items.filter((item) => item.sentiment === "negative").length
    const unread = result.items.filter((item) => !item.isRead).length
    return { positive, neutral, negative, unread }
  }, [result.items])

  async function updateClassification(item: Feedback, patch: Partial<Feedback>) {
    const updated = await api<Feedback>(`/showing-feedback/${item.id}/classification`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
    setResult((current) => ({
      ...current,
      items: current.items.map((entry) =>
        entry.id === item.id ? { ...entry, ...updated } : entry
      ),
    }))
  }

  async function markRead(item: Feedback) {
    await api("/showing-feedback/bulk/read", {
      method: "PATCH",
      body: JSON.stringify({ ids: [item.id], isRead: true }),
    })
    setResult((current) => ({
      ...current,
      items: current.items.map((entry) =>
        entry.id === item.id ? { ...entry, isRead: true } : entry
      ),
    }))
  }

  function exportCsv() {
    const rows = items.map((item) => {
      const lead = item.realtorShowing?.lead
      return [
        lead?.name || item.realtorShowing?.visitorName || `Lead #${item.leadId ?? ""}`,
        item.property?.title || item.property?.location || "",
        item.sentiment,
        item.intent,
        item.feedbackText,
        item.confidence,
        item.receivedAt,
      ]
    })
    const csv = [
      ["Lead", "Property", "Sentiment", "Intent", "Feedback", "Confidence", "Received"],
      ...rows,
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `showing-feedback-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const currentPage = result.page || page
  const totalPages = Math.max(result.totalPages || 1, 1)
  const start = result.totalCount === 0 ? 0 : (currentPage - 1) * result.pageSize + 1
  const end = Math.min(result.totalCount, currentPage * result.pageSize)

  return (
    <main className="min-h-full bg-[#f9fafb] px-4 py-6 text-[#111827] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">Command Center</h1>
            <p className="mt-1 text-[15px] text-[#4b5563]">
              Centralized showing feedback and sentiment override.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#4b5563]" />
              <Input
                className="h-11 rounded-lg border-[#e5e7eb] bg-white pl-10 text-sm shadow-none sm:w-72"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search registry..."
                value={search}
              />
            </div>
            <Button
              className="h-11 rounded-lg border-[#e5e7eb] bg-white px-5 text-[#111827] hover:bg-[#f3f4f6]"
              onClick={exportCsv}
              type="button"
              variant="outline"
            >
              <Download className="mr-2 size-4" /> Export
            </Button>
            <Button
              className="h-11 rounded-lg bg-[#4343d5] px-5 font-bold text-white hover:bg-[#3737bd]"
              render={<Link href="/dashboard/showing-feedback/leads/sequences" />}
            >
              Add Entry
            </Button>
          </div>
        </header>

        <section className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Leads"
            value={result.totalCount}
            footer={
              <span className="flex items-center text-xs font-medium text-[#374151]">
                <TrendingUp className="ml-1 size-4" />
              </span>
            }
          />
          <StatCard
            accent
            icon={<BarChart3 className="size-7" />}
            label="Unread Feedback"
            value={summary.unread}
          />
          <StatCard
            label="Positive"
            tone="positive"
            value={summary.positive}
            percentage={percentage(summary.positive, result.items.length)}
          />
          <StatCard
            label="Neutral"
            tone="neutral"
            value={summary.neutral}
            percentage={percentage(summary.neutral, result.items.length)}
          />
          <StatCard
            label="Negative"
            tone="negative"
            value={summary.negative}
            percentage={percentage(summary.negative, result.items.length)}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#e5e7eb] bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm">
                <CalendarDays className="size-4 text-[#4b5563]" />
                <input
                  className="w-[110px] border-0 bg-transparent p-0 text-xs outline-none"
                  onChange={(event) => setFromDate(event.target.value)}
                  type="date"
                  value={fromDate}
                />
                <span className="text-[#9ca3af]">–</span>
                <input
                  className="w-[110px] border-0 bg-transparent p-0 text-xs outline-none"
                  onChange={(event) => setToDate(event.target.value)}
                  type="date"
                  value={toDate}
                />
              </div>
              <div className="hidden h-6 w-px bg-[#e5e7eb] sm:block" />
              <div className="flex flex-wrap gap-2">
                {(["all", "positive", "neutral", "negative"] as const).map((value) => (
                  <button
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.04em] transition ${
                      sentiment === value
                        ? "bg-[#4343d5] text-white"
                        : "text-[#4b5563] hover:bg-[#f3f4f6]"
                    }`}
                    key={value}
                    onClick={() => setSentiment(value)}
                    type="button"
                  >
                    {value === "all" ? "All Activity" : titleCase(value)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#4b5563]">Sort by</span>
              <Select onValueChange={setSort} value={sort}>
                <SelectTrigger className="h-9 w-[160px] border-0 bg-transparent text-sm font-semibold shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent First</SelectItem>
                  <SelectItem value="confidence">Sentiment Score</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="hidden grid-cols-12 gap-5 border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[#4b5563] lg:grid">
            <div className="col-span-3">Lead &amp; Property</div>
            <div className="col-span-4">Feedback Content</div>
            <div className="col-span-2">Overrides</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          <div className="divide-y divide-[#e5e7eb]">
            {loading ? (
              <div className="p-12 text-center text-sm text-[#4b5563]">Loading feedback…</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#4b5563]">
                No lead showing feedback matches the current filters.
              </div>
            ) : (
              items.map((item) => (
                <FeedbackRow
                  item={item}
                  key={item.id}
                  onMarkRead={markRead}
                  onUpdate={updateClassification}
                />
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5e7eb] bg-[#f9fafb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[#4b5563]">
              Showing {start}-{end} of {result.totalCount} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                className="rounded p-1.5 text-[#4b5563] hover:bg-[#f3f4f6] disabled:opacity-30"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                <ChevronLeft className="size-5" />
              </button>
              {pageButtons(currentPage, totalPages).map((value, index) =>
                value === "ellipsis" ? (
                  <span className="px-2 text-sm text-[#4b5563]" key={`ellipsis-${index}`}>…</span>
                ) : (
                  <button
                    className={`size-8 rounded text-sm font-medium ${
                      value === currentPage
                        ? "bg-[#4343d5] font-bold text-white"
                        : "hover:bg-[#f3f4f6]"
                    }`}
                    key={value}
                    onClick={() => setPage(value)}
                    type="button"
                  >
                    {value}
                  </button>
                )
              )}
              <button
                className="rounded p-1.5 text-[#4b5563] hover:bg-[#f3f4f6] disabled:opacity-30"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                type="button"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Link
        aria-label="Classifier controls"
        className="fixed bottom-8 right-8 flex size-12 items-center justify-center rounded-full bg-[#111827] text-white shadow-xl transition hover:scale-105"
        href="/dashboard/showing-feedback/leads/classifier-controls"
      >
        <Sparkles className="size-5" />
      </Link>
    </main>
  )
}

function StatCard({
  accent = false,
  footer,
  icon,
  label,
  percentage,
  tone = "default",
  value,
}: {
  accent?: boolean
  footer?: React.ReactNode
  icon?: React.ReactNode
  label: string
  percentage?: number
  tone?: "default" | "positive" | "neutral" | "negative"
  value: number
}) {
  const valueClass =
    tone === "positive"
      ? "text-green-700"
      : tone === "negative"
        ? "text-red-700"
        : tone === "neutral"
          ? "text-[#4b5563]"
          : accent
            ? "text-[#4343d5]"
            : "text-[#111827]"
  const badgeClass =
    tone === "positive"
      ? "bg-green-100 text-green-700"
      : tone === "negative"
        ? "bg-red-100 text-red-700"
        : "bg-[#f3f4f6] text-[#4b5563]"

  return (
    <div
      className={`flex min-h-[84px] flex-col justify-between rounded-2xl border bg-white p-3 ${
        accent
          ? "border-[#4343d5]/20 border-l-4 border-l-[#4343d5]"
          : "border-[#e5e7eb]"
      }`}
    >
      <span className={`text-[11px] font-bold tracking-[0.06em] ${accent ? "text-[#4343d5]" : "text-[#4b5563]"}`}>
        {label}
      </span>
      <div className="mt-2 flex items-end justify-between">
        <span className={`text-[28px] font-bold leading-none tracking-[-0.02em] ${valueClass}`}>
          {value.toLocaleString()}
        </span>
        {icon ? (
          <span className="flex h-9 w-16 items-center justify-center rounded bg-[#4343d5]/10 text-[#4343d5]">
            {icon}
          </span>
        ) : percentage !== undefined ? (
          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>
            {percentage}%
          </span>
        ) : (
          footer
        )}
      </div>
    </div>
  )
}

function FeedbackRow({
  item,
  onMarkRead,
  onUpdate,
}: {
  item: Feedback
  onMarkRead: (item: Feedback) => Promise<void>
  onUpdate: (item: Feedback, patch: Partial<Feedback>) => Promise<void>
}) {
  const lead = item.realtorShowing?.lead
  const name = lead?.name || item.realtorShowing?.visitorName || `Lead #${item.leadId ?? ""}`
  const property = item.property?.title || item.property?.location || "Property unavailable"
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  const sentimentStyles = {
    positive: {
      chip: "border-green-200 bg-green-100 text-green-700",
      text: "text-green-700",
      bar: "bg-green-700",
      avatar: "bg-[#eef2ff] text-[#4343d5]",
    },
    neutral: {
      chip: "border-gray-200 bg-gray-100 text-gray-600",
      text: "text-gray-600",
      bar: "bg-gray-600",
      avatar: "bg-gray-200 text-gray-600",
    },
    negative: {
      chip: "border-red-200 bg-red-100 text-red-700",
      text: "text-red-700",
      bar: "bg-red-700",
      avatar: "bg-red-50 text-red-700",
    },
  }[item.sentiment]
  const confidence = Math.max(0, Math.min(100, Math.round(item.confidence * 100)))
  const leadHistoryHref = item.leadId
    ? `/dashboard/lead-history?leadId=${item.leadId}`
    : "/dashboard/lead-history"

  return (
    <div
      className={`grid gap-5 px-5 py-4 transition hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] lg:grid-cols-12 lg:items-center ${
        item.sentiment === "negative" ? "border-l-4 border-l-red-500" : ""
      } ${item.isRead ? "bg-gray-50/30" : "bg-white"}`}
    >
      <div className="lg:col-span-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${sentimentStyles.avatar}`}>
            {initials || "L"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">{name}</p>
            <p className="mt-1 truncate text-[11px] text-[#4b5563]">{property}</p>
          </div>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-4">
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${sentimentStyles.chip}`}>
            {item.sentiment}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#4b5563]">
            {item.channel.toLowerCase().includes("sms") ? <Clock3 className="size-3" /> : <Mail className="size-3" />}
            {new Date(item.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-snug">{item.feedbackText}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 w-full max-w-[100px] rounded-full bg-[#f3f4f6]">
            <div className={`h-1 rounded-full ${sentimentStyles.bar}`} style={{ width: `${confidence}%` }} />
          </div>
          <span className={`text-[10px] font-bold ${sentimentStyles.text}`}>AI: {confidence}%</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 lg:col-span-2">
        <Select
          onValueChange={(value) => void onUpdate(item, { sentiment: value as Feedback["sentiment"] })}
          value={item.sentiment}
        >
          <SelectTrigger className={`h-9 w-full rounded border bg-white px-2 text-[11px] font-bold ${item.sentiment === "negative" ? "border-red-200 text-red-700" : "border-[#e5e7eb] text-[#4b5563]"}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="positive">Sentiment: Positive</SelectItem>
            <SelectItem value="neutral">Sentiment: Neutral</SelectItem>
            <SelectItem value="negative">Sentiment: Negative</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => void onUpdate(item, { intent: value as Feedback["intent"] })}
          value={item.intent}
        >
          <SelectTrigger className="h-9 w-full rounded border border-[#e5e7eb] bg-white px-2 text-[11px] font-bold text-[#4b5563]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apply">Intent: Apply</SelectItem>
            <SelectItem value="offer">Intent: Offer</SelectItem>
            <SelectItem value="interested">Intent: Interested</SelectItem>
            <SelectItem value="not_interested">Intent: Not interested</SelectItem>
            <SelectItem value="unknown">Intent: Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-start gap-2 lg:col-span-3 lg:justify-end">
        <Button
          className="size-10 rounded border-[#e5e7eb] bg-white p-0 text-[#4b5563] hover:text-[#4343d5]"
          render={<Link href={leadHistoryHref} />}
          title="View history"
          variant="outline"
        >
          <History className="size-4" />
        </Button>
        {item.leadId ? (
          <Button
            className="size-10 rounded border-[#e5e7eb] bg-white p-0 text-[#4b5563] hover:text-[#4343d5]"
            render={<Link href={`/dashboard/leads/${item.leadId}`} />}
            title="Lead details"
            variant="outline"
          >
            <ContactRound className="size-4" />
          </Button>
        ) : null}
        <Button
          className={`h-10 rounded px-4 text-[11px] font-bold uppercase tracking-wide ${
            item.isRead
              ? "border border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f3f4f6]"
              : item.sentiment === "negative"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#4343d5]/10 text-[#4343d5] hover:bg-[#4343d5] hover:text-white"
          }`}
          disabled={item.isRead}
          onClick={() => void onMarkRead(item)}
          type="button"
        >
          {item.isRead ? "Read" : item.sentiment === "negative" ? "Escalate" : "Mark Read"}
        </Button>
      </div>
    </div>
  )
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function pageButtons(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (page <= 3) return [1, 2, 3, "ellipsis", totalPages]
  if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages]
  return [1, "ellipsis", page, "ellipsis", totalPages]
}
