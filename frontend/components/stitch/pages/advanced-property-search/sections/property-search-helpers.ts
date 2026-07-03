export type PropertyViewMode = "grid" | "list"
export type PropertySortMode = "featured" | "price-asc" | "price-desc" | "latest" | "size-desc"

export const PROPERTY_PAGE_SIZE = 12
export const PROPERTY_FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e2e8f0/0f172a?text=EstateBlue"

export function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function parsePriceValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseSizeValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function listingTypeLabel(value: "ForSale" | "ForRent") {
  return value === "ForRent" ? "For rent" : "For sale"
}

export function propertyTypeLabel(value: "Residential" | "Commercial") {
  return value === "Commercial" ? "Commercial" : "Residential"
}
