export function formatDateTimeInZone(
  value: string | Date | null | undefined,
  timeZone: string,
) {
  if (!value) return "Not set"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Not set"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    hour12: true,
    timeStyle: "short",
    timeZone,
  }).format(date)
}

export function dateKeyInZone(timeZone: string, value: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toDateTimeLocalInZone(
  value: string | Date | null | undefined,
  timeZone: string,
) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
