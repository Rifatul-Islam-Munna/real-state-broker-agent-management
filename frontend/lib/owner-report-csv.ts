import Papa from "papaparse"

export type OwnerReportWeek = 1 | 2 | 3 | 4
export type OwnerReportMetric = "inquiries" | "appointments" | "showings" | "applications" | "feedback"

export type OwnerReportImportRow = {
  id: string
  sourceRow: number
  propertyName: string
  inquiries: string
  appointments: string
  showings: string
  applications: string
  feedback: string
}

export type OwnerReportImportResult = {
  rows: OwnerReportImportRow[]
  headerRow: number
  propertyColumn: number
  layout: "grouped" | "flat" | "long"
  warnings: string[]
}

export type MatchableProperty = {
  id: number
  title: string
}

export type TemplateValueKey =
  | "propertyName"
  | OwnerReportMetric
  | "week"
  | "reportPeriod"
  | "ownerName"
  | "ownerEmail"
  | "ownerPhone"
  | "fromDate"
  | "toDate"
  | "totalActivity"
  | "feedbackCount"
  | "empty"

export const templateValueOptions: Array<{ value: TemplateValueKey; label: string }> = [
  { value: "propertyName", label: "Property name / address" },
  { value: "inquiries", label: "Inquiries (selected week)" },
  { value: "appointments", label: "Appointments (selected week)" },
  { value: "showings", label: "Showings (selected week)" },
  { value: "applications", label: "Applications (selected week)" },
  { value: "feedback", label: "Combined feedback (selected week)" },
  { value: "feedbackCount", label: "Number of feedback entries" },
  { value: "totalActivity", label: "Total activity count" },
  { value: "week", label: "Week number (1–4)" },
  { value: "reportPeriod", label: "Week label (e.g. Week 2)" },
  { value: "fromDate", label: "Report period start date" },
  { value: "toDate", label: "Report period end date" },
  { value: "ownerName", label: "Owner name (from property)" },
  { value: "ownerEmail", label: "Owner email (from property)" },
  { value: "ownerPhone", label: "Owner phone (from property)" },
  { value: "empty", label: "Blank / remove variable" },
]

const metricOrder: OwnerReportMetric[] = [
  "inquiries",
  "appointments",
  "showings",
  "applications",
  "feedback",
]

const metricAliases: Record<OwnerReportMetric, RegExp> = {
  inquiries: /\b(inquir(?:y|ies)?|enquir(?:y|ies)?|inquiries|enquiries)\b/,
  appointments: /\b(appointment(?:s)?|appt(?:s)?|bookings?)\b/,
  showings: /\b(showing(?:s)?|viewing(?:s)?|property\s+visits?)\b/,
  applications: /\b(applications?|applicants?|applications?\s+received)\b/,
  feedback: /\b(feedback|buyer\s+comments?|viewer\s+comments?|prospect\s+comments?)\b/,
}

const propertyHeaderPattern =
  /\b(property|address|listing\s+address|property\s+name|unit\s+address)\b/

type ColumnGroup = {
  perWeek: Partial<Record<OwnerReportWeek, number[]>>
  shared: number[]
}
type ColumnGroups = Record<OwnerReportMetric, ColumnGroup>
type Layout = {
  kind: "grouped" | "flat" | "long"
  headerRow: number
  dataStart: number
  propertyColumn: number
  weekColumn: number | null
  groups: ColumnGroups
  warnings: string[]
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/^\uFEFF/, "").trim()
}

function normalizeHeader(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
}

function getMetric(value: string): OwnerReportMetric | null {
  const normalized = normalizeHeader(value)
  // A "showing feedback" column must be treated as feedback, not a count.
  if (metricAliases.feedback.test(normalized)) return "feedback"
  for (const metric of metricOrder) {
    if (metricAliases[metric].test(normalized)) return metric
  }
  return null
}

