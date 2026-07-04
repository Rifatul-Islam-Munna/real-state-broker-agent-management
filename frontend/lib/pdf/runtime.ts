import type { Template } from "@pdfme/common"

export const PDF_RUNTIME_VERSION = 2

export const PDF_PAGE_SIZES = [
  { label: "A4 portrait", value: "a4-portrait", width: 210, height: 297 },
  { label: "A4 landscape", value: "a4-landscape", width: 297, height: 210 },
  { label: "Letter portrait", value: "letter-portrait", width: 216, height: 279 },
  { label: "Letter landscape", value: "letter-landscape", width: 279, height: 216 },
  { label: "Legal portrait", value: "legal-portrait", width: 216, height: 356 },
]

export function createBlankTemplate(): Template {
  return {
    basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
    schemas: [[]],
    pdfmeVersion: "6.0.0",
  }
}

export function cloneTemplate(template: Template): Template {
  return JSON.parse(JSON.stringify(template)) as Template
}

export function templateFieldNames(template: Template) {
  return [
    ...new Set(
      template.schemas
        .flat()
        .map((schema) => `${schema.name ?? ""}`.trim())
        .filter(Boolean),
    ),
  ]
}

export function addTextField(template: Template, key: string, label: string) {
  const next = cloneTemplate(template)
  if (!next.schemas.length) next.schemas = [[]]
  const page = next.schemas[next.schemas.length - 1]
  const index = page.length
  page.push({
    name: key,
    type: "text",
    position: {
      x: 15 + (Math.floor(index / 18) % 2) * 95,
      y: 18 + (index % 18) * 14,
    },
    width: 82,
    height: 10,
    content: label,
    fontSize: 10,
    fontColor: "#111827",
    alignment: "left",
    verticalAlignment: "middle",
    lineHeight: 1,
    characterSpacing: 0,
    backgroundColor: "",
    borderColor: "",
    borderWidth: 0,
  } as never)
  return next
}

export function addBlankPage(template: Template) {
  const next = cloneTemplate(template)
  next.schemas = [...(next.schemas.length ? next.schemas : [[]]), []]
  return next
}

export function setTemplatePageSize(template: Template, width: number, height: number) {
  const next = cloneTemplate(template)
  next.basePdf = { width, height, padding: [10, 10, 10, 10] } as never
  return next
}

export async function createPdfmePlugins() {
  const schemas = await import("@pdfme/schemas")
  return {
    text: schemas.text,
    multiVariableText: schemas.multiVariableText,
    image: schemas.image,
    signature: schemas.signature,
    svg: schemas.svg,
    table: schemas.table,
    line: schemas.line,
    rectangle: schemas.rectangle,
    ellipse: schemas.ellipse,
    dateTime: schemas.dateTime,
    date: schemas.date,
    time: schemas.time,
    select: schemas.select,
    radioGroup: schemas.radioGroup,
    checkbox: schemas.checkbox,
    qrcode: schemas.barcodes.qrcode,
  }
}
