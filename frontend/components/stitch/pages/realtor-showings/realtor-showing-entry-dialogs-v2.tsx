"use client"

import { useEffect, useState } from "react"
import Papa from "papaparse"

import type {
  PropertyItem,
  RealtorShowingImportInput,
} from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  useCreateRealtorShowing,
  useImportRealtorShowings,
} from "@/hooks/use-realtor-showings-api"

type MappingKey = keyof RealtorShowingImportInput["mapping"]

type TemplateOption = {
  id: string
  name: string
}

const mappingFields: Array<{
  aliases: string[]
  key: MappingKey
  label: string
}> = [
  { key: "realtorName", label: "Realtor name", aliases: ["realtor name", "realtor", "agent name", "broker"] },
  { key: "realtorEmail", label: "Realtor email", aliases: ["realtor email", "agent email", "email"] },
  { key: "realtorPhone", label: "Realtor phone", aliases: ["realtor phone", "agent phone", "phone", "mobile"] },
  { key: "property", label: "Property", aliases: ["property", "property address", "listing", "address"] },
  { key: "showingAt", label: "Showing date/time", aliases: ["showing at", "showing date", "appointment", "date time"] },
  { key: "visitorName", label: "Visitor name", aliases: ["visitor name", "lead name", "tenant name", "client name"] },
  { key: "visitorEmail", label: "Visitor email", aliases: ["visitor email", "lead email", "tenant email", "client email"] },
  { key: "visitorPhone", label: "Visitor phone", aliases: ["visitor phone", "lead phone", "tenant phone", "client phone"] },
  { key: "leadId", label: "Existing lead ID", aliases: ["lead id", "tenant id", "visitor id", "contact id"] },
]

