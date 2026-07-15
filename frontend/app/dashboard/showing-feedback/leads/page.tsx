"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { CheckCheck, ExternalLink, Filter, History, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  if (!response.ok) throw new Error(await response.text() || "Request failed")
  return response.status === 204 ? undefined as T : response.json()
}

export default function LeadShowingFeedbackPage() {
  const [result, setResult] = useState<PageResult<Feedback>>({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false })
  const [selected, setSelected] = useState<number[]>([])
  const [fromDate, setFromDate] = useState(monthAgo)
  const [toDate, setToDate] = useState(today)
  const [readStatus, setReadStatus] = useState("all")
  const [sentiment, setSentiment] = useState("all")
  const [intent, setIntent] = useState("all")
  const [minimumPriority, setMinimumPriority] = useState("0")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("25")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [fromDate, toDate, readStatus, sentiment, intent, minimumPriority, pageSize])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({ fromDate, toDate, page: String(page), pageSize })
      if (readStatus !== "all") params.set("readStatus", readStatus)
      if (sentiment !== "all") params.set("sentiment", sentiment)
      if (intent !== "all") params.set("intent", intent)
      if (Number(minimumPriority) > 0) params.set("minimumPriority", minimumPriority)
      try {
        const payload = await api<PageResult<Feedback>>(`/showing-feedback/lead-inbox?${params}`)
        if (alive) {
          setResult(payload)
          setSelected([])
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [fromDate, intent, minimumPriority, page, pageSize, readStatus, sentiment, toDate])

  const items = result.items
  const summary = useMemo(() => ({
    unread: items.filter((item) => !item.isRead).length,
    hot: items.filter((item) => item.priorityScore >= 70).length,
    apply: items.filter((item) => item.intent === "apply" || item.intent === "offer").length,
  }), [items])

  async function bulkRead(isRead: boolean) {
    if (!selected.length) return
    await api("/showing-feedback/bulk/read", { method: "PATCH", body: JSON.stringify({ ids: selected, isRead }) })
    setResult((current) => ({ ...current, items: current.items.map((item) => selected.includes(item.id) ? { ...item, isRead } : item) }))
    setSelected([])
  }

  async function updateClassification(item: Feedback, patch: Partial<Feedback>) {
    const updated = await api<Feedback>(`/showing-feedback/${item.id}/classification`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
    setResult((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry) }))
  }

  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.id))

  return <main className="space-y-4 p-3 md:p-4">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2"><Badge variant="secondary"><Sparkles className="mr-1 size-3" />Lead-linked</Badge><Badge variant="outline">{result.totalCount} total</Badge><Badge variant="outline">{summary.unread} unread</Badge><Badge variant="outline">{summary.hot} hot</Badge><Badge variant="outline">{summary.apply} apply/offer</Badge></div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Lead Showing Feedback</h1>
      </div>
      <div className="flex flex-wrap gap-2"><Button render={<Link href="/dashboard/showing-feedback/leads/classifier-controls" />} size="sm" variant="outline"><Filter className="mr-2 size-4" />Classifier</Button><Button render={<Link href="/dashboard/showing-feedback/leads/sequences" />} size="sm" variant="outline">Lead sequences</Button></div>
    </div>

    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Field label="From"><Input className="h-9" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
          <Field label="To"><Input className="h-9" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
          <Field label="Read"><Select value={readStatus} onValueChange={setReadStatus}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem></SelectContent></Select></Field>
          <Field label="Sentiment"><Select value={sentiment} onValueChange={setSentiment}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select></Field>
          <Field label="Intent"><Select value={intent} onValueChange={setIntent}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="apply">Apply</SelectItem><SelectItem value="offer">Offer</SelectItem><SelectItem value="interested">Interested</SelectItem><SelectItem value="not_interested">Not interested</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select></Field>
          <Field label="Priority"><Input className="h-9" min={0} max={100} type="number" value={minimumPriority} onChange={(e) => setMinimumPriority(e.target.value)} /></Field>
          <Field label="Rows"><Select value={pageSize} onValueChange={setPageSize}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select></Field>
          <div className="flex items-end gap-2"><Button className="h-9 flex-1" disabled={!selected.length} size="sm" variant="outline" onClick={() => void bulkRead(true)}><CheckCheck className="mr-2 size-4" />Read</Button></div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelected(checked ? items.map((item) => item.id) : [])} />
          <span className="mr-auto text-xs font-medium">{selected.length ? `${selected.length} selected` : "Select page"}</span>
          <Button disabled={!selected.length} size="sm" variant="ghost" onClick={() => void bulkRead(false)}>Unread</Button>
        </div>
      </CardContent>
    </Card>

    <div className="overflow-hidden rounded-lg border">
      {!loading && items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No lead showing feedback matches filters.</div> : null}
      {items.map((item) => <FeedbackRow key={item.id} item={item} selected={selected.includes(item.id)} onSelect={(checked) => setSelected((current) => checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} onUpdate={updateClassification} />)}
    </div>

    <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} pageSize={result.pageSize} onPage={setPage} />
  </main>
}

