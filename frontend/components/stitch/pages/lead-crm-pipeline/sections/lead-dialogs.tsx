"use client"

import { useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

const formSelectClassName =
  "h-10 w-full rounded-none border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"

const emptySelectValue = "__empty__"

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
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
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
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
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
  const selectedPropertyLabel = formValues.property || "Select property"
  const selectedAgentLabel = formValues.agent || "Select agent"
  const selectedSourceLabel = formValues.source || "Select source"
  const selectedInterestLabel = formValues.interest || "Select interest"
  const selectedTimelineLabel = formValues.timeline || "Select timeline"
  const selectedPriorityLabel = formatLeadPriority(formValues.priority)
  const selectedStageLabel = leadStageMeta[formValues.stage].label

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
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
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
            <Select
              modal={false}
              onValueChange={(value) => updateField("property", !value || value === emptySelectValue ? "" : value)}
              value={formValues.property || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedPropertyLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"Select property"}</SelectItem>
                {propertyTitles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              modal={false}
              onValueChange={(value) => updateField("agent", !value || value === emptySelectValue ? "" : value)}
              value={formValues.agent || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedAgentLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"Select agent"}</SelectItem>
                {agentSelectOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.agent} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Source"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("source", !value || value === emptySelectValue ? "" : value)}
              value={formValues.source || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedSourceLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"Select source"}</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.source} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Interest"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("interest", !value || value === emptySelectValue ? "" : value)}
              value={formValues.interest || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedInterestLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"Select interest"}</SelectItem>
                {interestOptions.map((interest) => (
                  <SelectItem key={interest} value={interest}>
                    {interest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.interest} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Timeline"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("timeline", !value || value === emptySelectValue ? "" : value)}
              value={formValues.timeline || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedTimelineLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"Select timeline"}</SelectItem>
                {timelineOptions.map((timeline) => (
                  <SelectItem key={timeline} value={timeline}>
                    {timeline}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.timeline} />
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Priority"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("priority", (value ?? formValues.priority) as LeadFormValues["priority"])}
              value={formValues.priority}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedPriorityLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leadFormSelectOptions.priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {formatLeadPriority(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Stage"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("stage", (value ?? formValues.stage) as LeadFormValues["stage"])}
              value={formValues.stage}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedStageLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leadFormSelectOptions.stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {leadStageMeta[stage].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