function getWeek(value: string): OwnerReportWeek | null {
  const normalized = normalizeHeader(value)
  const wordWeeks: Record<string, OwnerReportWeek> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
  }
  const named = normalized.match(/\b(first|second|third|fourth)\s*(?:week|wk)\b/) ??
    normalized.match(/\b(?:week|wk)\s*(first|second|third|fourth)\b/)
  if (named) return wordWeeks[named[1]] ?? null

  const explicit =
    normalized.match(/\b(?:week|wk|w)\s*[-.# ]*\s*0?([1-4])(?:st|nd|rd|th)?\b/) ??
    normalized.match(/\b([1-4])(?:st|nd|rd|th)?\s*(?:week|wk)\b/)
  if (explicit) return Number(explicit[1]) as OwnerReportWeek

  const bare = normalized.match(/^(?:0?([1-4])(?:st|nd|rd|th)?|(?:first|second|third|fourth))$/)
  if (!bare) return null
  return bare[1]
    ? (Number(bare[1]) as OwnerReportWeek)
    : (wordWeeks[normalized] ?? null)
}

function emptyGroups(): ColumnGroups {
  return {
    inquiries: { perWeek: {}, shared: [] },
    appointments: { perWeek: {}, shared: [] },
    showings: { perWeek: {}, shared: [] },
    applications: { perWeek: {}, shared: [] },
    feedback: { perWeek: {}, shared: [] },
  }
}

function addWeekColumn(
  groups: ColumnGroups,
  metric: OwnerReportMetric,
  week: OwnerReportWeek,
  column: number
) {
  const list = groups[metric].perWeek[week] ?? []
  if (!list.includes(column)) list.push(column)
  groups[metric].perWeek[week] = list
}

function addSharedColumn(
  groups: ColumnGroups,
  metric: OwnerReportMetric,
  column: number
) {
  if (!groups[metric].shared.includes(column)) groups[metric].shared.push(column)
}

function groupLabels(row: string[]) {
  return row.flatMap((value, column) => {
    const metric = getMetric(value)
    return metric ? [{ metric, column }] : []
  })
}

function findPropertyColumn(
  rows: string[][],
  headerRows: number[],
  dataStart: number,
  firstMetricColumn: number
): number {
  const explicitColumns = headerRows.flatMap((index) =>
    (rows[index] ?? []).flatMap((value, column) =>
      propertyHeaderPattern.test(normalizeHeader(value)) ? [column] : []
    )
  )

  if (!Number.isFinite(firstMetricColumn) || firstMetricColumn <= 0) {
    return explicitColumns[0] ?? 0
  }

  const sample = rows.slice(dataStart, dataStart + 200)
  const scores = Array.from({ length: firstMetricColumn }, (_, column) => {
    let score = 0
    for (const row of sample) {
      const value = clean(row[column])
      if (!value || /^[-+]?\d+([.,]\d+)?$/.test(value)) continue
      if (/^(address|property|weekly review|total)$/i.test(value)) continue
      score += value.length > 5 ? 2 : 1
    }
    return score
  })

  const bestScore = Math.max(...scores)
  const explicit = explicitColumns.find(
    (column) =>
      column < firstMetricColumn &&
      scores[column] > 0 &&
      scores[column] >= bestScore * 0.8
  )
  if (explicit !== undefined) return explicit

  // A merged "Address" heading can land in column A while actual values
  // appear in column B after exporting the spreadsheet as CSV.
  return scores.findIndex((score) => score === bestScore)
}

function groupedHeaderLayout(rows: string[][]): Layout | null {
  const limit = Math.min(rows.length, 65)

  for (let heading = 0; heading < limit; heading += 1) {
    const labels = groupLabels(rows[heading] ?? [])
    const unique = new Set(labels.map((label) => label.metric))
    if (unique.size < 2) continue

    let weekRow = -1
    let weekCount = 0
    for (let candidate = heading + 1; candidate <= Math.min(heading + 3, limit - 1); candidate += 1) {
      const candidateValues = rows[candidate] ?? []
      const found = candidateValues.filter((value) => getWeek(value) !== null).length
      const clearlyLabeled = candidateValues.filter((value) =>
        /\b(?:week|wk|w\s*[1-4]|[1-4](?:st|nd|rd|th)|first|second|third|fourth)\b/i.test(value)
      ).length
      const propertyHeaderColumn = (rows[heading] ?? []).findIndex((value) =>
        propertyHeaderPattern.test(normalizeHeader(value))
      )
      const propertyCell =
        propertyHeaderColumn >= 0 ? clean(candidateValues[propertyHeaderColumn]) : ""
      const plainNumericWeeks =
        candidateValues.filter((value) => /^[1-4]$/.test(clean(value))).length >= 8 &&
        (!propertyCell || /^(address|property|property address|property name|listing address)$/.test(normalizeHeader(propertyCell)))
      // Ordinary data counts 1, 2, 3, 4 must not become a header row.
      if (found > weekCount && (clearlyLabeled >= 2 || plainNumericWeeks)) {
        weekCount = found
        weekRow = candidate
      }
    }

    // A grouped report has a distinct row with repeated Week 1–4 headings.
    if (weekRow < 0 || weekCount < 3) continue

    const subheaders = rows[weekRow] ?? []
    const starts = subheaders.flatMap((value, column) =>
      getWeek(value) === 1 ? [column] : []
    )
    const groups = emptyGroups()
    const warnings: string[] = []
    const sortedLabels = [...labels].sort((a, b) => a.column - b.column)

    if (starts.length >= 2) {
      // Handles merged group headings exported as an empty span followed by
      // 1st/2nd/3rd/4th week columns. Labels may be centered in the span.
      const blocks = starts.map((start, index) => ({
        start,
        end: starts[index + 1] ?? subheaders.length,
      }))
      for (const [index, block] of blocks.entries()) {
        const inBlock = sortedLabels.filter(
          (label) => label.column >= block.start && label.column < block.end
        )
        const group =
          (sortedLabels.length === blocks.length
            ? sortedLabels[index]?.metric
            : inBlock[0]?.metric) ?? null
        if (!group) continue

        for (let column = block.start; column < block.end; column += 1) {
          const week = getWeek(subheaders[column] ?? "")
          if (week) addWeekColumn(groups, group, week, column)
        }
      }
    } else {
      // Some CSV exporters keep the merged heading but omit "Week 1" from
      // subsequent groups. Use group spans and the visible week labels.
      sortedLabels.forEach((label, index) => {
        const end = sortedLabels[index + 1]?.column ?? subheaders.length
        for (let column = label.column; column < end; column += 1) {
          const week = getWeek(subheaders[column] ?? "")
          if (week) addWeekColumn(groups, label.metric, week, column)
        }
      })
    }

    const recognized = metricOrder.filter((metric) =>
      Object.values(groups[metric].perWeek).some((columns) => columns?.length)
    )
    if (recognized.length < 2) continue

    const propertyColumn = findPropertyColumn(
      rows,
      [heading, weekRow],
      weekRow + 1,
      starts[0] ?? Math.min(...labels.map((label) => label.column))
    )
    warnings.push(
      "Detected grouped weekly headers on CSV rows " +
        (heading + 1) +
        " and " +
        (weekRow + 1) +
        "."
    )

    return {
      kind: "grouped",
      headerRow: heading,
      dataStart: weekRow + 1,
      propertyColumn,
      weekColumn: null,
      groups,
      warnings,
    }
  }
  return null
}

function flatHeaderLayout(rows: string[][]): Layout | null {
  let best: { rowIndex: number; score: number } | null = null

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 65); rowIndex += 1) {
    const headers = rows[rowIndex] ?? []
    const labels = groupLabels(headers)
    const unique = new Set(labels.map((label) => label.metric))
    if (unique.size < 2) continue

    const propertyColumn = headers.findIndex((value) =>
      propertyHeaderPattern.test(normalizeHeader(value))
    )
    const weekCount = labels.filter((label) =>
      getWeek(headers[label.column] ?? "")
    ).length
    const score = unique.size * 4 + weekCount * 2 + (propertyColumn >= 0 ? 5 : 0)
    if (!best || score > best.score) best = { rowIndex, score }
  }

  if (!best) return null

  const headerRow = best.rowIndex
  const headers = rows[headerRow] ?? []
  const labels = groupLabels(headers)
  const groups = emptyGroups()
  const warnings: string[] = []
  let implicitWeeks = false

  labels.forEach((label, index) => {
    const week = getWeek(headers[label.column] ?? "")
    if (week) {
      addWeekColumn(groups, label.metric, week, label.column)
      return
    }

    const next = labels[index + 1]?.column ?? headers.length
    const gap = next - label.column
    const isFourColumnGroup =
      gap === 4 &&
      labels.some((other) =>
        other.column !== label.column &&
        other.column !== next &&
        !getWeek(headers[other.column] ?? "")
      )

    if (isFourColumnGroup) {
      for (let weekNumber = 1; weekNumber <= 4; weekNumber += 1) {
        addWeekColumn(
          groups,
          label.metric,
          weekNumber as OwnerReportWeek,
          label.column + weekNumber - 1
        )
      }
      implicitWeeks = true
    } else {
      addSharedColumn(groups, label.metric, label.column)
    }
  })

  if (implicitWeeks) {
    warnings.push("Four-column metric groups without week labels were read left to right as Weeks 1–4.")
  }

  const weekColumn = headers.findIndex((value) =>
    /^(?:report\s+)?week(?:\s+(?:number|no\.?))?$/.test(normalizeHeader(value))
  )
  const firstMetric = Math.min(...labels.map((label) => label.column))
  const propertyColumn = findPropertyColumn(
    rows,
    [headerRow],
    headerRow + 1,
    firstMetric
  )
  return {
    kind: weekColumn >= 0 ? "long" : "flat",
    headerRow,
    dataStart: headerRow + 1,
    propertyColumn,
    weekColumn: weekColumn < 0 ? null : weekColumn,
    groups,
    warnings,
  }
}

