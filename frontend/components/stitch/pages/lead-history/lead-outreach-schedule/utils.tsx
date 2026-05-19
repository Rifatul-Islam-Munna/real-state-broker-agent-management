import type { ReactNode } from "react"

import type { LeadCampaignImportBatch } from "@/@types/real-estate-api"

import type { FeedbackState, LeadFieldKey, OutreachKind } from "./types"
import { channelOptions } from "./constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function SectionIntro({
  eyebrow,
  helper,
  title,
}: {
  eyebrow: string
  helper: string
  title: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/75">{eyebrow}</p>
      <h2 className="text-2xl font-black tracking-tight text-foreground md:text-[2rem]">{title}</h2>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{helper}</p>
    </div>
  )
}

export function StepBlock({ children, number, title }: { children: ReactNode; number: string; title: string }) {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,245,241,0.78))] p-5">
      <div className="flex items-center gap-3 border-b border-border/70 pb-4">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground shadow-[0_8px_18px_-12px_color-mix(in_oklab,var(--color-primary)_80%,black)]">
          {number}
        </div>
        <h3 className="text-lg font-black tracking-tight text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  )
}

export function FeedbackBox({ error, feedback }: { error: string | null; feedback: FeedbackState | null }) {
  if (error) {
    return <div className="rounded-[1.4rem] border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive">{error}</div>
  }

  if (!feedback) {
    return null
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        feedback.tone === "warning"
          ? "border-accent/30 bg-accent/10 text-foreground"
          : "border-primary/20 bg-primary/10 text-foreground"
      }`}
    >
      <p className="font-semibold">{feedback.message}</p>
      {feedback.details.map((detail) => (
        <p key={detail} className="mt-1 text-xs font-medium text-muted-foreground">
          {detail}
        </p>
      ))}
    </div>
  )
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,245,241,0.82))] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const className =
    status === "Failed"
      ? "border-destructive/25 bg-destructive/5 text-destructive"
      : status === "Scheduled"
        ? "border-accent/30 bg-accent/10 text-foreground"
        : status === "CompletedWithSkips"
          ? "border-accent/30 bg-accent/10 text-foreground"
          : "border-primary/20 bg-primary/10 text-primary"

  return <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${className}`}>{status}</span>
}

