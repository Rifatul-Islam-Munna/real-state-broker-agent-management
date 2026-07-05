export const MODULE_CATALOG = {
  portfolio: ['Properties & Portfolio', 'Portfolio', ['Property note', 'Ownership update', 'Occupancy update', 'Compliance item']],
  units: ['Units', 'Portfolio', ['Unit', 'Availability', 'Move-in', 'Move-out', 'Unit charge']],
  tenants: ['Tenants & Residents', 'People', ['Resident', 'Lease', 'Move-in', 'Move-out', 'Resident request']],
  staff: ['Property Staff', 'People', ['Staff profile', 'Assignment', 'Shift', 'Payment']],
  technicians: ['Technicians & Workers', 'People', ['Technician', 'Worker', 'Assignment', 'Completion report']],
  vendors: ['Vendors', 'People', ['Vendor', 'Service agreement', 'Insurance', 'Performance review']],
  'vendor-quotes': ['Vendor Quotes', 'Maintenance', ['Quote request', 'Vendor quote', 'Quote comparison', 'Approval']],
  tickets: ['Maintenance Tickets', 'Maintenance', ['Maintenance request', 'Repair issue', 'Emergency issue', 'Complaint']],
  'work-orders': ['Work Orders', 'Maintenance', ['Work order', 'Labor entry', 'Material entry', 'Completion report']],
  'recurring-maintenance': ['Recurring Maintenance', 'Maintenance', ['Maintenance schedule', 'Checklist', 'Generated task', 'Reminder']],
  inspections: ['Inspections', 'Maintenance', ['Move-in inspection', 'Move-out inspection', 'Routine inspection', 'Safety inspection']],
  assets: ['Assets', 'Maintenance', ['Asset', 'Warranty', 'Service history', 'Condition review', 'Replacement plan']],
  billing: ['Rent & Billing', 'Finance', ['Rent charge', 'Utility charge', 'Late fee', 'Payment', 'Credit', 'Refund']],
  finance: ['Financial Ledger', 'Finance', ['Income', 'Expense', 'Deposit', 'Withdrawal', 'Budget item', 'Reconciliation']],
  subscriptions: ['Service Contracts & Utilities', 'Finance', ['Utility service', 'Service contract', 'Insurance renewal', 'Recurring operating cost']],
  messages: ['Messaging', 'Communication', ['Incoming message', 'Outgoing message', 'Conversation note', 'Follow-up']],
  announcements: ['Announcements', 'Communication', ['Property notice', 'Emergency notice', 'Service interruption', 'Policy update']],
  notifications: ['Notification Automation', 'Communication', ['Email template', 'SMS template', 'Reminder rule', 'Delivery log']],
  documents: ['Plans & Documents', 'Documents', ['Property plan', 'Contract', 'Lease document', 'Compliance document', 'Attachment']],
  'public-portals': ['Public Request Portals', 'Portals', ['Public form', 'Checkout request', 'Quote request', 'Information request']],
  organization: ['Organization & Branding', 'Administration', ['Setting change', 'Brand asset', 'Integration note', 'Policy']],
  audit: ['Audit Logs', 'Administration', ['Activity', 'Change log', 'Access event', 'Submission event']],
  analytics: ['Operations Analytics', 'Insights', ['KPI snapshot', 'Occupancy report', 'Maintenance report', 'Finance report']],
  ai: ['AI Operations Assistant', 'Insights', ['AI summary', 'Suggested priority', 'Risk note', 'Operational recommendation']],
} as const;

export type ModuleKey = keyof typeof MODULE_CATALOG;
export const MODULE_KEYS = Object.keys(MODULE_CATALOG) as ModuleKey[];
export const MODULE_STATUSES = ['Not started', 'In progress', 'Ready'] as const;
export const RECORD_STATUSES = ['Open', 'Pending', 'Scheduled', 'Assigned', 'In progress', 'Waiting', 'Completed', 'Closed', 'Paid', 'Cancelled', 'Archived'] as const;
export const isModuleKey = (value: string): value is ModuleKey => value in MODULE_CATALOG;
