import {
  formatLeadPriority,
  leadPriorityOptions,
  leadStageMeta,
  leadStageOrder,
} from "@/lib/admin-portal"
import type { LeadItem, LeadPriority, LeadStage } from "@/hooks/use-real-estate-api"

export type LeadFormValues = {
  name: string
  email: string
  phone: string
  summary: string
  property: string
  budget: string
  stage: LeadStage
  priority: LeadPriority
  agent: string
  source: string
  interest: string
  timeline: string
  inBoard: boolean
  notes: string
}

export type LeadFormErrors = Partial<Record<keyof LeadFormValues | "form", string>>

export type OutreachType = "email" | "message"

export const boardLeadStages = leadStageOrder.filter((stage) => stage !== "Canceled")
export { leadStageOrder }

export const leadButtonClass =
  "border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"

export const leadFormSelectOptions = {
  interests: ["Buy", "Rent", "Sell", "Commercial", "Investment", "Consultation"] as const,
  priorities: leadPriorityOptions,
  sources: ["Website", "Contact Us", "Phone Call", "Walk In", "Referral", "Campaign", "Mail Signup"] as const,
  stages: leadStageOrder,
  timelines: ["Immediate", "This Week", "This Month", "1-3 Months", "3-6 Months", "6+ Months"] as const,
}

export function validateLeadForm(values: LeadFormValues) {
  const errors: LeadFormErrors = {}

  if (!values.name.trim()) errors.name = "Lead name is required."
  if (!values.email.trim()) errors.email = "Email is required."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address."
  }
  if (!values.phone.trim()) errors.phone = "Phone is required."
  if (!values.summary.trim() || values.summary.trim().length < 12) {
    errors.summary = "Summary must be at least 12 characters."
  }
  if (!values.property.trim()) errors.property = "Select a property."
  if (!values.budget.trim()) errors.budget = "Budget is required."
  if (!values.agent.trim()) errors.agent = "Assigned agent is required."
  if (!values.source.trim()) errors.source = "Source is required."
  if (!values.interest.trim()) errors.interest = "Interest is required."
  if (!values.timeline.trim()) errors.timeline = "Timeline is required."

  return errors
}

export function defaultLeadFormValues(): LeadFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    summary: "",
    property: "",
    budget: "",
    stage: "New",
    priority: "Warm",
    agent: "",
    source: "",
    interest: "",
    timeline: "",
    inBoard: false,
    notes: "",
  }
}

export function mapLeadToFormValues(lead: LeadItem): LeadFormValues {
  return {
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    summary: lead.summary ?? "",
    property: lead.property ?? "",
    budget: lead.budget ?? "",
    stage: lead.stage ?? "New",
    priority: lead.priority ?? "Warm",
    agent: lead.agent ?? "",
    source: lead.source ?? "",
    interest: lead.interest ?? "",
    timeline: lead.timeline ?? "",
    inBoard: lead.inBoard ?? false,
    notes: (lead.notes ?? []).join("\n"),
  }
}

export function formatLeadPriorityBadge(priority: LeadPriority) {
  return formatLeadPriority(priority)
}

export function fieldErrorText(error?: string) {
  return error ?? null
}

export { leadStageMeta }
