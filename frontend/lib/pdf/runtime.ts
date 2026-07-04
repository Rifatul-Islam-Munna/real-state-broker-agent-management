import type { Template } from "@pdfme/common"

export const PDF_RUNTIME_VERSION = 1

export function createBlankTemplate(): Template {
  return { basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] }, schemas: [[]] }
}

export function cloneTemplate(template: Template): Template {
  return JSON.parse(JSON.stringify(template)) as Template
}

export function templateFieldNames(template: Template) {
  return [...new Set(template.schemas.flat().map((schema) => `${schema.name ?? ""}`.trim()).filter(Boolean))]
}
