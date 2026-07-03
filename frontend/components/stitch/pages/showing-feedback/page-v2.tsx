"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  usePreviewShowingFeedbackReport,
  useSendShowingFeedbackReport,
  useShowingFeedback,
  useShowingFeedbackProperties,
} from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"
import { formatDateTimeLabel } from "@/lib/admin-portal"

import { ShowingFeedbackEntryDialogsV2 } from "./showing-feedback-entry-dialogs-v2"

const today = new Date().toISOString().slice(0, 10)

export function ShowingFeedbackPageV2() {
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [manualOpen, setManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [templateId, setTemplateId] = useState("")
  const [maxFeedback, setMaxFeedback] = useState(5)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [summarize, setSummarize] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const summariesQuery = useShowingFeedbackProperties()
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const schedulingQuery = useSchedulingSettings()
  const feedbackQuery = useShowingFeedback({
    fromDate,
    page,
    pageSize: 10,
    propertyId,
    toDate,
  })
  const templatesQuery = useLeadOutreachTemplates()
  const previewMutation = usePreviewShowingFeedbackReport()
  const sendMutation = useSendShowingFeedbackReport()

  const summaries = summariesQuery.data ?? []
  const properties = propertiesQuery.data?.items ?? []
  const selectedProperty = summaries.find((item) => item.propertyId === propertyId) ?? null
  const templates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) =>
          template.isActive !== false && template.audience === "OwnerFeedback",
      ),
    [templatesQuery.data],
  )
  const selectedTemplate = templates.find((template) => template.id === templateId)
  const totalFeedback = summaries.reduce((total, item) => total + item.feedbackCount, 0)
  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"

  async function previewReport(nextSummarize = summarize) {
    setReportError(null)
    if (!propertyId || !templateId) {
      setReportError("Choose a property and owner feedback template.")
      return
    }
    const response = await previewMutation.mutateAsync({
      fromDate,
      maxFeedback,
      propertyId,
      summarize: nextSummarize,
      templateId,
      toDate,
    })
    if (response.error) {
      setReportError(response.error.message)
      return
    }
    if (response.data) {
      setPreview({ body: response.data.body, subject: response.data.subject })
    }
  }

  async function sendReport() {
    setReportError(null)
    if (!propertyId || !templateId) {
      setReportError("Choose a property and owner feedback template.")
      return
    }
    const channels = [
      emailEnabled ? "Email" : null,
      smsEnabled ? "Sms" : null,
    ].filter((item): item is "Email" | "Sms" => item !== null)
    if (channels.length === 0) {
      setReportError("Choose Email, SMS, or both.")
      return
    }

    const response = await sendMutation.mutateAsync({
      channels,
      fromDate,
      maxFeedback,
      propertyId,
      summarize,
      templateId,
      toDate,
    })
    if (response.error) {
      setReportError(response.error.message)
      return
    }
    if (response.data) {
      setPreview({ body: response.data.body, subject: response.data.subject })
    }
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl text-foreground">
                  {"Showing feedback"}
                </CardTitle>
                <Badge variant="outline">{timeZone}</Badge>
              </div>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                {"Store feedback from inbound replies, single entry, or mapped CSV imports. Review by property and send compact owner reports from templates."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setManualOpen(true)} type="button" variant="outline">
                <AppIcon name="add" />
                {"Add feedback"}
              </Button>
              <Button onClick={() => setImportOpen(true)} type="button" variant="outline">
                <AppIcon name="upload_file" />
                {"Import CSV"}
              </Button>
              <Button onClick={() => setReportOpen(true)} type="button">
                <AppIcon name="send" />
                {"Owner report"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard icon="home_work" label="Properties with feedback" value={summaries.length} />
          <MetricCard icon="rate_review" label="Saved feedback" value={totalFeedback} />
          <MetricCard icon="description" label="Owner templates" value={templates.length} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{"Properties"}</CardTitle>
              <CardDescription>{"Select a property to review its feedback."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {summariesQuery.isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{"Loading properties..."}</p>
              ) : summaries.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {"No feedback saved yet. Add one entry or import a CSV."}
                </p>
              ) : (
                summaries.map((property) => (
                  <Button
                    className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                    key={property.propertyId}
                    onClick={() => {
                      setPropertyId(property.propertyId)
                      setPage(1)
                    }}
                    type="button"
                    variant={propertyId === property.propertyId ? "secondary" : "ghost"}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">
                        {property.propertyTitle}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {property.propertyLocation || "No location"}
                      </span>
                      <span className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{`${property.feedbackCount} feedback`}</span>
                        <span>
                          {property.latestFeedbackAt
                            ? formatDateTimeLabel(property.latestFeedbackAt)
                            : ""}
                        </span>
                      </span>
                    </span>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <CardTitle className="text-base">
                  {selectedProperty?.propertyTitle ?? "Feedback registry"}
                </CardTitle>
                <CardDescription>
                  {"Date filters use the first message date linked to the showing."}
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">{"From"}</Label><Input onChange={(event) => { setFromDate(event.target.value); setPage(1) }} type="date" value={fromDate} /></div>
                <div className="space-y-1"><Label className="text-xs">{"To"}</Label><Input onChange={(event) => { setToDate(event.target.value); setPage(1) }} type="date" value={toDate} /></div>
              </div>
            </CardHeader>
            <CardContent>
              {!propertyId ? (
                <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                  {"Choose a property from the left."}
                </div>
              ) : feedbackQuery.isLoading ? (
                <p className="py-14 text-center text-sm text-muted-foreground">{"Loading feedback..."}</p>
              ) : feedbackQuery.error ? (
                <Alert variant="destructive"><AlertDescription>{feedbackQuery.error.message}</AlertDescription></Alert>
              ) : (feedbackQuery.data?.items.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                  {"No feedback in this date range."}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[820px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{"First message"}</TableHead>
                          <TableHead>{"Realtor"}</TableHead>
                          <TableHead>{"Channel"}</TableHead>
                          <TableHead>{"Sentiment"}</TableHead>
                          <TableHead>{"Feedback"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(feedbackQuery.data?.items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="whitespace-nowrap font-medium text-foreground">
                              {formatDateTimeLabel(item.firstMessageAt)}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground">{item.realtorName || "Realtor"}</p>
                              <p className="max-w-48 truncate text-xs text-muted-foreground">{item.realtorContact || "No contact"}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline">{item.channel === "Sms" ? "SMS" : "Email"}</Badge></TableCell>
                            <TableCell><Badge variant={item.sentiment === "negative" ? "destructive" : "secondary"}>{item.sentiment}</Badge></TableCell>
                            <TableCell className="max-w-[430px] whitespace-pre-wrap text-foreground">{item.feedbackText}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" type="button" variant="outline">{"Previous"}</Button>
                    <span className="text-xs text-muted-foreground">{`Page ${feedbackQuery.data?.page ?? page} of ${feedbackQuery.data?.totalPages ?? 1}`}</span>
                    <Button disabled={!feedbackQuery.data || page >= feedbackQuery.data.totalPages} onClick={() => setPage((current) => current + 1)} size="sm" type="button" variant="outline">{"Next"}</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ShowingFeedbackEntryDialogsV2
        importOpen={importOpen}
        manualOpen={manualOpen}
        onImportOpenChange={setImportOpen}
        onManualOpenChange={setManualOpen}
        properties={properties}
        timeZone={timeZone}
      />

      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent className="sm:w-[38rem] sm:max-w-[38rem]">
          <SheetHeader className="border-b">
            <SheetTitle>{"Owner feedback report"}</SheetTitle>
            <SheetDescription>
              {"Select a template and delivery channels, preview the rendered report, then send it to the property owner."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            {reportError ? <Alert variant="destructive"><AlertDescription>{reportError}</AlertDescription></Alert> : null}
            <div className="rounded-xl border bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">{selectedProperty?.propertyTitle ?? "No property selected"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{`${fromDate} to ${toDate}`}</p>
            </div>
            <div className="space-y-2">
              <Label>{"Owner feedback template"}</Label>
              <Select onValueChange={(value) => setTemplateId(value === "none" ? "" : value)} value={templateId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{"Choose template"}</SelectItem>
                  {templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {templates.length === 0 ? (
                <Button className="h-auto p-0" render={<Link href="/dashboard/settings#communication-templates" />} variant="link">{"Create an owner feedback template in settings"}</Button>
              ) : null}
            </div>
            <div className="space-y-2"><Label>{"Maximum feedback items"}</Label><Input max={50} min={1} onChange={(event) => setMaxFeedback(Math.min(50, Math.max(1, Number(event.target.value) || 1)))} type="number" value={maxFeedback} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Toggle checked={emailEnabled} label="Email" onChange={setEmailEnabled} />
              <Toggle checked={smsEnabled} label="SMS" onChange={setSmsEnabled} />
              <Toggle checked={summarize} label="AI summary" onChange={setSummarize} />
            </div>
            <div className="space-y-2"><Label>{"Subject preview"}</Label><Input readOnly value={preview?.subject ?? selectedTemplate?.subject ?? ""} /></div>
            <div className="space-y-2"><Label>{"Message preview"}</Label><Textarea className="min-h-72" readOnly value={preview?.body ?? selectedTemplate?.body ?? ""} /></div>
          </div>
          <SheetFooter>
            <Button disabled={!propertyId || !templateId || previewMutation.isPending} onClick={() => void previewReport()} type="button" variant="outline">{previewMutation.isPending ? "Rendering..." : "Preview"}</Button>
            <Button disabled={!propertyId || !templateId || sendMutation.isPending} onClick={() => void sendReport()} type="button">{sendMutation.isPending ? "Sending..." : "Send to owner"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  )
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value}</p></div>
        <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground"><AppIcon name={icon} /></span>
      </CardContent>
    </Card>
  )
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>
}
