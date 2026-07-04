import type { Template } from "@pdfme/common"
import type { PaginatedResult } from "@/@types/real-estate-api"

export type PdfTemplateStatus = "Draft" | "Active" | "Archived"
export type PdfTemplateSourceType = "Blank" | "UploadedPdf"

export type PdfImportedField = {
  name: string
  type: string
  pageIndex: number
  position?: { x: number; y: number; width: number; height: number }
  options?: string[]
}

export type PdfTemplateItem = {
  id: number
  name: string
  description: string
  category: string
  status: PdfTemplateStatus
  sourceType: PdfTemplateSourceType
  templateJson: Template
  requiredVariables: string[]
  tags: string[]
  fileNamePattern: string
  sourceFileName: string
  sourceFileUrl: string
  sourceFileObjectName?: string | null
  sourceMimeType: string
  sourceSizeBytes: number
  importedFields: PdfImportedField[]
  schemaVersion: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PdfTemplateSaveInput = {
  id?: number
  name: string
  description: string
  category: string
  status: PdfTemplateStatus
  sourceType?: PdfTemplateSourceType
  templateJson: Template
  requiredVariables: string[]
  tags: string[]
  fileNamePattern: string
  isActive: boolean
  sourceFileName?: string
  sourceFileUrl?: string
  sourceFileObjectName?: string | null
  sourceMimeType?: string
  sourceSizeBytes?: number
  importedFields?: PdfImportedField[]
}

export type PdfVariableDefinition = {
  key: string
  label: string
  group: string
  dataType: string
  description: string
  example: string
}

export type PdfVariableCatalog = {
  category: string
  total: number
  groups: Array<{ group: string; variables: PdfVariableDefinition[] }>
  variables: PdfVariableDefinition[]
}

export type PdfResolveInput = {
  templateId: number
  propertyId?: number | null
  leadId?: number | null
  agentId?: number | null
  manualValues?: Record<string, string>
}

export type PdfMissingVariable = {
  key: string
  label?: string
  group?: string
}

export type PdfResolveResult = {
  template: PdfTemplateItem
  inputs: Array<Record<string, string>>
  automaticValues: Record<string, string>
  manualValues: Record<string, string>
  resolvedValues: Record<string, string>
  variablesUsed: string[]
  requiredVariables: string[]
  missingVariables: PdfMissingVariable[]
  fileName: string
  context: {
    propertyId?: number | null
    propertyTitle: string
    leadId?: number | null
    leadName: string
    agentId?: number | null
    agentName: string
  }
}

export type PdfGenerationItem = {
  id: number
  templateId: number
  templateName: string
  category: string
  propertyId?: number | null
  propertyTitle: string
  leadId?: number | null
  leadName: string
  agentId?: number | null
  agentName: string
  fileName: string
  fileUrl: string
  fileObjectName?: string | null
  mimeType: string
  sizeBytes: number
  manualFieldCount: number
  missingFieldCount: number
  variablesUsed: string[]
  context: Record<string, unknown>
  generatedBy: string
  createdAt: string
}

export type PdfGenerateResult = {
  generation: PdfGenerationItem
  downloadUrl: string
  fileName: string
  missingVariables: PdfMissingVariable[]
}

export type PdfTemplateList = PaginatedResult<PdfTemplateItem>
export type PdfGenerationList = PaginatedResult<PdfGenerationItem>
