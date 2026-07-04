import type {
  DocumentRepositoryItem,
  DocumentRepositorySaveInput,
} from "@/@types/real-estate-api"

import type { StoredPdfTemplate } from "./model"
import { GENERATED_PDF_CATEGORY, PDF_TEMPLATE_CATEGORY } from "./readme"

export const PDF_UTIL_VERSION = 1
const TEMPLATE_PREFIX = "pdfme-template:"

export function safePdfFilePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "document"
}

export function decodePdfTemplate(item: DocumentRepositoryItem): StoredPdfTemplate | null {
  if (!item.isTemplate || item.category !== PDF_TEMPLATE_CATEGORY || !item.fileUrl.startsWith(TEMPLATE_PREFIX)) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(item.fileUrl.slice(TEMPLATE_PREFIX.length))) as StoredPdfTemplate
    return parsed?.version === 1 && Array.isArray(parsed.template?.schemas) ? parsed : null
  } catch {
    return null
  }
}

export function buildPdfTemplateDocument(value: StoredPdfTemplate): DocumentRepositorySaveInput {
  const payload = `${TEMPLATE_PREFIX}${encodeURIComponent(JSON.stringify(value))}`
  return {
    title: value.name,
    fileName: `${safePdfFilePart(value.name)}.pdfme.json`,
    fileUrl: payload,
    fileObjectName: null,
    mimeType: "application/vnd.pdfme+json",
    sizeBytes: Math.max(1, payload.length),
    category: PDF_TEMPLATE_CATEGORY,
    documentType: "System",
    propertyId: null,
    propertyTitle: null,
    folder: `PDFs/Templates/${value.category}`,
    description: value.description,
    versionLabel: "pdfme-v1",
    tags: ["pdf-template", `pdf-category:${value.category}`, `pdf-status:${value.status}`, ...value.tags],
    accessLevel: "AdminOnly",
    isTemplate: true,
    requiresSignature: value.template.schemas.flat().some((schema) => `${schema.name ?? ""}`.toLowerCase().includes("signature")),
  }
}

export function buildGeneratedPdfDocument(args: {
  fileName: string
  fileUrl: string
  sizeBytes: number
  templateId: number
  templateName: string
  category: string
  primaryRecord?: { id: number; title: string }
  contact?: { id: number; name: string }
}): DocumentRepositorySaveInput {
  return {
    title: args.fileName.replace(/\.pdf$/i, ""),
    fileName: args.fileName,
    fileUrl: args.fileUrl,
    fileObjectName: null,
    mimeType: "application/pdf",
    sizeBytes: Math.max(1, args.sizeBytes),
    category: GENERATED_PDF_CATEGORY,
    documentType: args.primaryRecord ? "Property" : "System",
    propertyId: args.primaryRecord?.id ?? null,
    propertyTitle: args.primaryRecord?.title ?? null,
    folder: `PDFs/Generated/${args.category}`,
    description: `Generated from ${args.templateName}${args.contact ? ` for ${args.contact.name}` : ""}.`,
    versionLabel: "generated-v1",
    tags: ["generated-pdf", `pdf-template:${args.templateId}`, `pdf-category:${args.category}`, ...(args.contact ? [`contact-id:${args.contact.id}`] : [])],
    accessLevel: "AdminOnly",
    isTemplate: false,
    requiresSignature: false,
  }
}
