import type {
  LeadCollectionFieldMapping,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"

export type MappingSource = "email" | "linked"

export type SelectedTemplateValue = {
  start: number
  end: number
  text: string
  label?: string
  source: MappingSource
}

export function emptyLeadTemplate(mailInboxId?: number): LeadCollectionTemplateSaveInput {
  return {
    name: "Untitled lead email template",
    providerName: "",
    description: "",
    sourceType: mailInboxId ? "InboxEmail" : "PastedText",
    sourceMailInboxId: mailInboxId ?? null,
    sampleFromAddress: "",
    sampleSubject: "",
    senderPatterns: [],
    subjectPattern: "",
    subjectMatchMode: "Contains",
    bodyFingerprint: [],
    sourceHtml: "",
    sourceText: "",
    linkedPageConfig: {
      enabled: false,
      allowedHosts: [],
      urlIncludes: [],
      linkTextIncludes: [],
      maxLinks: 3,
    },
    linkedPageSampleUrl: "",
    linkedPageSourceHtml: "",
    linkedPageSourceText: "",
    mappings: [],
    requiredFields: [],
    confidenceThreshold: 0.82,
    isActive: true,
  }
}

export function applyZillowTemplatePreset(
  current: LeadCollectionTemplateSaveInput,
): LeadCollectionTemplateSaveInput {
  return {
    ...current,
    name:
      current.name === "Untitled lead email template"
        ? "Zillow linked lead template"
        : current.name,
    providerName: "Zillow",
    description:
      current.description ||
      "Matches Zillow lead emails, opens the configured detail link, and extracts the contact information from that page.",
    linkedPageConfig: {
      enabled: true,
      allowedHosts: ["zillow.com", "*.zillow.com"],
      urlIncludes: ["lead", "contact", "inquiry", "detail"],
      linkTextIncludes: [],
      maxLinks: 3,
    },
  }
}

export function splitTemplateList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]
}

export function normalizeTemplateText(value: string) {
  return `${value ?? ""}`
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function detectTemplateValues(text: string) {
  const values: Array<{ label: string; value: string }> = []
  const normalized = normalizeTemplateText(text)
  for (const line of normalized.split("\n")) {
    const match = line.match(/^([^:|]{2,60})\s*[:|]\s*(.{2,220})$/)
    if (match) values.push({ label: match[1].trim(), value: match[2].trim() })
  }

  const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = (normalized.match(/(?:\+?\d[\d\s().-]{6,}\d)/g) ?? []).find(
    (item) => {
      const digits = item.replace(/\D/g, "")
      return digits.length >= 7 && digits.length <= 15
    },
  )
  if (email && !values.some((item) => item.value === email)) {
    values.unshift({ label: "Email", value: email })
  }
  if (phone && !values.some((item) => item.value === phone.trim())) {
    values.unshift({ label: "Phone", value: phone.trim() })
  }
  return values.slice(0, 30)
}

export function selectedTemplateValue(
  sourceText: string,
  text: string,
  source: MappingSource,
  label?: string,
): SelectedTemplateValue {
  const normalizedSource = normalizeTemplateText(sourceText)
  const normalizedValue = normalizeTemplateText(text)
  const start = normalizedSource.toLowerCase().indexOf(normalizedValue.toLowerCase())
  return {
    start: Math.max(0, start),
    end: Math.max(0, start) + normalizedValue.length,
    text: normalizedValue,
    label,
    source,
  }
}

export function mergeMapping(
  template: LeadCollectionTemplateSaveInput,
  mapping: Partial<LeadCollectionFieldMapping>,
  required: boolean,
) {
  const field = `${mapping.field ?? ""}`
  return {
    ...template,
    mappings: [...template.mappings.filter((item) => item.field !== field), mapping],
    requiredFields: required
      ? [...new Set([...template.requiredFields, field])]
      : template.requiredFields,
  }
}

export function htmlToVisibleTemplateText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .trim()
}

export function sanitizeTemplateHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
}
