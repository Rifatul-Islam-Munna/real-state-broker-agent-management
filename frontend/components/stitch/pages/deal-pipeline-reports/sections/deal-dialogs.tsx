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
  "h-11 w-full rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm font-medium text-[var(--ether-on-surface)] shadow-none"

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
      <DialogContent className="rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
        <div className="border-b border-[var(--ether-outline-variant)] px-6 py-5 sm:px-8">
          <DialogTitle className="text-xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{`Send a ${mode} update for ${deal.title}.`}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-4 py-3 text-sm text-[var(--ether-on-surface-variant)]">{deal.client}</div>
          <Textarea className="min-h-40 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => { setMessage(event.target.value); setError(null) }} placeholder={`Write the ${mode} message here...`} value={message} />
          {error ? <p className="text-sm font-bold text-[var(--ether-on-surface)] text-rose-600">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:px-8">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="rounded-lg bg-[var(--ether-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,67,213,0.24)] hover:bg-[var(--ether-primary-container)] disabled:cursor-not-allowed disabled:opacity-70"
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
        </footer>
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
      <DialogContent className="rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
        <div className="border-b border-[var(--ether-outline-variant)] px-6 py-5 sm:px-8">
          <DialogTitle className="text-xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">{"Cancel Deal"}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{"Canceling here removes the deal from the active pipeline board and updates the status in place."}</DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-4 py-3 text-sm text-[var(--ether-on-surface-variant)]">{deal.title}</div>
          <Textarea className="min-h-32 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => { setReason(event.target.value); setError(null) }} placeholder="Add a cancel reason" value={reason} />
          {error ? <p className="text-sm font-bold text-[var(--ether-on-surface)] text-rose-600">{error}</p> : null}
        </div>
        <footer className="flex justify-end gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:px-8">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
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
        </footer>
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
        options.set(`${agent.id}`, agent.fullName)
      }
    })
    if (formValues.agentId && formValues.agent) {
      options.set(formValues.agentId, formValues.agent)
    } else if (formValues.agent) {
      options.set(formValues.agent, formValues.agent)
    }
    return Array.from(options.entries())
  }, [agentOptions, formValues.agent, formValues.agentId])
  const selectedAgentLabel = formValues.agentId
    ? agentOptions.find((agent) => `${agent.id}` === formValues.agentId)?.fullName ?? formValues.agent
    : formValues.agent || "Select agent"
  const selectedTypeLabel = formValues.type
  const selectedStageLabel = formatDealStage(formValues.stage)
  const selectedLeadLabel =
    leadSelectOptions.find(([id]) => id === formValues.sourceLeadId)?.[1] ?? "No linked lead"

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
      <DialogContent className="!flex h-[90dvh] max-h-[90dvh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
        <div className="border-b border-[var(--ether-outline-variant)] px-6 py-5 sm:px-8">
          <DialogTitle className="text-xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">
            {mode === "create" ? "Create Deal" : "Edit Deal"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
            {mode === "create"
              ? "Create new deals from the pipeline modal instead of leaving the board."
              : "Update the deal details directly from the pipeline list."}
          </DialogDescription>
        </div>
        <div className="custom-scrollbar grid flex-1 gap-5 overflow-y-auto bg-[color-mix(in_srgb,var(--ether-surface)_55%,white)] px-6 py-6 md:grid-cols-2 sm:px-8">
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("title", event.target.value)} placeholder="Deal title" value={formValues.title} />
            <FieldError error={errors.title} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("client", event.target.value)} placeholder="Client" value={formValues.client} />
            <FieldError error={errors.client} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("value", event.target.value)} placeholder="Value" value={formValues.value} />
            <FieldError error={errors.value} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("commissionRate", event.target.value)} placeholder="Commission rate" value={formValues.commissionRate} />
            <FieldError error={errors.commissionRate} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
            {"Assigned Agent"}
            <Select
              modal={false}
              onValueChange={(value) => {
                if (!value || value === emptySelectValue) {
                  updateField("agentId", "")
                  updateField("agent", "")
                  return
                }

                const selectedAgent = agentOptions.find((agent) => `${agent.id}` === value)
                updateField("agentId", selectedAgent ? `${selectedAgent.id}` : "")
                updateField("agent", selectedAgent?.fullName ?? value)
              }}
              value={formValues.agentId || formValues.agent || emptySelectValue}
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
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("deadline", event.target.value)} placeholder="Deadline" value={formValues.deadline} />
            <FieldError error={errors.deadline} />
          </div>
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("expectedClosingDate", event.target.value)} placeholder="Expected closing date" type="date" value={formValues.expectedClosingDate} />
            <FieldError error={errors.expectedClosingDate} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
            {"Commission Status"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("commissionStatus", (value ?? "Estimated") as DealFormValues["commissionStatus"])}
              value={formValues.commissionStatus}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>{formValues.commissionStatus}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {["NotReady", "Estimated", "ReadyToInvoice", "Invoiced", "Paid"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/([A-Z])/g, " $1").trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-col gap-2">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("commissionAmount", event.target.value)} placeholder="Commission amount" value={formValues.commissionAmount} />
            <FieldError error={errors.commissionAmount} />
          </div>
          <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
            {"Deal Type"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("type", (value ?? formValues.type) as DealFormValues["type"])}
              value={formValues.type}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedTypeLabel}
                </SelectValue>
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
          <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
            {"Stage"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("stage", (value ?? formValues.stage) as DealFormValues["stage"])}
              value={formValues.stage}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedStageLabel}
                </SelectValue>
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
          <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)] md:col-span-2">
            {"Linked Lead"}
            <Select
              modal={false}
              onValueChange={(value) => updateField("sourceLeadId", !value || value === emptySelectValue ? "" : value)}
              value={formValues.sourceLeadId || emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedLeadLabel}
                </SelectValue>
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
            <Textarea className="min-h-32 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateField("note", event.target.value)} placeholder="Deal note" value={formValues.note} />
            <FieldError error={errors.note} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Textarea className="min-h-24 h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("checklistItems", event.target.value)} placeholder="[ ] Document request sent&#10;[x] Viewing completed" value={formValues.checklistItems} />
            <FieldError error={errors.checklistItems} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Textarea className="min-h-20 h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("commissionPayoutNote", event.target.value)} placeholder="Commission payout note" value={formValues.commissionPayoutNote} />
            <FieldError error={errors.commissionPayoutNote} />
          </div>
          {submitError ? (
            <p className="rounded-lg bg-[var(--ether-error-container)] p-3 text-sm font-bold text-[var(--ether-on-surface)] text-[var(--ether-error)] md:col-span-2">{submitError}</p>
          ) : null}
        </div>
        <footer className="flex justify-end gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:px-8">
          <button className={dealButtonClass} onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="rounded-lg bg-[var(--ether-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,67,213,0.24)] hover:bg-[var(--ether-primary-container)] disabled:cursor-not-allowed disabled:opacity-70"
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
        </footer>
      </DialogContent>
    </Dialog>
  )
}