function selectedColumns(
  group: ColumnGroup,
  selectedWeek: OwnerReportWeek
): number[] {
  const weeks = Object.values(group.perWeek).flatMap((columns) => columns ?? [])
  if (weeks.length) return group.perWeek[selectedWeek] ?? []
  return group.shared
}

function mergeUnique(values: string[]): string {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const item of values) {
    const value = clean(item)
    const signature = value.toLowerCase().replace(/\s+/g, " ")
    if (value && !seen.has(signature)) {
      unique.push(value)
      seen.add(signature)
    }
  }
  return unique.join("\n\n")
}

function consolidateMetric(current: string, next: string): string {
  if (!next) return current
  if (!current || current === next) return current || next
  if (/^\d+$/.test(current) && /^\d+$/.test(next)) {
    return String(Number(current) + Number(next))
  }
  return mergeUnique([current, next])
}

function mergeDuplicateRows(rows: OwnerReportImportRow[]): OwnerReportImportRow[] {
  const merged = new Map<string, OwnerReportImportRow>()

  for (const row of rows) {
    const key = normalizePropertyName(row.propertyName)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...row })
      continue
    }
    existing.inquiries = consolidateMetric(existing.inquiries, row.inquiries)
    existing.appointments = consolidateMetric(existing.appointments, row.appointments)
    existing.showings = consolidateMetric(existing.showings, row.showings)
    existing.applications = consolidateMetric(existing.applications, row.applications)
    existing.feedback = mergeUnique([existing.feedback, row.feedback])
  }
  return [...merged.values()]
}

