import type {
  DocumentAccessLevel,
  DocumentRepositoryItem,
  DocumentRepositorySaveInput,
  DocumentType,
} from "@/@types/real-estate-api"

export const documentAccessOptions: DocumentAccessLevel[] = [
  "AdminOnly",
  "AgentAccess",
  "Public",
]
export const documentTypeOptions: DocumentType[] = ["System", "Property", "Other"]
export const defaultDocumentCategories = [
  "General",
  "Contracts",
  "Agreements",
  "Floor Plans",
  "Legal",
  "Marketing",
  "Templates",
]

export type TemplateFilter = "all" | "template" | "standard"
export type DocumentModalState =
  | { mode: "create" }
  | { mode: "edit"; document: DocumentRepositoryItem }
  | null

export type DocumentFormValues = {
  accessLevel: DocumentAccessLevel
  category: string
  description: string
  fileName: string
  fileObjectName: string
  fileUrl: string
  documentType: DocumentType
  folder: string
  isTemplate: boolean
  mimeType: string
  propertyId: number | null
  propertyTitle: string
  requiresSignature: boolean
  sizeBytes: number
  tags: string
  title: string
  versionLabel: string
}

export type DocumentFormErrors = Partial<
  Record<keyof DocumentFormValues | "form", string>
>

export function createEmptyDocumentForm(): DocumentFormValues {
  return {
    accessLevel: "AdminOnly",
    category: "General",
    description: "",
    fileName: "",
    fileObjectName: "",
    fileUrl: "",
    documentType: "Other",
    folder: "Repository",
    isTemplate: false,
    mimeType: "",
    propertyId: null,
    propertyTitle: "",
    requiresSignature: false,
    sizeBytes: 0,
    tags: "",
    title: "",
    versionLabel: "v1.0",
  }
}

export function mapDocumentToFormValues(
  document: DocumentRepositoryItem,
): DocumentFormValues {
  return {
    accessLevel: document.accessLevel ?? "AdminOnly",
    category: document.category ?? "General",
    description: document.description ?? "",
    fileName: document.fileName ?? "",
    fileObjectName: document.fileObjectName ?? "",
    fileUrl: document.fileUrl ?? "",
    documentType: document.documentType ?? "Other",
    folder: document.folder ?? "Repository",
    isTemplate: document.isTemplate ?? false,
    mimeType: document.mimeType ?? "",
    propertyId: document.propertyId ?? null,
    propertyTitle: document.propertyTitle ?? "",
    requiresSignature: document.requiresSignature ?? false,
    sizeBytes: document.sizeBytes ?? 0,
    tags: (document.tags ?? []).join("\n"),
    title: document.title ?? "",
    versionLabel: document.versionLabel ?? "v1.0",
  }
}

export function validateDocumentForm(values: DocumentFormValues) {
  const errors: DocumentFormErrors = {}

  if (!values.title.trim()) errors.title = "Title is required."
  if (!values.fileUrl.trim() || !values.fileName.trim()) {
    errors.fileUrl = "Upload a document before saving."
  }
  if (values.documentType === "Property" && !values.propertyId) {
    errors.propertyId = "Choose the property for this document."
  }

  return errors
}

export function buildDocumentPayload(
  values: DocumentFormValues,
): DocumentRepositorySaveInput {
  return {
    accessLevel: values.accessLevel,
    category: values.category.trim() || "General",
    description: values.description.trim(),
    fileName: values.fileName.trim(),
    fileObjectName: values.fileObjectName.trim() || null,
    fileUrl: values.fileUrl.trim(),
    documentType: values.documentType,
    folder: values.folder.trim() || "Repository",
    isTemplate: values.isTemplate,
    mimeType: values.mimeType.trim(),
    propertyId: values.documentType === "Property" ? values.propertyId : null,
    propertyTitle:
      values.documentType === "Property" ? values.propertyTitle.trim() : "",
    requiresSignature: values.requiresSignature,
    sizeBytes: values.sizeBytes,
    tags: values.tags
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
    title: values.title.trim(),
    versionLabel: values.versionLabel.trim() || "v1.0",
  }
}

export function formatDocumentAccess(value: DocumentAccessLevel) {
  if (value === "AdminOnly") return "Admin only"
  if (value === "AgentAccess") return "Agent access"
  return "Public"
}

export function formatDocumentSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  let value = sizeBytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

export function documentFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return "picture_as_pdf"
  if (mimeType.includes("word")) return "article"
  if (mimeType.startsWith("image/")) return "imagesmode"
  return "description"
}
