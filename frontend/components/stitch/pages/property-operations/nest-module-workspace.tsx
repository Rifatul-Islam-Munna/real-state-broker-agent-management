"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Clipboard, ExternalLink, Link2, Pencil, Play, Plus, RefreshCw, Trash2, X } from "lucide-react"
import { getPropertyOperationsPreset } from "@/data/property-operations-presets"
import type { PropertyOperationsModule } from "@/data/property-operations-modules"
import { propertyOperationsApi, type OperationsPublicAccess, type OperationsRecord, type OperationsWorkspace } from "@/lib/property-operations-api"

type FormState = {
  id?: string
  title: string
  recordType: string
  description: string
  status: string
  priority: string
  amount: string
  dueAt: string
  contactName: string
  contactEmail: string
  contactPhone: string
}

const blank: FormState = { title: "", recordType: "Item", description: "", status: "Open", priority: "Normal", amount: "", dueAt: "", contactName: "", contactEmail: "", contactPhone: "" }

function actionsFor(moduleKey: string, status: string) {
  if (["Completed", "Closed", "Paid", "Resolved", "Archived", "Rejected"].includes(status)) return [{ id: "reopen", label: "Reopen" }]
  const map: Record<string, Array<{ id: string; label: string }>> = {
    "vendor-quotes": [{ id: "review", label: "Review" }, { id: "approve", label: "Approve" }, { id: "reject", label: "Reject" }],
    tickets: [{ id: "assign", label: "Assign" }, { id: "start", label: "Start" }, { id: "resolve", label: "Resolve" }],
    "work-orders": [{ id: "assign", label: "Assign" }, { id: "start", label: "Start" }, { id: "complete", label: "Complete" }],
    inspections: [{ id: "start", label: "Start" }, { id: "complete", label: "Complete" }, { id: "approve", label: "Approve" }],
    billing: [{ id: "approve", label: "Approve" }, { id: "pay", label: "Mark paid" }],
    finance: [{ id: "approve", label: "Approve" }, { id: "pay", label: "Reconcile" }],
    messages: [{ id: "send", label: "Send" }, { id: "close", label: "Close" }],
    announcements: [{ id: "publish", label: "Publish" }, { id: "archive", label: "Archive" }],
    notifications: [{ id: "send", label: "Send" }, { id: "fail", label: "Mark failed" }],
    documents: [{ id: "approve", label: "Approve" }, { id: "archive", label: "Archive" }],
  }
  return map[moduleKey] ?? [{ id: "start", label: "Start" }, { id: "complete", label: "Complete" }, { id: "archive", label: "Archive" }]
}

