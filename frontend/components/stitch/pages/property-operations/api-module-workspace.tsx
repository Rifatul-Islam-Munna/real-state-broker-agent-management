"use client"

import { useEffect, useMemo, useState } from "react"
import { Clipboard, ExternalLink, Link2, Pencil, Plus, QrCode, Trash2, X } from "lucide-react"

import { getPropertyOperationsPreset } from "@/data/property-operations-presets"
import type { PropertyOperationsModule } from "@/data/property-operations-modules"
import {
  propertyOperationsApi,
  type OperationsPublicAccess,
  type OperationsRecord,
  type OperationsWorkspace,
} from "@/lib/property-operations-api"

type RecordForm = {
  id?: number
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
  extra: Record<string, unknown>
}

const emptyForm: RecordForm = {
  title: "",
  recordType: "Item",
  description: "",
  status: "Open",
  priority: "Normal",
  amount: "",
  dueAt: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  extra: {},
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>
  } catch {
    return {}
  }
}

export function ApiModuleWorkspace({
  module,
  onClose,
  onChanged,
  workspace,
}: {
  module: PropertyOperationsModule | null
  onClose: () => void
  onChanged: () => void
  workspace: OperationsWorkspace | null
}) {
  const [records, setRecords] = useState<OperationsRecord[]>([])
  const [form, setForm] = useState<RecordForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [shareRecord, setShareRecord] = useState<OperationsRecord | null>(null)
  const [shareTitle, setShareTitle] = useState("")
  const [shareInstructions, setShareInstructions] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [expiryHours, setExpiryHours] = useState("168")
  const [createdLink, setCreatedLink] = useState<OperationsPublicAccess | null>(null)

  const preset = useMemo(() => getPropertyOperationsPreset(module?.id ?? ""), [module?.id])

  async function loadRecords() {
    if (!workspace || !module) return
    setLoading(true)
    setError("")
    try {
      setRecords(await propertyOperationsApi.getRecords(workspace.propertyId, module.id))
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not load records.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setForm({ ...emptyForm, recordType: preset.recordTypes[0] ?? "Item" })
    setShowRecordForm(false)
    setShareRecord(null)
    setCreatedLink(null)
    void loadRecords()
  }, [module?.id, workspace?.propertyId])

  if (!module || !workspace) return null

  function editRecord(record: OperationsRecord) {
    const payload = parsePayload(record.payloadJson)
    setForm({
      id: record.id,
      title: record.title,
      recordType: record.recordType,
      description: record.description,
      status: record.status,
      priority: record.priority,
      amount: record.amount == null ? "" : String(record.amount),
      dueAt: record.dueAt ? record.dueAt.slice(0, 10) : "",
      contactName: String(payload.contactName ?? ""),
      contactEmail: String(payload.contactEmail ?? ""),
      contactPhone: String(payload.contactPhone ?? ""),
      extra: typeof payload.extra === "object" && payload.extra ? (payload.extra as Record<string, unknown>) : {},
    })
    setShowRecordForm(true)
  }

  async function saveRecord() {
    if (!form.title.trim()) return
    setLoading(true)
    setError("")
    try {
      await propertyOperationsApi.saveRecord({
        id: form.id,
        propertyId: workspace.propertyId,
        moduleKey: module.id,
        recordType: form.recordType,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        amount: form.amount ? Number(form.amount) : null,
        dueAt: form.dueAt ? new Date(`${form.dueAt}T12:00:00Z`).toISOString() : null,
        payloadJson: JSON.stringify({
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          extra: form.extra,
        }),
      })
      setForm({ ...emptyForm, recordType: preset.recordTypes[0] ?? "Item" })
      setShowRecordForm(false)
      await loadRecords()
      onChanged()
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not save record.")
    } finally {
      setLoading(false)
    }
  }

  async function deleteRecord(id: number) {
    if (!window.confirm("Delete this operational record?")) return
    setLoading(true)
    try {
      await propertyOperationsApi.deleteRecord(id)
      await loadRecords()
      onChanged()
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not delete record.")
    } finally {
      setLoading(false)
    }
  }

  function beginShare(record: OperationsRecord | null) {
    setShareRecord(record)
    setShareTitle(record?.title ?? `${module.label} request`)
    setShareInstructions(record?.description ?? "")
    const payload = record ? parsePayload(record.payloadJson) : {}
    setRecipientName(String(payload.contactName ?? ""))
    setRecipientEmail(String(payload.contactEmail ?? ""))
    setRecipientPhone(String(payload.contactPhone ?? ""))
    setCreatedLink(null)
  }

  async function createShareLink() {
    setLoading(true)
    setError("")
    try {
      const link = await propertyOperationsApi.createPublicLink({
        propertyId: workspace.propertyId,
        recordId: shareRecord?.id ?? null,
        moduleKey: module.id,
        title: shareTitle.trim() || `${module.label} request`,
        instructions: shareInstructions.trim(),
        recipientLabel: preset.recipient,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        recipientPhone: recipientPhone.trim(),
        formSchemaJson: JSON.stringify(preset.fields),
        expiryHours: Math.max(1, Number(expiryHours) || 168),
        oneTime: true,
        maxUses: 1,
        allowFileUploads: true,
      })
      setCreatedLink(link)
      onChanged()
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not create public request.")
    } finally {
      setLoading(false)
    }
  }

  const publicUrl = createdLink?.publicUrl
    ? createdLink.publicUrl.startsWith("http")
      ? createdLink.publicUrl
      : `${window.location.origin}${createdLink.publicUrl}`
    : ""
  const qrUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicUrl)}`
    : ""

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-3xl border bg-background md:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b p-5 md:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{workspace.propertyTitle}</p>
            <h2 className="mt-1 text-xl font-bold">{module.id === "subscriptions" ? "Service Contracts & Utilities" : module.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Admin-managed records. Outside participants respond only through temporary links or QR codes.</p>
          </div>
          <button className="rounded-xl border p-2" onClick={onClose} type="button"><X className="size-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{records.length} records</h3>
              <p className="text-xs text-muted-foreground">Create tasks, finances, contacts, schedules, documents and operational history.</p>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" onClick={() => beginShare(null)} type="button"><Link2 className="size-4" /> Public request</button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => { setForm({ ...emptyForm, recordType: preset.recordTypes[0] ?? "Item" }); setShowRecordForm(true) }} type="button"><Plus className="size-4" /> New record</button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {loading && records.length === 0 ? <p className="text-sm text-muted-foreground">Loading records...</p> : null}
            {!loading && records.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No records yet.</div> : null}
            {records.map((record) => (
              <article className="rounded-2xl border p-4" key={record.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{record.title}</h4>
                      <span className="rounded-full border px-2 py-0.5 text-[11px]">{record.status}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[11px]">{record.priority}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{record.recordType}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="rounded-lg p-2 hover:bg-muted" onClick={() => beginShare(record)} title="Create link or QR" type="button"><QrCode className="size-4" /></button>
                    <button className="rounded-lg p-2 hover:bg-muted" onClick={() => editRecord(record)} title="Edit" type="button"><Pencil className="size-4" /></button>
                    <button className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => void deleteRecord(record.id)} title="Delete" type="button"><Trash2 className="size-4" /></button>
                  </div>
                </div>
                {record.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{record.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {record.dueAt ? <span className="rounded-full border px-2.5 py-1">Due {new Date(record.dueAt).toLocaleDateString()}</span> : null}
                  {record.amount != null ? <span className="rounded-full border px-2.5 py-1">Amount {record.amount.toLocaleString()}</span> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showRecordForm ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border bg-background p-5 md:rounded-3xl md:p-6">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{form.id ? "Edit record" : "New record"}</h3><button onClick={() => setShowRecordForm(false)} type="button"><X /></button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">Title<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} value={form.title} /></label>
              <label className="text-sm font-medium">Type<select className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, recordType: e.target.value }))} value={form.recordType}>{preset.recordTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium">Status<select className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))} value={form.status}>{preset.statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium">Priority<select className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, priority: e.target.value }))} value={form.priority}>{["Low", "Normal", "High", "Urgent"].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium">Due date<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, dueAt: e.target.value }))} type="date" value={form.dueAt} /></label>
              <label className="text-sm font-medium">Amount<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, amount: e.target.value }))} type="number" value={form.amount} /></label>
              <label className="text-sm font-medium">Contact name<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, contactName: e.target.value }))} value={form.contactName} /></label>
              <label className="text-sm font-medium">Contact email<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, contactEmail: e.target.value }))} type="email" value={form.contactEmail} /></label>
              <label className="text-sm font-medium">Contact phone<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setForm((v) => ({ ...v, contactPhone: e.target.value }))} value={form.contactPhone} /></label>
              <label className="text-sm font-medium md:col-span-2">Description<textarea className="mt-1.5 min-h-28 w-full rounded-xl border p-3" onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} value={form.description} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button className="h-10 rounded-xl border px-4" onClick={() => setShowRecordForm(false)} type="button">Cancel</button><button className="h-10 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" disabled={loading || !form.title.trim()} onClick={() => void saveRecord()} type="button">Save record</button></div>
          </div>
        </div>
      ) : null}

      {shareRecord !== null || shareTitle ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border bg-background p-5 md:rounded-3xl md:p-6">
            <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Secure public request</h3><p className="text-xs text-muted-foreground">No account is required. The link expires and can be revoked.</p></div><button onClick={() => { setShareRecord(null); setShareTitle(""); setCreatedLink(null) }} type="button"><X /></button></div>
            {!createdLink ? <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">Request title<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setShareTitle(e.target.value)} value={shareTitle} /></label>
              <label className="text-sm font-medium md:col-span-2">Instructions<textarea className="mt-1.5 min-h-28 w-full rounded-xl border p-3" onChange={(e) => setShareInstructions(e.target.value)} value={shareInstructions} /></label>
              <label className="text-sm font-medium">Recipient name<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setRecipientName(e.target.value)} value={recipientName} /></label>
              <label className="text-sm font-medium">Recipient email<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setRecipientEmail(e.target.value)} value={recipientEmail} /></label>
              <label className="text-sm font-medium">Recipient phone<input className="mt-1.5 h-11 w-full rounded-xl border px-3" onChange={(e) => setRecipientPhone(e.target.value)} value={recipientPhone} /></label>
              <label className="text-sm font-medium">Expires after hours<input className="mt-1.5 h-11 w-full rounded-xl border px-3" min="1" onChange={(e) => setExpiryHours(e.target.value)} type="number" value={expiryHours} /></label>
              <div className="md:col-span-2 flex justify-end"><button className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" disabled={loading} onClick={() => void createShareLink()} type="button">Generate link and QR</button></div>
            </div> : <div className="mt-5 grid gap-6 md:grid-cols-[1fr_260px]">
              <div><p className="text-sm font-semibold">Request created</p><div className="mt-3 break-all rounded-xl border bg-muted/30 p-3 text-sm">{publicUrl}</div><div className="mt-3 flex flex-wrap gap-2"><button className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" onClick={() => navigator.clipboard.writeText(publicUrl)} type="button"><Clipboard className="size-4" /> Copy</button><a className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" href={publicUrl} rel="noreferrer" target="_blank"><ExternalLink className="size-4" /> Open</a></div><p className="mt-4 text-xs text-muted-foreground">Share by email, SMS, WhatsApp or print the QR. The recipient does not need an account.</p></div>
              <div className="rounded-2xl border p-3 text-center"><img alt="Request QR code" className="mx-auto aspect-square w-full" src={qrUrl} /><a className="mt-2 inline-block text-xs font-semibold text-primary" download="property-request-qr.png" href={qrUrl}>Download QR</a></div>
            </div>}
          </div>
        </div>
      ) : null}
    </div>
  )
}
