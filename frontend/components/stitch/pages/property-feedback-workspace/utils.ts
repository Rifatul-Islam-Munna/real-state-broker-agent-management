export const feedbackTabItems = [
  { value: "manual", label: "Manual Feedback" },
  { value: "imports", label: "CSV Imports" },
  { value: "requests", label: "Reply Queue" },
] as const

export type FeedbackTab = (typeof feedbackTabItems)[number]["value"]

export function parseCsv(csvText: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const normalized = csvText.replace(/\r/g, "").trim()
  if (!normalized) {
    return { headers: [], rows: [] }
  }

  const lines = normalized.split("\n").filter(Boolean)
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = splitCsvLine(lines[0]).map((item) => item.trim()).filter(Boolean)
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = values[index] ?? ""
      return record
    }, {})
  })

  return { headers, rows }
}

function splitCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }

    current += character
  }

  values.push(current.trim())
  return values
}

export function autoMap(columns: string[], aliases: Record<string, string[]>) {
  const mapped: Record<string, string> = {}

  Object.entries(aliases).forEach(([target, candidates]) => {
    const match = columns.find((column) =>
      candidates.some((candidate) => column.trim().toLowerCase() === candidate.toLowerCase()),
    )

    if (match) {
      mapped[target] = match
    }
  })

  return mapped
}
