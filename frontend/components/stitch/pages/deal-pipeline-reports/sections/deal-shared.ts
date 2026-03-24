import {
  dealStageMeta,
  dealStageOrder,
  dealTypeOptions,
  formatCurrency,
} from "@/lib/admin-portal"
import type { DealItem, DealStage, DealType } from "@/hooks/use-real-estate-api"

export type DealFormValues = {
  title: string
  client: string
  value: string
  commissionRate: string
  stage: DealStage
  type: DealType
  deadline: string
  note: string
  agent: string
  sourceLeadId: string
}

export type DealFormErrors = Partial<Record<keyof DealFormValues | "form", string>>
export type OutreachType = "email" | "message"

export const boardDealStages = dealStageOrder.filter((stage) => stage !== "Canceled")

export const dealButtonClass =
  "border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"

export function validateDealForm(values: DealFormValues) {
  const errors: DealFormErrors = {}

  if (!values.title.trim()) errors.title = "Deal title is required."
  if (!values.client.trim()) errors.client = "Client is required."
  if (!values.value.trim()) errors.value = "Value is required."
  if (Number.isNaN(Number.parseFloat(values.value.replace(/[^0-9.]/g, "")))) {
    errors.value = "Enter a valid deal value."
  }
  if (!values.commissionRate.trim()) errors.commissionRate = "Commission rate is required."
  if (!values.deadline.trim()) errors.deadline = "Deadline is required."
  if (!values.agent.trim()) errors.agent = "Assigned agent is required."
  if (!values.note.trim() || values.note.trim().length < 8) {
    errors.note = "Deal note must be at least 8 characters."
  }

  return errors
}

export function defaultDealFormValues(): DealFormValues {
  return {
    title: "",
    client: "",
    value: "",
    commissionRate: "3",
    stage: "OfferMade",
    type: "Residential",
    deadline: "",
    note: "",
    agent: "",
    sourceLeadId: "",
  }
}

export function mapDealToFormValues(deal: DealItem): DealFormValues {
  return {
    title: deal.title ?? "",
    client: deal.client ?? "",
    value: `${deal.value ?? 0}`,
    commissionRate: `${deal.commissionRate ?? 0}`,
    stage: deal.stage ?? "OfferMade",
    type: deal.type ?? "Residential",
    deadline: deal.deadline ?? "",
    note: deal.note ?? "",
    agent: deal.agent ?? "",
    sourceLeadId: deal.sourceLeadId ? `${deal.sourceLeadId}` : "",
  }
}

export function formatDealValue(value: number) {
  return formatCurrency(value)
}

export { dealStageMeta, dealStageOrder, dealTypeOptions }
