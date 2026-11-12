import type { TenantProperty } from "@/lib/tenant-dashboard-actions"

export type ReportOwnerContact = {
  name: string
  email: string
  phone: string
}

export type ReportOwnerDraft = ReportOwnerContact & { id: string }

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function valueFromPayload(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const text = asText(payload[key])
    if (text) return text
  }
  return ""
}

export function ownerContactsFromProperty(
  property: TenantProperty | undefined
): ReportOwnerContact[] {
  if (!property) return []

  const payload = property.payload ?? {}
  const primary: ReportOwnerContact = {
    name: valueFromPayload(payload, ["ownerName", "owner_name", "sellerName", "seller_name"]),
    email: valueFromPayload(payload, ["ownerEmail", "owner_email", "sellerEmail", "seller_email"]),
    phone: valueFromPayload(payload, ["ownerPhone", "owner_phone", "sellerPhone", "seller_phone"]),
  }

  const additional = Array.isArray(payload.owners)
    ? payload.owners.slice(1, 5).map((value) => {
        const item = value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {}
        return {
          name: asText(item.name ?? item.ownerName),
          email: asText(item.email ?? item.ownerEmail),
          phone: asText(item.phone ?? item.ownerPhone),
        }
      })
    : []

  return [primary, ...additional].filter(
    (owner) => owner.name || owner.email || owner.phone
  )
}

export function createOwnerDrafts(contacts: ReportOwnerContact[]): ReportOwnerDraft[] {
  const entries = contacts.length ? contacts.slice(0, 5) : [{ name: "", email: "", phone: "" }]
  return entries.map((owner) => ({ ...owner, id: crypto.randomUUID() }))
}

export function serializeOwnerDrafts(owners: ReportOwnerDraft[]): ReportOwnerContact[] {
  return owners.map(({ name, email, phone }) => ({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
  }))
}

export function ownerContactIssue(
  owners: ReportOwnerDraft[],
  emailEnabled: boolean,
  smsEnabled: boolean
) {
  if (!owners.length || owners.length > 5) return "Add between one and five owners"
  for (const [index, owner] of owners.entries()) {
    if (emailEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) {
      return "Owner " + (index + 1) + " needs a valid email"
    }
    const digits = owner.phone.replace(/\D/g, "")
    if (smsEnabled && (digits.length < 7 || digits.length > 15)) {
      return "Owner " + (index + 1) + " needs a valid phone"
    }
  }
  return ""
}
