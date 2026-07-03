"use client"

import { useState } from "react"
import Papa from "papaparse"

import type { PropertyItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  type ShowingFeedbackImportInput,
  useCreateShowingFeedback,
  useImportShowingFeedback,
} from "@/hooks/use-realtor-showings-api"

type MappingKey = keyof ShowingFeedbackImportInput["mapping"]

const mappingFields: Array<{
  aliases: string[]
  key: MappingKey
  label: string
  required?: boolean
}> = [
  { key: "property", label: "Property", aliases: ["property", "property address", "listing", "address"], required: true },
  { key: "realtorName", label: "Realtor name", aliases: ["realtor name", "realtor", "agent name", "broker"] },
  { key: "realtorContact", label: "Realtor contact", aliases: ["realtor contact", "contact"] },
  { key: "realtorEmail", label: "Realtor email", aliases: ["realtor email", "agent email", "email"] },
  { key: "realtorPhone", label: "Realtor phone", aliases: ["realtor phone", "agent phone", "phone", "mobile"] },
  { key: "channel", label: "Channel", aliases: ["channel", "source", "method"] },
  { key: "feedbackText", label: "Feedback text", aliases: ["feedback", "feedback text", "comment", "notes", "message"], required: true },
  { key: "sentiment", label: "Sentiment", aliases: ["sentiment", "tone"] },
  { key: "showingAt", label: "Showing date/time", aliases: ["showing at", "showing date", "appointment", "showing time"] },
  { key: "firstMessageAt", label: "First message date/time", aliases: ["first message", "first message at", "message date", "sent at"], required: true },
  { key: "receivedAt", label: "Feedback received at", aliases: ["received at", "reply date", "received date"] },
]

const emptyMapping: ShowingFeedbackImportInput["mapping"] = {
  channel: "",
  feedbackText: "",
  firstMessageAt: "",
  property: "",
  realtorContact: "",
  realtorEmail: "",
  realtorName: "",
  realtorPhone: "",
  receivedAt: "",
  sentiment: "",
  showingAt: "",
}

function autoMap(headers: string[]) {
  const normalized = headers.map((header) => ({
    header,
    normalized: header.toLowerCase().replace(/[_-]+/g, " ").trim(),
  }))
  return mappingFields.reduce((result, field) => {
    const match = normalized.find((item) =>
      field.aliases.some(
        (alias) => item.normalized === alias || item.normalized.includes(alias),
      ),
    )
    result[field.key] = match?.header ?? ""
    return result
  }, { ...emptyMapping })
}

function combineDateTime(date: string, time: string) {
  return date && time ? `${date}T${time}` : ""
}

