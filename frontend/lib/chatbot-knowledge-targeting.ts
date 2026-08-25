export type KnowledgePropertyLike = {
  id: number
  title: string
  status: string
  payload?: Record<string, unknown>
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function formatKnowledgeProperty(property: KnowledgePropertyLike) {
  const payload = property.payload ?? {}
  const address =
    text(payload.exactLocation) ||
    text(payload.location) ||
    text(payload.address) ||
    text(payload.streetAddress) ||
    "Address not set"
  const status = property.status
    ? `${property.status.charAt(0).toUpperCase()}${property.status.slice(1)}`
    : "Unknown"
  return {
    id: property.id,
    title: property.title || `Property #${property.id}`,
    address,
    status,
    searchText: `${property.title} ${address} ${status}`.toLowerCase(),
  }
}

export function priorityPreset(value: string) {
  if (value === "high") return 75
  if (value === "highest") return 100
  return 50
}