function FeedbackRow({ item, selected, onSelect, onUpdate }: { item: Feedback; selected: boolean; onSelect: (checked: boolean) => void; onUpdate: (item: Feedback, patch: Partial<Feedback>) => Promise<void> }) {
  const lead = item.realtorShowing?.lead
  const visitorName = lead?.name || item.realtorShowing?.visitorName || `Lead #${item.leadId}`
  const visitorContact = lead?.email || item.realtorShowing?.visitorEmail || item.realtorShowing?.visitorPhone || "No contact"
  const leadHistoryHref = item.leadId ? `/dashboard/lead-history?leadId=${item.leadId}` : "/dashboard/lead-history"

  return <div className="grid gap-3 border-b bg-background p-3 last:border-b-0 xl:grid-cols-[24px_minmax(220px,0.85fr)_minmax(260px,1.25fr)_220px] xl:items-center">
    <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(checked === true)} />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5"><strong className="truncate text-sm">{visitorName}</strong><Badge className="h-5 px-1.5 text-[11px]" variant={item.sentiment === "negative" ? "destructive" : item.sentiment === "positive" ? "default" : "secondary"}>{item.sentiment}</Badge>{!item.isRead ? <Badge className="h-5 px-1.5 text-[11px]">Unread</Badge> : null}</div>
      <p className="truncate text-xs text-muted-foreground">{visitorContact}</p>
      <p className="truncate text-xs text-muted-foreground">{item.property?.title || item.property?.location || "Property unavailable"}</p>
    </div>
    <div className="min-w-0">
      <p className="line-clamp-2 text-sm leading-5">{item.feedbackText}</p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.channel} reply {item.sourceMessageId ? `#${item.sourceMessageId}` : ""} | {new Date(item.receivedAt).toLocaleString()} | {item.classifier} {Math.round(item.confidence * 100)}%</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] xl:grid-cols-1">
      <div className="flex items-center gap-2 text-xs"><Badge variant="outline">P {item.priorityScore}</Badge><Badge variant="outline">{Math.round(item.applyLikelihood * 100)}%</Badge><Badge variant="outline">{item.intent.replaceAll("_", " ")}</Badge></div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={item.sentiment} onValueChange={(value) => void onUpdate(item, { sentiment: value as Feedback["sentiment"] })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select>
        <Select value={item.intent} onValueChange={(value) => void onUpdate(item, { intent: value as Feedback["intent"] })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apply">Apply</SelectItem><SelectItem value="offer">Offer</SelectItem><SelectItem value="interested">Interested</SelectItem><SelectItem value="not_interested">Not interested</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select>
      </div>
      <div className="flex gap-1">
        <Button className="h-8 flex-1" render={<Link href={leadHistoryHref} />} size="sm" variant="outline"><History className="mr-1 size-3" />History</Button>
        {item.leadId ? <Button className="h-8 flex-1" render={<Link href={`/dashboard/leads/${item.leadId}`} />} size="sm" variant="outline">Lead <ExternalLink className="ml-1 size-3" /></Button> : null}
      </div>
    </div>
  </div>
}

function Pagination({ page, totalPages, totalCount, pageSize, onPage }: { page: number; totalPages: number; totalCount: number; pageSize: number; onPage: (page: number) => void }) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(totalCount, page * pageSize)
  return <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
    <span>{start}-{end} of {totalCount}</span>
    <div className="flex gap-2">
      <Button disabled={page <= 1} size="sm" variant="outline" onClick={() => onPage(page - 1)}>Prev</Button>
      <span className="flex h-9 items-center px-2">Page {page} / {totalPages}</span>
      <Button disabled={page >= totalPages} size="sm" variant="outline" onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>
}
