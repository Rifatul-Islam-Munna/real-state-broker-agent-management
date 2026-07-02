"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  usePreviewShowingFeedbackReport,
  useSendShowingFeedbackReport,
  useShowingFeedback,
  useShowingFeedbackProperties,
} from "@/hooks/use-realtor-showings-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

const today = new Date().toISOString().slice(0, 10)

export function ShowingFeedbackPage() {
  const [propertyId, setPropertyId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [templateId, setTemplateId] = useState("")
  const [maxFeedback, setMaxFeedback] = useState(5)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [summarize, setSummarize] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)

  const propertiesQuery = useShowingFeedbackProperties()
  const feedbackQuery = useShowingFeedback({ fromDate, page, pageSize: 10, propertyId, toDate })
  const templatesQuery = useLeadOutreachTemplates()
  const previewMutation = usePreviewShowingFeedbackReport()
  const sendMutation = useSendShowingFeedbackReport()

  const properties = propertiesQuery.data ?? []
  const selectedProperty = properties.find((item) => item.propertyId === propertyId) ?? null
  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.isActive !== false && template.audience === "OwnerFeedback"),
    [templatesQuery.data],
  )
  const selectedTemplate = templates.find((template) => template.id === templateId)

  async function handlePreview(nextSummarize = summarize) {
    if (!propertyId || !templateId) return
    const response = await previewMutation.mutateAsync({
      fromDate,
      maxFeedback,
      propertyId,
      summarize: nextSummarize,
      templateId,
      toDate,
    })
    if (response.data) setPreview({ body: response.data.body, subject: response.data.subject })
  }

  async function handleSend() {
    if (!propertyId || !templateId) return
    const channels = [emailEnabled ? "Email" : "", smsEnabled ? "Sms" : ""].filter(Boolean) as Array<"Email" | "Sms">
    const response = await sendMutation.mutateAsync({
      channels,
      fromDate,
      maxFeedback,
      propertyId,
      summarize,
      templateId,
      toDate,
    })
    if (response.data) setPreview({ body: response.data.body, subject: response.data.subject })
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{"Showing Feedback"}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {"AI filters realtor Email/SMS replies, stores real property feedback by first message date, then sends owner reports from templates."}
          </p>
        </div>
        <Button render={<Link href="/dashboard/settings#communication-templates" />} variant="outline">
          <AppIcon data-icon="inline-start" name="edit_note" />
          {"Owner Templates"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{"Properties"}</CardTitle>
            <CardDescription>{"Only properties with saved feedback show here."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {propertiesQuery.isLoading ? <p className="text-sm text-muted-foreground">{"Loading..."}</p> : null}
            {properties.map((property) => (
              <button
                className={`rounded-lg border p-3 text-left transition-colors ${propertyId === property.propertyId ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                key={property.propertyId}
                onClick={() => {
                  setPropertyId(property.propertyId)
                  setPage(1)
                }}
                type="button"
              >
                <p className="font-bold">{property.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{property.propertyLocation || "No location"}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <Badge variant="secondary">{`${property.feedbackCount} feedback`}</Badge>
                  <span>{property.latestFeedbackAt ? formatDateTimeLabel(property.latestFeedbackAt) : ""}</span>
                </div>
              </button>
            ))}
            {!propertiesQuery.isLoading && properties.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {"No realtor feedback saved yet."}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <CardTitle>{selectedProperty?.propertyTitle ?? "Feedback"}</CardTitle>
                <CardDescription>{"Filter by first message date, not reply date."}</CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
                <Input onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
              </div>
            </CardHeader>
            <CardContent>
              {!propertyId ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{"Choose property."}</p>
              ) : feedbackQuery.isLoading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{"Loading feedback..."}</p>
              ) : feedbackQuery.error ? (
                <p className="py-10 text-center text-sm text-destructive">{feedbackQuery.error.message}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[880px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{"First Message Date"}</TableHead>
                          <TableHead>{"Realtor"}</TableHead>
                          <TableHead>{"Channel"}</TableHead>
                          <TableHead>{"Sentiment"}</TableHead>
                          <TableHead>{"Feedback"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(feedbackQuery.data?.items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDateTimeLabel(item.firstMessageAt)}</TableCell>
                            <TableCell>
                              <p className="font-medium">{item.realtorName || "Realtor"}</p>
                              <p className="text-xs text-muted-foreground">{item.realtorContact}</p>
                            </TableCell>
                            <TableCell><Badge variant="outline">{item.channel === "Sms" ? "SMS" : "Email"}</Badge></TableCell>
                            <TableCell><Badge variant={item.sentiment === "negative" ? "destructive" : "secondary"}>{item.sentiment}</Badge></TableCell>
                            <TableCell className="max-w-[420px] whitespace-pre-wrap">{item.feedbackText}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {(feedbackQuery.data?.items ?? []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{"No feedback in date range."}</p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="outline">{"Prev"}</Button>
                    <span className="text-sm text-muted-foreground">{`Page ${feedbackQuery.data?.page ?? page} of ${feedbackQuery.data?.totalPages ?? 1}`}</span>
                    <Button disabled={!feedbackQuery.data || page >= feedbackQuery.data.totalPages} onClick={() => setPage((current) => current + 1)} size="sm" variant="outline">{"Next"}</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{"Send Owner Report"}</CardTitle>
              <CardDescription>{"Template vars: {{fromdate}}, {{todate}}, {{feedback_summary}}, {{feedback1}}, {{feedback2}}..."}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Select onValueChange={(value) => setTemplateId(value === "none" ? "" : value)} value={templateId || "none"}>
                  <SelectTrigger><SelectValue placeholder="Choose owner feedback template" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">{"Choose template"}</SelectItem>
                      {templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Input min={1} max={50} onChange={(event) => setMaxFeedback(Math.min(50, Math.max(1, Number(event.target.value) || 1)))} type="number" value={maxFeedback} />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-lg border p-3"><Checkbox checked={emailEnabled} onCheckedChange={(checked) => setEmailEnabled(checked === true)} />{"Email"}</label>
                  <label className="flex items-center gap-2 rounded-lg border p-3"><Checkbox checked={smsEnabled} onCheckedChange={(checked) => setSmsEnabled(checked === true)} />{"SMS"}</label>
                  <label className="flex items-center gap-2 rounded-lg border p-3"><Checkbox checked={summarize} onCheckedChange={(checked) => setSummarize(checked === true)} />{"Summarize"}</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!propertyId || !templateId || previewMutation.isPending} onClick={() => void handlePreview()} type="button" variant="outline">
                    {"Preview"}
                  </Button>
                  <Button disabled={!propertyId || !templateId || previewMutation.isPending} onClick={() => {
                    setSummarize(true)
                    void handlePreview(true)
                  }} type="button" variant="outline">
                    {"Summarize"}
                  </Button>
                  <Button disabled={!propertyId || !templateId || sendMutation.isPending || (!emailEnabled && !smsEnabled)} onClick={() => void handleSend()} type="button">
                    {sendMutation.isPending ? "Sending..." : "Send To Owner"}
                  </Button>
                </div>
                {!selectedTemplate && templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{"Create Owner Feedback template in settings first."}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Input readOnly value={preview?.subject ?? selectedTemplate?.subject ?? ""} />
                <Textarea className="min-h-[260px]" readOnly value={preview?.body ?? selectedTemplate?.body ?? ""} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
