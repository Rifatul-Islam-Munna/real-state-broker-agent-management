export const PDF_FEATURE_VERSION = 1
export const PDF_TEMPLATE_CATEGORY = "PDF Template"
export const GENERATED_PDF_CATEGORY = "Generated PDF"

export const PDF_CATEGORIES = ["Universal", "Contact", "Custom"] as const
export type PdfCategory = (typeof PDF_CATEGORIES)[number]