export function parseWeeklyOwnerReportCsv(
  csvText: string,
  week: OwnerReportWeek
): OwnerReportImportResult {
  if (!csvText.trim()) throw new Error("Choose a CSV file first.")
  if (![1, 2, 3, 4].includes(week)) {
    throw new Error("Select Week 1, 2, 3, or 4.")
  }

  const parsed = Papa.parse<string[]>(csvText.replace(/^\uFEFF/, ""), {
    dynamicTyping: false,
    skipEmptyLines: false,
  })
  const rows = parsed.data.map((row) => row.map(clean))
  if (!rows.length) throw new Error("The CSV file is empty.")

  const layout = groupedHeaderLayout(rows) ?? flatHeaderLayout(rows)
  if (!layout) {
    throw new Error(
      "Could not detect Address and activity columns. Supported layouts: two-row group/week headings, flat 'Inquiries Week 1' columns, or Address/Week/Inquiries rows."
    )
  }

  const warnings = [...layout.warnings]
  const missingMetrics = metricOrder.filter((metric) => {
    const group = layout.groups[metric]
    return !group.shared.length && !Object.values(group.perWeek).some((columns) => columns?.length)
  })
  for (const metric of missingMetrics) {
    warnings.push(
      metric.charAt(0).toUpperCase() +
        metric.slice(1) +
        " column not found; imported value will be blank."
    )
  }

  if (parsed.errors.length) {
    warnings.push(
      "The CSV parser found " +
        parsed.errors.length +
        " formatting warning(s). Review the imported rows before sending."
    )
  }

  const imported: OwnerReportImportRow[] = []
  for (let rowIndex = layout.dataStart; rowIndex < rows.length; rowIndex += 1) {
    const source = rows[rowIndex] ?? []
    const propertyName = clean(source[layout.propertyColumn])
    if (
      !propertyName ||
      /^(address|property|property\s+name|weekly\s+review|total|totals|grand\s+total)$/i.test(propertyName)
    ) {
      continue
    }

    if (layout.weekColumn !== null) {
      const rowWeek = getWeek(source[layout.weekColumn] ?? "")
      if (rowWeek !== week) continue
    }

    const values = Object.fromEntries(
      metricOrder.map((metric) => {
        const columns = selectedColumns(layout.groups[metric], week)
        const parts = columns.map((column) => clean(source[column]))
        // A feedback column can contain multiple lines (quoted CSV cells).
        const value =
          metric === "feedback"
            ? mergeUnique(parts)
            : parts.find(Boolean) ?? ""
        return [metric, value]
      })
    ) as Record<OwnerReportMetric, string>

    imported.push({
      id: "csv-row-" + (rowIndex + 1),
      sourceRow: rowIndex + 1,
      propertyName,
      ...values,
    })
  }

  if (!imported.length) {
    throw new Error(
      "No property rows were found for the selected week below the report headers."
    )
  }

  return {
    rows: mergeDuplicateRows(imported),
    headerRow: layout.headerRow + 1,
    propertyColumn: layout.propertyColumn + 1,
    layout: layout.kind,
    warnings,
  }
}

