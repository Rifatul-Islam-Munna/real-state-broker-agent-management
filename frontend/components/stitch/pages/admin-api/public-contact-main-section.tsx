"use client"

import { useState } from "react"

import { useCreateContactRequest } from "@/hooks/use-real-estate-api"
import { publicContactMethods } from "@/static-data/pages/public-contact-us/data"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const inquiryTypes = [
  "Buying",
  "Selling",
  "Property Valuation",
  "Agent Introduction",
] as const

export function PublicContactMainApiSection() {
  const [activeInquiry, setActiveInquiry] = useState<typeof inquiryTypes[number]>("Buying")
  const createContactRequest = useCreateContactRequest()
  const [formState, setFormState] = useState({
    email: "",
    message: "",
    name: "",
    phone: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
            onSubmit={async (event) => {
              event.preventDefault()

              if (!formState.name.trim()) {
                setFormError("Full name is required.")
                return
              }

              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
                setFormError("Enter a valid email address.")
                return
              }

              if (!formState.phone.trim()) {
                setFormError("Phone number is required.")
                return
              }

              if (formState.message.trim().length < 20) {
                setFormError("Message must be at least 20 characters.")
                return
              }

              setFormError(null)

              const response = await createContactRequest.mutateAsync({
                email: formState.email,
                inquiryType: activeInquiry,
                message: formState.message,
                name: formState.name,
                phone: formState.phone,
              })

              if (response.error) {
                setFormError(response.error.message)
                return
              }

              setFormState({
                email: "",
                message: "",
                name: "",
                phone: "",
              })
              setSubmitted(true)
            }}
          >
            <Input
              className="h-auto border-slate-200 px-4 py-3 text-sm"
              onChange={(event) => {
                setFormError(null)
                setSubmitted(false)
                setFormState((current) => ({ ...current, name: event.target.value }))
              }}
              placeholder="Full name"
              type="text"
              value={formState.name}
            />
            <Input
              className="h-auto border-slate-200 px-4 py-3 text-sm"
              onChange={(event) => {
                setFormError(null)
                setSubmitted(false)
                setFormState((current) => ({ ...current, email: event.target.value }))
              }}
              placeholder="Email address"
              type="email"
              value={formState.email}
            />
            <Input
              className="h-auto border-slate-200 px-4 py-3 text-sm"
              onChange={(event) => {
                setFormError(null)
                setSubmitted(false)
                setFormState((current) => ({ ...current, phone: event.target.value }))
              }}
              placeholder="Phone number"
              type="tel"
              value={formState.phone}
            />
            <Input
              className="h-auto border-slate-200 px-4 py-3 text-sm"
              defaultValue={activeInquiry}
              readOnly
              type="text"
            />
            <Textarea
              className="min-h-40 border-slate-200 px-4 py-3 text-sm md:col-span-2"
              onChange={(event) => {
                setFormError(null)
                setSubmitted(false)
                setFormState((current) => ({ ...current, message: event.target.value }))
              }}
              placeholder="Tell us what you need and include any listing or location details."
              value={formState.message}
            />
            <button
              className="bg-primary px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2 md:w-fit"
              disabled={createContactRequest.isPending}
              type="submit"
            >
              {createContactRequest.isPending ? "Sending..." : "Send Inquiry"}
            </button>
            {formError ? (
              <p className="md:col-span-2 text-sm font-semibold text-rose-600">
                {formError}
              </p>
            ) : null}
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
                <AppIcon className="text-3xl text-accent" name={method.icon} />
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
