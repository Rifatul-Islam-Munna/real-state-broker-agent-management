"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  usePreviewShowingFeedbackReport,
  useSendShowingFeedbackReport,
} from "@/hooks/use-realtor-showings-api"

const feedbackTokens = [
  "{{feedback_summary}}",
  "{{positive_feedback}}",
  "{{negative_feedback}}",
  "{{positive_summary}}",
  "{{negative_summary}}",
]

export function FeedbackReportSheet({
  fromDate,
  onOpenChange,
  open,
  propertyId,
  propertyTitle,
  timeZone,
  toDate,
}: {
  fromDate: string
  onOpenChange: (open: boolean) => void
  open: boolean
  propertyId: number | null
  propertyTitle: string
  timeZone: string
  toDate: string
}) {
  const [templateId, setTemplateId] = useState("")
  const [maxFeedback, setMaxFeedback] = useState(10)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [summarize, setSummarize] = useState(true)
  const [preview, setPreview] = useState<{
    subject: string
    body: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const templatesQuery = useLeadOutreachTemplates()
  const previewMutation = usePreviewShowingFeedbackReport()
  const sendMutation = useSendShowingFeedbackReport()
  const templates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (item) => item.audience === "OwnerFeedback" && item.isActive !== false
      ),
    [templatesQuery.data]
  )
  const selectedTemplate = templates.find((item) => item.id === templateId)

  function isTemplateReady() {
    if (!propertyId || !selectedTemplate) {
      setError("Choose a property and owner feedback template.")
      return false
    }
    const content = `${selectedTemplate.subject}\n${selectedTemplate.body}`
    const hasFeedbackToken =
      feedbackTokens.some((token) => content.includes(token)) ||
      /\{\{feedback\d+\}\}/.test(content)
    if (!hasFeedbackToken) {
      setError(
        "The selected template needs a feedback token such as {{positive_feedback}}, {{negative_feedback}}, or {{feedback_summary}}."
      )
      return false
    }
    return true
  }

  async function renderPreview() {
    setError(null)
    if (!isTemplateReady() || !propertyId) return
    const response = await previewMutation.mutateAsync({
      propertyId,
      templateId,
      fromDate,
      toDate,
      maxFeedback,
      summarize,
    })
    if (response.error) return setError(response.error.message)
    if (response.data)
      setPreview({ subject: response.data.subject, body: response.data.body })
  }

  async function sendReport() {
    setError(null)
    if (!isTemplateReady() || !propertyId) return
    const channels = [
      emailEnabled ? "Email" : null,
      smsEnabled ? "Sms" : null,
    ].filter((item): item is "Email" | "Sms" => item !== null)
    if (!channels.length) return setError("Choose Email, SMS, or both.")
    const response = await sendMutation.mutateAsync({
      propertyId,
      templateId,
      fromDate,
      toDate,
      maxFeedback,
      summarize,
      channels,
    })
    if (response.error) return setError(response.error.message)
    if (response.data)
      setPreview({ subject: response.data.subject, body: response.data.body })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="shadow-none sm:w-[40rem] sm:max-w-[40rem]">
        <SheetHeader className="border-b">
          <SheetTitle>Owner feedback report</SheetTitle>
          <SheetDescription>
            Positive and negative replies are rendered in separate sections and
            can be sent by email, SMS, or both.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {templatesQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>{templatesQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-medium">
              {propertyTitle || "No property selected"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fromDate} to {toDate} · {timeZone}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Owner feedback template</Label>
            <Select
              value={templateId || "none"}
              onValueChange={(value) => {
                setTemplateId(value === "none" ? "" : value)
                setPreview(null)
                setError(null)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose template</SelectItem>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Tokens: {"{{positive_feedback}}"}, {"{{negative_feedback}}"},{" "}
                {"{{positive_summary}}"}, and {"{{negative_summary}}"}.
              </p>
            ) : (
              <Button
                className="h-auto p-0"
                render={
                  <Link href="/dashboard/settings#communication-templates" />
                }
                variant="link"
              >
                Create an owner feedback template in settings
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <Label>Maximum feedback items</Label>
            <Input
              max={50}
              min={1}
              onChange={(event) =>
                setMaxFeedback(
                  Math.min(50, Math.max(1, Number(event.target.value) || 1))
                )
              }
              type="number"
              value={maxFeedback}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ChannelToggle
              checked={emailEnabled}
              label="Email"
              onChange={setEmailEnabled}
            />
            <ChannelToggle
              checked={smsEnabled}
              label="SMS"
              onChange={setSmsEnabled}
            />
            <ChannelToggle
              checked={summarize}
              label="AI summary"
              onChange={(value) => {
                setSummarize(value)
                setPreview(null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject preview</Label>
            <Input
              readOnly
              value={preview?.subject ?? selectedTemplate?.subject ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Message preview</Label>
            <Textarea
              className="min-h-80 leading-6"
              readOnly
              value={preview?.body ?? selectedTemplate?.body ?? ""}
            />
          </div>
        </div>
        <SheetFooter>
          <Button
            disabled={!propertyId || !templateId || previewMutation.isPending}
            onClick={() => void renderPreview()}
            size="lg"
            type="button"
            variant="outline"
          >
            {previewMutation.isPending ? "Rendering..." : "Preview"}
          </Button>
          <Button
            disabled={!propertyId || !templateId || sendMutation.isPending}
            onClick={() => void sendReport()}
            size="lg"
            type="button"
          >
            {sendMutation.isPending ? "Sending..." : "Send to owner"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function ChannelToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      {label}
    </label>
  )
}
