import {
  createOwnerDrafts,
  ownerContactIssue,
  ownerContactsFromProperty,
  type ReportOwnerDraft,
} from "@/lib/owner-report-contacts"
import {
  findConfidentPropertyMatch,
  type OwnerReportImportRow,
  type OwnerReportWeek,
  type TemplateValueKey,
} from "@/lib/owner-report-csv"
import type { TenantProperty } from "@/lib/tenant-dashboard-actions"

export type DeliveryStatus = "idle" | "sending" | "queued" | "failed"

export type PreparedRow = OwnerReportImportRow & {
  propertyId: number | null
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  owners: ReportOwnerDraft[]
  selected: boolean
  deliveryStatus: DeliveryStatus
  deliveryMessage: string
}

export function ownerDetails(property?: TenantProperty) {
  const owners = createOwnerDrafts(ownerContactsFromProperty(property))
  const primary = owners[0] ?? { name: "", email: "", phone: "" }

  return {
    ownerName: primary.name,
    ownerEmail: primary.email,
    ownerPhone: primary.phone,
    owners,
  }
}

export function buildPreparedRows(
  imported: OwnerReportImportRow[],
  properties: TenantProperty[]
): PreparedRow[] {
  return imported.map((row) => {
    const match = findConfidentPropertyMatch(row.propertyName, properties)

    return {
      ...row,
      propertyId: match.property?.id ?? null,
      ...ownerDetails(match.property ?? undefined),
      selected: true,
      deliveryStatus: "idle",
      deliveryMessage: "",
    }
  })
}

export function replaceRow(
  rows: PreparedRow[],
  rowId: string,
  patch: Partial<PreparedRow>
): PreparedRow[] {
  return rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
}

export function rowIssue(
  row: PreparedRow,
  emailEnabled: boolean,
  smsEnabled: boolean
): string {
  if (!row.propertyId) return "Match this row to a property"
  return ownerContactIssue(row.owners, emailEnabled, smsEnabled)
}

export function weekLabel(week: OwnerReportWeek) {
  return `Week ${week}`
}

export function templateValues(
  row: PreparedRow,
  week: OwnerReportWeek
): Record<TemplateValueKey, string> {
  const activity = [
    row.inquiries,
    row.appointments,
    row.showings,
    row.applications,
  ]
  const hasNumericActivity = activity.some((value) => /^\d+$/.test(value))

  return {
    propertyName: row.propertyName,
    inquiries: row.inquiries,
    appointments: row.appointments,
    showings: row.showings,
    applications: row.applications,
    feedback: row.feedback,
    week: String(week),
    reportPeriod: weekLabel(week),
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    ownerPhone: row.ownerPhone,
    fromDate: "",
    toDate: "",
    totalActivity: hasNumericActivity
      ? String(
          activity.reduce(
            (sum, value) => sum + (/^\d+$/.test(value) ? Number(value) : 0),
            0
          )
        )
      : "",
    feedbackCount: row.feedback
      ? String(row.feedback.split(/\n\s*\n/).filter(Boolean).length)
      : "0",
    empty: "",
  }
}
