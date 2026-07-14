"use client"

import { useEffect, useState } from "react"
import { Bot, Plus, Route, Sparkles, Trash2 } from "lucide-react"
import { sileo } from "sileo"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { propertyOperationsApi, type OperationsRecord, type OperationsWorkspace } from "@/lib/property-operations-api"

export function PropertyOperationsPlanPage() {
  const [spaces, setSpaces] = useState<OperationsWorkspace[]>([])
  const [records, setRecords] = useState<OperationsRecord[]>([])
  const [propertyId, setPropertyId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    const workspaces = await propertyOperationsApi.getWorkspaces()
    setSpaces(workspaces)
    const selected = propertyId || String(workspaces[0]?.propertyId ?? "")
    if (!propertyId && selected) setPropertyId(selected)
    const groups = await Promise.all(workspaces.map((item) => propertyOperationsApi.getRecords(item.propertyId, "plans")))
    setRecords(groups.flat())
  }
  useEffect(() => { void load() }, [])

  async function save() {
    if (!propertyId || !title.trim()) return
    setSaving(true)
    try {
      await propertyOperationsApi.saveRecord({
        propertyId: Number(propertyId), moduleKey: "plans", recordType: "Operations plan", title,
        description, status: "Draft", priority: "Medium", payloadJson: JSON.stringify({ extra: { phases: [], milestones: [] } }),
      })
      setTitle(""); setDescription(""); await load(); sileo.success({ title: "Plan created" })
    } finally { setSaving(false) }
  }

  return <div className="space-y-6"><section className="rounded-2xl border bg-background p-5"><Badge variant="outline" className="border-blue-200 text-blue-700">Planning</Badge><h1 className="mt-3 text-2xl font-semibold">Operations plans</h1><p className="mt-2 text-sm text-muted-foreground">Create property roadmaps, maintenance phases and capital milestones.</p></section><div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><Card className="shadow-none"><CardHeader><CardTitle>New plan</CardTitle><CardDescription>Start a property operations roadmap.</CardDescription></CardHeader><CardContent className="space-y-4"><Select value={propertyId} onValueChange={setPropertyId}><SelectTrigger><SelectValue placeholder="Property" /></SelectTrigger><SelectContent>{spaces.map((item) => <SelectItem key={item.propertyId} value={String(item.propertyId)}>{item.propertyTitle}</SelectItem>)}</SelectContent></Select><Input placeholder="Plan title" value={title} onChange={(event) => setTitle(event.target.value)} /><Textarea placeholder="Objectives and scope" value={description} onChange={(event) => setDescription(event.target.value)} /><Button onClick={() => void save()} disabled={saving || !title.trim()}><Plus className="size-4" />Create plan</Button></CardContent></Card><Card className="shadow-none"><CardHeader><CardTitle>Plan registry</CardTitle><CardDescription>{records.length} plans</CardDescription></CardHeader><CardContent className="space-y-3">{records.map((item) => <article key={item.id} className="flex items-start justify-between rounded-xl border p-4"><div><div className="flex items-center gap-2"><Route className="size-4" /><p className="font-medium">{item.title}</p><Badge variant="outline">{item.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{item.description || "No description"}</p></div><Button variant="ghost" size="icon" onClick={() => void propertyOperationsApi.deleteRecord(item.id).then(load)}><Trash2 className="size-4" /></Button></article>)}{!records.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No plans yet.</p> : null}</CardContent></Card></div></div>
}

export function PropertyOperationsAiPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  async function load() { setLoading(true); try { setSummary(await propertyOperationsApi.getAssistant()) } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  return <div className="space-y-6"><section className="rounded-2xl border bg-[linear-gradient(135deg,#f8fbff,#f3f8f5)] p-6"><div className="flex items-center gap-2 text-blue-700"><Sparkles className="size-5" /><Badge variant="outline">AI operations assistant</Badge></div><h1 className="mt-4 text-2xl font-semibold">Portfolio intelligence</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Live PostgreSQL-backed summary of operational risks, overdue work and recommended actions.</p></section><Card className="shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Bot className="size-5" />Assistant summary</CardTitle><CardDescription>Generated from current property operations data.</CardDescription></div><Button variant="outline" onClick={() => void load()}>Refresh</Button></CardHeader><CardContent>{loading ? <p className="text-sm text-muted-foreground">Analyzing portfolio…</p> : <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-muted/40 p-5 text-sm">{JSON.stringify(summary ?? {}, null, 2)}</pre>}</CardContent></Card></div>
}
