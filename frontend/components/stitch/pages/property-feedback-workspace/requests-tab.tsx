"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  CreateShowingFeedbackRequestInput,
  LeadItem,
  PropertyItem,
  PropertyVisitFeedbackItem,
  ShowingFeedbackRequestItem,
  ShowingBookingItem,
} from "@/hooks/use-real-estate-api"

export function RequestsTab({
  feedbackEntries,
  form,
  isSaving,
  leads,
  onChange,
  onSave,
  properties,
  requests,
  showings,
  templates,
}: {
  feedbackEntries: PropertyVisitFeedbackItem[]
  form: CreateShowingFeedbackRequestInput
  isSaving: boolean
  leads: LeadItem[]
  onChange: (next: CreateShowingFeedbackRequestInput) => void
  onSave: () => void
  properties: PropertyItem[]
  requests: ShowingFeedbackRequestItem[]
  showings: ShowingBookingItem[]
  templates: AgencyCommunicationTemplateItem[]
}) {
  const selectedProperty = properties.find((item) => item.id === form.propertyId) ?? null
  const propertyOptions = properties.map((item) => ({ value: String(item.id), label: item.title }))
  const showingOptions = showings
    .filter((item) => !form.propertyId || item.propertyId === form.propertyId)
    .map((item) => ({
      value: String(item.id),
      label: `${item.propertyTitle} | ${item.showingAgentName || item.contactName} | ${new Date(item.startAt).toLocaleString()}`,
    }))
  const leadOptions = leads
    .filter((item) => !selectedProperty || item.property === selectedProperty.title)
    .map((item) => ({ value: String(item.id), label: `${item.name} | ${item.email}` }))
  const selectedPropertyLabel = propertyOptions.find((item) => item.value === String(form.propertyId))?.label ?? "Select property"
  const selectedShowingLabel = showingOptions.find((item) => item.value === String(form.showingBookingId))?.label ?? "Select showing"
  const selectedLeadLabel = leadOptions.find((item) => item.value === String(form.leadId))?.label ?? "Select lead"
  const feedbackTemplates = useMemo(
    () =>
      templates.filter(
        (item) =>
          item.id.startsWith("feedback-request-") ||
          item.name.toLowerCase().includes("feedback request") ||
          item.name.toLowerCase().includes("showing feedback"),
      ),
    [templates],
  )
  const [templateId, setTemplateId] = useState("")

  function toggleChannel(channel: AgencyCommunicationChannel) {
    const next = form.channels.includes(channel)
      ? form.channels.filter((item) => item !== channel)
      : [...form.channels, channel]

    onChange({
      ...form,
      channels: next.length > 0 ? next : ["Email"],
    })
  }

  function loadTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId)
    const match = feedbackTemplates.find((item) => item.id === nextTemplateId)

    if (!match) {
      return
    }

    onChange({
      ...form,
      subject: match.subject,
      message: match.body,
      followUpSubject: match.followUpSubject || match.subject,
      followUpMessage: match.followUpBody || match.body,
      channels: match.channels.length > 0 ? match.channels : ["Email"],
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
        <div className="mb-5 rounded-[1.35rem] border border-slate-200 bg-[#f7f5f1]/65 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Manual request"}</p>
              <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">{"Send broker feedback request"}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {"Send first message, auto-track follow-up queue, reuse templates, pick Email/SMS/WhatsApp."}
              </p>
            </div>
            <button
              className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              disabled={isSaving}
              onClick={onSave}
              type="button"
            >
              {isSaving ? "Saving..." : "Schedule Request"}
            </button>
          </div>
          <div className="mt-4 grid gap-4 rounded-[1.2rem] border border-slate-200 bg-white p-4">
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Saved template"}</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                onChange={(event) => loadTemplate(event.target.value)}
                value={templateId}
              >
                <option value="">{"Custom draft"}</option>
                {feedbackTemplates.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["Email", "SMS", "WhatsApp"] as const).map((channel) => (
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${
                    form.channels.includes(channel) ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-700"
                  }`}
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  type="button"
                >
                  {channel}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              {"Template save/delete moved to Template Vault so this screen stays send-only."}
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectField
              label="Property"
              onValueChange={(value) => onChange({ ...form, propertyId: value ? Number(value) : 0, showingBookingId: null })}
              options={propertyOptions}
              selectedLabel={selectedPropertyLabel}
              value={form.propertyId ? String(form.propertyId) : ""}
            />
            <SelectField
              label="Showing"
              onValueChange={(value) => {
                const showing = showings.find((item) => item.id === Number(value))
                onChange({
                  ...form,
                  showingBookingId: showing?.id ?? null,
                  propertyId: showing?.propertyId ?? form.propertyId,
                  leadId: showing?.leadId ?? null,
                  recipientName: showing?.showingAgentName || form.recipientName,
                  recipientEmail: showing?.showingAgentEmail || form.recipientEmail,
                  recipientPhone: showing?.showingAgentPhone || form.recipientPhone,
                })
              }}
              options={showingOptions}
              selectedLabel={selectedShowingLabel}
              value={form.showingBookingId ? String(form.showingBookingId) : ""}
            />
            <SelectField
              label="Lead"
              onValueChange={(value) => onChange({ ...form, leadId: value ? Number(value) : null })}
              options={leadOptions}
              selectedLabel={selectedLeadLabel}
              value={form.leadId ? String(form.leadId) : ""}
            />
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Send at"}</span>
              <Input
                onChange={(event) => onChange({ ...form, scheduledAt: event.target.value ? new Date(event.target.value).toISOString() : null })}
                type="datetime-local"
                value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""}
              />
            </label>
            <TextField label="Recipient name" onChange={(value) => onChange({ ...form, recipientName: value })} value={form.recipientName} />
            <TextField label="Recipient email" onChange={(value) => onChange({ ...form, recipientEmail: value })} value={form.recipientEmail ?? ""} />
            <TextField label="Recipient phone" onChange={(value) => onChange({ ...form, recipientPhone: value })} value={form.recipientPhone ?? ""} />
            <TextField label="Subject" onChange={(value) => onChange({ ...form, subject: value })} value={form.subject} wide />
            <LongTextField label="Message" onChange={(value) => onChange({ ...form, message: value })} value={form.message} wide />
            <TextField label="Follow-up subject" onChange={(value) => onChange({ ...form, followUpSubject: value })} value={form.followUpSubject ?? ""} wide />
            <LongTextField label="Follow-up message" onChange={(value) => onChange({ ...form, followUpMessage: value })} value={form.followUpMessage ?? ""} wide />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Request queue"}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{"Scheduled reminder pipeline"}</h3>
        </div>
        <div className="mt-5 space-y-3">
          {requests.map((item) => (
            <article className="rounded-[1.35rem] border border-slate-200 bg-[#f7f5f1]/60 p-4" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                  item.status === "Pending"
                    ? "bg-amber-100 text-amber-700"
                    : item.status === "Replied"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.status === "Failed"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700"
                }`}>
                  {item.status}
                </span>
                <p className="text-sm font-bold text-slate-900">{item.propertyTitle}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {`${item.recipientName || "No name"} · ${item.recipientEmail || item.recipientPhone || "No contact"}`}
              </p>
              <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.12em] text-slate-400 md:grid-cols-3">
                <p>{`Send at ${new Date(item.scheduledAt).toLocaleString()}`}</p>
                <p>{`Follow-ups ${item.followUpCount}/${item.maxFollowUps}`}</p>
                <p>{item.replyReceivedAt ? `Reply ${new Date(item.replyReceivedAt).toLocaleString()}` : item.nextFollowUpAt ? `Next follow-up ${new Date(item.nextFollowUpAt).toLocaleString()}` : "No reply yet"}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.channels.map((channel) => (
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600" key={`${item.id}-${channel}`}>
                    {channel}
                  </span>
                ))}
              </div>
              {item.replySummary || item.skipReason ? (
                <p className="mt-3 text-sm text-slate-600">{item.replySummary || item.skipReason}</p>
              ) : null}
            </article>
          ))}
          {requests.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-[#f7f5f1]/50 p-6 text-sm text-slate-500">
              {"No feedback requests queued yet."}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c18b2f]/80">{"Reply inbox"}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{"Captured answers"}</h3>
        </div>
        <div className="mt-5 space-y-3">
          {feedbackEntries.slice(0, 12).map((item) => (
            <article className="rounded-[1.25rem] border border-slate-200 bg-[#f7f5f1]/65 p-4" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{item.propertyTitle}</p>
                <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.source}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              {item.issues.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.issues.slice(0, 4).map((issue) => (
                    <span className="rounded-full border border-[#c18b2f]/25 bg-[#c18b2f]/10 px-3 py-1 text-[11px] font-bold text-[#8b6722]" key={`${item.id}-${issue}`}>
                      {issue}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function SelectField({
  label,
  onValueChange,
  options,
  selectedLabel,
  value,
}: {
  label: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  selectedLabel: string
  value: string
}) {
  return (
    <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
      <span>{label}</span>
      <Select onValueChange={(next) => onValueChange(next === "__empty__" ? "" : next)} value={value || "__empty__"}>
        <SelectTrigger><SelectValue>{selectedLabel}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="__empty__">{`Select ${label.toLowerCase()}`}</SelectItem>
          {options.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function TextField({
  label,
  onChange,
  value,
  wide = false,
}: {
  label: string
  onChange: (value: string) => void
  value: string
  wide?: boolean
}) {
  return (
    <label className={`space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 ${wide ? "md:col-span-2" : ""}`}>
      <span>{label}</span>
      <Input onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  )
}

function LongTextField({
  label,
  onChange,
  value,
  wide = false,
}: {
  label: string
  onChange: (value: string) => void
  value: string
  wide?: boolean
}) {
  return (
    <label className={`space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 ${wide ? "md:col-span-2" : ""}`}>
      <span>{label}</span>
      <Textarea className="min-h-32" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  )
}
