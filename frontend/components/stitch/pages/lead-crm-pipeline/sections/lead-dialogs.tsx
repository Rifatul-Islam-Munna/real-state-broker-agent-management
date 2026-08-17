"use client"

import { useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { AppIcon } from "@/components/ui/app-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
  "h-11 w-full rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm font-medium text-[var(--ether-on-surface)] shadow-none"

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
        options.set(`${agent.id}`, agent.fullName)
      }
    })

    if (formValues.agentId && formValues.agent) {
      options.set(`${formValues.agentId}`, formValues.agent)
    } else if (formValues.agent) {
      options.set(formValues.agent, formValues.agent)
    }

    return Array.from(options.entries())
  }, [agentOptions, formValues.agent, formValues.agentId])

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
  const selectedAgentLabel = formValues.agentId
    ? agentOptions.find((agent) => agent.id === formValues.agentId)?.fullName ?? formValues.agent
    : formValues.agent || "Auto assign"
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

  const inputClassName = "h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
  const fieldLabelClassName = "text-xs font-semibold text-[var(--ether-on-surface-variant)]"

  async function handleSave() {
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
      <DialogContent className="!flex h-[90dvh] max-h-[90dvh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
        <header className="flex items-start justify-between border-b border-[var(--ether-outline-variant)] px-6 py-5 sm:px-8 sm:py-6">
          <div>
            <DialogTitle className="text-2xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">
              {mode === "create" ? "Add Lead" : "Edit Lead"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
              {mode === "create" ? "Create a new lead and configure its workflow." : "Update lead intelligence and status parameters."}
            </DialogDescription>
          </div>
          <button aria-label="Close lead form" className="flex size-9 items-center justify-center rounded-full text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-high)]" onClick={() => onOpenChange(false)} type="button">
            <AppIcon name="close" />
          </button>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[color-mix(in_srgb,var(--ether-surface)_55%,white)] px-6 py-6 sm:px-8">
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Client Information</h3></div>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2"><span className={fieldLabelClassName}>Full Name</span><Input className={inputClassName} onChange={(e) => updateField("name", e.target.value)} placeholder="Enter name" value={formValues.name} /><FieldError error={errors.name} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Email Address</span><Input className={inputClassName} onChange={(e) => updateField("email", e.target.value)} placeholder="email@example.com" type="email" value={formValues.email} /><FieldError error={errors.email} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Phone Number</span><Input className={inputClassName} onChange={(e) => updateField("phone", e.target.value)} placeholder="+1 (555) 000-0000" value={formValues.phone} /><FieldError error={errors.phone} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Property Interest</span>
                  <Select modal={false} onValueChange={(value) => updateField("property", !value || value === emptySelectValue ? "" : value)} value={formValues.property || emptySelectValue}>
                    <SelectTrigger className={formSelectClassName}><span>{selectedPropertyLabel}</span></SelectTrigger>
                    <SelectContent><SelectItem value={emptySelectValue}>Select property</SelectItem>{propertyTitles.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}</SelectContent>
                  </Select><FieldError error={errors.property} />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Financials & Profile</h3></div>
              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2"><span className={fieldLabelClassName}>Budget / Value</span><Input className={inputClassName} onChange={(e) => updateField("budget", e.target.value)} placeholder="$ 290,000" value={formValues.budget} /><FieldError error={errors.budget} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Credit Score</span><Input className={inputClassName} onChange={(e) => updateField("creditScore", e.target.value)} placeholder="Individual Score" value={formValues.creditScore} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Combined Credit</span><Input className={inputClassName} onChange={(e) => updateField("combinedCreditScore", e.target.value)} placeholder="Joint Score" value={formValues.combinedCreditScore} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Monthly Earning</span><Input className={inputClassName} onChange={(e) => updateField("monthlyEarning", e.target.value)} placeholder="$ 6,500" value={formValues.monthlyEarning} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Combined Monthly Earning</span><Input className={inputClassName} onChange={(e) => updateField("combinedMonthlyEarning", e.target.value)} placeholder="$ 11,000" value={formValues.combinedMonthlyEarning} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Source</span><Select modal={false} onValueChange={(value) => updateField("source", !value || value === emptySelectValue ? "" : value)} value={formValues.source || emptySelectValue}><SelectTrigger className={formSelectClassName}><span>{selectedSourceLabel}</span></SelectTrigger><SelectContent><SelectItem value={emptySelectValue}>Select source</SelectItem>{sourceOptions.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent></Select><FieldError error={errors.source} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Interest Type</span><Select modal={false} onValueChange={(value) => updateField("interest", !value || value === emptySelectValue ? "" : value)} value={formValues.interest || emptySelectValue}><SelectTrigger className={formSelectClassName}><span>{selectedInterestLabel}</span></SelectTrigger><SelectContent><SelectItem value={emptySelectValue}>Select interest</SelectItem>{interestOptions.map((interest) => <SelectItem key={interest} value={interest}>{interest}</SelectItem>)}</SelectContent></Select><FieldError error={errors.interest} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Timeline</span><Select modal={false} onValueChange={(value) => updateField("timeline", !value || value === emptySelectValue ? "" : value)} value={formValues.timeline || emptySelectValue}><SelectTrigger className={formSelectClassName}><span>{selectedTimelineLabel}</span></SelectTrigger><SelectContent><SelectItem value={emptySelectValue}>Select timeline</SelectItem>{timelineOptions.map((timeline) => <SelectItem key={timeline} value={timeline}>{timeline}</SelectItem>)}</SelectContent></Select><FieldError error={errors.timeline} /></label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Lead Logic & Workflow</h3></div>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2"><span className={fieldLabelClassName}>Assigned Agent</span><Select modal={false} onValueChange={(value) => { if (!value || value === emptySelectValue) { updateField("agentId", null); updateField("agent", ""); return } const selectedAgent = agentOptions.find((agent) => `${agent.id}` === value); updateField("agentId", selectedAgent ? selectedAgent.id : null); updateField("agent", selectedAgent?.fullName ?? value) }} value={formValues.agentId ? `${formValues.agentId}` : formValues.agent || emptySelectValue}><SelectTrigger className={formSelectClassName}><span>{selectedAgentLabel}</span></SelectTrigger><SelectContent><SelectItem value={emptySelectValue}>Auto assign</SelectItem>{agentSelectOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><FieldError error={errors.agent} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Lead Priority</span><Select modal={false} onValueChange={(value) => updateField("priority", (value ?? formValues.priority) as LeadFormValues["priority"])} value={formValues.priority}><SelectTrigger className={formSelectClassName}><span>{selectedPriorityLabel}</span></SelectTrigger><SelectContent>{leadFormSelectOptions.priorities.map((priority) => <SelectItem key={priority} value={priority}>{formatLeadPriority(priority)}</SelectItem>)}</SelectContent></Select></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Next Action Date</span><Input className={inputClassName} onChange={(e) => updateField("nextActionDate", e.target.value)} type="datetime-local" value={formValues.nextActionDate} /><FieldError error={errors.nextActionDate} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Action Type</span><Select modal={false} onValueChange={(value) => updateField("nextActionType", !value || value === emptySelectValue ? "" : value)} value={formValues.nextActionType || emptySelectValue}><SelectTrigger className={formSelectClassName}><span>{formValues.nextActionType || "Select action"}</span></SelectTrigger><SelectContent><SelectItem value={emptySelectValue}>Select action</SelectItem>{leadFormSelectOptions.nextActionTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FieldError error={errors.nextActionType} /></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Follow-up Status</span><Select modal={false} onValueChange={(value) => updateField("followUpStatus", (value ?? "Open") as LeadFormValues["followUpStatus"])} value={formValues.followUpStatus}><SelectTrigger className={formSelectClassName}><span>{formValues.followUpStatus.replace(/([A-Z])/g, " $1").trim()}</span></SelectTrigger><SelectContent>{leadFormSelectOptions.followUpStatuses.map((status) => <SelectItem key={status} value={status}>{status.replace(/([A-Z])/g, " $1").trim()}</SelectItem>)}</SelectContent></Select></label>
                <label className="space-y-2"><span className={fieldLabelClassName}>Lifecycle Stage</span><Select modal={false} onValueChange={(value) => updateField("stage", (value ?? formValues.stage) as LeadFormValues["stage"])} value={formValues.stage}><SelectTrigger className={formSelectClassName}><span>{selectedStageLabel}</span></SelectTrigger><SelectContent>{leadFormSelectOptions.stages.map((stage) => <SelectItem key={stage} value={stage}>{leadStageMeta[stage].label}</SelectItem>)}</SelectContent></Select></label>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Notes & Finalize</h3></div>
              <label className="flex items-center gap-3 rounded-lg border border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)]/50 p-3 text-sm font-medium text-[var(--ether-on-surface)]"><input checked={formValues.inBoard} className="size-4 rounded border-[var(--ether-outline-variant)] text-[var(--ether-primary)] focus:ring-[var(--ether-primary)]" onChange={(e) => updateField("inBoard", e.target.checked)} type="checkbox" />Place on active board immediately</label>
              <div className="mt-4 grid gap-4"><label className="space-y-2"><span className={fieldLabelClassName}>Summary</span><Textarea className="min-h-24 rounded-lg border-[var(--ether-outline-variant)]" onChange={(e) => updateField("summary", e.target.value)} value={formValues.summary} /><FieldError error={errors.summary} /></label><label className="space-y-2"><span className={fieldLabelClassName}>Internal Notes</span><Textarea className="min-h-24 rounded-lg border-[var(--ether-outline-variant)]" onChange={(e) => updateField("notes", e.target.value)} value={formValues.notes} /></label></div>
            </section>

            {submitError ? <p className="rounded-lg bg-[var(--ether-error-container)] p-3 text-sm font-semibold text-[var(--ether-error)]">{submitError}</p> : null}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:px-8">
          <button className="rounded-lg px-5 py-2.5 text-sm font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-high)]" onClick={() => onOpenChange(false)} type="button">Cancel</button>
          <button className="rounded-lg bg-[var(--ether-primary)] px-7 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,67,213,0.24)] hover:bg-[var(--ether-primary-container)] disabled:opacity-60" disabled={isSubmitting} onClick={() => void handleSave()} type="button">{isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : (mode === "create" ? "Create Lead" : "Save Changes")}</button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