export function ShowingFeedbackEntryDialogsV2({
  importOpen,
  manualOpen,
  onImportOpenChange,
  onManualOpenChange,
  properties,
  timeZone,
}: {
  importOpen: boolean
  manualOpen: boolean
  onImportOpenChange: (open: boolean) => void
  onManualOpenChange: (open: boolean) => void
  properties: PropertyItem[]
  timeZone: string
}) {
  const createMutation = useCreateShowingFeedback()
  const importMutation = useImportShowingFeedback()

  const [propertyId, setPropertyId] = useState("")
  const [realtorName, setRealtorName] = useState("")
  const [realtorEmail, setRealtorEmail] = useState("")
  const [realtorPhone, setRealtorPhone] = useState("")
  const [channel, setChannel] = useState<"Email" | "Sms">("Email")
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("neutral")
  const [feedbackText, setFeedbackText] = useState("")
  const [showingDate, setShowingDate] = useState("")
  const [showingTime, setShowingTime] = useState("")
  const [messageDate, setMessageDate] = useState("")
  const [messageTime, setMessageTime] = useState("")
  const [manualError, setManualError] = useState<string | null>(null)

  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [mapping, setMapping] = useState({ ...emptyMapping })
  const [importError, setImportError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  function resetManual() {
    setPropertyId("")
    setRealtorName("")
    setRealtorEmail("")
    setRealtorPhone("")
    setChannel("Email")
    setSentiment("neutral")
    setFeedbackText("")
    setShowingDate("")
    setShowingTime("")
    setMessageDate("")
    setMessageTime("")
    setManualError(null)
  }

  async function saveManual() {
    setManualError(null)
    const firstMessageAt = combineDateTime(
      messageDate || showingDate,
      messageTime || showingTime,
    )
    const showingAt = combineDateTime(showingDate, showingTime)

    if (!propertyId) {
      setManualError("Choose a property.")
      return
    }
    if (!showingAt || !firstMessageAt) {
      setManualError("Choose the showing and first-message date and time.")
      return
    }
    if (!feedbackText.trim()) {
      setManualError("Add the realtor feedback.")
      return
    }

    const response = await createMutation.mutateAsync({
      channel,
      feedbackText: feedbackText.trim(),
      firstMessageAt,
      propertyId: Number(propertyId),
      realtorEmail: realtorEmail.trim(),
      realtorName: realtorName.trim(),
      realtorPhone: realtorPhone.trim(),
      receivedAt: firstMessageAt,
      sentiment,
      showingAt,
    })
    if (response.error) {
      setManualError(response.error.message)
      return
    }

    resetManual()
    onManualOpenChange(false)
  }

  function parseFile(file?: File) {
    if (!file) return
    setImportError(null)
    setImportSummary(null)
    Papa.parse<Record<string, string>>(file, {
      complete: (result) => {
        const parsedRows = result.data.filter((row) =>
          Object.values(row).some((value) => `${value ?? ""}`.trim()),
        )
        const parsedHeaders = result.meta.fields ?? []
        if (parsedHeaders.length === 0 || parsedRows.length === 0) {
          setImportError("CSV needs a header row and at least one data row.")
          return
        }
        setFileName(file.name)
        setHeaders(parsedHeaders)
        setRows(parsedRows)
        setMapping(autoMap(parsedHeaders))
      },
      error: (error) => setImportError(error.message),
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    })
  }

  async function importRows() {
    setImportError(null)
    if (rows.length === 0) {
      setImportError("Choose a CSV file first.")
      return
    }
    if (!mapping.property || !mapping.feedbackText) {
      setImportError("Map Property and Feedback text.")
      return
    }
    if (!mapping.firstMessageAt && !mapping.showingAt) {
      setImportError("Map First message date/time or Showing date/time.")
      return
    }

    const response = await importMutation.mutateAsync({ mapping, rows })
    if (response.error) {
      setImportError(response.error.message)
      return
    }
    if (response.data) {
      setImportSummary(
        `${response.data.createdCount} feedback row${response.data.createdCount === 1 ? "" : "s"} saved. ${response.data.failedCount} failed.`,
      )
    }
    setFileName("")
    setHeaders([])
    setRows([])
    setMapping({ ...emptyMapping })
  }

  return (
    <>
      <Dialog
        open={manualOpen}
        onOpenChange={(open) => {
          if (!open && !createMutation.isPending) resetManual()
          onManualOpenChange(open)
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{"Add showing feedback"}</DialogTitle>
              <Badge variant="outline">{timeZone}</Badge>
            </div>
            <DialogDescription>
              {"Create one showing and its feedback. Date and time fields are interpreted in the agency timezone."}
            </DialogDescription>
          </DialogHeader>

          {manualError ? (
            <Alert variant="destructive"><AlertDescription>{manualError}</AlertDescription></Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Property">
              <Select onValueChange={setPropertyId} value={propertyId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{"Choose property"}</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={String(property.id)}>
                      {`${property.title} — ${property.location}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Realtor name"><Input onChange={(event) => setRealtorName(event.target.value)} value={realtorName} /></Field>
            <Field label="Channel"><Select onValueChange={(value) => setChannel(value as "Email" | "Sms")} value={channel}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Email">{"Email"}</SelectItem><SelectItem value="Sms">{"SMS"}</SelectItem></SelectContent></Select></Field>
            <Field label="Realtor email"><Input onChange={(event) => setRealtorEmail(event.target.value)} type="email" value={realtorEmail} /></Field>
            <Field label="Realtor phone"><Input onChange={(event) => setRealtorPhone(event.target.value)} value={realtorPhone} /></Field>
            <Field label="Showing date"><Input onChange={(event) => setShowingDate(event.target.value)} type="date" value={showingDate} /></Field>
            <Field label="Showing time"><Input onChange={(event) => setShowingTime(event.target.value)} type="time" value={showingTime} /></Field>
            <Field label="First message date"><Input onChange={(event) => setMessageDate(event.target.value)} type="date" value={messageDate} /></Field>
            <Field label="First message time"><Input onChange={(event) => setMessageTime(event.target.value)} type="time" value={messageTime} /></Field>
            <Field label="Sentiment"><Select onValueChange={(value) => setSentiment(value as typeof sentiment)} value={sentiment}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="positive">{"Positive"}</SelectItem><SelectItem value="neutral">{"Neutral"}</SelectItem><SelectItem value="negative">{"Negative"}</SelectItem></SelectContent></Select></Field>
            <Field className="sm:col-span-2" label="Feedback"><Textarea className="min-h-32" onChange={(event) => setFeedbackText(event.target.value)} value={feedbackText} /></Field>
          </div>
          <DialogFooter>
            <Button disabled={createMutation.isPending} onClick={() => onManualOpenChange(false)} type="button" variant="outline">{"Cancel"}</Button>
            <Button disabled={createMutation.isPending} onClick={() => void saveManual()} type="button">{createMutation.isPending ? "Saving..." : "Save feedback"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={onImportOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{"Import showing feedback CSV"}</DialogTitle>
              <Badge variant="outline">{timeZone}</Badge>
            </div>
            <DialogDescription>
              {"Upload a CSV, map your own columns, and save each valid row to the showing-feedback database."}
            </DialogDescription>
          </DialogHeader>

          {importError ? <Alert variant="destructive"><AlertDescription>{importError}</AlertDescription></Alert> : null}
          {importSummary ? <Alert><AlertDescription>{importSummary}</AlertDescription></Alert> : null}

          <div className="space-y-5">
            <div className="rounded-xl border border-dashed p-4">
              <Label htmlFor="feedback-csv">{"CSV file"}</Label>
              <Input accept=".csv,text/csv" className="mt-2" id="feedback-csv" onChange={(event) => parseFile(event.target.files?.[0])} type="file" />
              <p className="mt-2 text-xs text-muted-foreground">
                {fileName ? `${fileName} — ${rows.length} row${rows.length === 1 ? "" : "s"}` : "Maximum 2,000 rows. A header row is required."}
              </p>
            </div>

            {headers.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{"Column mapping"}</h3>
                    <p className="text-xs text-muted-foreground">{"Auto-mapped where possible. Override any field."}</p>
                  </div>
                  <Badge variant="secondary">{`${headers.length} columns`}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mappingFields.map((field) => (
                    <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`}>
                      <Select onValueChange={(value) => setMapping((current) => ({ ...current, [field.key]: value === "none" ? "" : value }))} value={mapping[field.key] || "none"}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Choose column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{"Not mapped"}</SelectItem>
                          {headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button disabled={importMutation.isPending} onClick={() => onImportOpenChange(false)} type="button" variant="outline">{"Close"}</Button>
            <Button disabled={importMutation.isPending || rows.length === 0} onClick={() => void importRows()} type="button">{importMutation.isPending ? "Importing..." : `Import ${rows.length} rows`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return <div className={`space-y-2 ${className ?? ""}`}><Label>{label}</Label>{children}</div>
}
