"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type {
  LeadItem,
  PropertyItem,
  PropertyVisitFeedbackItem,
  SavePropertyVisitFeedbackInput,
  ShowingBookingItem,
} from "@/hooks/use-real-estate-api"

const empty = "__empty__"

export function ManualFeedbackTab({
  feedbackEntries,
  form,
  isSaving,
  leads,
  onChange,
  onSave,
  properties,
  showings,
}: {
  feedbackEntries: PropertyVisitFeedbackItem[]
  form: SavePropertyVisitFeedbackInput
  isSaving: boolean
  leads: LeadItem[]
  onChange: (next: SavePropertyVisitFeedbackInput) => void
  onSave: () => void
  properties: PropertyItem[]
  showings: ShowingBookingItem[]
}) {
  const selectedShowing = showings.find((item) => item.id === form.showingBookingId) ?? null
  const selectedProperty = properties.find((item) => item.id === form.propertyId) ?? null
  const propertyOptions = properties.map((item) => ({ value: String(item.id), label: item.title }))
  const showingOptions = showings
    .filter((item) => !form.propertyId || item.propertyId === form.propertyId)
    .slice(0, 100)
    .map((item) => ({
      value: String(item.id),
      label: `${item.propertyTitle} | ${item.contactName} | ${new Date(item.startAt).toLocaleString()}`,
    }))
  const leadOptions = leads
    .filter((item) => {
      if (selectedShowing?.leadId) {
        return item.id === selectedShowing.leadId
      }

      if (form.showingBookingId) {
        return false
      }

      return !selectedProperty || item.property === selectedProperty.title
    })
    .slice(0, 120)
    .map((item) => ({ value: String(item.id), label: `${item.name} | ${item.email}` }))
  const selectedPropertyLabel = propertyOptions.find((item) => item.value === String(form.propertyId))?.label ?? "Select property"
  const selectedShowingLabel = showingOptions.find((item) => item.value === String(form.showingBookingId))?.label ?? "Optional showing record"
  const selectedLeadLabel = leadOptions.find((item) => item.value === String(form.leadId))?.label ?? "Lead from showing"

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Manual entry"}</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{"Save feedback manually"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {"Pick property, then showing. Lead list stays tied to selected showing so names stay clean."}
            </p>
          </div>
          <button
            className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save Feedback"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>{"Property"}</span>
            <Select
              onValueChange={(value) => onChange({ ...form, propertyId: value === empty ? 0 : Number(value), showingBookingId: null, leadId: null })}
              value={form.propertyId ? String(form.propertyId) : empty}
            >
              <SelectTrigger><SelectValue>{selectedPropertyLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={empty}>{"Select property"}</SelectItem>
                {propertyOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:col-span-2">
            <span>{"Showing record"}</span>
            <Select
              onValueChange={(value) => {
                if (value === empty) {
                  onChange({ ...form, showingBookingId: null, leadId: null })
                  return
                }

                const nextShowing = showings.find((item) => item.id === Number(value)) ?? null
                onChange({
                  ...form,
                  propertyId: nextShowing?.propertyId ?? form.propertyId,
                  showingBookingId: nextShowing?.id ?? null,
                  leadId: nextShowing?.leadId ?? null,
                  contactName: nextShowing?.showingAgentName || nextShowing?.contactName || form.contactName,
                  contactEmail: nextShowing?.showingAgentEmail || nextShowing?.contactEmail || form.contactEmail,
                  contactPhone: nextShowing?.showingAgentPhone || nextShowing?.contactPhone || form.contactPhone,
                })
              }}
              value={form.showingBookingId ? String(form.showingBookingId) : empty}
            >
              <SelectTrigger><SelectValue>{selectedShowingLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={empty}>{"Optional showing record"}</SelectItem>
                {showingOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>{"Lead"}</span>
            <Select
              onValueChange={(value) => onChange({ ...form, leadId: value === empty ? null : Number(value) })}
              value={form.leadId ? String(form.leadId) : empty}
            >
              <SelectTrigger><SelectValue>{selectedLeadLabel}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={empty}>{"Lead from showing"}</SelectItem>
                {leadOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <InputField label="Contact name" onChange={(value) => onChange({ ...form, contactName: value })} value={form.contactName} />
          <InputField label="Contact email" onChange={(value) => onChange({ ...form, contactEmail: value })} value={form.contactEmail ?? ""} />
          <InputField label="Contact phone" onChange={(value) => onChange({ ...form, contactPhone: value })} value={form.contactPhone ?? ""} />

          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            <span>{"Sentiment"}</span>
            <Select
              onValueChange={(value) => onChange({ ...form, sentiment: value as SavePropertyVisitFeedbackInput["sentiment"] })}
              value={form.sentiment}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Negative", "Mixed", "Positive", "Unknown"].map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <InputField
            label="Issue tags"
            onChange={(value) => onChange({ ...form, issues: value.split(",").map((item) => item.trim()).filter(Boolean) })}
            value={form.issues.join(", ")}
          />
          <InputField label="Quick summary" onChange={(value) => onChange({ ...form, summary: value })} value={form.summary} wide />

          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 md:col-span-2">
            <span>{"Full feedback"}</span>
            <Textarea
              className="min-h-40"
              onChange={(event) => onChange({ ...form, feedbackText: event.target.value })}
              value={form.feedbackText}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c18b2f]/80">{"Recent replies"}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{"Latest feedback inbox"}</h3>
        </div>
        <div className="mt-5 space-y-3">
          {feedbackEntries.slice(0, 8).map((item) => (
            <article className="rounded-[1.25rem] border border-slate-200 bg-[#f7f5f1]/70 p-4" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                  item.sentiment === "Negative"
                    ? "bg-rose-100 text-rose-700"
                    : item.sentiment === "Mixed"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}>
                  {item.sentiment}
                </span>
                <p className="text-sm font-bold text-slate-900">{item.propertyTitle}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-slate-400">
                {`${item.contactName || "Unknown"} | ${new Date(item.feedbackAt).toLocaleString()}`}
              </p>
            </article>
          ))}
          {feedbackEntries.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-[#f7f5f1]/50 p-6 text-sm text-slate-500">
              {"No feedback saved yet."}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function InputField({
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
