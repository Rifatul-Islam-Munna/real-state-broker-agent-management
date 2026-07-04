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

export function addTextField(template: Template, key: string, label: string) {
  const next = cloneTemplate(template)
  if (!next.schemas.length) next.schemas = [[]]
  const page = next.schemas[next.schemas.length - 1]
  const index = page.length
  page.push({ name: key, type: "text", position: { x: 15 + (Math.floor(index / 18) % 2) * 95, y: 18 + (index % 18) * 14 }, width: 82, height: 10, content: label, fontSize: 10, fontColor: "#111827", alignment: "left", verticalAlignment: "middle" } as never)
  return next
}

export async function createPdfmePlugins() {
  const schemas = await import("@pdfme/schemas")
  return {
    text: schemas.text,
    image: schemas.image,
    signature: schemas.signature,
    table: schemas.table,
    qrcode: schemas.barcodes.qrcode,
  }
}
