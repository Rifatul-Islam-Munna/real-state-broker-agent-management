export type LeadOutreachMode = "email" | "message" | "call"

export type LeadOutreachComposerValues = {
  attachPropertyDocuments?: boolean
  attachmentDocumentCategory?: string
  attachmentDocumentType?: string
  attachmentMode?: "none" | "property" | "pdf" | "document"
  title: string
  message: string
  scheduledAt: string
  templateId?: string
  pdfTemplateId?: string
  mediaUrls?: string[]
}