export function ChannelComposerCard({
  activeKinds,
  body,
  heading,
  isEnabled,
  onBodyChange,
  onEnabledChange,
  onKindsChange,
  onScheduleChange,
  onTitleChange,
  scheduleAt,
  title,
}: {
  activeKinds: OutreachKind[]
  body: string
  heading: string
  isEnabled: boolean
  onBodyChange: (value: string) => void
  onEnabledChange?: (checked: boolean) => void
  onKindsChange: (value: OutreachKind[]) => void
  onScheduleChange: (value: string) => void
  onTitleChange: (value: string) => void
  scheduleAt: string
  title: string
}) {
  return (
    <Card className="rounded-[1.75rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,245,241,0.82))] shadow-none">
      <CardHeader className="border-b border-border/70">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-black tracking-tight">{heading}</CardTitle>
          {onEnabledChange ? (
            <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <input checked={isEnabled} onChange={(event) => onEnabledChange(event.target.checked)} type="checkbox" />
              <span>{"Enable"}</span>
            </label>
          ) : null}
        </div>
        <CardDescription>{"Check one or many channels."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnabled ? (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              {channelOptions.map((option) => {
                const active = activeKinds.includes(option.kind)

                return (
                  <button
                    key={`${heading}-${option.kind}`}
                    className={`cursor-pointer rounded-[1.35rem] border px-3 py-3 text-left transition-colors duration-200 ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-foreground"
                    }`}
                    onClick={() =>
                      onKindsChange(
                        active ? activeKinds.filter((item) => item !== option.kind) : [...activeKinds, option.kind],
                      )}
                    type="button"
                  >
                    <p className="text-sm font-bold">{option.label}</p>
                    <p className="mt-1 text-xs">{option.helper}</p>
                  </button>
                )
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Subject / title">
                <Input className="rounded-2xl bg-background" onChange={(event) => onTitleChange(event.target.value)} value={title} />
              </Field>
              <Field label="Scheduled time">
                <Input className="rounded-2xl bg-background" onChange={(event) => onScheduleChange(event.target.value)} type="datetime-local" value={scheduleAt} />
              </Field>
            </div>

            <Field label="Message body">
              <Textarea className="min-h-40 rounded-3xl bg-background" onChange={(event) => onBodyChange(event.target.value)} value={body} />
            </Field>
          </>
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">{"Disabled for this campaign."}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function buildHistoryHref(pathname: string, leadId: number) {
  return pathname.startsWith("/agent")
    ? `/agent/lead?view=history&leadId=${leadId}`
    : `/admin/lead-history?leadId=${leadId}`
}

export function buildImportSummary(batch: LeadCampaignImportBatch) {
  const parts = [
    `${batch.importedCount}/${batch.totalRows} leads ready`,
    batch.sentCount > 0 ? `${batch.sentCount} sent` : null,
    batch.scheduledCount > 0 ? `${batch.scheduledCount} scheduled` : null,
    batch.skippedCount > 0 ? `${batch.skippedCount} skipped` : null,
    batch.failedCount > 0 ? `${batch.failedCount} failed` : null,
  ].filter(Boolean)

  return parts.join(" | ")
}

export function autoMapLeadFields(current: Record<LeadFieldKey, string>, headers: string[]): Record<LeadFieldKey, string> {
  const headerMap = new Map(headers.map((header) => [normalizeTokenKey(header), header]))

  return {
    ...current,
    name: current.name || headerMap.get("name") || headerMap.get("full name") || "",
    email: current.email || headerMap.get("email") || headerMap.get("email address") || "",
    phone: current.phone || headerMap.get("phone") || headerMap.get("phone number") || "",
    summary: current.summary || headerMap.get("summary") || headerMap.get("message") || "",
    property: current.property || headerMap.get("property") || headerMap.get("property address") || "",
    budget: current.budget || headerMap.get("budget") || "",
    source: current.source || headerMap.get("source") || "",
    interest: current.interest || headerMap.get("interest") || "",
    timeline: current.timeline || headerMap.get("timeline") || "",
    agent: current.agent || headerMap.get("agent") || headerMap.get("agent name") || "",
    notes: current.notes || headerMap.get("notes") || "",
  }
}

export function autoMapVariableTokens(current: Record<string, string>, tokens: string[], headers: string[]) {
  const headerMap = new Map(headers.map((header) => [normalizeTokenKey(header), header]))
  const next = { ...current }

  tokens.forEach((token) => {
    if (next[token]) {
      return
    }

    const normalized = normalizeTokenKey(token.replaceAll("{", "").replaceAll("}", "").replaceAll("_", " "))
    next[token] = headerMap.get(normalized) || ""
  })

  return next
}

export function parseVariableTokensText(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("{{") && item.endsWith("}}") ? item : `{{${item.replace(/[{}]/g, "").trim()}}}`)),
    ),
  )
}

export function normalizeTokenKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

export function extractTemplateTokens(value: string) {
  return Array.from(value.matchAll(/{{\s*[\w.-]+\s*}}/g)).map((item) => item[0])
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function removeEmptyEntries<T extends Record<string, string>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry)) as T
}

export function parseCsv(csvText: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const rows: string[][] = []
  let current = ""
  let currentRow: string[] = []
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        current += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }

      continue
    }

    if (character === "," && !inQuotes) {
      currentRow.push(current.trim())
      current = ""
      continue
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      currentRow.push(current.trim())
      if (currentRow.some((item) => item.length > 0)) {
        rows.push(currentRow)
      }
      current = ""
      currentRow = []
      continue
    }

    current += character
  }

  currentRow.push(current.trim())
  if (currentRow.some((item) => item.length > 0)) {
    rows.push(currentRow)
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = rows[0].map((header, index) => header || `column_${index + 1}`)
  const dataRows = rows.slice(1).filter((row) => row.some((item) => item.length > 0))

  return {
    headers,
    rows: dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))),
  }
}