const addressReplacements: Array<[RegExp, string]> = [
  [/\bnorthwest\b|\bnorth\s+west\b/g, "nw"],
  [/\bnortheast\b|\bnorth\s+east\b/g, "ne"],
  [/\bsouthwest\b|\bsouth\s+west\b/g, "sw"],
  [/\bsoutheast\b|\bsouth\s+east\b/g, "se"],
  [/\bnorth\b/g, "n"],
  [/\bsouth\b/g, "s"],
  [/\beast\b/g, "e"],
  [/\bwest\b/g, "w"],
  [/\bstreet\b/g, "st"],
  [/\bavenue\b/g, "ave"],
  [/\bboulevard\b/g, "blvd"],
  [/\bdrive\b/g, "dr"],
  [/\broad\b/g, "rd"],
  [/\blane\b/g, "ln"],
  [/\bterrace\b/g, "ter"],
  [/\bplace\b/g, "pl"],
  [/\bpassage\b/g, "psg"],
  [/\bapartment\b/g, "apt"],
  [/\bunit\s*#?/g, "unit "],
]

export function normalizePropertyName(value: string) {
  let normalized = clean(value).toLowerCase()
  for (const [pattern, replacement] of addressReplacements) {
    normalized = normalized.replace(pattern, replacement)
  }
  return normalized
    .replace(/#/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function firstAddressNumber(value: string) {
  return normalizePropertyName(value).match(/\b\d+[a-z]?\b/)?.[0] ?? ""
}

function propertyScore(source: string, target: string) {
  const left = normalizePropertyName(source)
  const right = normalizePropertyName(target)
  if (!left || !right) return 0
  if (left === right) return 1

  const leftNumber = firstAddressNumber(left)
  const rightNumber = firstAddressNumber(right)
  if (leftNumber && rightNumber && leftNumber !== rightNumber) return 0
  const leftUnit = left.match(/\b(?:unit|apt|suite)\s+(\d+[a-z]?)\b/)?.[1]
  const rightUnit = right.match(/\b(?:unit|apt|suite)\s+(\d+[a-z]?)\b/)?.[1]
  if (leftUnit && rightUnit && leftUnit !== rightUnit) return 0

  const shorterLength = Math.min(left.split(" ").length, right.split(" ").length)
  if (shorterLength >= 3 && (left.includes(right) || right.includes(left))) {
    return 0.96
  }

  const leftTokens = new Set(left.split(" ").filter(Boolean))
  const rightTokens = new Set(right.split(" ").filter(Boolean))
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token)
  ).length
  if (!intersection) return 0

  const smallerSet = Math.min(leftTokens.size, rightTokens.size)
  const union = new Set([...leftTokens, ...rightTokens]).size
  const coverage = intersection / Math.max(1, smallerSet)
  const jaccard = intersection / Math.max(1, union)
  return coverage * 0.72 + jaccard * 0.28
}

