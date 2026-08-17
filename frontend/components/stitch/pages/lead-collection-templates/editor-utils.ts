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
    mailboxTags: [],
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
      openPage: true,
      autoFillContactFields: true,
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

export function normalizeLeadTemplate(
  value?: Partial<LeadCollectionTemplateSaveInput> | null,
  mailInboxId?: number,
): LeadCollectionTemplateSaveInput {
  const fallback = emptyLeadTemplate(mailInboxId)
  const raw = value ?? {}
  const linked = raw.linkedPageConfig ?? fallback.linkedPageConfig
  return {
    ...fallback,
    ...raw,
    name: `${raw.name ?? fallback.name}`,
    providerName: `${raw.providerName ?? ""}`,
    description: `${raw.description ?? ""}`,
    sourceType: raw.sourceType ?? fallback.sourceType,
    sourceMailInboxId: raw.sourceMailInboxId ?? fallback.sourceMailInboxId,
    sampleFromAddress: `${raw.sampleFromAddress ?? ""}`,
    sampleSubject: `${raw.sampleSubject ?? ""}`,
    senderPatterns: stringArray(raw.senderPatterns),
    mailboxTags: stringArray(raw.mailboxTags),
    subjectPattern: `${raw.subjectPattern ?? ""}`,
    subjectMatchMode: raw.subjectMatchMode ?? fallback.subjectMatchMode,
    bodyFingerprint: stringArray(raw.bodyFingerprint),
    sourceHtml: `${raw.sourceHtml ?? ""}`,
    sourceText: `${raw.sourceText ?? ""}`,
    linkedPageConfig: {
      ...fallback.linkedPageConfig,
      ...linked,
      allowedHosts: stringArray(linked.allowedHosts),
      urlIncludes: stringArray(linked.urlIncludes),
      linkTextIncludes: stringArray(linked.linkTextIncludes),
    },
    linkedPageSampleUrl: `${raw.linkedPageSampleUrl ?? ""}`,
    linkedPageSourceHtml: `${raw.linkedPageSourceHtml ?? ""}`,
    linkedPageSourceText: `${raw.linkedPageSourceText ?? ""}`,
    mappings: Array.isArray(raw.mappings) ? raw.mappings : [],
    requiredFields: stringArray(raw.requiredFields),
    confidenceThreshold: Number.isFinite(Number(raw.confidenceThreshold))
      ? Number(raw.confidenceThreshold)
      : fallback.confidenceThreshold,
    isActive: raw.isActive !== false,
  }
}

export function applyZillowTemplatePreset(
  current: LeadCollectionTemplateSaveInput,
): LeadCollectionTemplateSaveInput {
  const normalized = normalizeLeadTemplate(current)
  return {
    ...normalized,
    name:
      normalized.name === "Untitled lead email template"
        ? "Zillow linked lead template"
        : normalized.name,
    providerName: "Zillow",
    description:
      normalized.description ||
      "Matches Zillow lead emails, opens the configured detail link, and extracts the contact information from that page.",
    linkedPageConfig: {
      enabled: true,
      allowedHosts: ["zillow.com", "*.zillow.com"],
      urlIncludes: ["lead", "contact", "inquiry", "detail"],
      linkTextIncludes: [],
      maxLinks: 3,
      openPage: false,
      autoFillContactFields: true,
    },
  }
}

export function linkedPageConfigForUrl(url: string, linkText = "", openPage = false) {
  const cleanUrl = `${url ?? ""}`.trim()
  return {
    enabled: Boolean(cleanUrl),
    selectedUrl: cleanUrl || undefined,
    allowedHosts: hostsForLink(cleanUrl),
    urlIncludes: urlIncludesForLink(cleanUrl),
    linkTextIncludes: linkText ? [linkText] : [],
    maxLinks: 3,
    openPage,
    autoFillContactFields: true,
  }
}

