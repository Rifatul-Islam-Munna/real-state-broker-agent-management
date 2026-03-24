"use client"

import { useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AgentUserOption, LeadItem, PropertyItem } from "@/hooks/use-real-estate-api"
import { formatLeadPriority, leadStageMeta } from "@/lib/admin-portal"

import {
  defaultLeadFormValues,
  leadButtonClass,
  leadFormSelectOptions,
  mapLeadToFormValues,
  type LeadFormErrors,
  type LeadFormValues,
  type OutreachType,
  validateLeadForm,
} from "./lead-shared"

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <p className="text-xs font-semibold text-rose-600">{error}</p>
}

export function LeadCommunicationDialog({
  isSubmitting,
  lead,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {
  isSubmitting: boolean
  lead: LeadItem | null
  mode: OutreachType | null
  onOpenChange: (open: boolean) => void
  onSubmit: (message: string) => Promise<string | null>
  open: boolean
}) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!lead || !mode) {
    return null
  }

  const title = mode === "email" ? "Send Email" : "Send Message"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {`Send a ${mode} update to ${lead.name}.`}
          </DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {lead.email}
          </div>
          <Textarea
            className="min-h-40 rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => {
              setMessage(event.target.value)
              setError(null)
            }}
            placeholder={`Write the ${mode} message here...`}
            value={message}
          />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button
            className={leadButtonClass}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {"Close"}
          </button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              if (message.trim().length < 5) {
                setError("Message must be at least 5 characters.")
                return
              }

              const responseError = await onSubmit(message)

              if (responseError) {
                setError(responseError)
                return
              }

              setMessage("")
              setError(null)
              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting ? "Sending..." : title}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function LeadCancelDialog({
  isSubmitting,
  lead,
  onOpenChange,
  onSubmit,
  open,
}: {
  isSubmitting: boolean
  lead: LeadItem | null
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => Promise<string | null>
  open: boolean
}) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!lead) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {"Cancel Lead"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {"Canceling here removes the lead from the active board and from current follow-up."}
          </DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {lead.name}
          </div>
          <Textarea
            className="min-h-32 rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder="Add a cancel reason"
            value={reason}
          />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={leadButtonClass} onClick={() => onOpenChange(false)} type="button">
            {"Close"}
          </button>
          <button
            className="border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              if (reason.trim().length < 5) {
                setError("A short cancel reason is required.")
                return
              }

              const responseError = await onSubmit(reason)

              if (responseError) {
                setError(responseError)
                return
              }

              setReason("")
              setError(null)
              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting ? "Canceling..." : "Confirm Cancel"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function LeadFormDialog({
  isSubmitting,
  lead,
  mode,
  agentOptions,
  onOpenChange,
  onSubmit,
  open,
  propertyOptions,
}: {
  isSubmitting: boolean
  lead: LeadItem | null
  mode: "create" | "edit"
  agentOptions: AgentUserOption[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LeadFormValues) => Promise<string | null>
  open: boolean
  propertyOptions: PropertyItem[]
}) {
  const initialValues = lead ? mapLeadToFormValues(lead) : defaultLeadFormValues()
  const [formValues, setFormValues] = useState(initialValues)
  const [errors, setErrors] = useState<LeadFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const propertyTitles = useMemo(() => {
    const titles = new Set(propertyOptions.map((item) => item.title ?? "").filter(Boolean))

    if (formValues.property) {
      titles.add(formValues.property)
    }

    return Array.from(titles)
  }, [formValues.property, propertyOptions])

  const agentSelectOptions = useMemo(() => {
    const options = new Map<string, string>()

    agentOptions.forEach((agent) => {
      if (agent.fullName) {
        options.set(agent.fullName, agent.fullName)
      }
    })

    if (formValues.agent) {
      options.set(formValues.agent, formValues.agent)
    }

    return Array.from(options.entries())
  }, [agentOptions, formValues.agent])

  const sourceOptions = useMemo(() => {
    const options = new Set<string>(leadFormSelectOptions.sources)

    if (formValues.source) {
      options.add(formValues.source)
    }

    return Array.from(options)
  }, [formValues.source])

  const interestOptions = useMemo(() => {
    const options = new Set<string>(leadFormSelectOptions.interests)

    if (formValues.interest) {
      options.add(formValues.interest)
    }

    return Array.from(options)
  }, [formValues.interest])

  const timelineOptions = useMemo(() => {
    const options = new Set<string>(leadFormSelectOptions.timelines)

    if (formValues.timeline) {
      options.add(formValues.timeline)
    }

    return Array.from(options)
  }, [formValues.timeline])

  function updateField<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setFormValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[key]
      delete nextErrors.form
      return nextErrors
    })
    setSubmitError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setFormValues(initialValues)
          setErrors({})
          setSubmitError(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-5xl rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === "create" ? "Add Lead" : "Edit Lead"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === "create"
              ? "Create the lead from a modal and keep the workflow inside the CRM."
              : "Update the lead details without leaving the CRM list."}
          </DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Lead name"
              value={formValues.name}
            />
            <FieldError error={errors.name} />
          </div>
          <div className="flex flex-col gap-2">
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Email"
              type="email"
              value={formValues.email}
            />
            <FieldError error={errors.email} />
          </div>
          <div className="flex flex-col gap-2">
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="Phone"
              value={formValues.phone}
            />
            <FieldError error={errors.phone} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Property"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("property", event.target.value)}
              value={formValues.property}
            >
              <option value="">{"Select property"}</option>
              {propertyTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
            <FieldError error={errors.property} />
          </label>
          <div className="flex flex-col gap-2">
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("budget", event.target.value)}
              placeholder="Budget"
              value={formValues.budget}
            />
            <FieldError error={errors.budget} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Assigned Agent"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("agent", event.target.value)}
              value={formValues.agent}
            >
              <option value="">{"Select agent"}</option>
              {agentSelectOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError error={errors.agent} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Source"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("source", event.target.value)}
              value={formValues.source}
            >
              <option value="">{"Select source"}</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <FieldError error={errors.source} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Interest"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("interest", event.target.value)}
              value={formValues.interest}
            >
              <option value="">{"Select interest"}</option>
              {interestOptions.map((interest) => (
                <option key={interest} value={interest}>
                  {interest}
                </option>
              ))}
            </select>
            <FieldError error={errors.interest} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Timeline"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("timeline", event.target.value)}
              value={formValues.timeline}
            >
              <option value="">{"Select timeline"}</option>
              {timelineOptions.map((timeline) => (
                <option key={timeline} value={timeline}>
                  {timeline}
                </option>
              ))}
            </select>
            <FieldError error={errors.timeline} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Priority"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("priority", event.target.value as LeadFormValues["priority"])}
              value={formValues.priority}
            >
              {leadFormSelectOptions.priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {formatLeadPriority(priority)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Stage"}
            <select
              className="h-10 rounded-none border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              onChange={(event) => updateField("stage", event.target.value as LeadFormValues["stage"])}
              value={formValues.stage}
            >
              {leadFormSelectOptions.stages.map((stage) => (
                <option key={stage} value={stage}>
                  {leadStageMeta[stage].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input
              checked={formValues.inBoard}
              className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
              onChange={(event) => updateField("inBoard", event.target.checked)}
              type="checkbox"
            />
            {"Place on active board immediately"}
          </label>
          <div className="hidden md:block" />
          <div className="flex flex-col gap-2 md:col-span-2">
            <Textarea
              className="min-h-28 rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("summary", event.target.value)}
              placeholder="Summary"
              value={formValues.summary}
            />
            <FieldError error={errors.summary} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Textarea
              className="min-h-24 rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Notes, one per line"
              value={formValues.notes}
            />
          </div>
          {submitError ? (
            <p className="text-sm font-semibold text-rose-600 md:col-span-2">{submitError}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={leadButtonClass} onClick={() => onOpenChange(false)} type="button">
            {"Close"}
          </button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              const nextErrors = validateLeadForm(formValues)

              if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors)
                return
              }

              const responseError = await onSubmit(formValues)

              if (responseError) {
                setSubmitError(responseError)
                return
              }

              setErrors({})
              setSubmitError(null)
              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Lead"
                : "Save Lead"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
