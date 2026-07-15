"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CheckCheck, ExternalLink, Filter, Sparkles, UserRoundCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [items, setItems] = useState<Feedback[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [fromDate, setFromDate] = useState(monthAgo)
  const [toDate, setToDate] = useState(today)
  const [readStatus, setReadStatus] = useState("all")
  const [sentiment, setSentiment] = useState("all")
  const [intent, setIntent] = useState("all")
  const [minimumPriority, setMinimumPriority] = useState("0")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ fromDate, toDate })
    if (readStatus !== "all") params.set("readStatus", readStatus)
    try {
      setItems(await api<Feedback[]>(`/showing-feedback/lead-inbox?${params}`))
      setSelected([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [fromDate, toDate, readStatus])

  const visible = useMemo(() => items.filter((item) => {
    if (sentiment !== "all" && item.sentiment !== sentiment) return false
    if (intent !== "all" && item.intent !== intent) return false
    return item.priorityScore >= Number(minimumPriority || 0)
  }), [intent, items, minimumPriority, sentiment])

  const summary = useMemo(() => ({
    unread: items.filter((item) => !item.isRead).length,
    hot: items.filter((item) => item.priorityScore >= 70).length,
    apply: items.filter((item) => item.intent === "apply" || item.intent === "offer").length,
    negative: items.filter((item) => item.sentiment === "negative").length,
  }), [items])

  async function bulkRead(isRead: boolean) {
    if (!selected.length) return
    await api("/showing-feedback/bulk/read", { method: "PATCH", body: JSON.stringify({ ids: selected, isRead }) })
    setItems((current) => current.map((item) => selected.includes(item.id) ? { ...item, isRead } : item))
    setSelected([])
  }

  async function updateClassification(item: Feedback, patch: Partial<Feedback>) {
    const updated = await api<Feedback>(`/showing-feedback/${item.id}/classification`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry))
  }

  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.includes(item.id))

  return <main className="space-y-6 p-4 md:p-6">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge variant="secondary"><Sparkles className="mr-1 size-3" />CPU-light intent scoring</Badge><Badge variant="outline">Lead-linked</Badge></div>
        <h1 className="text-3xl font-bold tracking-tight">Lead Showing Intelligence</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">Feedback from the actual lead or tenant who visited the property, ranked by intent, urgency, and likelihood to apply.</p>
      </div>
      <div className="flex flex-wrap gap-2"><Button render={<Link href="/dashboard/showing-feedback/leads/classifier-controls" />} variant="outline"><Filter className="mr-2 size-4" />Advanced classifier controls</Button><Button render={<Link href="/dashboard/showing-feedback/leads/sequences" />} variant="outline">Lead message sequences</Button></div>
    </div>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric title="Unread replies" value={summary.unread} detail="Needs review" />
      <Metric title="Hot prospects" value={summary.hot} detail="Priority 70+" />
      <Metric title="Apply / offer intent" value={summary.apply} detail="Revenue opportunity" />
      <Metric title="Negative feedback" value={summary.negative} detail="Objections to resolve" />
    </section>

    <Card>
      <CardHeader>
        <CardTitle>Classifier and inbox controls</CardTitle>
        <CardDescription>Filter by date, sentiment, intent, read status, and priority. Bulk actions work on selected responses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Field label="From"><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
          <Field label="Read status"><Select value={readStatus} onValueChange={setReadStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem></SelectContent></Select></Field>
          <Field label="Sentiment"><Select value={sentiment} onValueChange={setSentiment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select></Field>
          <Field label="Intent"><Select value={intent} onValueChange={setIntent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="apply">Apply</SelectItem><SelectItem value="offer">Offer</SelectItem><SelectItem value="interested">Interested</SelectItem><SelectItem value="not_interested">Not interested</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select></Field>
          <Field label="Minimum priority"><Input min={0} max={100} type="number" value={minimumPriority} onChange={(e) => setMinimumPriority(e.target.value)} /></Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3">
          <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => setSelected(checked ? visible.map((item) => item.id) : [])} />
          <span className="mr-auto text-sm font-medium">{selected.length ? `${selected.length} selected` : "Select visible feedback"}</span>
          <Button disabled={!selected.length} size="sm" variant="outline" onClick={() => void bulkRead(true)}><CheckCheck className="mr-2 size-4" />Mark selected read</Button>
          <Button disabled={!selected.length} size="sm" variant="outline" onClick={() => void bulkRead(false)}>Mark selected unread</Button>
        </div>
      </CardContent>
    </Card>

    <div className="space-y-4">
      {!loading && visible.length === 0 ? <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">No lead showing feedback matches these filters.</CardContent></Card> : null}
      {visible.map((item) => <FeedbackCard key={item.id} item={item} selected={selected.includes(item.id)} onSelect={(checked) => setSelected((current) => checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} onUpdate={updateClassification} />)}
    </div>
  </main>
}

function FeedbackCard({ item, selected, onSelect, onUpdate }: { item: Feedback; selected: boolean; onSelect: (checked: boolean) => void; onUpdate: (item: Feedback, patch: Partial<Feedback>) => Promise<void> }) {
  const lead = item.realtorShowing?.lead
  const visitorName = lead?.name || item.realtorShowing?.visitorName || `Lead #${item.leadId}`
  const visitorContact = lead?.email || item.realtorShowing?.visitorEmail || item.realtorShowing?.visitorPhone || "No contact"
  const tone = item.sentiment === "positive" ? "border-emerald-300 bg-emerald-50/70" : item.sentiment === "negative" ? "border-rose-300 bg-rose-50/80" : "border-slate-200 bg-slate-50/70"
  const scoreTone = item.priorityScore >= 70 ? "text-rose-700" : item.priorityScore >= 40 ? "text-amber-700" : "text-slate-700"

  return <Card className={tone}>
    <CardContent className="p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(checked === true)} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <UserRoundCheck className="size-5" /><strong className="text-base">{visitorName}</strong>
            <Badge variant={item.sentiment === "negative" ? "destructive" : item.sentiment === "positive" ? "default" : "secondary"}>{item.sentiment}</Badge>
            <Badge variant="outline">{item.intent.replaceAll("_", " ")}</Badge>
            {!item.isRead ? <Badge>Unread</Badge> : <Badge variant="outline">Read</Badge>}
            {item.realtorShowing?.replyReceived ? <Badge variant="secondary">Follow-ups stopped</Badge> : null}
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <span>{visitorContact}</span>
            <span>{item.property?.title || item.property?.location || "Property unavailable"}</span>
            <span>Showing realtor: {item.realtorShowing?.realtorName || "Unassigned"}</span>
            <span>Received {new Date(item.receivedAt).toLocaleString()}</span>
          </div>
          <p className="rounded-xl border bg-background/80 p-4 text-sm leading-6 text-foreground">{item.feedbackText}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Classifier: {item.classifier}</span><span>•</span><span>Confidence {Math.round(item.confidence * 100)}%</span></div>
        </div>

        <div className="w-full space-y-3 xl:w-72">
          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-background/85 p-4 text-center">
            <div><p className="text-xs text-muted-foreground">Priority</p><p className={`text-2xl font-bold ${scoreTone}`}>{item.priorityScore}</p></div>
            <div><p className="text-xs text-muted-foreground">Apply likelihood</p><p className="text-2xl font-bold">{Math.round(item.applyLikelihood * 100)}%</p></div>
          </div>
          <Select value={item.sentiment} onValueChange={(value) => void onUpdate(item, { sentiment: value as Feedback["sentiment"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">Positive</SelectItem><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="negative">Negative</SelectItem></SelectContent></Select>
          <Select value={item.intent} onValueChange={(value) => void onUpdate(item, { intent: value as Feedback["intent"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apply">Apply</SelectItem><SelectItem value="offer">Offer</SelectItem><SelectItem value="interested">Interested</SelectItem><SelectItem value="not_interested">Not interested</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent></Select>
          {item.leadId ? <Button className="w-full" render={<Link href={`/dashboard/leads/${item.leadId}`} />} variant="outline">Open linked lead <ExternalLink className="ml-2 size-4" /></Button> : null}
        </div>
      </div>
    </CardContent>
  </Card>
}

function Metric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
