"use client"

import type {
  ContactRequestStatus,
  DealStage,
  DealType,
  LeadPriority,
  LeadStage,
  MailInboxKind,
  MailInboxStatus,
  PaginatedResult,
  PropertyItem,
} from "@/@types/real-estate-api"
import {
  formatCompactCurrencyAmount,
  formatCurrencyAmount,
  parseCurrencyValue,
} from "@/lib/currency"

export const leadStageOrder: LeadStage[] = [
  "New",
  "Contacted",
  "Pending",
  "Qualified",
  "Visit",
  "Negotiation",
  "Deal",
  "Canceled",
]

export const dealStageOrder: DealStage[] = [
  "OfferMade",
  "OfferAccepted",
  "UnderContract",
  "Inspection",
  "Financing",
  "Closing",
  "Completed",
  "Canceled",
]

export const leadStageMeta: Record<
  LeadStage,
  {
    label: string
    dotClassName: string
  }
> = {
  New: { label: "New Lead", dotClassName: "bg-sky-500" },
  Contacted: { label: "Contacted", dotClassName: "bg-orange-500" },
  Pending: { label: "Pending", dotClassName: "bg-slate-500" },
  Qualified: { label: "Qualified", dotClassName: "bg-violet-500" },
  Visit: { label: "Property Visit", dotClassName: "bg-amber-500" },
  Negotiation: { label: "Negotiation", dotClassName: "bg-emerald-500" },
  Deal: { label: "Deal", dotClassName: "bg-primary" },
  Canceled: { label: "Canceled", dotClassName: "bg-rose-500" },
}

export const dealStageMeta: Record<
  DealStage,
  {
    label: string
    accentClassName: string
    badgeClassName: string
  }
> = {
  OfferMade: {
    label: "Offer Made",
    accentClassName: "bg-sky-500",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
  },
  OfferAccepted: {
    label: "Offer Accepted",
    accentClassName: "bg-indigo-500",
    badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  UnderContract: {
    label: "Under Contract",
    accentClassName: "bg-violet-500",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
  Inspection: {
    label: "Inspection",
    accentClassName: "bg-amber-500",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  Financing: {
    label: "Financing",
    accentClassName: "bg-orange-500",
    badgeClassName: "border-orange-200 bg-orange-50 text-orange-700",
  },
  Closing: {
    label: "Closing",
    accentClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  Completed: {
    label: "Completed",
    accentClassName: "bg-slate-500",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  },
  Canceled: {
    label: "Canceled",
    accentClassName: "bg-rose-500",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
}

export const leadPriorityOptions: LeadPriority[] = ["HighPriority", "Warm", "FollowUp"]
export const dealTypeOptions: DealType[] = ["Residential", "Commercial", "Industrial"]
export const contactRequestStatusOptions: ContactRequestStatus[] = ["New", "Reviewing", "Converted"]
export const mailInboxStatusOptions: MailInboxStatus[] = ["New", "Replied", "Converted"]
export const mailInboxKindOptions: MailInboxKind[] = ["Direct", "Newsletter"]

export function formatLeadPriority(priority: LeadPriority) {
  switch (priority) {
    case "HighPriority":
      return "High Priority"
    case "FollowUp":
      return "Follow Up"
    default:
      return "Warm"
  }
}

export function formatLeadStage(stage: LeadStage) {
  return leadStageMeta[stage]?.label ?? stage
}

export function formatDealStage(stage: DealStage) {
  return dealStageMeta[stage]?.label ?? stage
}

export function formatDateTimeLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export function formatRelativeTimeLabel(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diff = date.getTime() - Date.now()
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const minutes = Math.round(diff / 60_000)

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute")
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour")
  }

  const days = Math.round(hours / 24)
  return formatter.format(days, "day")
}

export function formatCurrency(value: number) {
  return formatCurrencyAmount(value)
}

export function formatCompactCurrency(value: number) {
  return formatCompactCurrencyAmount(value)
}

export function formatCommissionLabel(value: number, commissionRate: number) {
  const commissionValue = value * (commissionRate / 100)
  return `${commissionRate}% (${formatCompactCurrency(commissionValue)})`
}

export function parseNumberFromValue(value: string) {
  return parseCurrencyValue(value)
}

export function inferPropertyType(property: Pick<PropertyItem, "description" | "title">) {
  const text = `${property.title ?? ""} ${property.description ?? ""}`.toLowerCase()
  return text.includes("office") || text.includes("retail") || text.includes("commercial")
    ? "Commercial"
    : "Residential"
}

export function inferListingType(property: Pick<PropertyItem, "description" | "title">) {
  const text = `${property.title ?? ""} ${property.description ?? ""}`.toLowerCase()
  return text.includes("rent") || text.includes("/mo") ? "For Rent" : "For Sale"
}

export function propertySummary(property: PropertyItem) {
  return property.exactLocation ?? property.location ?? "Location pending"
}

export function propertyHeroImage(property: PropertyItem) {
  const mediaUrl = property.thumbnailUrl ?? property.imageUrls?.[0]

  if (mediaUrl) {
    return mediaUrl
  }

  return `https://placehold.co/320x220/e2e8f0/334155?text=${encodeURIComponent(property.title ?? "Property")}`
}

export function getPageItems<T>(result?: PaginatedResult<T>) {
  return result?.items ?? []
}

export function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)
}
