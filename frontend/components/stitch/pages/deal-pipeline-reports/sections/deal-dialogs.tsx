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
import type { AgentUserOption, DealItem, LeadItem } from "@/hooks/use-real-estate-api"
import { formatDealStage } from "@/lib/admin-portal"

import {
  dealButtonClass,
  dealStageOrder,
  dealTypeOptions,
  defaultDealFormValues,
  mapDealToFormValues,
  type DealFormErrors,
  type DealFormValues,
  type OutreachType,
  validateDealForm,
} from "./deal-shared"

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <p className="text-xs font-semibold text-rose-600">{error}</p>
}

const formSelectClassName =
  "h-10 w-full rounded-none border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"

const emptySelectValue = "__empty__"

export function DealCommunicationDialog({
  deal,
  isSubmitting,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {
  deal: DealItem | null
  isSubmitting: boolean
  mode: OutreachType | null
  onOpenChange: (open: boolean) => void
  onSubmit: (message: string) => Promise<string | null>
  open: boolean
}) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!deal || !mode) {
    return null
  }

  const title = mode === "email" ? "Send Email" : "Send Message"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">{`Send a ${mode} update for ${deal.title}.`}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{deal.client}</div>
          <Textarea className="min-h-40 rounded-none border-slate-200 dark:border-white/10" onChange={(event) => { setMessage(event.target.value); setError(null) }} placeholder={`Write the ${mode} message here...`} value={message} />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
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

export function DealCancelDialog({
  deal,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
}: {
  deal: DealItem | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: string) => Promise<string | null>
  open: boolean
}) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!deal) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">{"Cancel Deal"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">{"Canceling here removes the deal from the active pipeline board and updates the status in place."}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{deal.title}</div>
          <Textarea className="min-h-32 rounded-none border-slate-200 dark:border-white/10" onChange={(event) => { setReason(event.target.value); setError(null) }} placeholder="Add a cancel reason" value={reason} />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
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

export function DealFormDialog({
  agentOptions,
  deal,
  isSubmitting,
  leadOptions,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {
  agentOptions: AgentUserOption[]
  deal: DealItem | null
  isSubmitting: boolean
  leadOptions: LeadItem[]
  mode: "create" | "edit"
  onOpenChange: (open: boolean) => void
  onSubmit: (values: DealFormValues) => Promise<string | null>
  open: boolean
}) {
  const initialValues = deal ? mapDealToFormValues(deal) : defaultDealFormValues()
  const [formValues, setFormValues] = useState(initialValues)
  const [errors, setErrors] = useState<DealFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const leadSelectOptions = useMemo(() => {
    const options = new Map<string, string>()
    leadOptions.forEach((lead) => options.set(`${lead.id}`, lead.name))
    if (formValues.sourceLeadId && deal?.sourceLeadName) {
      options.set(formValues.sourceLeadId, deal.sourceLeadName)
    }
    return Array.from(options.entries())
  }, [deal?.sourceLeadName, formValues.sourceLeadId, leadOptions])

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

  function updateField<K extends keyof DealFormValues>(key: K, value: DealFormValues[K]) {
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
            {mode === "create" ? "Create Deal" : "Edit Deal"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === "create"
              ? "Create new deals from the pipeline modal instead of leaving the board."
              : "Update the deal details directly from the pipeline list."}
          </DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("title", event.target.value)} placeholder="Deal title" value={formValues.title} />
            <FieldError error={errors.title} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("client", event.target.value)} placeholder="Client" value={formValues.client} />
            <FieldError error={errors.client} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("value", event.target.value)} placeholder="Value" value={formValues.value} />
            <FieldError error={errors.value} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("commissionRate", event.target.value)} placeholder="Commission rate" value={formValues.commissionRate} />
            <FieldError error={errors.commissionRate} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Assigned Agent"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("agent", !value || value === emptySelectValue ? "" : value)}
              value={formValues.agent || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue placeholder="Select agent" />
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
          <div className="flex flex-col gap-2">
            <Input className="rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("deadline", event.target.value)} placeholder="Deadline" value={formValues.deadline} />
            <FieldError error={errors.deadline} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Deal Type"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("type", (value ?? formValues.type) as DealFormValues["type"])}
              value={formValues.type}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue placeholder="Select deal type" />
              </SelectTrigger>
              <SelectContent>
                {dealTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {"Stage"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("stage", (value ?? formValues.stage) as DealFormValues["stage"])}
              value={formValues.stage}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {dealStageOrder.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {formatDealStage(stage)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:col-span-2">
            {"Linked Lead"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("sourceLeadId", !value || value === emptySelectValue ? "" : value)}
              value={formValues.sourceLeadId || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue placeholder="No linked lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>{"No linked lead"}</SelectItem>
                {leadSelectOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Textarea className="min-h-32 rounded-none border-slate-200 dark:border-white/10" onChange={(event) => updateField("note", event.target.value)} placeholder="Deal note" value={formValues.note} />
            <FieldError error={errors.note} />
          </div>
          {submitError ? (
            <p className="text-sm font-semibold text-rose-600 md:col-span-2">{submitError}</p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              const nextErrors = validateDealForm(formValues)

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
                ? "Create Deal"
                : "Save Deal"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
