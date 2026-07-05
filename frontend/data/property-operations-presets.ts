export type OperationsFormField = {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "file"
  required?: boolean
  options?: string[]
}

export type OperationsModulePreset = {
  recordTypes: string[]
  statuses: string[]
  recipient: string
  fields: OperationsFormField[]
}

const contact: OperationsFormField[] = [
  { key: "name", label: "Full name", type: "text", required: true },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
]
const notes: OperationsFormField = { key: "notes", label: "Notes", type: "textarea" }
const file: OperationsFormField = { key: "attachment", label: "Photo or attachment", type: "file" }

const definitions: Record<string, [string[], string, OperationsFormField[]]> = {
  portfolio: [["Property note", "Ownership update", "Occupancy update", "Compliance item", "Insurance item"], "Owner or property contact", [{ key: "updateType", label: "Update type", type: "select", options: ["Ownership", "Occupancy", "Insurance", "Compliance", "Other"] }, notes, file]],
  units: [["Unit", "Availability", "Move-in", "Move-out", "Unit charge", "Unit condition"], "Resident or unit contact", [{ key: "unit", label: "Unit number", type: "text", required: true }, { key: "date", label: "Relevant date", type: "date" }, { key: "condition", label: "Condition", type: "select", options: ["Good", "Needs attention", "Urgent"] }, notes, file]],
  tenants: [["Resident", "Lease", "Move-in", "Move-out", "Emergency contact", "Resident request"], "Resident", [{ key: "unit", label: "Unit", type: "text" }, { key: "requestType", label: "Request type", type: "select", options: ["General", "Lease", "Move-in", "Move-out", "Contact update"] }, notes, file]],
  staff: [["Staff profile", "Assignment", "Shift", "Payment", "Performance note"], "Property staff member", [{ key: "assignment", label: "Assignment", type: "text", required: true }, { key: "availability", label: "Availability", type: "textarea" }, notes]],
  technicians: [["Technician", "Worker", "Assignment", "Availability", "Completion report"], "Technician or worker", [{ key: "workCompleted", label: "Work completed", type: "textarea", required: true }, { key: "hours", label: "Hours worked", type: "number" }, { key: "materials", label: "Materials used", type: "textarea" }, file]],
  vendors: [["Vendor", "Service agreement", "Insurance", "Performance review", "Vendor contact"], "Vendor contact", [{ key: "company", label: "Company", type: "text", required: true }, { key: "services", label: "Services offered", type: "textarea" }, { key: "insuranceExpiry", label: "Insurance expiry", type: "date" }, file]],
  "vendor-quotes": [["Quote request", "Vendor quote", "Quote comparison", "Approval", "Rejection"], "Vendor", [{ key: "scope", label: "Scope response", type: "textarea", required: true }, { key: "amount", label: "Quoted amount", type: "number", required: true }, { key: "availableDate", label: "Available start date", type: "date" }, file]],
  tickets: [["Maintenance request", "Repair issue", "Emergency issue", "Complaint", "Service request"], "Resident or reporting contact", [{ key: "location", label: "Issue location", type: "text", required: true }, { key: "urgency", label: "Urgency", type: "select", options: ["Low", "Normal", "High", "Emergency"], required: true }, { key: "issue", label: "Describe the issue", type: "textarea", required: true }, file]],
  "work-orders": [["Work order", "Labor entry", "Material entry", "Completion report", "Change order"], "Assigned worker or vendor", [{ key: "result", label: "Completion status", type: "select", options: ["Completed", "Partially completed", "Unable to complete"], required: true }, { key: "summary", label: "Work summary", type: "textarea", required: true }, { key: "hours", label: "Labor hours", type: "number" }, { key: "cost", label: "Material cost", type: "number" }, file]],
  "recurring-maintenance": [["Maintenance schedule", "Checklist", "Generated task", "Service cycle", "Reminder"], "Service provider", [{ key: "serviceDate", label: "Service date", type: "date", required: true }, { key: "completed", label: "Checklist completed", type: "checkbox" }, { key: "findings", label: "Findings", type: "textarea" }, { key: "nextService", label: "Next service", type: "date" }, file]],
  inspections: [["Move-in inspection", "Move-out inspection", "Routine inspection", "Safety inspection", "Follow-up"], "Inspector", [{ key: "inspectionDate", label: "Inspection date", type: "date", required: true }, { key: "result", label: "Result", type: "select", options: ["Pass", "Issues found", "Unsafe", "Follow-up required"], required: true }, { key: "findings", label: "Findings", type: "textarea", required: true }, file]],
  assets: [["Asset", "Warranty", "Service history", "Condition review", "Replacement plan"], "Technician or custodian", [{ key: "asset", label: "Asset", type: "text", required: true }, { key: "condition", label: "Condition", type: "select", options: ["Excellent", "Good", "Fair", "Poor", "Out of service"], required: true }, { key: "serviceNeeded", label: "Service needed", type: "textarea" }, file]],
  billing: [["Rent charge", "Utility charge", "Late fee", "Payment", "Credit", "Refund"], "Payer or resident", [{ key: "reference", label: "Reference", type: "text" }, { key: "amount", label: "Amount", type: "number", required: true }, { key: "paymentDate", label: "Payment date", type: "date" }, file]],
  finance: [["Income", "Expense", "Deposit", "Withdrawal", "Budget item", "Reconciliation"], "Accountant or payment contact", [{ key: "entryType", label: "Entry type", type: "select", options: ["Income", "Expense", "Deposit", "Refund"], required: true }, { key: "amount", label: "Amount", type: "number", required: true }, { key: "date", label: "Transaction date", type: "date", required: true }, file]],
  subscriptions: [["Utility service", "Service contract", "Insurance renewal", "Recurring operating cost"], "Service provider", [{ key: "service", label: "Service or contract", type: "text", required: true }, { key: "renewalDate", label: "Renewal date", type: "date" }, { key: "cost", label: "Recurring cost", type: "number" }, file]],
  messages: [["Incoming message", "Outgoing message", "Conversation note", "Follow-up"], "External contact", [{ key: "message", label: "Message", type: "textarea", required: true }, file]],
  announcements: [["Property notice", "Emergency notice", "Service interruption", "Event", "Policy update"], "Notice recipient", [{ key: "acknowledged", label: "I acknowledge this notice", type: "checkbox", required: true }, { key: "response", label: "Response", type: "textarea" }]],
  notifications: [["Email template", "SMS template", "Reminder rule", "Delivery log", "Escalation rule"], "Notification recipient", [{ key: "acknowledged", label: "Acknowledged", type: "checkbox" }, { key: "reply", label: "Reply", type: "textarea" }]],
  documents: [["Property plan", "Contract", "Lease document", "Compliance document", "Generated document"], "Document recipient", [{ key: "documentType", label: "Document type", type: "text" }, { key: "accepted", label: "Reviewed and accepted", type: "checkbox" }, file, notes]],
  "public-portals": [["Public form", "Checkout request", "Quote request", "Information request", "Anonymous submission"], "External participant", [{ key: "response", label: "Response", type: "textarea", required: true }, file]],
  organization: [["Setting change", "Brand asset", "Integration note", "Policy", "Operational preference"], "Organization contact", [{ key: "confirmation", label: "Confirmation or update", type: "textarea", required: true }, file]],
  audit: [["Activity", "Change log", "Access event", "Submission event", "Exception"], "Review contact", [{ key: "confirmation", label: "Confirmation", type: "textarea", required: true }, notes]],
  analytics: [["KPI snapshot", "Occupancy report", "Maintenance report", "Finance report", "Service report"], "Report recipient", [{ key: "feedback", label: "Report feedback", type: "textarea", required: true }, notes]],
  ai: [["AI summary", "Suggested priority", "Risk note", "Draft response", "Operational recommendation"], "Review contact", [{ key: "feedback", label: "Feedback", type: "textarea", required: true }, { key: "accepted", label: "Accept recommendation", type: "checkbox" }]],
}

const defaultStatuses = ["Open", "Pending", "Scheduled", "In progress", "Completed", "Closed"]

export function getPropertyOperationsPreset(moduleKey: string): OperationsModulePreset {
  const definition = definitions[moduleKey] ?? [["Item"], "External participant", [notes, file]]
  return {
    recordTypes: definition[0] as string[],
    recipient: definition[1] as string,
    fields: [...contact, ...(definition[2] as OperationsFormField[])],
    statuses: defaultStatuses,
  }
}
