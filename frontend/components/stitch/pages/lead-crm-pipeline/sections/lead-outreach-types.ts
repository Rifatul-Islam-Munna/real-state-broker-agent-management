export type LeadOutreachMode = "email" | "message" | "call"

export type LeadOutreachComposerValues = {
  attachPropertyDocuments?: boolean
  title: string
  message: string
  scheduledAt: string
  templateId?: string
}
