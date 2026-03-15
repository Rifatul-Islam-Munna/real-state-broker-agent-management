"use client"

import { useState } from "react"

import { publicContactMethods } from "@/static-data/pages/public-contact-us/data"
import { useAdminFlowStore } from "@/stores/admin-flow-store"

const inquiryTypes = [
  "Buying",
  "Selling",
  "Property Valuation",
  "Agent Introduction",
] as const

export function ContactMainSection() {
  const [activeInquiry, setActiveInquiry] = useState<typeof inquiryTypes[number]>("Buying")
  const submitContactRequest = useAdminFlowStore((state) => state.submitContactRequest)
  const [formState, setFormState] = useState({
    email: "",
    message: "",
    name: "",
    phone: "",
  })
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10">
        <div className="border border-slate-200 bg-white p-8">
          <div className="flex flex-wrap gap-3">
            {inquiryTypes.map((type) => (
              <button
                key={type}
                className={type === activeInquiry
                  ? "bg-primary px-4 py-2 text-sm font-bold text-white"
                  : "border border-primary/10 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary"}
                onClick={() => setActiveInquiry(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
          <form
            className="mt-8 grid gap-5 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              submitContactRequest({
                email: formState.email,
                inquiryType: activeInquiry,
                message: formState.message,
                name: formState.name,
                phone: formState.phone,
              })
              setFormState({
                email: "",
                message: "",
                name: "",
                phone: "",
              })
              setSubmitted(true)
            }}
          >
            <input
              className="border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              type="text"
              value={formState.name}
            />
            <input
              className="border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email address"
              type="email"
              value={formState.email}
            />
            <input
              className="border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Phone number"
              type="tel"
              value={formState.phone}
            />
            <input
              className="border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              defaultValue={activeInquiry}
              readOnly
              type="text"
            />
            <textarea
              className="min-h-40 border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary md:col-span-2"
              onChange={(event) => setFormState((current) => ({ ...current, message: event.target.value }))}
              placeholder="Tell us what you need and include any listing or location details."
              value={formState.message}
            />
            <button
              className="bg-primary px-6 py-3 text-sm font-bold text-white md:col-span-2 md:w-fit"
              type="submit"
            >
              {"Send Inquiry"}
            </button>
            {submitted ? (
              <p className="md:col-span-2 text-sm font-semibold text-primary">
                {"Inquiry sent. You can now review it from the admin Contact Us inbox."}
              </p>
            ) : null}
          </form>
        </div>
        <aside className="grid gap-4">
          {publicContactMethods.map((method) => (
            <div
              key={method.title}
              className="border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-accent">
                  {method.icon}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    {method.title}
                  </p>
                  <p className="mt-2 text-lg font-bold text-primary">
                    {method.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div className="border border-primary/10 bg-primary p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              {"Response Standard"}
            </p>
            <p className="mt-3 text-3xl font-black">
              {"Same-day reply"}
            </p>
            <p className="mt-3 text-sm text-white/75">
              {"Luxury inquiries and active listing requests are routed immediately to the appropriate advisor."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
