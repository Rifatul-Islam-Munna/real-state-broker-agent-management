export type PropertyOperationsModule = {
  id: string
  label: string
  category: string
  description: string
  sourceArea: string
}

export const propertyOperationsModules: readonly PropertyOperationsModule[] = [
  {
    id: "portfolio",
    label: "Properties & Portfolio",
    category: "Portfolio",
    description: "Operational property records, ownership context, occupancy and portfolio-level controls.",
    sourceArea: "PropertyModule",
  },
  {
    id: "units",
    label: "Units",
    category: "Portfolio",
    description: "Manage rentable units, unit availability, charges and resident assignment.",
    sourceArea: "UnitModule",
  },
  {
    id: "tenants",
    label: "Tenants & Residents",
    category: "People",
    description: "Resident profiles, tenancy details, contact information and portal access.",
    sourceArea: "TenantModule",
  },
  {
    id: "staff",
    label: "Property Staff",
    category: "People",
    description: "Property staff records, assignments, payments and direct communication.",
    sourceArea: "StaffModule",
  },
  {
    id: "technicians",
    label: "Technicians & Workers",
    category: "People",
    description: "Worker assignments, scoped workloads, availability and service history.",
    sourceArea: "TechnicianModule",
  },
  {
    id: "vendors",
    label: "Vendors",
    category: "People",
    description: "Vendor directory, service coverage, communication and performance records.",
    sourceArea: "VendorModule",
  },
  {
    id: "vendor-quotes",
    label: "Vendor Quotes",
    category: "Maintenance",
    description: "Request, compare, approve and reject vendor bids for property work.",
    sourceArea: "VendorQuoteModule",
  },
  {
    id: "tickets",
    label: "Maintenance Tickets",
    category: "Maintenance",
    description: "Resident and staff requests with priority, assignment, status and communication history.",
    sourceArea: "TicketModule",
  },
  {
    id: "work-orders",
    label: "Work Orders",
    category: "Maintenance",
    description: "Track scheduled work, labor, materials, completion evidence and cost.",
    sourceArea: "WorkOrderModule",
  },
  {
    id: "recurring-maintenance",
    label: "Recurring Maintenance",
    category: "Maintenance",
    description: "Preventive schedules, recurrence rules, assets, reminders and generated work.",
    sourceArea: "RecurringMaintenanceModule",
  },
  {
    id: "inspections",
    label: "Inspections",
    category: "Maintenance",
    description: "Inspection schedules, checklists, findings, photos and follow-up actions.",
    sourceArea: "InspectionModule",
  },
  {
    id: "assets",
    label: "Assets",
    category: "Maintenance",
    description: "Building equipment, warranty details, condition, service history and replacement planning.",
    sourceArea: "AssetModule",
  },
  {
    id: "billing",
    label: "Rent & Billing",
    category: "Finance",
    description: "Bills, recurring rent, extra charges, balances, due dates and payment states.",
    sourceArea: "BillModule",
  },
  {
    id: "finance",
    label: "Financial Ledger",
    category: "Finance",
    description: "Income and expense entries, property-level financial activity and reporting.",
    sourceArea: "FinanceEntryModule",
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    category: "Finance",
    description: "Organization plan, feature access, usage and subscription lifecycle.",
    sourceArea: "SubscriptionModule",
  },
  {
    id: "messages",
    label: "Messaging",
    category: "Communication",
    description: "Central communication between owners, residents, staff, workers and vendors.",
    sourceArea: "MessagingModule",
  },
  {
    id: "announcements",
    label: "Announcements",
    category: "Communication",
    description: "Property or organization notices targeted to the right audiences.",
    sourceArea: "AnnouncementModule",
  },
  {
    id: "notifications",
    label: "Notification Automation",
    category: "Communication",
    description: "Email and SMS templates, overdue reminders, inspection alerts and delivery logs.",
    sourceArea: "NotificationModule",
  },
  {
    id: "documents",
    label: "Plans & Documents",
    category: "Documents",
    description: "Property plans, contracts, attachments, generated documents and file access.",
    sourceArea: "PlanDocModule / UploadsModule",
  },
  {
    id: "public-portals",
    label: "Public Request Portals",
    category: "Portals",
    description: "Public ticket, checkout and vendor quote experiences with secure request links.",
    sourceArea: "PublicRequestModule",
  },
  {
    id: "organization",
    label: "Organization & Branding",
    category: "Administration",
    description: "Operational settings, branding, payment configuration and role-aware workspace controls.",
    sourceArea: "OrganizationModule",
  },
  {
    id: "audit",
    label: "Audit Logs",
    category: "Administration",
    description: "Organization-wide activity history with actor, entity and action metadata.",
    sourceArea: "AuditLogModule",
  },
  {
    id: "analytics",
    label: "Operations Analytics",
    category: "Insights",
    description: "Portfolio, maintenance, occupancy, finance and service-performance analytics.",
    sourceArea: "AnalyticsModule",
  },
  {
    id: "ai",
    label: "AI Operations Assistant",
    category: "Insights",
    description: "AI-supported operational summaries, prioritization and property-management assistance.",
    sourceArea: "AiModule",
  },
] as const

export const propertyOperationsCategories = [
  "All",
  ...Array.from(new Set(propertyOperationsModules.map((module) => module.category))),
] as const
