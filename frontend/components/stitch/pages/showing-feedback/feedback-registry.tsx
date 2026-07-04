"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useShowingFeedback } from "@/hooks/use-realtor-showings-api"
import { formatDateTimeInZone } from "@/lib/time-zone"

import type { FeedbackPropertySummary } from "./feedback-dashboard"

type SentimentFilter = "all" | "positive" | "negative" | "neutral"

export function FeedbackRegistry({
  fromDate,
  onFromDateChange,
  onPropertyChange,
  onToDateChange,
  propertyId,
  summaries,
  timeZone,
  toDate,
}: {
  fromDate: string
  onFromDateChange: (value: string) => void
  onPropertyChange: (value: number | null) => void
  onToDateChange: (value: string) => void
  propertyId: number | null
  summaries: FeedbackPropertySummary[]
  timeZone: string
  toDate: string
}) {
  const [page, setPage] = useState(1)
  const [sentiment, setSentiment] = useState<SentimentFilter>("all")
  const selected = summaries.find((item) => item.propertyId === propertyId)
  const query = useShowingFeedback({
    propertyId,
    page,
    pageSize: 10,
    fromDate,
    toDate,
    sentiment: sentiment === "all" ? undefined : sentiment,
  })

  function resetPage(action: () => void) {
    action()
    setPage(1)
  }

  function count(filter: SentimentFilter) {
    if (!selected) return 0
    if (filter === "all") return selected.feedbackCount
    return Number(selected[`${filter}Count`] ?? 0)
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-5 border-b">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle className="text-lg">
              {selected?.propertyTitle ?? "Feedback registry"}
            </CardTitle>
            <CardDescription className="mt-1 leading-6">
              Filter property replies by date and sentiment. Times use the
              agency timezone.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[760px]">
            <div className="space-y-1.5">
              <Label className="text-xs">Property</Label>
              <Select
                value={propertyId ? String(propertyId) : "none"}
                onValueChange={(value) =>
                  resetPage(() =>
                    onPropertyChange(value === "none" ? null : Number(value))
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose property</SelectItem>
                  {summaries.map((item) => (
                    <SelectItem
                      key={item.propertyId}
                      value={String(item.propertyId)}
                    >
                      {item.propertyTitle} · {item.feedbackCount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateField
              label="From"
              value={fromDate}
              onChange={(value) => resetPage(() => onFromDateChange(value))}
            />
            <DateField
              label="To"
              value={toDate}
              onChange={(value) => resetPage(() => onToDateChange(value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "positive", "negative", "neutral"] as const).map(
            (filter) => (
              <Button
                className="min-w-28 justify-between gap-3"
                key={filter}
                onClick={() => resetPage(() => setSentiment(filter))}
                type="button"
                variant={sentiment === filter ? "secondary" : "outline"}
              >
                <span className="capitalize">{filter}</span>
                <Badge variant="outline">{count(filter)}</Badge>
              </Button>
            )
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!propertyId ? (
          <EmptyState text="Choose a property to open its feedback registry." />
        ) : query.isLoading ? (
          <EmptyState text="Loading feedback..." />
        ) : query.error ? (
          <div className="p-5">
            <Alert variant="destructive">
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
          </div>
        ) : !query.data?.items.length ? (
          <EmptyState
            text={`No ${sentiment === "all" ? "" : `${sentiment} `}feedback in this date range.`}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[1040px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Reply received</TableHead>
                    <TableHead>Realtor</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Classifier</TableHead>
                    <TableHead className="pr-5">Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap pl-5 font-medium">
                        {formatDateTimeInZone(item.receivedAt, timeZone)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {item.realtorName || "Realtor"}
                        </p>
                        <p className="max-w-52 truncate text-xs text-muted-foreground">
                          {item.realtorContact || "No contact"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.channel === "Sms" ? "SMS" : "Email"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={item.sentiment} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.classifier || "Unknown"}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Math.round((item.confidence ?? 0) * 100)}% confidence
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[460px] whitespace-pre-wrap pr-5 leading-6">
                        {item.feedbackText}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                {query.data.totalCount} matching items
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="min-w-24 text-center text-xs text-muted-foreground">
                  Page {query.data.page} of {query.data.totalPages}
                </span>
                <Button
                  disabled={page >= query.data.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="m-5 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (sentiment === "negative")
    return <Badge variant="destructive">Negative</Badge>
  if (sentiment === "positive")
    return <Badge variant="secondary">Positive</Badge>
  return <Badge variant="outline">Neutral</Badge>
}
