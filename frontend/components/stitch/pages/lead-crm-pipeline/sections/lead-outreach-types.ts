export type LeadOutreachMode = "both" | "email" | "message" | "call"

export type LeadOutreachComposerValues = {
  attachPropertyDocuments?: boolean
  attachmentDocumentCategory?: string
  attachmentDocumentType?: string
  attachmentMode?: "none" | "property" | "pdf" | "document"
  title: string
  message: string
  scheduledAt: string
  templateId?: string
  sequenceType?: "Direct" | "FollowUp1" | "FollowUp2" | "FollowUp3"
  pdfTemplateId?: string
  mediaUrls?: string[]
}
