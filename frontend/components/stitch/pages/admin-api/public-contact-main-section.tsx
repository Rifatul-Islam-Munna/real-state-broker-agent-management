"use client"

import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { sileo } from "sileo"

import type { PublicAgencyProfileSettings } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { useCreateContactRequest } from "@/hooks/use-real-estate-api"
import { agencySocialPlatformOptions, getConfiguredAgencySocialLinks } from "@/lib/agency-social-links"

const inquiryTypes = ["Buying", "Selling", "Property Valuation", "Agent Introduction"] as const

type InquiryType = (typeof inquiryTypes)[number]

export function PublicContactMainApiSection({ profile }: { profile: PublicAgencyProfileSettings }) {
  const searchParams = useSearchParams()
  const agentId = searchParams.get("agentId")?.trim() ?? ""
  const agentName = searchParams.get("agentName")?.trim() ?? ""
  const agencyName = searchParams.get("agencyName")?.trim() ?? ""
  const agentVerified = searchParams.get("verified") === "true"
  const hasAgentTarget = Boolean(agentId || agentName)

  const [activeInquiry, setActiveInquiry] = useState<InquiryType>(hasAgentTarget ? "Agent Introduction" : "Buying")
  const [formState, setFormState] = useState({
    email: "",
    message: hasAgentTarget
      ? `Selected agent: ${agentName || "Unknown agent"}\nAgent ID: ${agentId || "Not provided"}\nAgency: ${agencyName || "Not provided"}\nVerified: ${agentVerified ? "Yes" : "No"}\n\nI would like to contact this agent about: `
      : "",
    name: "",
    phone: "",
  })
  const createContactRequest = useCreateContactRequest()
  const socialLinks = getConfiguredAgencySocialLinks(profile.socialLinks)
  const office = profile.officeLocations.find((item) => item.trim()) || "Office location not added yet"

  function showValidationError(description: string) {
    sileo.error({ title: "Check the form", description })
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formState.name.trim()) return showValidationError("Full name is required.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) return showValidationError("Enter a valid email address.")
    if (!formState.phone.trim()) return showValidationError("Phone number is required.")
    if (formState.message.trim().length < 20) return showValidationError("Message must be at least 20 characters.")

    const response = await createContactRequest.mutateAsync({
      email: formState.email.trim(),
      inquiryType: activeInquiry,
      message: formState.message.trim(),
      name: formState.name.trim(),
      phone: formState.phone.trim(),
    })

    if (!response.error) {
      setFormState({ email: "", message: "", name: "", phone: "" })
    }
  }

  const fieldClass = "w-full rounded-xl border border-slate-200 bg-[#eff4ff] px-5 py-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#4343d5] focus:bg-white focus:ring-4 focus:ring-[#4343d5]/10"

  return (
    <section className="pb-24 sm:pb-32">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:px-8 lg:grid-cols-12 lg:px-10">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,.04)] sm:p-10 lg:col-span-7">
          <h2 className="text-2xl font-semibold tracking-tight">Tell us how we can help</h2>
          <p className="mt-2 text-sm text-slate-600">Choose an inquiry type and share the details your advisor should know.</p>

          <div className="mt-9 flex flex-wrap gap-3">
            {inquiryTypes.map((type) => {
              const active = type === activeInquiry
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveInquiry(type)}
                  className={`rounded-xl border px-5 py-3 text-xs font-semibold transition ${active ? "border-[#4343d5] bg-[#4343d5] text-white shadow-md" : "border-slate-300 bg-white text-slate-700 hover:border-[#4343d5]"}`}
                >
                  {type}
                </button>
              )
            })}
          </div>

          <form onSubmit={submitForm} className="mt-10 grid gap-7 md:grid-cols-2">
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Full name
              <input value={formState.name} onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))} className={fieldClass} placeholder="Your full name" />
            </label>

            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Email address
              <input type="email" value={formState.email} onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} className={fieldClass} placeholder="you@example.com" />
            </label>

            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Phone number
              <input value={formState.phone} onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))} className={fieldClass} placeholder="Your phone number" />
            </label>

            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Inquiry type
              <select value={activeInquiry} onChange={(event) => setActiveInquiry(event.target.value as InquiryType)} className={fieldClass}>
                {inquiryTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>

            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 md:col-span-2">
              Message
              <textarea rows={6} value={formState.message} onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))} className={`${fieldClass} resize-none`} placeholder="Tell us what you need and include any listing or location details." />
            </label>

            <button disabled={createContactRequest.isPending} className="w-full rounded-xl bg-[#4343d5] px-10 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(67,67,213,.22)] transition hover:bg-[#3535b8] disabled:opacity-60 md:w-fit">
              {createContactRequest.isPending ? "Sending..." : "Send inquiry"}
            </button>
          </form>
        </div>

        <aside className="space-y-5 lg:col-span-5">
          {[
            ["mail", "General inquiries", profile.contactEmail || "Contact email not added yet"],
            ["call", "Call our desk", profile.contactPhone || "Phone number not added yet"],
            ["location_on", "Visit headquarters", office],
          ].map(([icon, title, detail]) => (
            <div key={title} className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#4343d5]/5 text-[#4343d5]"><AppIcon name={icon} className="text-2xl" /></span>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p><p className="mt-2 break-words text-lg font-semibold leading-7">{detail}</p></div>
            </div>
          ))}

          <div className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#4343d5]/5 text-[#4343d5]"><AppIcon name="public" className="text-2xl" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Social channels</p><div className="mt-4 flex flex-wrap gap-2">{socialLinks.length ? socialLinks.map((link) => { const platform = agencySocialPlatformOptions.find((item) => item.platform === link.platform); return <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-[#4343d5] hover:text-[#4343d5]"><AppIcon name={platform?.icon || "share"} /></a> }) : <span className="text-sm text-slate-500">No social channels added yet.</span>}</div></div>
          </div>

          <div className="overflow-hidden rounded-[24px] bg-[#07192d] p-8 text-white">
            <div className="flex items-center gap-3"><span className="h-px w-8 bg-[#4343d5]" /><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8e8eff]">Response standard</p></div>
            <h3 className="mt-6 text-3xl font-extrabold">Same-day reply</h3>
            <p className="mt-5 text-sm leading-7 text-slate-300">Luxury inquiries and active listing requests are routed immediately to the appropriate advisor. We aim to provide a professional response within one business day.</p>
            <p className="mt-7 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8e8eff]">Our commitment to excellence <AppIcon name="verified" className="text-sm" /></p>
          </div>
        </aside>
      </div>
    </section>
  )
}