export function NestModuleWorkspace({ module, workspace, onClose, onChanged }: { module: PropertyOperationsModule | null; workspace: OperationsWorkspace | null; onClose: () => void; onChanged: () => void }) {
  const [records, setRecords] = useState<OperationsRecord[]>([])
  const [form, setForm] = useState<FormState>(blank)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState<OperationsRecord | null>(null)
  const [createdLink, setCreatedLink] = useState<OperationsPublicAccess | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const preset = useMemo(() => getPropertyOperationsPreset(module?.id ?? ""), [module?.id])

  async function load() {
    if (!module || !workspace) return
    setLoading(true)
    try { setRecords(await propertyOperationsApi.getRecords(workspace.propertyId, module.id)) }
    catch (value) { setError(value instanceof Error ? value.message : "Could not load records.") }
    finally { setLoading(false) }
  }

  useEffect(() => { setEditing(false); setSharing(null); setCreatedLink(null); void load() }, [module?.id, workspace?.propertyId])
  if (!module || !workspace) return null

  function openNew() {
    setForm({ ...blank, recordType: preset.recordTypes[0] ?? "Item" })
    setEditing(true)
  }

  function openEdit(item: OperationsRecord) {
    let payload: Record<string, unknown> = {}
    try { payload = JSON.parse(item.payloadJson || "{}") as Record<string, unknown> } catch { payload = {} }
    setForm({ id: item.id, title: item.title, recordType: item.recordType, description: item.description, status: item.status, priority: item.priority, amount: item.amount == null ? "" : String(item.amount), dueAt: item.dueAt?.slice(0, 10) ?? "", contactName: String(payload.contactName ?? item.contactName ?? ""), contactEmail: String(payload.contactEmail ?? item.contactEmail ?? ""), contactPhone: String(payload.contactPhone ?? item.contactPhone ?? "") })
    setEditing(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setLoading(true)
    try {
      await propertyOperationsApi.saveRecord({ id: form.id, propertyId: workspace.propertyId, moduleKey: module.id, recordType: form.recordType, title: form.title.trim(), description: form.description.trim(), status: form.status, priority: form.priority, amount: form.amount ? Number(form.amount) : null, dueAt: form.dueAt ? new Date(`${form.dueAt}T12:00:00Z`).toISOString() : null, payloadJson: JSON.stringify({ contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone }) })
      setEditing(false); await load(); onChanged()
    } catch (value) { setError(value instanceof Error ? value.message : "Could not save record.") }
    finally { setLoading(false) }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this record?")) return
    await propertyOperationsApi.deleteRecord(id); await load(); onChanged()
  }

  async function runAction(item: OperationsRecord, action: string) {
    setLoading(true)
    try { await propertyOperationsApi.recordAction(item.id, action); await load(); onChanged() }
    catch (value) { setError(value instanceof Error ? value.message : "Action failed.") }
    finally { setLoading(false) }
  }

  async function createLink() {
    if (!sharing) return
    setLoading(true)
    try {
      const result = await propertyOperationsApi.createPublicLink({ propertyId: workspace.propertyId, recordId: sharing.id, moduleKey: module.id, title: sharing.title, instructions: sharing.description, recipientLabel: preset.recipient, recipientName: sharing.contactName ?? "", recipientEmail: sharing.contactEmail ?? "", recipientPhone: sharing.contactPhone ?? "", formSchemaJson: JSON.stringify(preset.fields), oneTime: true, maxUses: 1, allowFileUploads: true })
      setCreatedLink(result); onChanged()
    } catch (value) { setError(value instanceof Error ? value.message : "Could not create link.") }
    finally { setLoading(false) }
  }

  async function runRecurring() {
    setLoading(true)
    try { await propertyOperationsApi.runRecurringMaintenance(workspace.propertyId); await load(); onChanged() }
    catch (value) { setError(value instanceof Error ? value.message : "Could not generate work orders.") }
    finally { setLoading(false) }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6">
    <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-3xl border bg-background md:rounded-3xl">
      <header className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-semibold uppercase text-primary">{workspace.propertyTitle}</p><h2 className="mt-1 text-xl font-bold">{module.id === "subscriptions" ? "Service Contracts & Utilities" : module.label}</h2><p className="mt-1 text-sm text-muted-foreground">Admin records with link and QR participation for outside contacts.</p></div><button className="rounded-xl border p-2" onClick={onClose} type="button"><X className="size-5" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {error ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{records.length} records</p><div className="flex gap-2">{module.id === "recurring-maintenance" ? <button className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" onClick={() => void runRecurring()} type="button"><RefreshCw className="size-4" />Generate due work</button> : null}<button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={openNew} type="button"><Plus className="size-4" />New record</button></div></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">{records.map((item) => <article className="rounded-2xl border p-4" key={item.id}><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="text-xs text-muted-foreground">{item.recordType} · {item.status} · {item.priority}</p></div><div className="flex"><button className="p-2" onClick={() => { setSharing(item); setCreatedLink(null) }} title="Link or QR" type="button"><Link2 className="size-4" /></button><button className="p-2" onClick={() => openEdit(item)} title="Edit" type="button"><Pencil className="size-4" /></button><button className="p-2 text-red-600" onClick={() => void remove(item.id)} title="Delete" type="button"><Trash2 className="size-4" /></button></div></div>{item.description ? <p className="mt-3 text-sm text-muted-foreground">{item.description}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{actionsFor(module.id, item.status).map((action) => <button className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold" key={action.id} onClick={() => void runAction(item, action.id)} type="button"><Play className="size-3" />{action.label}</button>)}</div></article>)}{!loading && !records.length ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No records yet.</p> : null}</div>
      </div>
    </div>

    {editing ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center md:p-6"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background p-5 md:rounded-3xl"><div className="flex justify-between"><h3 className="text-lg font-bold">{form.id ? "Edit" : "New"} record</h3><button onClick={() => setEditing(false)} type="button"><X /></button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm md:col-span-2">Title<input className="mt-1 h-10 w-full rounded-xl border px-3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="text-sm">Type<select className="mt-1 h-10 w-full rounded-xl border px-3" value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value })}>{preset.recordTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm">Status<select className="mt-1 h-10 w-full rounded-xl border px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{preset.statuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm">Priority<select className="mt-1 h-10 w-full rounded-xl border px-3" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["Low", "Normal", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-sm">Due date<input className="mt-1 h-10 w-full rounded-xl border px-3" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label><label className="text-sm">Amount<input className="mt-1 h-10 w-full rounded-xl border px-3" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label className="text-sm">Contact name<input className="mt-1 h-10 w-full rounded-xl border px-3" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label><label className="text-sm">Contact email<input className="mt-1 h-10 w-full rounded-xl border px-3" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></label><label className="text-sm">Contact phone<input className="mt-1 h-10 w-full rounded-xl border px-3" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></label><label className="text-sm md:col-span-2">Description<textarea className="mt-1 min-h-24 w-full rounded-xl border p-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></div><button className="mt-5 h-10 w-full rounded-xl bg-primary font-semibold text-primary-foreground" disabled={loading} onClick={() => void save()} type="button"><Check className="mr-2 inline size-4" />Save</button></div></div> : null}

    {sharing ? <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center md:p-6"><div className="w-full max-w-2xl rounded-t-3xl bg-background p-5 md:rounded-3xl"><div className="flex justify-between"><div><h3 className="text-lg font-bold">Secure request</h3><p className="text-xs text-muted-foreground">No recipient account is required.</p></div><button onClick={() => { setSharing(null); setCreatedLink(null) }} type="button"><X /></button></div>{!createdLink ? <button className="mt-6 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground" disabled={loading} onClick={() => void createLink()} type="button">Generate expiring link and QR</button> : <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px]"><div><div className="break-all rounded-xl border p-3 text-sm">{createdLink.publicUrl}</div><div className="mt-3 flex gap-2"><button className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs" onClick={() => navigator.clipboard.writeText(createdLink.publicUrl ?? "")} type="button"><Clipboard className="size-4" />Copy</button><a className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs" href={createdLink.publicUrl ?? "#"} target="_blank"><ExternalLink className="size-4" />Open</a></div></div>{createdLink.qrDataUrl ? <img alt="Secure request QR" className="w-full rounded-xl border p-2" src={createdLink.qrDataUrl} /> : null}</div>}</div></div> : null}
  </div>
}
