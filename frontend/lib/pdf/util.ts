export const PDF_UTIL_VERSION = 1

export function safePdfFilePart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || "document"
}
