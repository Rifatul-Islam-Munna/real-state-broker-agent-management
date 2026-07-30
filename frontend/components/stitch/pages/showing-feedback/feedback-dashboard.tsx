"use client"

import Link from "next/link"
import type { ReactElement } from "react"
import { useMemo, useState } from "react"

import type { ShowingFeedbackPropertySummary } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { useShowingFeedbackProperties } from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"

import { FeedbackRegistry } from "./feedback-registry"
import { FeedbackReportSheet } from "./feedback-report-sheet"
import { ShowingFeedbackEntryDialogsV2 } from "./showing-feedback-entry-dialogs-v2"

export type FeedbackPropertySummary = ShowingFeedbackPropertySummary & {
  positiveCount?: number
  negativeCount?: number
  neutralCount?: number
}

const today = new Date().toISOString().slice(0, 10)
const thirtyDaysAgo = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10)

export function ShowingFeedbackDashboard() {
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(today)
  const [manualOpen, setManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const summariesQuery = useShowingFeedbackProperties()
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const schedulingQuery = useSchedulingSettings()
  const summaries = useMemo(
    () => (summariesQuery.data ?? []) as FeedbackPropertySummary[],
    [summariesQuery.data],
  )
  const properties = propertiesQuery.data?.items ?? []
  const selectedProperty = summaries.find((item) => item.propertyId === propertyId) ?? null
  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"

  const totals = useMemo(
    () =>
      summaries.reduce(
        (value, item) => ({
          all: value.all + item.feedbackCount,
          positive: value.positive + Number(item.positiveCount ?? 0),
          negative: value.negative + Number(item.negativeCount ?? 0),
          neutral: value.neutral + Number(item.neutralCount ?? 0),
        }),
        { all: 0, positive: 0, negative: 0, neutral: 0 },
      ),
    [summaries],
  )

  const positiveRate = totals.all > 0 ? Math.round((totals.positive / totals.all) * 100) : 0
  const negativeRate = totals.all > 0 ? Math.round((totals.negative / totals.all) * 100) : 0
  const responseCoverage = summaries.length > 0
    ? Math.round((summaries.filter((item) => item.feedbackCount > 0).length / summaries.length) * 100)
    : 0

  function exportSummary() {
    const rows = [
      ["Property", "Feedback", "Positive", "Neutral", "Negative"],
      ...summaries.map((item) => [
        item.propertyTitle,
        String(item.feedbackCount),
        String(item.positiveCount ?? 0),
        String(item.neutralCount ?? 0),
        String(item.negativeCount ?? 0),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "showing-feedback-summary.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
              <span>Lead Tracking</span>
              <AppIcon className="text-sm" name="chevron_right" />
              <span className="font-bold text-[var(--ether-primary)]">Showing Feedback</span>
            </div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Showing Feedback Registry</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" onClick={() => setAdvancedOpen((value) => !value)} type="button" variant="outline"><AppIcon name="filter_list" />Advanced Filters</Button>
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" onClick={() => setManualOpen(true)} type="button" variant="outline"><AppIcon name="add" />Add Feedback</Button>
            <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)]" onClick={exportSummary} type="button"><AppIcon name="download" />Export Data</Button>
          </div>
        </section>

        {summariesQuery.error ? <Alert variant="destructive"><AlertDescription>{summariesQuery.error.message}</AlertDescription></Alert> : null}

        <section className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-[var(--shadow-surface-1)] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-6 xl:gap-8">
            <CompactMetric icon="all_inclusive" label="Total" tone="primary" value={totals.all} />
            <Divider />
            <CompactMetric icon="thumb_up" label="Positive" tone="secondary" value={totals.positive} />
            <Divider />
            <CompactMetric icon="thumb_down" label="Negative" tone="tertiary" value={totals.negative} />
            <Divider />
            <CompactMetric icon="home_work" label="Properties" tone="primary" value={summaries.length} />
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-lg bg-[var(--ether-surface-container-low)] px-3 py-2 text-xs font-bold text-[var(--ether-on-surface)] xl:self-auto">
            <AppIcon className="text-[var(--ether-secondary)]" name="trending_up" />
            {positiveRate}% positive sentiment
          </div>
        </section>

        <FeedbackRegistry
          advancedOpen={advancedOpen}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          onPropertyChange={setPropertyId}
          onToDateChange={setToDate}
          propertyId={propertyId}
          summaries={summaries}
          timeZone={timeZone}
          toDate={toDate}
        />

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Feedback Health</h2>
              <AppIcon className="text-[var(--ether-primary)]" name="analytics" />
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <HealthBar label="Positive Rate" tone="secondary" value={positiveRate} />
              <HealthBar label="Negative Rate" tone="tertiary" value={negativeRate} />
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] pt-5">
              <span className="text-xs text-[var(--ether-on-surface-variant)]">Properties with feedback</span>
              <span className="text-sm font-bold text-[var(--ether-primary)]">{responseCoverage}%</span>
            </div>
          </article>

          <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Feedback Actions</h2>
              <AppIcon className="text-[var(--ether-secondary)]" name="lightbulb" />
            </div>
            <div className="mt-6 space-y-3">
              <ActionRow icon="person_search" label="Open lead feedback" render={<Link href="/dashboard/showing-feedback/leads" />} />
              <ActionRow icon="schedule_send" label="Manage feedback automation" render={<Link href="/dashboard/showing-feedback-automation" />} />
              <ActionRow icon="upload_file" label="Import feedback CSV" onClick={() => setImportOpen(true)} />
              <ActionRow disabled={!propertyId} icon="send" label="Create owner report" onClick={() => setReportOpen(true)} />
            </div>
          </article>
        </section>
      </div>

      <ShowingFeedbackEntryDialogsV2 importOpen={importOpen} manualOpen={manualOpen} onImportOpenChange={setImportOpen} onManualOpenChange={setManualOpen} properties={properties} timeZone={timeZone} />
      <FeedbackReportSheet fromDate={fromDate} onOpenChange={setReportOpen} open={reportOpen} propertyId={propertyId} propertyTitle={selectedProperty?.propertyTitle ?? ""} timeZone={timeZone} toDate={toDate} />
    </main>
  )
}

function CompactMetric({ icon, label, tone, value }: { icon: string; label: string; tone: "primary" | "secondary" | "tertiary"; value: number }) {
  const toneClass = tone === "secondary" ? "bg-[var(--ether-secondary-container)]/40 text-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return <div className="flex items-center gap-3"><span className={`flex size-9 items-center justify-center rounded-lg ${toneClass}`}><AppIcon name={icon} /></span><div><p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{label}</p><p className="mt-1 text-xl font-bold text-[var(--ether-on-surface)]">{value.toLocaleString()}</p></div></div>
}

function Divider() {
  return <span className="hidden h-9 w-px bg-[color-mix(in_srgb,var(--ether-outline-variant)_45%,transparent)] sm:block" />
}

function HealthBar({ label, tone, value }: { label: string; tone: "secondary" | "tertiary"; value: number }) {
  return <div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-[var(--ether-on-surface-variant)]">{label}</span><span className={tone === "secondary" ? "font-bold text-[var(--ether-secondary)]" : "font-bold text-[var(--ether-error)]"}>{value}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ether-surface-container-high)]"><div className={tone === "secondary" ? "h-full rounded-full bg-[var(--ether-secondary)]" : "h-full rounded-full bg-[var(--ether-error)]"} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>
}

function ActionRow({ disabled, icon, label, onClick, render }: { disabled?: boolean; icon: string; label: string; onClick?: () => void; render?: ReactElement }) {
  return <Button className="h-11 w-full justify-start rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 text-sm font-semibold" disabled={disabled} onClick={onClick} render={render} variant="outline"><AppIcon className="text-[var(--ether-primary)]" name={icon} />{label}</Button>
}
