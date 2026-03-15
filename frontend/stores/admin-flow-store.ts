"use client"

import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"

export type ActivityItem = {
  label: string
  time: string
  description: string
}

export type LeadStage =
  | "new"
  | "contacted"
  | "pending"
  | "qualified"
  | "visit"
  | "negotiation"
  | "deal"
  | "canceled"
export type LeadPriority = "High Priority" | "Warm" | "Follow Up"
export type DealStage =
  | "offer-made"
  | "offer-accepted"
  | "under-contract"
  | "inspection"
  | "financing"
  | "closing"
  | "completed"
  | "canceled"
export type DealType = "Residential" | "Commercial" | "Industrial"
export type OutreachType = "email" | "message"
export type ContactRequestStatus = "new" | "reviewing" | "converted"
export type MailInboxStatus = "new" | "replied" | "converted"
export type MailInboxKind = "newsletter" | "direct"

export type LeadFlowItem = {
  id: string
  name: string
  summary: string
  property: string
  budget: string
  stage: LeadStage
  priority: LeadPriority
  agent: string
  lastActivity: string
  source: string
  email: string
  phone: string
  interest: string
  timeline: string
  linkedDealId?: string | null
  inBoard: boolean
  notes: string[]
  history: ActivityItem[]
}

export type DealFlowItem = {
  id: string
  title: string
  type: DealType
  client: string
  value: number
  valueLabel: string
  commissionLabel: string
  stage: DealStage
  deadline: string
  note: string
  agent: string
  sourceLeadId?: string | null
  history: ActivityItem[]
}

export type ContactRequestItem = {
  id: string
  createdAt: string
  email: string
  inquiryType: string
  leadId?: string | null
  message: string
  name: string
  phone: string
  status: ContactRequestStatus
}

export type MailInboxItem = {
  id: string
  createdAt: string
  email: string
  kind: MailInboxKind
  leadId?: string | null
  message: string
  name: string
  status: MailInboxStatus
  subject: string
}

export const leadStageOrder: LeadStage[] = [
  "new",
  "contacted",
  "pending",
  "qualified",
  "visit",
  "negotiation",
  "deal",
  "canceled",
]

export const dealStageOrder: DealStage[] = [
  "offer-made",
  "offer-accepted",
  "under-contract",
  "inspection",
  "financing",
  "closing",
  "completed",
  "canceled",
]

export const leadStageMeta: Record<
  LeadStage,
  {
    label: string
    dotClassName: string
  }
> = {
  new: { label: "New Lead", dotClassName: "bg-sky-500" },
  contacted: { label: "Contacted", dotClassName: "bg-orange-500" },
  pending: { label: "Pending", dotClassName: "bg-slate-500" },
  qualified: { label: "Qualified", dotClassName: "bg-violet-500" },
  visit: { label: "Property Visit", dotClassName: "bg-amber-500" },
  negotiation: { label: "Negotiation", dotClassName: "bg-emerald-500" },
  deal: { label: "Deal", dotClassName: "bg-primary" },
  canceled: { label: "Canceled", dotClassName: "bg-rose-500" },
}

export const dealStageMeta: Record<
  DealStage,
  {
    label: string
    accentClassName: string
    badgeClassName: string
  }