const emptyMapping: RealtorShowingImportInput["mapping"] = {
  realtorEmail: "",
  realtorName: "",
  realtorPhone: "",
  property: "",
  showingAt: "",
  visitorName: "",
  visitorEmail: "",
  visitorPhone: "",
  leadId: "",
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

export function RealtorShowingEntryDialogsV2({
  directTemplates,
  followUpTemplates,
  importOpen,
  manualOpen,
  onImportOpenChange,
  onManualOpenChange,
  properties,
  timeZone,
}: {
  directTemplates: TemplateOption[]
  followUpTemplates: TemplateOption[]
  importOpen: boolean
  manualOpen: boolean
  onImportOpenChange: (open: boolean) => void
  onManualOpenChange: (open: boolean) => void
  properties: PropertyItem[]
  timeZone: string
}) {
  const importMutation = useImportRealtorShowings()
  const createMutation = useCreateRealtorShowing()

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [leadSearch, setLeadSearch] = useState("")
  const [leadResults, setLeadResults] = useState<Array<{ id: number; name: string; email?: string; phone?: string }>>([])
  const [manualName, setManualName] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [visitorName, setVisitorName] = useState("")
  const [visitorEmail, setVisitorEmail] = useState("")
  const [visitorPhone, setVisitorPhone] = useState("")
  const [manualProperty, setManualProperty] = useState("")
  const [showingDate, setShowingDate] = useState("")
  const [showingTime, setShowingTime] = useState("")
  const [manualError, setManualError] = useState<string | null>(null)

  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [mapping, setMapping] = useState({ ...emptyMapping })
  const [parseError, setParseError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [directTemplateId, setDirectTemplateId] = useState("")
  const [outreachDate, setOutreachDate] = useState("")
  const [outreachTime, setOutreachTime] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(true)
  const [followUpTemplateId, setFollowUpTemplateId] = useState("")
  const [followUpGapDays, setFollowUpGapDays] = useState(2)

  const outreachAt =
    outreachDate && outreachTime ? `${outreachDate}T${outreachTime}` : ""

  useEffect(() => {
    if (leadSearch.trim().length < 2) {
      setLeadResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/proxy/leads?page=1&pageSize=8&search=${encodeURIComponent(leadSearch.trim())}`)
      if (!response.ok) return
      const payload = await response.json()
      setLeadResults(payload.data ?? payload.items ?? [])
    }, 250)
    return () => window.clearTimeout(timer)
  }, [leadSearch])

  function resetManual() {
    setSelectedLeadId(null)
    setLeadSearch("")
    setLeadResults([])
    setManualName("")
    setManualEmail("")
    setManualPhone("")
    setVisitorName("")
    setVisitorEmail("")
    setVisitorPhone("")
    setManualProperty("")
    setShowingDate("")
    setShowingTime("")
    setManualError(null)
  }

  async function createManual() {
    setManualError(null)
    if ((!manualEmail.trim() && !manualPhone.trim()) || !visitorEmail.trim() || !manualProperty) {
      setManualError("Choose a property, add realtor contact details, and provide the visitor email.")
      return
    }
    if (!showingDate || !showingTime) {
      setManualError("Choose the showing date and time.")
      return
    }
    const property = properties.find((item) => String(item.id) === manualProperty)
    if (!property) {
      setManualError("Property was not found.")
      return
    }

    const response = await createMutation.mutateAsync({
      directTemplateId,
      emailEnabled,
      followUpEnabled,
      followUpGapDays,
      followUpTemplateId,
      outreachAt: outreachAt || null,
      property: property.title,
      realtorEmail: manualEmail.trim(),
      realtorName: manualName.trim(),
      realtorPhone: manualPhone.trim(),
      showingAt: `${showingDate}T${showingTime}`,
      smsEnabled,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim(),
      visitorPhone: visitorPhone.trim(),
      leadId: selectedLeadId,
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
    setParseError(null)
    setImportSummary(null)
    Papa.parse<Record<string, string>>(file, {
      complete: (result) => {
        const parsedRows = result.data.filter((row) =>
          Object.values(row).some((value) => `${value ?? ""}`.trim()),
        )
        const parsedHeaders = result.meta.fields ?? []
        if (parsedHeaders.length === 0 || parsedRows.length === 0) {
          setParseError("CSV needs a header row and at least one data row.")
          return
        }
        setFileName(file.name)
        setHeaders(parsedHeaders)
        setRows(parsedRows)
        setMapping(autoMap(parsedHeaders))
      },
      error: (error) => setParseError(error.message),
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    })
  }

  async function importCsv() {
    setParseError(null)
    if (rows.length === 0) {
      setParseError("Choose a CSV file first.")
      return
    }
    if (!mapping.property || (!mapping.realtorEmail && !mapping.realtorPhone) || !mapping.visitorEmail) {
      setParseError("Map Property, realtor email or phone, and visitor email.")
      return
    }

    const response = await importMutation.mutateAsync({
      directTemplateId,
      emailEnabled,
      followUpEnabled,
      followUpGapDays,
      followUpTemplateId,
      mapping,
      outreachAt: outreachAt || null,
      rows,
      smsEnabled,
    })
    if (response.error) {
      setParseError(response.error.message)
      return
    }
    if (response.data) {
      setImportSummary(
        `${response.data.createdCount} showing${response.data.createdCount === 1 ? "" : "s"} saved. ${response.data.failedCount} failed.`,
      )
    }
    setFileName("")
    setHeaders([])
    setRows([])
    setMapping({ ...emptyMapping })
  }

  const automationFields = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle checked={emailEnabled} label="Email" onChange={setEmailEnabled} />
        <Toggle checked={smsEnabled} label="SMS" onChange={setSmsEnabled} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First message date">
          <Input onChange={(event) => setOutreachDate(event.target.value)} type="date" value={outreachDate} />
        </Field>
        <Field label="First message time">
          <Input onChange={(event) => setOutreachTime(event.target.value)} type="time" value={outreachTime} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        {`Leave both empty to send immediately. Times use ${timeZone}.`}
      </p>
      <Field label="Direct template">
        <Select onValueChange={(value) => setDirectTemplateId(value === "none" ? "" : value)} value={directTemplateId || "none"}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{"Default reminder"}</SelectItem>
            {directTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Toggle checked={followUpEnabled} label="Enable follow-up" onChange={setFollowUpEnabled} />
      {followUpEnabled ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Follow-up template">
            <Select onValueChange={(value) => setFollowUpTemplateId(value === "none" ? "" : value)} value={followUpTemplateId || "none"}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose follow-up" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{"No follow-up template"}</SelectItem>
                {followUpTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gap days">
            <Input min={1} onChange={(event) => setFollowUpGapDays(Math.max(1, Number(event.target.value) || 1))} type="number" value={followUpGapDays} />
          </Field>
        </div>
      ) : null}
    </div>
  )

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
              <DialogTitle>{"Add property showing"}</DialogTitle>
              <Badge variant="outline">{timeZone}</Badge>
            </div>
            <DialogDescription>
              {"Create one showing with separate date and time fields, then configure its first message and follow-up."}
            </DialogDescription>
          </DialogHeader>
          {manualError ? <Alert variant="destructive"><AlertDescription>{manualError}</AlertDescription></Alert> : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-base">Realtor conducting the showing</CardTitle><CardDescription>This contact receives the realtor showing workflow.</CardDescription></CardHeader>
              <CardContent className="grid gap-4">
                <Field label="Realtor name"><Input onChange={(event) => setManualName(event.target.value)} value={manualName} /></Field>
                <Field label="Realtor email"><Input onChange={(event) => setManualEmail(event.target.value)} type="email" value={manualEmail} /></Field>
                <Field label="Realtor phone"><Input onChange={(event) => setManualPhone(event.target.value)} value={manualPhone} /></Field>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-base">Lead or tenant visiting</CardTitle><CardDescription>Search an existing lead or enter a new visitor. Email is required.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Search existing lead by name or email"><Input placeholder="Start typing a name or email..." value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} /></Field>
                {leadResults.length > 0 ? <div className="space-y-2">{leadResults.map((lead) => <button key={lead.id} type="button" className={`w-full rounded-lg border p-3 text-left text-sm ${selectedLeadId === lead.id ? "border-primary bg-primary/5" : "bg-background"}`} onClick={() => { setSelectedLeadId(lead.id); setVisitorName(lead.name || ""); setVisitorEmail(lead.email || ""); setVisitorPhone(lead.phone || "") }}><strong>{lead.name}</strong><div className="text-muted-foreground">{lead.email || lead.phone || `Lead #${lead.id}`}</div></button>)}</div> : null}
                <Field label="Visitor name"><Input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} /></Field>
                <Field label="Visitor email"><Input type="email" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} /></Field>
                <Field label="Visitor phone"><Input value={visitorPhone} onChange={(event) => setVisitorPhone(event.target.value)} /></Field>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Property">
              <Select onValueChange={(value) => setManualProperty(value === "none" ? "" : value)} value={manualProperty || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Choose property</SelectItem>{properties.map((property) => <SelectItem key={property.id} value={String(property.id)}>{`${property.title} ? ${property.location}`}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Showing date"><Input onChange={(event) => setShowingDate(event.target.value)} type="date" value={showingDate} /></Field>
            <Field label="Showing time"><Input onChange={(event) => setShowingTime(event.target.value)} type="time" value={showingTime} /></Field>
          </div>
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-base">{"Outreach automation"}</CardTitle><CardDescription>{"Replies stop the remaining automatic visitor follow-up for this showing."}</CardDescription></CardHeader>
            <CardContent>{automationFields}</CardContent>
          </Card>
          <DialogFooter>
            <Button disabled={createMutation.isPending} onClick={() => onManualOpenChange(false)} type="button" variant="outline">{"Cancel"}</Button>
            <Button disabled={createMutation.isPending} onClick={() => void createManual()} type="button">{createMutation.isPending ? "Creating..." : "Create showing"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={onImportOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>{"Import property showings"}</DialogTitle>
              <Badge variant="outline">{timeZone}</Badge>
            </div>
            <DialogDescription>
              {"Upload a CSV, map the columns, and apply one outreach schedule to the imported rows."}
            </DialogDescription>
          </DialogHeader>
          {parseError ? <Alert variant="destructive"><AlertDescription>{parseError}</AlertDescription></Alert> : null}
          {importSummary ? <Alert><AlertDescription>{importSummary}</AlertDescription></Alert> : null}
          <div className="space-y-5">
            <div className="rounded-xl border border-dashed p-4">
              <Label htmlFor="showing-csv">{"CSV file"}</Label>
              <Input accept=".csv,text/csv" className="mt-2" id="showing-csv" onChange={(event) => parseFile(event.target.files?.[0])} type="file" />
              <p className="mt-2 text-xs text-muted-foreground">{fileName ? `${fileName} — ${rows.length} rows` : "Maximum 2,000 rows with a header row."}</p>
            </div>
            {headers.length > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">{"Column mapping"}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mappingFields.map((field) => (
                    <Field key={field.key} label={field.label}>
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
            <Card className="shadow-none"><CardHeader><CardTitle className="text-base">{"Outreach automation"}</CardTitle></CardHeader><CardContent>{automationFields}</CardContent></Card>
          </div>
          <DialogFooter>
            <Button disabled={importMutation.isPending} onClick={() => onImportOpenChange(false)} type="button" variant="outline">{"Close"}</Button>
            <Button disabled={importMutation.isPending || rows.length === 0} onClick={() => void importCsv()} type="button">{importMutation.isPending ? "Importing..." : `Import ${rows.length} rows`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>
}
