import type { Template } from "@pdfme/common"

export type PdfStatus = "Draft" | "Active" | "Archived"

export type StoredPdfTemplate = {
  version: 1
  name: string
  description: string
  category: string
  status: PdfStatus
  fileNamePattern: string
  requiredVariables: string[]
  tags: string[]
  template: Template
}
