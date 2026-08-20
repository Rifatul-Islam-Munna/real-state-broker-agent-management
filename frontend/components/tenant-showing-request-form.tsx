"use client"

import Image from "next/image"
import { FormEvent, useMemo, useState } from "react"
import { Building2, CalendarDays, CheckCircle2, Clock3, LockKeyhole, Send, TriangleAlert } from "lucide-react"

import type { TenantShowingFormField } from "@/lib/tenant-dashboard-actions"

export type TenantPublicShowingRequest = {
  id: number
  title: string
  message: string
  status: string
  propertyMode: "fixed" | "respondent"
  propertyId: number | null
  propertyTitle: string | null
  leadName: string
  fields: TenantShowingFormField[]
  answers: Record<string, unknown>
  properties: Array<{ id: number; title: string }>
  expiresAt: string
  preferredShowingAt: string | null
  businessName: string
  brandColor: string
  logoUrl: string
}

type AnswerValue = string | boolean | string[]

type TenantShowingRequestFormProps = {
  initialRequest: TenantPublicShowingRequest
  token: string
}

function asInputDateTime(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function initialAnswers(request: TenantPublicShowingRequest) {
  const result: Record<string, AnswerValue> = {}
  for (const field of request.fields) {
    if (["divider", "heading", "paragraph", "image"].includes(field.type)) continue
    const value = request.answers?.[field.key]
    if (field.type === "checkbox") result[field.key] = value === true
    else if (field.type === "checkbox-group") result[field.key] = Array.isArray(value) ? value.map(String) : []
    else if (field.type === "datetime" && typeof value === "string") result[field.key] = asInputDateTime(value)
    else result[field.key] = typeof value === "string" || typeof value === "number" ? String(value) : ""
  }
  return result
}

export function TenantShowingRequestForm({ initialRequest, token }: TenantShowingRequestFormProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() => initialAnswers(initialRequest))
  const [propertyId, setPropertyId] = useState(String(initialRequest.propertyId ?? ""))
  const [isPending, setIsPending] = useState(false)
  const [submitted, setSubmitted] = useState(initialRequest.status === "submitted" || initialRequest.status === "approved")
  const [error, setError] = useState("")

  const expirationLabel = useMemo(() => new Date(initialRequest.expiresAt).toLocaleString(), [initialRequest.expiresAt])

  const updateAnswer = (key: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsPending(true)
    setError("")
    try {
      const normalizedAnswers: Record<string, AnswerValue> = {}
      let preferredShowingAt: string | null = null
      for (const field of initialRequest.fields) {
        if (["divider", "heading", "paragraph", "image"].includes(field.type)) continue
        const value = answers[field.key]
        if (field.type === "datetime" && typeof value === "string" && value) {
          const date = new Date(value)
          const iso = Number.isFinite(date.getTime()) ? date.toISOString() : value
          normalizedAnswers[field.key] = field.availability?.length ? value : iso
          if (!preferredShowingAt && (field.key.includes("preferred") || field.label.toLowerCase().includes("preferred"))) preferredShowingAt = iso
        } else {
          normalizedAnswers[field.key] = value
        }
      }
      const response = await fetch(`/api/tenant-public/showing-requests/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: propertyId ? Number(propertyId) : null,
          preferredShowingAt,
          answers: normalizedAnswers,
        }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message
        throw new Error(message || "Your request could not be submitted")
      }
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your request could not be submitted")
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f0e8] p-5 sm:p-8">
        <section className="w-full max-w-xl rounded-[30px] border border-white/70 bg-white p-7 text-center shadow-[0_30px_100px_rgba(48,50,46,0.14)] sm:p-10">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="size-8" /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: initialRequest.brandColor }}>Request received</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">Your showing request is under review.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">{initialRequest.businessName} will confirm the property, time, and assigned realtor. Your original lead record remains connected to this property.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f0e8] px-5 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_35px_120px_rgba(48,50,46,0.16)] lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-[#1d2d2c] p-7 text-white sm:p-10">
          <div className="absolute -right-28 -top-20 size-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-24 left-8 size-56 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: initialRequest.brandColor }} />
          <div className="relative flex h-full min-h-[420px] flex-col">
            <div className="flex items-center gap-3">
              {initialRequest.logoUrl ? <Image alt={initialRequest.businessName} className="h-11 w-auto max-w-40 object-contain" height={44} src={initialRequest.logoUrl} unoptimized width={160} /> : <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10"><Building2 className="size-5" /></span>}
              <div><p className="font-bold">{initialRequest.businessName}</p><p className="text-xs text-white/50">Private showing intake</p></div>
            </div>
            <div className="my-auto py-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: initialRequest.brandColor }}>{initialRequest.leadName ? `Prepared for ${initialRequest.leadName}` : "Showing request"}</p>
              <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em]">{initialRequest.title}</h1>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/65">{initialRequest.message || "Tell us which property and time work best. A realtor will review and confirm your appointment."}</p>
            </div>
            <div className="grid gap-3 text-xs text-white/65">
              <p className="flex items-center gap-2"><Clock3 className="size-4" /> Link expires {expirationLabel}</p>
              <p className="flex items-center gap-2"><LockKeyhole className="size-4" /> Secure tenant-specific form</p>
            </div>
          </div>
        </aside>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: initialRequest.brandColor }}>Appointment details</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Request a property showing</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Complete the form below. Submission does not finalize the appointment until a realtor reviews and approves it.</p>
          </div>

          <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
            {initialRequest.propertyMode === "respondent" ? (
              <label className="grid gap-2 text-sm font-bold">Property<select className="h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none transition focus:border-slate-700 focus:ring-4 focus:ring-slate-900/5" onChange={(event) => setPropertyId(event.target.value)} required value={propertyId}><option value="">Choose a currently available property</option>{initialRequest.properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select></label>
            ) : (
              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm"><Building2 className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected property</p><p className="mt-1 font-bold">{initialRequest.propertyTitle || "Property unavailable"}</p></div></div>
            )}

            {initialRequest.fields.map((field) => {
              const value = answers[field.key]
              const commonClass = "h-12 rounded-xl border border-slate-300 bg-white px-4 font-normal outline-none transition focus:border-slate-700 focus:ring-4 focus:ring-slate-900/5"
              if (field.type === "divider") return <hr className="my-2 border-slate-200" key={field.key} />
              if (field.type === "heading") return <div className="pt-2" key={field.key}><h3 className="text-xl font-bold tracking-[-0.02em] text-slate-950">{field.label}</h3>{field.description ? <p className="mt-1 text-sm text-slate-500">{field.description}</p> : null}</div>
              if (field.type === "paragraph") return <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600" key={field.key}>{field.label}{field.description ? `\n${field.description}` : ""}</p>
              if (field.type === "image") return <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50" key={field.key}><img alt={field.label || "Form image"} className="max-h-[420px] w-full object-cover" src={field.imageUrl} />{field.description ? <figcaption className="p-3 text-xs text-slate-500">{field.description}</figcaption> : null}</figure>
              if (field.type === "textarea") return <label className="grid gap-2 text-sm font-bold" key={field.key}>{field.label}{field.required ? " *" : ""}<textarea className="min-h-32 rounded-xl border border-slate-300 p-4 font-normal leading-7 outline-none focus:border-slate-700" onChange={(event) => updateAnswer(field.key, event.target.value)} required={field.required} value={String(value ?? "")} /></label>
              if (field.type === "select") return <label className="grid gap-2 text-sm font-bold" key={field.key}>{field.label}{field.required ? " *" : ""}<select className={commonClass} onChange={(event) => updateAnswer(field.key, event.target.value)} required={field.required} value={String(value ?? "")}><option value="">Choose an option</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
              if (field.type === "radio") return <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4" key={field.key}><legend className="px-1 text-sm font-bold">{field.label}{field.required ? " *" : ""}</legend>{field.options.map((option) => <label className="flex items-center gap-3 text-sm" key={option}><input checked={value === option} name={field.key} onChange={() => updateAnswer(field.key, option)} required={field.required} type="radio" value={option} /> {option}</label>)}</fieldset>
              if (field.type === "checkbox-group") return <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4" key={field.key}><legend className="px-1 text-sm font-bold">{field.label}{field.required ? " *" : ""}</legend>{field.options.map((option) => { const selected = Array.isArray(value) ? value : []; return <label className="flex items-center gap-3 text-sm" key={option}><input checked={selected.includes(option)} onChange={(event) => updateAnswer(field.key, event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} type="checkbox" value={option} /> {option}</label> })}</fieldset>
              if (field.type === "checkbox") return <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold" key={field.key}><input checked={value === true} className="mt-1" onChange={(event) => updateAnswer(field.key, event.target.checked)} required={field.required} type="checkbox" /> <span>{field.label}{field.required ? " *" : ""}</span></label>
              if (field.type === "datetime" && field.availability?.length) {
                const today = new Date().toLocaleDateString("en-CA")
                const slots = field.availability.filter((slot) => slot.date >= today && slot.times.length)
                const current = String(value ?? "")
                const selectedDate = current.slice(0, 10)
                const selectedTime = current.includes("T") ? current.slice(11, 16) : ""
                const times = slots.find((slot) => slot.date === selectedDate)?.times ?? []
                return <fieldset className="grid gap-3 rounded-2xl border border-slate-200 p-4" key={field.key}><legend className="px-1 text-sm font-bold">{field.label}{field.required ? " *" : ""}</legend><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-xs font-semibold text-slate-600">Available date<select className={commonClass} onChange={(event) => updateAnswer(field.key, event.target.value ? `${event.target.value}T` : "")} required={field.required} value={selectedDate}><option value="">Choose date</option>{slots.map((slot) => <option key={slot.date} value={slot.date}>{new Date(`${slot.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold text-slate-600">Available time<select className={commonClass} disabled={!selectedDate} onChange={(event) => updateAnswer(field.key, selectedDate && event.target.value ? `${selectedDate}T${event.target.value}` : `${selectedDate}T`)} required={field.required} value={selectedTime}><option value="">Choose time</option>{times.map((time) => <option key={time} value={time}>{new Date(`${selectedDate}T${time}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</option>)}</select></label></div>{slots.length === 0 ? <p className="text-xs text-rose-700">No future appointments are currently available.</p> : null}</fieldset>
              }
              const inputType = field.type === "phone" ? "tel" : field.type === "datetime" ? "datetime-local" : field.type
              return <label className="grid gap-2 text-sm font-bold" key={field.key}>{field.label}{field.required ? " *" : ""}<input className={commonClass} onChange={(event) => updateAnswer(field.key, event.target.value)} required={field.required} type={inputType} value={String(value ?? "")} /></label>
            })}

            {error ? <div className="flex items-start gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div> : null}

            <button className="inline-flex h-13 items-center justify-center gap-2 rounded-xl px-5 font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending} style={{ backgroundColor: initialRequest.brandColor }} type="submit"><Send className="size-4" /> {isPending ? "Submitting..." : "Submit showing request"}</button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><CalendarDays className="size-4" /> The realtor may suggest a different time before approval.</p>
          </form>
        </section>
      </div>
    </main>
  )
}
