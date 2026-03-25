import type { PropertyItem } from "@/types/real-estate-api"

export type NeighborhoodInsightFormValue = {
  type: string
  description: string
}

export type PropertyFormValues = {
  agentId: number | null
  title: string
  propertyType: PropertyItem["propertyType"]
  listingType: PropertyItem["listingType"]
  price: string
  status: PropertyItem["status"]
  location: string
  exactLocation: string
  bedRoom: string
  bathRoom: string
  width: string
  description: string
  keyAmenities: string[]
  neighborhoodInsights: NeighborhoodInsightFormValue[]
  thumbnailUrl: string
  thumbnailObjectName: string
  imageUrls: string[]
  imageObjectNames: string[]
}

export type PropertyFormErrors = Partial<Record<keyof PropertyFormValues | "form", string>>

export type PendingUploadFile = {
  id: string
  file: File
  previewUrl: string
}

export const amenityOptions = [
  "Swimming Pool",
  "Gym / Fitness Center",
  "Central Cooling",
  "Smart Home",
  "Garage",
  "Garden",
] as const

export function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <p className="text-xs font-semibold text-rose-600">{error}</p>
}
