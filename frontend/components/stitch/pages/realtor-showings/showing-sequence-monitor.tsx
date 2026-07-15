"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { History, Pause, Play, Search, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SequenceAudience = "realtor" | "visitor"

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
  sequenceStatus?: "active" | "paused" | "cancelled" | "completed"
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error(await response.text() || "Request failed")
  return response.json()
}

export function ShowingSequenceMonitor({ audience }: { audience: SequenceAudience }) {
  const [result, setResult] = useState<PageResult<Showing>>({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState("25")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), pageSize })
      if (search.trim()) params.set("search", search.trim())
      try {
        const payload = await api<PageResult<Showing> | Showing[]>(`/realtor-showings?${params}`)
        const normalized = Array.isArray(payload)
          ? { items: payload, page, pageSize: Number(pageSize), totalCount: payload.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
          : payload
        if (alive) setResult(normalized)
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [page, pageSize, search])

  async function setStatus(item: Showing, status: "active" | "paused" | "cancelled") {
    const updated = await api<Showing>(`/realtor-showings/${item.id}/sequence`, { method: "PATCH", body: JSON.stringify({ status }) })
    setResult((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry) }))
  }

  const title = audience === "realtor" ? "Realtor Message Sequences" : "Lead Showing Message Sequences"
  const activeCount = result.items.filter((item) => !item.replyReceived && (item.sequenceStatus ?? "active") === "active").length
  const stoppedCount = result.items.filter((item) => item.replyReceived || item.sequenceStatus === "completed").length

  return <main className="space-y-4 p-3 md:p-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-1 flex flex-wrap gap-2"><Badge variant="outline">{result.totalCount} total</Badge><Badge variant="secondary">{activeCount} active on page</Badge><Badge variant="outline">{stoppedCount} reply-stopped</Badge></div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="h-9 pl-9" placeholder="Search person, email, property..." value={search} onChange={(event)=>setSearch(event.target.value)}/></div>
        <Select value={pageSize} onValueChange={setPageSize}><SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
      </div>
    </div>

    <Card>
      <CardContent className="p-0">
        {!loading && result.items.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No showing sequences found.</div> : null}
        <div className="divide-y">
          {result.items.map((item) => <SequenceRow audience={audience} item={item} key={`${audience}-${item.id}`} onStatus={setStatus} />)}
        </div>
      </CardContent>
    </Card>

    <Pagination page={result.page} totalPages={result.totalPages} totalCount={result.totalCount} pageSize={result.pageSize} onPage={setPage} />
  </main>
}

function SequenceRow({ audience, item, onStatus }: { audience: SequenceAudience; item: Showing; onStatus: (item: Showing, status: "active" | "paused" | "cancelled") => Promise<void> }) {
  const person = audience === "realtor" ? item.realtorName : item.visitorName || item.lead?.name
  const contact = audience === "realtor" ? item.realtorEmail || item.realtorPhone : item.visitorEmail || item.visitorPhone || item.lead?.email || item.lead?.phone
  const status = item.replyReceived ? "completed" : item.sequenceStatus || (item.followUpEnabled ? "active" : "paused")
  const step = item.replyReceived ? "reply received" : item.sequenceStep || (item.outreachAt ? "direct scheduled" : "direct pending")
  const property = item.property?.title || item.property?.location || item.propertyText || "No property"
  const channels = [item.emailEnabled ? "Email" : null, item.smsEnabled ? "SMS" : null].filter(Boolean).join(" + ") || "No channel"
  const leadHistoryHref = item.lead?.id ? `/dashboard/lead-history?leadId=${item.lead.id}` : "/dashboard/lead-history"

  return <div className="grid gap-3 p-3 xl:grid-cols-[minmax(220px,0.9fr)_minmax(280px,1.25fr)_260px] xl:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5"><strong className="truncate text-sm">{person || "Unknown contact"}</strong><Badge className="h-5 px-1.5 text-[11px]" variant={status === "active" ? "default" : status === "cancelled" ? "destructive" : "secondary"}>{status}</Badge><Badge className="h-5 px-1.5 text-[11px]" variant="outline">{step}</Badge></div>
      <p className="truncate text-xs text-muted-foreground">{contact || "No contact"}</p>
      <p className="truncate text-xs text-muted-foreground">{property}</p>
    </div>
    <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
      <span>Direct: {item.directTemplateId || "Not selected"}</span>
      <span>Follow-up: {item.followUpTemplateId || "Not selected"}</span>
      <span>Gap: {item.followUpGapDays || 0} day(s)</span>
      <span>{channels}</span>
      <span>Showing: {item.showingAt ? new Date(item.showingAt).toLocaleString() : "Not set"}</span>
      <span>Reply: {item.replyReceivedAt ? new Date(item.replyReceivedAt).toLocaleString() : "Waiting"}</span>
    </div>
    <div className="flex flex-wrap gap-2 xl:justify-end">
      <Button className="h-8" render={<Link href={leadHistoryHref} />} size="sm" variant="outline"><History className="mr-1 size-3" />History</Button>
      <Button className="h-8" size="sm" variant="outline" disabled={status === "active" || status === "completed"} onClick={()=>void onStatus(item,"active")}><Play className="mr-1 size-3"/>Resume</Button>
      <Button className="h-8" size="sm" variant="outline" disabled={status !== "active"} onClick={()=>void onStatus(item,"paused")}><Pause className="mr-1 size-3"/>Pause</Button>
      <Button className="h-8" size="sm" variant="destructive" disabled={status === "cancelled" || status === "completed"} onClick={()=>void onStatus(item,"cancelled")}><XCircle className="mr-1 size-3"/>Cancel</Button>
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
