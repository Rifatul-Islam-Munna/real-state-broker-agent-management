"use client"

import Link from "next/link"
import { useActionState, useMemo, useState } from "react"
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  GripVertical,
  Plus,
  Send,
  Settings2,
  Trash2,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react"

import {
  createTenantShowingRequestAction,
  createTenantShowingTemplateAction,
  type TenantActionState,
  type TenantLead,
  type TenantProperty,
  type TenantShowingFormField,
  type TenantShowingRequest,
  type TenantShowingTemplate,
} from "@/lib/tenant-dashboard-actions"

const initialState: TenantActionState = { ok: false, message: "" }

type BuilderField = TenantShowingFormField & { id: string }

function createBuilderField(index: number): BuilderField {
  return {
    id: `field-${Date.now()}-${index}`,
    key: `field_${index}`,
    label: "",
    type: "text",
    required: false,
    options: [],
    description: "",
    imageUrl: "",
  }
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
  if (status === "submitted") return "bg-amber-50 text-amber-800 ring-amber-600/15"
  if (status === "rejected" || status === "expired") return "bg-rose-50 text-rose-700 ring-rose-600/15"
  return "bg-sky-50 text-sky-700 ring-sky-600/15"
}

type ShowingRequestsWorkspaceProps = {
  leads: TenantLead[]
  properties: TenantProperty[]
  templates: TenantShowingTemplate[]
  requests: TenantShowingRequest[]
}