> = {
  "offer-made": {
    label: "Offer Made",
    accentClassName: "bg-sky-500",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
  },
  "offer-accepted": {
    label: "Offer Accepted",
    accentClassName: "bg-indigo-500",
    badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  "under-contract": {
    label: "Under Contract",
    accentClassName: "bg-violet-500",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
  inspection: {
    label: "Inspection",
    accentClassName: "bg-amber-500",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  financing: {
    label: "Financing",
    accentClassName: "bg-orange-500",
    badgeClassName: "border-orange-200 bg-orange-50 text-orange-700",
  },
  closing: {
    label: "Closing",
    accentClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  completed: {
    label: "Completed",
    accentClassName: "bg-slate-500",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  },
  canceled: {
    label: "Canceled",
    accentClassName: "bg-rose-500",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
}

function nowLabel() {
  return "Just now"
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function makeId(prefix: string, value: string) {
  return `${prefix}-${slugify(value) || "item"}-${Date.now().toString(36)}`
}

function nameFromEmail(email: string) {
  return (email.split("@")[0] ?? "new lead")
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const initialLeads: LeadFlowItem[] = [
  {
    id: "jessica-pearson",
    name: "Jessica Pearson",
    summary: "Commercial buyer with a high-intent site visit lined up.",
    property: "City Center Retail Space",
    budget: "$2.5M - $3.0M",
    stage: "visit",
    priority: "High Priority",
    agent: "Harvey Specter",
    lastActivity: "12m ago",
    source: "Referral",
    email: "jessica@example.com",
    phone: "(555) 321-8876",
    interest: "Luxury Retail Space",
    timeline: "Within 3 months",
    linkedDealId: null,
    inBoard: true,
    notes: ["Needs a corner unit with strong visibility."],
    history: [
      {
        label: "Property Visit Scheduled",
        time: "Today, 2:45 PM",
        description: "Site visit confirmed for tomorrow morning.",
      },
    ],
  },
  {
    id: "johnathan-wick",
    name: "Johnathan Wick",
    summary: "Luxury buyer interested in a penthouse with concierge service.",
    property: "Luxury Penthouse",
    budget: "$1.2M",
    stage: "new",
    priority: "High Priority",
    agent: "Dana Miles",
    lastActivity: "2h ago",
    source: "Website",
    email: "johnathan@example.com",
    phone: "(555) 811-2031",
    interest: "Luxury Residential",
    timeline: "This month",
    linkedDealId: null,
    inBoard: false,
    notes: ["Needs secure parking and private elevator access."],
    history: [
      {
        label: "Lead Captured",
        time: "2h ago",
        description: "Submitted request through the penthouse inquiry form.",
      },
    ],
  },
  {
    id: "sarah-miller",
    name: "Sarah Miller",
    summary: "Family buyer comparing suburban inventory with school district focus.",
    property: "3-BHK Suburban Home",
    budget: "$450k",
    stage: "new",
    priority: "Warm",
    agent: "Monica Lewis",
    lastActivity: "5h ago",
    source: "Open House",
    email: "sarah@example.com",
    phone: "(555) 444-1293",
    interest: "Suburban Family Home",
    timeline: "Next 6 weeks",
    linkedDealId: null,
    inBoard: false,
    notes: ["Needs backyard space and short commute to downtown."],
    history: [
      {
        label: "Open House Signup",
        time: "5h ago",
        description: "Checked in at Oak Ridge Manor open house.",
      },
    ],
  },
  {
    id: "michael-scott",
    name: "Michael Scott",
    summary: "Commercial office search waiting on email response after qualification call.",
    property: "Office Complex",
    budget: "$3.5M",
    stage: "contacted",
    priority: "Follow Up",
    agent: "Rachel Kim",
    lastActivity: "1d ago",
    source: "LinkedIn",
    email: "michael@example.com",
    phone: "(555) 908-2204",
    interest: "Office Acquisition",
    timeline: "This quarter",
    linkedDealId: null,
    inBoard: true,
    notes: ["Needs flexible floor plates and executive parking access."],
    history: [
      {
        label: "Qualification Call",
        time: "1d ago",
        description: "Reviewed occupancy targets and preferred neighborhoods.",
      },
    ],
  },
  {
    id: "daniel-brooks",
    name: "Daniel Brooks",
    summary: "Waiting on financing docs before the next shortlist goes out.",
    property: "Waterfront Townhome Search",
    budget: "$975k",
    stage: "pending",
    priority: "Warm",
    agent: "Dana Miles",
    lastActivity: "8h ago",
    source: "Referral",
    email: "daniel@example.com",
    phone: "(555) 420-1092",
    interest: "Residential Waterfront",
    timeline: "Next 30 days",
    linkedDealId: null,
    inBoard: true,
    notes: ["Waiting for refreshed pre-approval."],
    history: [
      {
        label: "Docs Requested",
        time: "8h ago",
        description: "Waiting for proof of funds and financing docs.",
      },
    ],
  },
  {
    id: "amelia-reed",
    name: "Amelia Reed",
    summary: "Investor lead with pre-approval complete and renovation upside focus.",
    property: "Historic Townhouse Portfolio",
    budget: "$1.8M",
    stage: "qualified",
    priority: "Warm",
    agent: "Harvey Specter",
    lastActivity: "4h ago",
    source: "Newsletter",
    email: "amelia@example.com",
    phone: "(555) 777-4102",
    interest: "Income-Producing Residential",
    timeline: "45 days",
    linkedDealId: null,
    inBoard: true,
    notes: ["Focused on cap rate and walkability metrics."],
    history: [
      {
        label: "Pre-Approval Confirmed",
        time: "4h ago",
        description: "Uploaded financing proof and requested rent-roll details.",
      },
    ],
  },
  {
    id: "owen-clark",
    name: "Owen Clark",
    summary: "Seller lead entering negotiation after pricing and marketing review.",
    property: "Waterfront Villa Listing",
    budget: "$4.2M asking",
    stage: "negotiation",
    priority: "High Priority",
    agent: "Dana Miles",
    lastActivity: "35m ago",
    source: "Referral",
    email: "owen@example.com",
    phone: "(555) 102-4401",
    interest: "Luxury Seller Representation",
    timeline: "Immediate",
    linkedDealId: null,
    inBoard: true,
    notes: ["Comparing commission structures with two agencies."],
    history: [
      {
        label: "Commission Review",
        time: "35m ago",
        description: "Negotiating final representation package.",
      },
    ],
  },
]

const initialDeals: DealFlowItem[] = [
  {
    id: "sunset-valley-estate",
    title: "Sunset Valley Estate",
    type: "Residential",
    client: "Robert Fox",
    value: 850000,
    valueLabel: "$850,000",
    commissionLabel: "3% ($25.5k)",
    stage: "offer-made",
    deadline: "Offer review tomorrow",
    note: "Counter terms expected from seller this evening.",
    agent: "Dana Miles",
    sourceLeadId: null,
    history: [
      {
        label: "Pipeline Entry",
        time: "Offer review tomorrow",
        description: "Counter terms expected from seller this evening.",
      },
    ],
  },
  {
    id: "oak-ridge-manor",
    title: "Oak Ridge Manor",
    type: "Residential",
    client: "Mark Sloan",
    value: 2100000,
    valueLabel: "$2,100,000",
    commissionLabel: "2.5% ($52.5k)",
    stage: "offer-accepted",
    deadline: "Deposit due Friday",
    note: "Inspection vendor already locked in.",
    agent: "Harvey Specter",
    sourceLeadId: null,
    history: [
      {
        label: "Offer Accepted",
        time: "Deposit due Friday",
        description: "Inspection vendor already locked in.",
      },
    ],
  },
  {
    id: "harbor-point-office",
    title: "Harbor Point Office",
    type: "Commercial",
    client: "Bluewave Partners",
    value: 980000,
    valueLabel: "$980,000",
    commissionLabel: "4% ($39.2k)",
    stage: "inspection",
    deadline: "Environmental report due Monday",
    note: "Site engineer flagged roof membrane follow-up.",
    agent: "Rachel Kim",
    sourceLeadId: null,
    history: [
      {
        label: "Inspection Running",
        time: "Environmental report due Monday",
        description: "Site engineer flagged roof membrane follow-up.",
      },
    ],
  },
  {
    id: "tech-park-unit-4",
    title: "Tech Park Unit 4",
    type: "Industrial",
    client: "Nexus Corp",
    value: 1500000,
    valueLabel: "$1,500,000",
    commissionLabel: "4% ($60k)",
    stage: "financing",
    deadline: "Appraisal in progress",
    note: "Bank requested updated equipment access survey.",
    agent: "Dana Miles",
    sourceLeadId: null,
    history: [
      {
        label: "Financing In Progress",
        time: "Appraisal in progress",
        description: "Bank requested updated equipment access survey.",
      },
    ],
  },
  {
    id: "park-lane-retail",
    title: "Park Lane Retail",
    type: "Commercial",
    client: "Jess Pearson",
    value: 1350000,
    valueLabel: "$1,350,000",
    commissionLabel: "3.5% ($47.2k)",
    stage: "closing",
    deadline: "Signing set for Thursday",
    note: "Final title packet and lender docs already approved.",
    agent: "Rachel Kim",
    sourceLeadId: null,
    history: [
      {
        label: "Closing Scheduled",
        time: "Signing set for Thursday",
        description: "Final title packet and lender docs already approved.",
      },
    ],
  },
]

const initialContactRequests: ContactRequestItem[] = [
  {
    id: "contact-maya-stone",
    createdAt: "Today, 10:20 AM",
    email: "maya.stone@example.com",
    inquiryType: "Buying",
    leadId: null,
    message: "Looking for a 4-bedroom home near downtown with parking and a quick school commute.",
    name: "Maya Stone",
    phone: "(555) 291-0041",
    status: "new",
  },
  {
    id: "contact-liam-carver",
    createdAt: "Today, 8:45 AM",
    email: "liam.carver@example.com",
    inquiryType: "Selling",
    leadId: null,
    message: "Need an agent to price and launch my waterfront condo next month.",
    name: "Liam Carver",
    phone: "(555) 611-2283",
    status: "reviewing",
  },
]

const initialMailInbox: MailInboxItem[] = [
  {
    id: "mail-jonathan-lee",
    createdAt: "Today, 9:30 AM",
    email: "jonathan.lee@example.com",
    kind: "direct",
    leadId: null,
    message: "Can you send available loft listings in the downtown core under $900k?",
    name: "Jonathan Lee",
    status: "new",
    subject: "Downtown loft options",
  },
  {
    id: "mail-amira-news",
    createdAt: "Today, 7:10 AM",
    email: "amira.news@example.com",
    kind: "newsletter",
    leadId: null,
    message: "Joined the EstateBlue newsletter from the homepage footer.",
    name: "Amira News",
    status: "new",
    subject: "Newsletter signup",
  },
]

function withLeadHistory(
  lead: LeadFlowItem,
  item: {
    label: string
    description: string
  },
) {
  const exists = lead.history.some(
    (historyItem) =>
      historyItem.label === item.label && historyItem.description === item.description,
  )

  if (exists) {
    return lead
  }

  return {
    ...lead,
    history: [
      {
        ...item,
        time: nowLabel(),
      },
      ...lead.history,
    ],
  }
}

function withDealHistory(
  deal: DealFlowItem,
  item: {
    label: string
    description: string
  },
) {
  const exists = deal.history.some(
    (historyItem) =>
      historyItem.label === item.label && historyItem.description === item.description,
  )

  if (exists) {
    return deal
  }

  return {
    ...deal,
    history: [
      {
        ...item,
        time: nowLabel(),
      },
      ...deal.history,
    ],
  }
}

function parseBudgetValue(budget: string) {
  const matches = Array.from(budget.matchAll(/(\d+(?:\.\d+)?)\s*([MK])?/gi))

  if (matches.length === 0) {
    return 0
  }

  const values = matches.map((match) => {
    const numericValue = Number.parseFloat(match[1] ?? "0")
    const unit = (match[2] ?? "").toUpperCase()

    if (unit === "M") {
      return numericValue * 1_000_000
    }

    if (unit === "K") {
      return numericValue * 1_000
    }

    return numericValue
  })

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function inferDealType(lead: Pick<LeadFlowItem, "interest" | "property">): DealType {
  const text = `${lead.interest} ${lead.property}`.toLowerCase()

  if (text.includes("office") || text.includes("retail") || text.includes("commercial")) {
    return "Commercial"
  }

  if (text.includes("industrial") || text.includes("warehouse") || text.includes("factory")) {
    return "Industrial"
  }

  return "Residential"
}

function buildCommissionLabel(value: number, type: DealType) {
  const rate = type === "Commercial" ? 0.04 : 0.03

  return `${Math.round(rate * 100)}% (${new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  }).format(value * rate)})`
}

function buildDealFromLead(lead: LeadFlowItem): DealFlowItem {
  const value = parseBudgetValue(lead.budget)
  const type = inferDealType(lead)

  return {
    id: `${lead.id}-deal`,
    title: lead.property,
    type,
    client: lead.name,
    value,
    valueLabel: lead.budget,
    commissionLabel: buildCommissionLabel(value || 500000, type),
    stage: "offer-made",
    deadline: "Created from lead",
    note: `Converted from ${lead.name} in Lead CRM.`,
    agent: lead.agent,
    sourceLeadId: lead.id,
    history: [
      {
        label: "Deal Created",
        time: nowLabel(),
        description: `Converted from ${lead.name} in Lead CRM.`,
      },
    ],
  }
}

function buildLeadFromContact(contact: ContactRequestItem): LeadFlowItem {
  return {
    id: makeId("lead", contact.name),
    name: contact.name,
    summary: contact.message,
    property: "Needs property match",
    budget: "Budget to be confirmed",
    stage: "new",
    priority: "Warm",
    agent: "Dana Miles",
    lastActivity: nowLabel(),
    source: "Contact Us",
    email: contact.email,
    phone: contact.phone,
    interest: contact.inquiryType,
    timeline: "Needs follow-up",
    linkedDealId: null,
    inBoard: false,
    notes: [contact.message],
    history: [
      {
        label: "Lead Created",
        time: nowLabel(),
        description: `Converted from Contact Us: ${contact.inquiryType}.`,
      },
    ],
  }
}

function buildLeadFromMail(mail: MailInboxItem): LeadFlowItem {
  return {
    id: makeId("lead", mail.name || mail.email),
    name: mail.name || nameFromEmail(mail.email),
    summary: mail.message,
    property: "Needs property match",
    budget: "Budget to be confirmed",
    stage: "new",
    priority: mail.kind === "direct" ? "Warm" : "Follow Up",
    agent: "Rachel Kim",
    lastActivity: nowLabel(),
    source: mail.kind === "newsletter" ? "Mail Signup" : "Mail Inbox",
    email: mail.email,
    phone: "Not provided",
    interest: mail.subject,
    timeline: "Needs follow-up",
    linkedDealId: null,
    inBoard: false,
    notes: [mail.message],
    history: [
      {
        label: "Lead Created",
        time: nowLabel(),
        description: `Converted from ${mail.kind === "newsletter" ? "newsletter signup" : "mail inbox"}.`,
      },
    ],
  }
}

function defaultOutreachMessage(name: string, type: OutreachType) {
  if (type === "email") {
    return `Hi ${name},\n\nFollowing up from EstateBlue on your request.\n\nBest regards,\nEstateBlue`
  }

  return `Hi ${name}, this is EstateBlue following up on your request.`
}

function syncLinkedDealFromLead(deal: DealFlowItem, lead: LeadFlowItem) {
  const nextType = inferDealType(lead)
  const nextValue = parseBudgetValue(lead.budget)

  return {
    ...deal,
    agent: lead.agent,
    client: lead.name,
    commissionLabel: buildCommissionLabel(nextValue || deal.value || 500000, nextType),
    title: lead.property,
    type: nextType,
    value: nextValue || deal.value,
    valueLabel: lead.budget,
  }
}

const noopStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => {},
  setItem: () => {},
}

type LeadEditValues = Partial<
  Pick<
    LeadFlowItem,
    "agent" | "budget" | "interest" | "name" | "priority" | "property" | "summary" | "timeline"
  >
>
type DealEditValues = Partial<
  Pick<DealFlowItem, "agent" | "client" | "deadline" | "note" | "title" | "type" | "valueLabel">
>
type ContactRequestInput = Pick<ContactRequestItem, "email" | "inquiryType" | "message" | "name" | "phone">
type MailInboxInput = Pick<MailInboxItem, "email" | "kind" | "message" | "name" | "subject">

type AdminFlowStore = {
  leads: LeadFlowItem[]
  deals: DealFlowItem[]
  contactRequests: ContactRequestItem[]
  mailInbox: MailInboxItem[]
  cancelLead: (leadId: string, reason?: string) => void
  cancelDeal: (dealId: string, reason?: string) => void
  convertLeadToDeal: (leadId: string) => void
  replaceLeadStage: (stage: LeadStage, newList: LeadFlowItem[]) => void
  replaceDealStage: (stage: DealStage, newList: DealFlowItem[]) => void
  setLeadBoard: (leadId: string, inBoard: boolean) => void
  logLeadCommunication: (leadId: string, type: OutreachType, body: string) => void
  logDealCommunication: (dealId: string, type: OutreachType, body: string) => void
  updateLead: (leadId: string, updates: LeadEditValues) => void
  updateDeal: (dealId: string, updates: DealEditValues) => void
  submitContactRequest: (input: ContactRequestInput) => void
  submitMailInboxItem: (input: MailInboxInput) => void
  convertContactRequestToLead: (contactId: string) => void
  convertMailInboxItemToLead: (mailId: string) => void
  resetFlow: () => void
}

export const useAdminFlowStore = create<AdminFlowStore>()(
  persist(
    (set) => ({
      leads: initialLeads,
      deals: initialDeals,
      contactRequests: initialContactRequests,
      mailInbox: initialMailInbox,
      cancelLead: (leadId, reason) =>
        set((state) => {
          const lead = state.leads.find((item) => item.id === leadId)

          if (!lead) {
            return state
          }

          const description = reason?.trim()
            ? `Lead canceled: ${reason.trim()}`
            : "Lead was canceled from Lead CRM."

          return {
            deals: lead.linkedDealId
              ? state.deals.map((deal) =>
                  deal.id === lead.linkedDealId
                    ? withDealHistory(
                        {
                          ...deal,
                          deadline: "Canceled from lead",
                          note: "This deal was canceled from Lead CRM.",
                          stage: "canceled",
                        },
                        {
                          label: "Deal Canceled",
                          description: "The linked lead was canceled from Lead CRM.",
                        },
                      )
                    : deal,
                )
              : state.deals,
            leads: state.leads.map((item) =>
              item.id === leadId
                ? withLeadHistory(
                    {
                      ...item,
                      inBoard: false,
                      lastActivity: nowLabel(),
                      stage: "canceled",
                    },
                    {
                      label: "Lead Canceled",
                      description,
                    },
                  )
                : item,
            ),
          }
        }),
      cancelDeal: (dealId, reason) =>
        set((state) => {
          const deal = state.deals.find((item) => item.id === dealId)

          if (!deal) {
            return state
          }

          const description = reason?.trim()
            ? `Deal canceled: ${reason.trim()}`
            : "This deal was canceled from the pipeline."

          return {
            deals: state.deals.map((item) =>
              item.id === dealId
                ? withDealHistory(
                    {
                      ...item,
                      deadline: "Canceled",
                      note: description,
                      stage: "canceled",
                    },
                    {
                      label: "Deal Canceled",
                      description,
                    },
                  )
                : item,
            ),
            leads: deal.sourceLeadId
              ? state.leads.map((leadItem) =>
                  leadItem.id === deal.sourceLeadId
                    ? withLeadHistory(
                        {
                          ...leadItem,
                          inBoard: false,
                          lastActivity: nowLabel(),
                          stage: "canceled",
                        },
                        {
                          label: "Lead Canceled",
                          description: "The linked deal was canceled in the deal pipeline.",
                        },
                      )
                    : leadItem,
                )
              : state.leads,
          }
        }),
      convertLeadToDeal: (leadId) =>
        set((state) => {
          const lead = state.leads.find((item) => item.id === leadId)

          if (!lead) {
            return state
          }

          const existingDeal =
            state.deals.find((item) => item.id === lead.linkedDealId) ??
            state.deals.find((item) => item.sourceLeadId === leadId) ??
            null

          const nextDeal = existingDeal ?? buildDealFromLead(lead)
          const nextDealId = existingDeal?.id ?? nextDeal.id

          return {
            deals: existingDeal
              ? state.deals.map((item) =>
                  item.id === existingDeal.id
                    ? withDealHistory(
                        {
                          ...item,
                          deadline: item.stage === "canceled" ? "Reopened from lead" : item.deadline,
                          note: item.stage === "canceled" ? "Deal reopened from Lead CRM." : item.note,
                          stage: item.stage === "canceled" ? "offer-made" : item.stage,
                        },
                        {
                          label: item.stage === "canceled" ? "Deal Reopened" : "Deal Linked",
                          description:
                            item.stage === "canceled"
                              ? "Deal was moved back into the active pipeline from Lead CRM."
                              : "Lead remains linked to the existing deal.",
                        },
                      )
                    : item,
                )
              : [nextDeal, ...state.deals],
            leads: state.leads.map((item) =>
              item.id === leadId
                ? withLeadHistory(
                    {
                      ...item,
                      inBoard: true,
                      lastActivity: nowLabel(),
                      linkedDealId: nextDealId,
                      stage: "deal",
                    },
                    {
                      label: "Deal Created",
                      description: "Lead was converted into a deal pipeline item.",
                    },
                  )
                : item,
            ),
          }
        }),
      replaceLeadStage: (stage, newList) =>
        set((state) => {
          const incomingIds = new Set(newList.map((lead) => lead.id))
          let nextDeals = [...state.deals]

          const nextLeads = state.leads
            .filter((lead) => lead.stage !== stage && !incomingIds.has(lead.id))
            .concat(
              newList.map((lead) => {
                const existingLead =
                  state.leads.find((existingItem) => existingItem.id === lead.id) ?? lead

                let nextLead: LeadFlowItem = {
                  ...existingLead,
                  ...lead,
                  inBoard: true,
                  stage,
                }

                if (stage === "deal") {
                  const existingDeal =
                    nextDeals.find((item) => item.id === existingLead.linkedDealId) ??
                    nextDeals.find((item) => item.sourceLeadId === existingLead.id) ??
                    null

                  const linkedDeal = existingDeal ?? buildDealFromLead(existingLead)

                  if (!existingDeal) {
                    nextDeals = [linkedDeal, ...nextDeals]
                  } else if (existingDeal.stage === "canceled") {
                    nextDeals = nextDeals.map((item) =>
                      item.id === existingDeal.id
                        ? withDealHistory(
                            {
                              ...item,
                              deadline: "Moved from Lead CRM",
                              note: "Deal was reopened from Lead CRM.",
                              stage: "offer-made",
                            },
                            {
                              label: "Deal Reopened",
                              description: "Deal returned to the active pipeline from Lead CRM.",
                            },
                          )
                        : item,
                    )
                  }

                  nextLead = withLeadHistory(
                    {
                      ...nextLead,
                      lastActivity: nowLabel(),
                      linkedDealId: linkedDeal.id,
                    },
                    {
                      label: "Deal Created",
                      description: "Lead was converted into a deal pipeline item.",
                    },
                  )
                } else if (existingLead.stage !== stage) {
                  nextLead = withLeadHistory(
                    {
                      ...nextLead,
                      lastActivity: nowLabel(),
                    },
                    {
                      label: `Moved to ${leadStageMeta[stage].label}`,
                      description: `Lead was moved into ${leadStageMeta[stage].label}.`,
                    },
                  )
                }

                return nextLead
              }),
            )

          return {
            deals: nextDeals,
            leads: nextLeads,
          }
        }),
      replaceDealStage: (stage, newList) =>
        set((state) => {
          const incomingIds = new Set(newList.map((deal) => deal.id))
          const nextDeals = state.deals
            .filter((deal) => deal.stage !== stage && !incomingIds.has(deal.id))
            .concat(
              newList.map((deal) => {
                const existingDeal =
                  state.deals.find((existingItem) => existingItem.id === deal.id) ?? deal

                return existingDeal.stage === stage
                  ? {
                      ...existingDeal,
                      ...deal,
                      stage,
                    }
                  : withDealHistory(
                      {
                        ...existingDeal,
                        ...deal,
                        stage,
                      },
                      {
                        label: `Moved to ${dealStageMeta[stage].label}`,
                        description: `Deal was moved into ${dealStageMeta[stage].label}.`,
                      },
                    )
              }),
            )

          return {
            deals: nextDeals,
            leads: state.leads.map((lead) => {
              const linkedDeal = nextDeals.find((deal) => deal.sourceLeadId === lead.id)

              if (!linkedDeal) {
                return lead
              }

              return withLeadHistory(
                {
                  ...lead,
                  inBoard: true,
                  lastActivity: nowLabel(),
                  linkedDealId: linkedDeal.id,
                  stage: "deal",
                },
                {
                  label: "Deal Updated",
                  description: `Linked deal moved to ${dealStageMeta[linkedDeal.stage].label}.`,
                },
              )
            }),
          }
        }),
      setLeadBoard: (leadId, inBoard) =>
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId
              ? withLeadHistory(
                  {
                    ...lead,
                    inBoard,
                    lastActivity: nowLabel(),
                  },
                  {
                    label: inBoard ? "Added To Board" : "Removed From Board",
                    description: inBoard
                      ? "Lead was added to the active board for follow-up."
                      : "Lead was removed from the active board but kept in the CRM list.",
                  },
                )
              : lead,
          ),
        })),
      logLeadCommunication: (leadId, type, body) =>
        set((state) => {
          const lead = state.leads.find((item) => item.id === leadId)

          if (!lead) {
            return state
          }

          const description = body.trim() || defaultOutreachMessage(lead.name, type)
          const label = type === "email" ? "Email Sent" : "Message Sent"

          return {
            leads: state.leads.map((item) =>
              item.id === leadId
                ? withLeadHistory(
                    {
                      ...item,
                      lastActivity: nowLabel(),
                      stage: item.stage === "new" ? "contacted" : item.stage,
                    },
                    {
                      label,
                      description,
                    },
                  )
                : item,
            ),
          }
        }),
      logDealCommunication: (dealId, type, body) =>
        set((state) => {
          const deal = state.deals.find((item) => item.id === dealId)

          if (!deal) {
            return state
          }

          const description = body.trim() || defaultOutreachMessage(deal.client, type)
          const label = type === "email" ? "Email Sent" : "Message Sent"

          return {
            deals: state.deals.map((item) =>
              item.id === dealId
                ? withDealHistory(
                    {
                      ...item,
                      note: description,
                    },
                    {
                      label,
                      description,
                    },
                  )
                : item,
            ),
            leads: deal.sourceLeadId
              ? state.leads.map((lead) =>
                  lead.id === deal.sourceLeadId
                    ? withLeadHistory(
                        {
                          ...lead,
                          lastActivity: nowLabel(),
                          stage: lead.stage === "new" ? "contacted" : lead.stage,
                        },
                        {
                          label,
                          description,
                        },
                      )
                    : lead,
                )
              : state.leads,
          }
        }),
      updateLead: (leadId, updates) =>
        set((state) => {
          const lead = state.leads.find((item) => item.id === leadId)

          if (!lead) {
            return state
          }

          const nextLead: LeadFlowItem = {
            ...lead,
            ...updates,
            lastActivity: nowLabel(),
          }

          return {
            deals: lead.linkedDealId
              ? state.deals.map((deal) =>
                  deal.id === lead.linkedDealId
                    ? withDealHistory(syncLinkedDealFromLead(deal, nextLead), {
                        label: "Linked Lead Updated",
                        description: "Deal details synced with the Lead CRM edit.",
                      })
                    : deal,
                )
              : state.deals,
            leads: state.leads.map((item) =>
              item.id === leadId
                ? withLeadHistory(nextLead, {
                    label: "Lead Updated",
                    description: "Lead details were edited from Lead CRM.",
                  })
                : item,
            ),
          }
        }),
      updateDeal: (dealId, updates) =>
        set((state) => {
          const deal = state.deals.find((item) => item.id === dealId)

          if (!deal) {
            return state
          }

          const nextType = updates.type ?? deal.type
          const nextValueLabel = updates.valueLabel ?? deal.valueLabel
          const nextValue = parseBudgetValue(nextValueLabel) || deal.value

          return {
            deals: state.deals.map((item) =>
              item.id === dealId
                ? withDealHistory(
                    {
                      ...item,
                      ...updates,
                      commissionLabel: buildCommissionLabel(nextValue, nextType),
                      type: nextType,
                      value: nextValue,
                      valueLabel: nextValueLabel,
                    },
                    {
                      label: "Deal Updated",
                      description: "Deal details were edited from the pipeline.",
                    },
                  )
                : item,
            ),
            leads: deal.sourceLeadId
              ? state.leads.map((lead) =>
                  lead.id === deal.sourceLeadId
                    ? withLeadHistory(
                        {
                          ...lead,
                          agent: updates.agent ?? lead.agent,
                          budget: nextValueLabel,
                          lastActivity: nowLabel(),
                          name: updates.client ?? lead.name,
                          property: updates.title ?? lead.property,
                        },
                        {
                          label: "Linked Deal Updated",
                          description: "Lead details synced with the deal pipeline edit.",
                        },
                      )
                    : lead,
                )
              : state.leads,
          }
        }),
      submitContactRequest: (input) =>
        set((state) => ({
          contactRequests: [
            {
              id: makeId("contact", input.name || input.email),
              createdAt: nowLabel(),
              email: input.email,
              inquiryType: input.inquiryType,
              leadId: null,
              message: input.message,
              name: input.name,
              phone: input.phone,
              status: "new",
            },
            ...state.contactRequests,
          ],
        })),
      submitMailInboxItem: (input) =>
        set((state) => ({
          mailInbox: [
            {
              id: makeId("mail", input.email),
              createdAt: nowLabel(),
              email: input.email,
              kind: input.kind,
              leadId: null,
              message: input.message,
              name: input.name || nameFromEmail(input.email),
              status: "new",
              subject: input.subject,
            },
            ...state.mailInbox,
          ],
        })),
      convertContactRequestToLead: (contactId) =>
        set((state) => {
          const contact = state.contactRequests.find((item) => item.id === contactId)

          if (!contact) {
            return state
          }

          const existingLead =
            state.leads.find((lead) => lead.id === contact.leadId) ??
            state.leads.find(
              (lead) =>
                lead.email.toLowerCase() === contact.email.toLowerCase() && lead.source === "Contact Us",
            ) ??
            null

          const nextLead = existingLead ?? buildLeadFromContact(contact)
          const nextLeadId = existingLead?.id ?? nextLead.id

          return {
            contactRequests: state.contactRequests.map((item) =>
              item.id === contactId
                ? {
                    ...item,
                    leadId: nextLeadId,
                    status: "converted",
                  }
                : item,
            ),
            leads: existingLead ? state.leads : [nextLead, ...state.leads],
          }
        }),
      convertMailInboxItemToLead: (mailId) =>
        set((state) => {
          const mail = state.mailInbox.find((item) => item.id === mailId)

          if (!mail) {
            return state
          }

          const existingLead =
            state.leads.find((lead) => lead.id === mail.leadId) ??
            state.leads.find(
              (lead) =>
                lead.email.toLowerCase() === mail.email.toLowerCase() &&
                (lead.source === "Mail Inbox" || lead.source === "Mail Signup"),
            ) ??
            null

          const nextLead = existingLead ?? buildLeadFromMail(mail)
          const nextLeadId = existingLead?.id ?? nextLead.id

          return {
            leads: existingLead ? state.leads : [nextLead, ...state.leads],
            mailInbox: state.mailInbox.map((item) =>
              item.id === mailId
                ? {
                    ...item,
                    leadId: nextLeadId,
                    status: "converted",
                  }
                : item,
            ),
          }
        }),
      resetFlow: () =>
        set({
          contactRequests: initialContactRequests,
          deals: initialDeals,
          leads: initialLeads,
          mailInbox: initialMailInbox,
        }),
    }),
    {
      merge: (persistedState, currentState) => {
        const nextState = persistedState as Partial<AdminFlowStore> | undefined

        return {
          ...currentState,
          ...nextState,
          contactRequests:
            nextState?.contactRequests && nextState.contactRequests.length > 0
              ? nextState.contactRequests
              : currentState.contactRequests,
          deals:
            nextState?.deals && nextState.deals.length > 0
              ? nextState.deals
              : currentState.deals,
          leads:
            nextState?.leads && nextState.leads.length > 0
              ? nextState.leads
              : currentState.leads,
          mailInbox:
            nextState?.mailInbox && nextState.mailInbox.length > 0
              ? nextState.mailInbox
              : currentState.mailInbox,
        }
      },
      name: "estate-blue-admin-flow",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : localStorage,
      ),
    },
  ),
)
