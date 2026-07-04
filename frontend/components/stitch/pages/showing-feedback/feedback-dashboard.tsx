"use client"

import { useMemo, useState } from "react"

import type { ShowingFeedbackPropertySummary } from "@/@types/real-estate-api"
import { ShowingFeedbackAutomationPanel } from "@/components/stitch/pages/agency-settings/sections/showing-feedback-automation-panel"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
const thirtyDaysAgo = new Date(Date.now() - 29 * 86_400_000)
  .toISOString()
  .slice(0, 10)

export function ShowingFeedbackDashboard() {
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(today)
  const [manualOpen, setManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const summariesQuery = useShowingFeedbackProperties()
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const schedulingQuery = useSchedulingSettings()
  const summaries = (summariesQuery.data ?? []) as FeedbackPropertySummary[]
  const properties = propertiesQuery.data?.items ?? []
  const selectedProperty =
    summaries.find((item) => item.propertyId === propertyId) ?? null
  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"
  const totals = useMemo(
    () =>
      summaries.reduce(
        (value, item) => ({
          all: value.all + item.feedbackCount,
          positive: value.positive + Number(item.positiveCount ?? 0),
          negative: value.negative + Number(item.negativeCount ?? 0),
        }),
        { all: 0, positive: 0, negative: 0 }
      ),
    [summaries]
  )

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="shadow-none">
          <CardHeader className="gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">Showing feedback</CardTitle>
                <Badge variant="outline">{timeZone}</Badge>
              </div>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                Review replies by property and sentiment, manage the automatic
                weekly report, and send owner summaries from one workspace.
              </CardDescription>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
              <ActionButton
                icon="add"
                label="Add feedback"
                onClick={() => setManualOpen(true)}
                variant="outline"
              />
              <ActionButton
                icon="upload_file"
                label="Import CSV"
                onClick={() => setImportOpen(true)}
                variant="outline"
              />
              <ActionButton
                icon="send"
                label="Owner report"
                onClick={() => setReportOpen(true)}
              />
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon="home_work"
            label="Properties"
            value={summaries.length}
          />
          <Metric icon="rate_review" label="All feedback" value={totals.all} />
          <Metric icon="thumb_up" label="Positive" value={totals.positive} />
          <Metric icon="thumb_down" label="Negative" value={totals.negative} />
        </section>

        <ShowingFeedbackAutomationPanel />

        <FeedbackRegistry
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          onPropertyChange={setPropertyId}
          onToDateChange={setToDate}
          propertyId={propertyId}
          summaries={summaries}
          timeZone={timeZone}
          toDate={toDate}
        />
      </div>

      <ShowingFeedbackEntryDialogsV2
        importOpen={importOpen}
        manualOpen={manualOpen}
        onImportOpenChange={setImportOpen}
        onManualOpenChange={setManualOpen}
        properties={properties}
        timeZone={timeZone}
      />

      <FeedbackReportSheet
        fromDate={fromDate}
        onOpenChange={setReportOpen}
        open={reportOpen}
        propertyId={propertyId}
        propertyTitle={selectedProperty?.propertyTitle ?? ""}
        timeZone={timeZone}
        toDate={toDate}
      />
    </main>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  variant,
}: {
  icon: string
  label: string
  onClick: () => void
  variant?: "outline"
}) {
  return (
    <Button
      className="min-w-36"
      onClick={onClick}
      size="lg"
      type="button"
      variant={variant}
    >
      <AppIcon name={icon} />
      {label}
    </Button>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: number
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex min-h-28 items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl border bg-muted/30">
          <AppIcon name={icon} />
        </span>
      </CardContent>
    </Card>
  )
}
