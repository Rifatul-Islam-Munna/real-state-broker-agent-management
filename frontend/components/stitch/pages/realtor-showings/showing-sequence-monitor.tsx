"use client"

import { useEffect, useMemo, useState } from "react"
import { Pause, Play, Search, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
  const [items, setItems] = useState<Showing[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Showing[] | { items?: Showing[]; data?: Showing[] }>("/realtor-showings")
      .then((payload) => setItems(Array.isArray(payload) ? payload : payload.items ?? payload.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => [item.realtorName, item.realtorEmail, item.visitorName, item.visitorEmail, item.propertyText].some((value) => `${value ?? ""}`.toLowerCase().includes(query)))
  }, [items, search])

  async function setStatus(item: Showing, status: "active" | "paused" | "cancelled") {
    const updated = await api<Showing>(`/realtor-showings/${item.id}/sequence`, { method: "PATCH", body: JSON.stringify({ status }) })
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...updated } : entry))
  }

  const title = audience === "realtor" ? "Realtor Message Sequences" : "Lead Showing Message Sequences"
  const description = audience === "realtor" ? "Track which realtor is receiving each showing message and control the sequence." : "Track which lead or tenant is receiving showing follow-ups and stop, pause, or resume outreach."

  return <main className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-muted-foreground">{description}</p></div>
    <Card><CardHeader><CardTitle>Active outreach</CardTitle><CardDescription>Direct message, current step, next follow-up timing, and reply status.</CardDescription></CardHeader><CardContent>
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" placeholder="Search by person, email, or property..." value={search} onChange={(e)=>setSearch(e.target.value)}/></div>
      <div className="space-y-3">
        {!loading && visible.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No showing sequences found.</div> : null}
        {visible.map((item) => {
          const person = audience === "realtor" ? item.realtorName : item.visitorName
          const contact = audience === "realtor" ? item.realtorEmail || item.realtorPhone : item.visitorEmail || item.visitorPhone
          const status = item.replyReceived ? "completed" : item.sequenceStatus || (item.followUpEnabled ? "active" : "paused")
          const step = item.replyReceived ? "reply received" : item.sequenceStep || (item.outreachAt ? "direct scheduled" : "direct pending")
          return <div key={`${audience}-${item.id}`} className="rounded-xl border p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><strong>{person || "Unknown contact"}</strong><Badge variant={status === "active" ? "default" : status === "cancelled" ? "destructive" : "secondary"}>{status}</Badge><Badge variant="outline">{step}</Badge>{item.replyReceived ? <Badge variant="secondary">Reply stopped follow-ups</Badge> : null}</div><p className="text-sm text-muted-foreground">{contact || "No contact"} · {item.propertyText || "No property"}</p><p className="text-xs text-muted-foreground">Direct template: {item.directTemplateId || "Not selected"} · Follow-up: {item.followUpTemplateId || "Not selected"} · Gap: {item.followUpGapDays || 0} day(s)</p></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={status === "active" || status === "completed"} onClick={()=>void setStatus(item,"active")}><Play className="mr-2 size-4"/>Resume</Button><Button size="sm" variant="outline" disabled={status !== "active"} onClick={()=>void setStatus(item,"paused")}><Pause className="mr-2 size-4"/>Pause</Button><Button size="sm" variant="destructive" disabled={status === "cancelled" || status === "completed"} onClick={()=>void setStatus(item,"cancelled")}><XCircle className="mr-2 size-4"/>Cancel</Button></div>
            </div>
          </div>
        })}
      </div>
    </CardContent></Card>
  </main>
}
