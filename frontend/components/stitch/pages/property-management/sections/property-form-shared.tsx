import type {
  PropertyDocumentItem,
  PropertyItem,
} from "@/@types/real-estate-api"

export type NeighborhoodInsightFormValue = {
  type: string
  description: string
}

export type PropertyPreQuestionFormValue = {
  id?: number
  prompt: string
  helperText: string
  isRequired: boolean
  allowsFileUpload: boolean
  attachmentUrl: string
  attachmentObjectName: string
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
  extraDescription: string
  minimumCreditScore: string
  minimumMonthlyIncome: string
  securityDeposit: string
  applicationFee: string
  availableFrom: string
  minimumLeaseMonths: string
  applicationInstructions: string
  realtorDescription: string
  realtorShowingInstructions: string
  entryInstructions: string
  lockboxCode: string
  commissionInfo: string
  internalRemarks: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  ownerExtraInfo: string
  propertyDocuments: PropertyDocumentItem[]
  keyAmenities: string[]
  documentRepositoryItemIds: number[]
  neighborhoodInsights: NeighborhoodInsightFormValue[]
  thumbnailUrl: string
  thumbnailObjectName: string
  imageUrls: string[]
  imageObjectNames: string[]
  preQuestions: PropertyPreQuestionFormValue[]
}

export type PropertyFormErrors = Partial<
  Record<keyof PropertyFormValues | "form", string>
>

export type PendingUploadFile = {
  id: string
  file: File
  previewUrl: string
}

export type PendingPropertyDocument = {
  id: string
  name: string
  file: File
}

export const defaultAmenityOptions = [
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