export function TenantShowingRequestsWorkspace({ leads, properties, templates, requests }: ShowingRequestsWorkspaceProps) {
  const [tab, setTab] = useState<"requests" | "templates">("requests")
  const [requestState, requestAction, requestPending] = useActionState(createTenantShowingRequestAction, initialState)
  const [templateState, templateAction, templatePending] = useActionState(createTenantShowingTemplateAction, initialState)
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0] ? String(templates[0].id) : "")
  const initialMode = templates[0]?.propertyMode ?? "fixed"
  const [propertyMode, setPropertyMode] = useState<"fixed" | "respondent">(initialMode)
  const [selectedPropertyId, setSelectedPropertyId] = useState("")
  const [fields, setFields] = useState<BuilderField[]>([
    { ...createBuilderField(1), label: "Preferred showing time", key: "preferredShowingAt", type: "datetime", required: true },
  ])

  const selectedLead = useMemo(
    () => leads.find((lead) => String(lead.id) === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  )
  const linkedPublishedProperties = useMemo(() => {
    const linkedIds = new Set((selectedLead?.properties ?? []).filter((item) => item.status === "published").map((item) => item.id))
    return properties.filter((property) => property.status === "published" && linkedIds.has(property.id))
  }, [properties, selectedLead])

  const handleLeadChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const leadId = event.target.value
    setSelectedLeadId(leadId)
    const lead = leads.find((item) => String(item.id) === leadId)
    const firstPublished = (lead?.properties ?? []).find((property) => property.status === "published")
    setSelectedPropertyId(firstPublished ? String(firstPublished.id) : "")
  }

  const handleTemplateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = event.target.value
    setSelectedTemplateId(templateId)
    const template = templates.find((item) => String(item.id) === templateId)
    const nextMode = template?.propertyMode ?? "fixed"
    setPropertyMode(nextMode)
    if (nextMode === "respondent") setSelectedPropertyId("")
  }

  const addField = () => setFields((current) => [...current, createBuilderField(current.length + 1)])
  const removeField = (id: string) => setFields((current) => current.filter((field) => field.id !== id))
  const updateField = (id: string, patch: Partial<BuilderField>) => {
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)))
  }

  const serializedFields = JSON.stringify(
    fields.map((field) => ({ key: field.key, label: field.label, type: field.type, required: field.required, options: field.options, description: field.description, imageUrl: field.imageUrl })),
  )

  return (
    <main className="mx-auto max-w-[1500px] space-y-8 p-5 sm:p-8 lg:p-10">
      <header className="relative overflow-hidden rounded-[28px] bg-[#17213b] px-6 py-8 text-white shadow-[0_24px_70px_rgba(23,33,59,0.2)] sm:px-9">
        <div className="absolute right-8 top-0 h-full w-72 bg-[radial-gradient(circle_at_center,rgba(242,192,80,0.18),transparent_65%)]" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f2c050]">Appointment intake</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Showing request studio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">Build reusable forms, send expiring links to leads, review their property and time choices, then approve with a manually assigned realtor.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-2xl font-bold">{requests.length}</p><p className="text-[11px] uppercase tracking-wide text-white/55">Requests</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-2xl font-bold">{requests.filter((item) => item.status === "submitted").length}</p><p className="text-[11px] uppercase tracking-wide text-white/55">To review</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><p className="text-2xl font-bold">{templates.length}</p><p className="text-[11px] uppercase tracking-wide text-white/55">Templates</p></div>
          </div>
        </div>
      </header>

      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Showing request workspace">
        <button aria-selected={tab === "requests"} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${tab === "requests" ? "bg-[#17213b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setTab("requests")} role="tab" type="button"><ClipboardList className="size-4" /> Requests</button>
        <button aria-selected={tab === "templates"} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${tab === "templates" ? "bg-[#17213b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setTab("templates")} role="tab" type="button"><Settings2 className="size-4" /> Form templates</button>
      </div>

      {tab === "requests" ? (
        <section className="grid gap-7 xl:grid-cols-[minmax(360px,0.8fr)_minmax(680px,1.5fr)]">
          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff6df] text-[#946710]"><Send className="size-5" /></span><div><h2 className="text-xl font-bold">Send showing form</h2><p className="mt-1 text-sm leading-6 text-slate-600">A linked live property is filled automatically. You can change it or let the recipient choose.</p></div></div>
            <form action={requestAction} className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold">Lead<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-[#17213b]" name="leadId" onChange={handleLeadChange} required value={selectedLeadId}><option value="">Choose lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.full_name} - {lead.email || lead.phone || "no contact"}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold">Template<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-[#17213b]" name="templateId" onChange={handleTemplateChange} required value={selectedTemplateId}><option value="">Choose template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
              <input name="propertyMode" type="hidden" value={propertyMode} />

              {propertyMode === "fixed" ? (
                <label className="grid gap-2 text-sm font-semibold">Property<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-[#17213b]" name="propertyId" onChange={(event) => setSelectedPropertyId(event.target.value)} required value={selectedPropertyId}><option value="">Choose published property</option>{properties.filter((property) => property.status === "published").map((property) => <option key={property.id} value={property.id}>{property.title}{linkedPublishedProperties.some((item) => item.id === property.id) ? " - linked to lead" : ""}</option>)}</select></label>
              ) : (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900"><strong>Recipient selects the property.</strong> The public form will show only currently published listings.</div>
              )}

              <label className="grid gap-2 text-sm font-semibold">Request title<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#17213b]" name="title" placeholder="Private showing request" /></label>
              <label className="grid gap-2 text-sm font-semibold">Intro message<textarea className="min-h-28 rounded-xl border border-slate-300 p-4 font-normal leading-6 outline-none focus:border-[#17213b]" name="message" placeholder="Invite the lead and explain what happens after submission." /></label>
              <label className="grid gap-2 text-sm font-semibold">Link expires after<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-[#17213b]" defaultValue="72" name="expiryHours"><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="336">14 days</option><option value="720">30 days</option></select></label>
              <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><legend className="px-1 text-sm font-semibold">Send through</legend><div className="mt-2 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input defaultChecked name="channels" type="checkbox" value="Email" /> Email</label><label className="flex items-center gap-2"><input name="channels" type="checkbox" value="SMS" /> SMS</label></div></fieldset>
              {requestState.message ? <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${requestState.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{requestState.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}<span>{requestState.message}</span></div> : null}
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17213b] px-5 font-semibold text-white shadow-lg shadow-[#17213b]/15 disabled:opacity-60" disabled={requestPending || !templates.length || !leads.length} type="submit"><Send className="size-4" /> {requestPending ? "Creating..." : "Create and send request"}</button>
            </form>
          </article>

          <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7"><div><h2 className="text-xl font-bold">Request queue</h2><p className="mt-1 text-sm text-slate-600">Submitted requests wait here for manual realtor assignment and approval.</p></div><UserRoundCheck className="size-5 text-[#946710]" /></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-6 py-4">Lead</th><th className="px-6 py-4">Property</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Preferred time</th><th className="px-6 py-4">Expires</th><th className="px-6 py-4"><span className="sr-only">Open</span></th></tr></thead><tbody>{requests.length ? requests.map((request) => <tr className="border-t border-slate-100 transition hover:bg-[#fffaf0]" key={request.id}><td className="px-6 py-5"><p className="font-bold">{request.leadName}</p><p className="mt-1 text-xs text-slate-500">{request.recipientEmail || request.recipientPhone || "No contact"}</p></td><td className="px-6 py-5"><p className="font-medium">{request.requestedPropertyTitle || request.propertyTitle || (request.propertyMode === "respondent" ? "Recipient will choose" : "Not selected")}</p><p className="mt-1 text-xs text-slate-500">{request.title}</p></td><td className="px-6 py-5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${statusClass(request.status)}`}>{request.status}</span></td><td className="px-6 py-5 text-xs text-slate-600">{request.preferredShowingAt ? new Date(request.preferredShowingAt).toLocaleString() : "Waiting"}</td><td className="px-6 py-5 text-xs text-slate-600">{new Date(request.expiresAt).toLocaleString()}</td><td className="px-6 py-5"><Link aria-label={`Open request for ${request.leadName}`} className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#946710] hover:text-[#946710]" href={`/dashboard/showing-requests/${request.id}`}><ArrowUpRight className="size-4" /></Link></td></tr>) : <tr><td className="px-6 py-16 text-center" colSpan={6}><CalendarClock className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No showing requests yet</p><p className="mt-1 text-sm text-slate-500">Create the first request from the form on the left.</p></td></tr>}</tbody></table></div>
          </article>
        </section>
      ) : (
        <section className="grid gap-7 xl:grid-cols-[minmax(480px,1fr)_minmax(500px,1fr)]">
          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff6df] text-[#946710]"><FilePlus2 className="size-5" /></span><div><h2 className="text-xl font-bold">Custom form template</h2><p className="mt-1 text-sm leading-6 text-slate-600">Design the questions once, then reuse the template for any lead.</p></div></div><button aria-label="Add field" className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-[#946710] hover:text-[#946710]" onClick={addField} type="button"><Plus className="size-4" /></button></div>
            <form action={templateAction} className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-semibold">Template name<input className="h-12 rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#17213b]" name="name" placeholder="Buyer showing intake" required /></label>
              <label className="grid gap-2 text-sm font-semibold">Description<textarea className="min-h-24 rounded-xl border border-slate-300 p-4 font-normal leading-6 outline-none focus:border-[#17213b]" name="description" /></label>
              <label className="grid gap-2 text-sm font-semibold">Property behavior<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none focus:border-[#17213b]" defaultValue="fixed" name="propertyMode"><option value="fixed">Realtor chooses property before sending</option><option value="respondent">Recipient chooses a published property</option></select></label>
              <div className="grid gap-3"><div className="flex items-center justify-between"><p className="text-sm font-bold">Form fields</p><button className="inline-flex items-center gap-2 text-sm font-semibold text-[#946710]" onClick={addField} type="button"><Plus className="size-4" /> Add field</button></div>{fields.map((field, index) => <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={field.id}><div className="flex items-center gap-3"><GripVertical className="size-4 text-slate-400" /><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Field {index + 1}</p><button aria-label={`Remove field ${index + 1}`} className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" disabled={fields.length === 1} onClick={() => removeField(field.id)} type="button"><Trash2 className="size-4" /></button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-semibold">Label<input className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal" onChange={(event) => updateField(field.id, { label: event.target.value })} required={field.type !== "divider"} value={field.label} /></label><label className="grid gap-1.5 text-xs font-semibold">Type<select className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal" onChange={(event) => updateField(field.id, { type: event.target.value as TenantShowingFormField["type"] })} value={field.type}><option value="text">Short text</option><option value="textarea">Long text</option><option value="email">Email</option><option value="phone">Phone</option><option value="number">Number</option><option value="date">Date</option><option value="datetime">Date and time</option><option value="select">Dropdown</option><option value="radio">Radio choices</option><option value="checkbox">Agreement checkbox</option><option value="checkbox-group">Multiple checkboxes</option><option value="heading">Section heading</option><option value="paragraph">Information text</option><option value="divider">Divider</option><option value="image">Image</option></select></label>{field.type === "select" || field.type === "radio" || field.type === "checkbox-group" ? <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Options, separated by commas<input className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal" onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} value={field.options.join(", ")} /></label> : null}{field.type === "image" ? <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Image URL<input className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal" onChange={(event) => updateField(field.id, { imageUrl: event.target.value })} placeholder="https://..." required value={field.imageUrl ?? ""} /></label> : null}{field.type === "heading" || field.type === "paragraph" || field.type === "image" ? <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">Supporting text<textarea className="min-h-20 rounded-lg border border-slate-300 bg-white p-3 font-normal" onChange={(event) => updateField(field.id, { description: event.target.value })} value={field.description ?? ""} /></label> : null}{!["divider", "heading", "paragraph", "image"].includes(field.type) ? <label className="flex items-center gap-2 text-xs font-semibold sm:col-span-2"><input checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} type="checkbox" /> Required response</label> : null}</div></div>)}</div>
              <input name="fields" type="hidden" value={serializedFields} />
              {templateState.message ? <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${templateState.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{templateState.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}<span>{templateState.message}</span></div> : null}
              <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#17213b] px-5 font-semibold text-white disabled:opacity-60" disabled={templatePending} type="submit"><FilePlus2 className="size-4" /> {templatePending ? "Saving..." : "Save reusable template"}</button>
            </form>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-7"><h2 className="text-xl font-bold">Template library</h2><p className="mt-1 text-sm text-slate-600">Choose a fixed-property template or let the lead select from live listings.</p><div className="mt-6 grid gap-4">{templates.map((template) => <article className="rounded-2xl border border-slate-200 p-5" key={template.id}><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{template.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{template.description || "No description"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${template.propertyMode === "respondent" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800"}`}>{template.propertyMode === "respondent" ? "Lead chooses" : "Fixed property"}</span></div><div className="mt-4 flex flex-wrap gap-2">{template.fields.map((field) => <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600" key={field.key}>{field.label}{field.required ? " *" : ""}</span>)}</div></article>)}{!templates.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No templates have been created.</div> : null}</div></article>
        </section>
      )}
    </main>
  )
}
