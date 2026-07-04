import type { PaginatedResult } from "@/@types/real-estate-api"

export type LeadCollectionTemplateSourceType =
  | "InboxEmail"
  | "PastedHtml"
  | "PastedText"
  | "UploadedHtml"

export type LeadCollectionSubjectMatchMode = "Contains" | "Exact" | "Regex"
export type LeadCollectionFieldTransform = "Text" | "Email" | "Phone" | "Number" | "Date"

export type LeadCollectionExternalPageConfig = {
  enabled: boolean
  allowedHosts: string[]
  urlIncludes: string[]
  linkTextIncludes: string[]
  maxLinks: number
}

export type LeadCollectionFieldMapping = {
  field: string
  label: string
  sampleValue: string
  selectionStart: number
  selectionEnd: number
  prefix: string
  suffix: string
  occurrence: number
  required: boolean
  transform: LeadCollectionFieldTransform
}

export type LeadCollectionTemplateItem = {
  id: number
  name: string
  providerName: string
  description: string
  sourceType: LeadCollectionTemplateSourceType
  sourceMailInboxId?: number | null
  sampleFromAddress: string
  sampleSubject: string
  senderPatterns: string[]
  subjectPattern: string
  subjectMatchMode: LeadCollectionSubjectMatchMode
  bodyFingerprint: string[]
  sourceHtml: string
  sourceText: string
  linkedPageConfig: LeadCollectionExternalPageConfig
  linkedPageSampleUrl: string
  linkedPageSourceHtml: string
  linkedPageSourceText: string
  mappings: LeadCollectionFieldMapping[]
  requiredFields: string[]
  confidenceThreshold: number
  isActive: boolean
  matchCount: number
  successCount: number
  aiFallbackCount: number
  lastMatchedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type LeadCollectionTemplateSaveInput = Omit<
  LeadCollectionTemplateItem,
  | "id"
  | "mappings"
  | "matchCount"
  | "successCount"
  | "aiFallbackCount"
  | "lastMatchedAt"
  | "createdAt"
  | "updatedAt"
> & {
  id?: number
  mappings: Array<Partial<LeadCollectionFieldMapping>>
}

export type LeadCollectionLeadField = {
  field: string
  label: string
  dataType: "text" | "number" | "date" | "boolean" | "list"
  writable: boolean
  suggestedTransform: LeadCollectionFieldTransform
  requiredByDefault: boolean
}

export type LeadCollectionPreparedSource = {
  sourceType: LeadCollectionTemplateSourceType
  sourceMailInboxId?: number | null
  sourceHtml: string
  sourceText: string
  sampleFromAddress: string
  sampleSubject: string
  senderPatterns: string[]
  subjectPattern: string
  subjectMatchMode: LeadCollectionSubjectMatchMode
  bodyFingerprint: string[]
  linkedPageConfig: LeadCollectionExternalPageConfig
  linkedPageSampleUrl: string
  linkedPageSourceHtml: string
  linkedPageSourceText: string
  linkedPageStatus: string
}

export type LeadCollectionParseResult = {
  matched: boolean
  templateId?: number | null
  templateName: string
  matchScore: number
  confidence: number
  threshold: number
  values: Record<string, string>
  missingRequiredFields: string[]
  extractedFields: string[]
  diagnostics: string[]
}

export type LeadCollectionTemplateList = PaginatedResult<LeadCollectionTemplateItem>