export function findConfidentPropertyMatch<T extends MatchableProperty>(
  sourceName: string,
  properties: T[]
): { property: T | null; score: number } {
  const candidates = properties
    .map((property) => ({
      property,
      score: propertyScore(sourceName, property.title),
    }))
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]
  if (!best) return { property: null, score: 0 }

  const secondScore = candidates[1]?.score ?? 0
  const confident =
    (best.score >= 0.96 && best.score - secondScore >= 0.05) ||
    (best.score >= 0.86 && best.score - secondScore >= 0.08)

  return {
    property: confident ? best.property : null,
    score: best.score,
  }
}

export function extractTemplateTokens(...values: string[]) {
  const tokens: string[] = []
  const seen = new Set<string>()
  // Conditional guards are variables too, even when only used in {{#if field}}.
  const pattern = /\{\{\s*(?:#if\s+)?([a-zA-Z0-9_]+)\s*\}\}/g
  for (const value of values) {
    for (const match of value.matchAll(pattern)) {
      const token = match[1]
      if (!token || seen.has(token)) continue
      seen.add(token)
      tokens.push(token)
    }
  }
  return tokens
}

export function defaultTemplateSource(token: string): TemplateValueKey | "" {
  const normalized = token.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (
    normalized.includes("property") &&
    (normalized.includes("address") ||
      normalized.includes("name") ||
      normalized.includes("title"))
  ) return "propertyName"

  if (normalized.includes("inquir") || normalized.includes("enquir")) return "inquiries"
  if (normalized.includes("appoint")) return "appointments"
  if (normalized.includes("showing") || normalized.includes("viewing")) return "showings"
  if (normalized.includes("applic")) return "applications"
  // Owner reports may call the recipient a client, seller, or landlord.
  // Treat these as owner fields so common templates need no manual mapping.
  if (/^(owner|client|seller|landlord|recipient)(full)?name$/.test(normalized)) return "ownerName"
  if (/^(owner|client|seller|landlord|recipient)email$/.test(normalized)) return "ownerEmail"
  if (/^(owner|client|seller|landlord|recipient)phone$/.test(normalized)) return "ownerPhone"
  if (normalized.includes("totalactivity")) return "totalActivity"
  if (normalized.includes("feedbackcount")) return "feedbackCount"
  if (normalized === "fromdate" || normalized === "periodstart") return "fromDate"
  if (normalized === "todate" || normalized === "periodend") return "toDate"
  if (normalized.includes("feedback") || normalized.includes("positive") ||
      normalized.includes("negative") || normalized.includes("summary")) {
    return "feedback"
  }
  if (normalized === "reportperiod") return "reportPeriod"
  if (normalized === "week") return "week"
  return ""
}

export function renderTemplateWithMapping(
  template: string,
  mapping: Record<string, TemplateValueKey | "">,
  values: Record<TemplateValueKey, string>
) {
  // A conditional wraps the entire optional sentence, not just its placeholder.
  // Example: {{#if feedback}}Feedback: {{feedback}}{{/if}}
  const hasValue = (token: string) => {
    const source = mapping[token]
    return Boolean(source && values[source]?.trim())
  }
  let removedBlock = false
  // Consume the line ending when a conditional occupies a complete line.
  const wholeLines = template.replace(
    /^[ \t]*\{\{\s*#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}[ \t]*(\r?\n|$)/gm,
    (_match, token: string, content: string, newline: string) => {
      if (hasValue(token)) return content + newline
      removedBlock = true
      return ""
    }
  )
  const conditional = wholeLines.replace(
    /\{\{\s*#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g,
    (_match, token: string, content: string) => {
      if (hasValue(token)) return content
      removedBlock = true
      return ""
    }
  )
  const withoutEmptyParagraphs = removedBlock
    ? conditional.replace(/(?:\r?\n[ \t]*){3,}/g, "\n\n")
    : conditional

  return withoutEmptyParagraphs.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (fullMatch, token: string) => {
      const source = mapping[token]
      return source ? values[source] ?? "" : fullMatch
    }
  )
}