export function extractTemplateLinks(html: string, text = "") {
  const links: Array<{ url: string; text: string; host: string }> = []
  for (const match of `${html ?? ""}`.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push(toTemplateLink(match[1], htmlToVisibleTemplateText(match[2])))
  }
  for (const match of `${html ?? ""}`.matchAll(/<(?:area|form)\b[^>]*(?:href|action)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    links.push(toTemplateLink(match[1], ""))
  }
  for (const match of `${html ?? ""}`.matchAll(/\b(?:data-href|data-url|data-link)\s*=\s*["']([^"']+)["']/gi)) {
    links.push(toTemplateLink(match[1], ""))
  }
  for (const match of `${text ?? ""}\n${htmlToVisibleTemplateText(html)}`.matchAll(/https:\/\/[^\s<>"')\]]+/gi)) {
    links.push(toTemplateLink(match[0], ""))
  }
  const unique = new Map<string, { url: string; text: string; host: string }>()
  for (const link of links) if (link.url) unique.set(link.url, link)
  return [...unique.values()].sort((left, right) => linkScore(right) - linkScore(left))
}

function toTemplateLink(value: string, text: string) {
  const url = decodeBasicEntities(value)
  try {
    const parsed = new URL(url)
    const target = redirectTarget(parsed) ?? parsed
    return { url, text: normalizeTemplateText(text).slice(0, 80), host: target.hostname }
  } catch {
    return { url: "", text: normalizeTemplateText(text).slice(0, 80), host: "" }
  }
}

function hostsForLink(value: string) {
  const url = targetUrl(value)
  if (!url) return []
  const parts = url.hostname.split(".")
  const root = parts.length > 2 ? parts.slice(-2).join(".") : url.hostname
  return root === url.hostname ? [root] : [root, `*.${root}`]
}

function urlIncludesForLink(value: string) {
  const url = targetUrl(value)
  if (!url) return []
  return url.pathname.split("/").map((part) => part.trim().toLowerCase()).filter((part) => part.length >= 4).slice(-2)
}

function targetUrl(value: string) {
  try {
    const parsed = new URL(value)
    return redirectTarget(parsed) ?? parsed
  } catch {
    return null
  }
}

function redirectTarget(url: URL) {
  for (const value of url.searchParams.values()) {
    try {
      const decoded = decodeURIComponent(value)
      if (/^https:\/\//i.test(decoded)) return new URL(decoded)
    } catch {
      continue
    }
  }
  return null
}

function linkScore(link: { text: string; url: string }) {
  const value = `${link.text} ${link.url}`.toLowerCase()
  let score = 0
  if (/(contact|phone|call|lead|inquiry|detail|renter|prospect)/.test(value)) score += 8
  if (/(unsubscribe|privacy|terms|preferences|logo|image|static)/.test(value)) score -= 20
  return score
}

function decodeBasicEntities(value: string) {
  return `${value ?? ""}`
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
}

function stringArray(value: unknown) {
  if (typeof value === "string") value = value.split(",")
  return [...new Set((Array.isArray(value) ? value : []).map((item) => `${item ?? ""}`.trim()).filter(Boolean))]
}

export function splitTemplateList(value: string) {
  return stringArray(value)
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
  const start = findSelectedTextStart(normalizedSource, normalizedValue)
  return {
    start: Math.max(0, start),
    end: Math.max(0, start) + normalizedValue.length,
    text: normalizedValue,
    label,
    source,
  }
}

function findSelectedTextStart(sourceText: string, selectedText: string) {
  if (!selectedText) return -1
  const direct = sourceText.toLowerCase().indexOf(selectedText.toLowerCase())
  if (direct >= 0) return direct

  const pattern = selectedText
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+")
  if (!pattern) return -1

  const match = sourceText.match(new RegExp(pattern, "i"))
  return match?.index ?? -1
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
  return `${html ?? ""}`
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
  return `${html ?? ""}`
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
}
