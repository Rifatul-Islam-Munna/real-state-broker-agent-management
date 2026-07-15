"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import Papa from "papaparse"

import type { RealtorShowingAutomationInput, RealtorShowingImportInput } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  useImportRealtorShowings,
  useCreateRealtorShowing,
  useRealtorShowings,
  useUpdateRealtorShowingAutomation,
  useUpdateRealtorShowingProperty,
} from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

type MappingKey = keyof RealtorShowingImportInput["mapping"]

const mappingFields: Array<{ key: MappingKey; label: string; aliases: string[] }> = [
  { key: "realtorName", label: "Realtor Name", aliases: ["realtor name", "realtor", "agent name", "name", "broker name"] },
  { key: "realtorEmail", label: "Realtor Email", aliases: ["realtor email", "agent email", "email", "email address"] },
  { key: "realtorPhone", label: "Realtor Phone", aliases: ["realtor phone", "agent phone", "phone", "mobile", "telephone"] },
  { key: "property", label: "Property", aliases: ["property", "property address", "listing", "listing address", "address", "mls address"] },
  { key: "showingAt", label: "Showing Date/Time", aliases: ["showing at", "showing date", "showing time", "date", "appointment"] },
  { key: "visitorName", label: "Visitor Name", aliases: ["visitor name", "lead name", "tenant name", "client name"] },
  { key: "visitorEmail", label: "Visitor Email", aliases: ["visitor email", "lead email", "tenant email", "client email"] },
  { key: "visitorPhone", label: "Visitor Phone", aliases: ["visitor phone", "lead phone", "tenant phone", "client phone"] },
  { key: "leadId", label: "Existing Lead ID", aliases: ["lead id", "tenant id", "visitor id"] },
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

function autoMapHeaders(headers: string[]) {
  const normalized = headers.map((header) => ({ header, normalized: header.toLowerCase().replace(/[_-]+/g, " ").trim() }))
  return mappingFields.reduce((mapping, field) => {
    const match = normalized.find((item) => field.aliases.some((alias) => item.normalized === alias || item.normalized.includes(alias)))
    mapping[field.key] = match?.header ?? ""
    return mapping
  }, { ...emptyMapping })
}

export function RealtorShowingsPage() {
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualEmail, setManualEmail] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [manualProperty, setManualProperty] = useState("")
  const [manualShowingAt, setManualShowingAt] = useState("")
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [mapping, setMapping] = useState({ ...emptyMapping })
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [directTemplateId, setDirectTemplateId] = useState("")
  const [outreachAt, setOutreachAt] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(true)
  const [followUpTemplateId, setFollowUpTemplateId] = useState("")
  const [followUpGapDays, setFollowUpGapDays] = useState(2)
  const [parseError, setParseError] = useState("")
  const [importSummary, setImportSummary] = useState("")
  const [automationEditor, setAutomationEditor] = useState<(RealtorShowingAutomationInput & { realtorName: string }) | null>(null)

  const showingsQuery = useRealtorShowings(search)
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const templatesQuery = useLeadOutreachTemplates()
  const importMutation = useImportRealtorShowings()
  const createMutation = useCreateRealtorShowing()
  const propertyMutation = useUpdateRealtorShowingProperty()
  const automationMutation = useUpdateRealtorShowingAutomation()

  const showingsData = showingsQuery.data
  const showings = Array.isArray(showingsData)
    ? showingsData
    : showingsData?.items ?? []
  const properties = useMemo(() => propertiesQuery.data?.items ?? [], [propertiesQuery.data?.items])
  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter(
      (template) =>
        template.isActive !== false
        && (template.audience === "Realtor" || template.id === "showing-confirmation"),
    ),
    [templatesQuery.data],
  )
  const directTemplates = useMemo(
    () => templates.filter((template) => (template.sequenceType ?? "Direct") === "Direct"),
    [templates],
  )
  const followUpTemplates = useMemo(
    () => templates.filter((template) => (template.sequenceType ?? "Direct") !== "Direct"),
    [templates],
  )

  function handleFile(file?: File) {
    if (!file) return
    setParseError("")
    Papa.parse<Record<string, string>>(file, {
      complete: (result) => {
        const parsedRows = result.data.filter((row) => Object.values(row).some((value) => `${value ?? ""}`.trim()))
        const parsedHeaders = result.meta.fields ?? []
        if (parsedHeaders.length === 0 || parsedRows.length === 0) {
          setParseError("CSV needs a header row and at least one data row.")
          return
        }
        setFileName(file.name)
        setHeaders(parsedHeaders)
        setRows(parsedRows)
        setMapping(autoMapHeaders(parsedHeaders))
      },
      error: (error) => setParseError(error.message),
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    })
  }

  async function handleImport() {
    if (rows.length === 0) {
      setParseError("Choose a CSV file first.")
      return
    }
    if (!mapping.realtorEmail && !mapping.realtorPhone) {
      setParseError("Map realtor email or phone.")
      return
    }
    if (!mapping.property) {
      setParseError("Map property column.")
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
      setParseError(response.error.message || "Import failed.")
      return
    }
    if (response.data) {
      setImportSummary(
        `${response.data.createdCount} showing${response.data.createdCount === 1 ? "" : "s"} imported. ${response.data.failedCount} row/outreach failure${response.data.failedCount === 1 ? "" : "s"}.`,
      )
    }
    setImportOpen(false)
    setFileName("")
    setHeaders([])
    setRows([])
    setMapping({ ...emptyMapping })
  }

  async function handleAutomationSave() {
    if (!automationEditor) return
    const response = await automationMutation.mutateAsync(automationEditor)
    if (!response.error) setAutomationEditor(null)
  }

  async function handleManualCreate() {
    if ((!manualEmail.trim() && !manualPhone.trim()) || !manualProperty) return
    const selectedProperty = properties.find((property) => String(property.id) === manualProperty)
    if (!selectedProperty) return
    const response = await createMutation.mutateAsync({
      directTemplateId,
      emailEnabled,
      followUpEnabled,
      followUpGapDays,
      followUpTemplateId,
      outreachAt: outreachAt || null,
      property: selectedProperty.title,
      realtorEmail: manualEmail.trim(),
      realtorName: manualName.trim(),
      realtorPhone: manualPhone.trim(),
      showingAt: manualShowingAt || null,
      smsEnabled,
    })
    if (response.error) return
    setManualOpen(false)
    setManualName("")
    setManualEmail("")
    setManualPhone("")
    setManualProperty("")
    setManualShowingAt("")
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{"Realtor Showings"}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {"Import realtor showing CSV files, map columns, match each row to a property, and schedule Email/SMS follow-ups. Any inbound realtor Email or SMS stops remaining automatic outreach."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/dashboard/realtor-showings/new" />} type="button" variant="outline">
            <AppIcon data-icon="inline-start" name="add" />
            {"Add Showing"}
          </Button>
          <Button onClick={() => setImportOpen(true)} type="button">
            <AppIcon data-icon="inline-start" name="upload_file" />
            {"Import CSV"}
          </Button>
        </div>
      </div>
      {importSummary ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <p className="text-sm font-medium">{importSummary}</p>
            <Button onClick={() => setImportSummary("")} size="sm" type="button" variant="ghost">{"Dismiss"}</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>{"Realtor Templates"}</CardTitle>
            <CardDescription>{`${templates.length} active Realtor template${templates.length === 1 ? "" : "s"}. Create direct and follow-up templates in Communication Templates using Audience: Realtor.`}</CardDescription>
          </div>
          <Button render={<Link href="/dashboard/settings#communication-templates" />} variant="outline">
            {"Manage Realtor Templates"}
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="grid gap-3 md:grid-cols-[1fr_320px] md:items-end">
          <div>
            <CardTitle>{"Showing Registry"}</CardTitle>
            <CardDescription>{"Auto matches accept partial property title/address overlap. Use property selector to correct any row."}</CardDescription>
          </div>
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search realtor, property, email, phone" value={search} />
        </CardHeader>
        <CardContent>
          {showingsQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{"Loading showings..."}</p>
          ) : showingsQuery.error ? (
            <p className="py-10 text-center text-sm text-destructive">{showingsQuery.error.message}</p>
          ) : showings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{"No realtor showings imported."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{"Realtor"}</TableHead>
                    <TableHead>{"Showing"}</TableHead>
                    <TableHead>{"CSV Property"}</TableHead>
                    <TableHead>{"Matched Property"}</TableHead>
                    <TableHead>{"Match"}</TableHead>
                    <TableHead>{"Outreach"}</TableHead>
                    <TableHead>{"Automation"}</TableHead>
                    <TableHead className="text-right">{"Action"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showings.map((showing) => (
                    <TableRow key={showing.id}>
                      <TableCell className="max-w-[230px]">
                        <p className="font-medium">{showing.realtorName}</p>
                        <p className="truncate text-muted-foreground">{showing.realtorEmail || "No email"}</p>
                        <p className="text-muted-foreground">{showing.realtorPhone || "No phone"}</p>
                      </TableCell>
                      <TableCell>{showing.showingAt ? formatDateTimeLabel(showing.showingAt) : "Not provided"}</TableCell>
                      <TableCell className="max-w-[220px]">{showing.propertyText || "Not provided"}</TableCell>
                      <TableCell className="min-w-[280px]">
                        <Select
                          disabled={propertyMutation.isPending}
                          modal={false}
                          onValueChange={(value) => void propertyMutation.mutateAsync({
                            id: showing.id,
                            propertyId: value === "none" ? null : Number(value),
                          })}
                          value={showing.propertyId ? String(showing.propertyId) : "none"}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose property" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="none">{"Unmatched"}</SelectItem>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={String(property.id)}>
                                  {`${property.title} - ${property.location}`}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={showing.propertyId ? "secondary" : "destructive"}>{showing.propertyMatchMethod}</Badge>
                          <span className="text-xs text-muted-foreground">{`${Math.round(showing.propertyMatchScore * 100)}%`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {showing.emailEnabled ? <Badge variant="outline">{"Email"}</Badge> : null}
                          {showing.smsEnabled ? <Badge variant="outline">{"SMS"}</Badge> : null}
                          {showing.followUpEnabled ? <Badge variant="secondary">{`Follow-up ${showing.followUpGapDays}d`}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {showing.outreachAt ? formatDateTimeLabel(showing.outreachAt) : "Send now"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={showing.automationStatus === "StoppedByReply" ? "secondary" : showing.automationStatus === "Scheduled" ? "outline" : "destructive"}>
                          {showing.automationStatus === "StoppedByReply" ? "Stopped: replied" : showing.automationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => setAutomationEditor({
                            directTemplateId: showing.directTemplateId,
                            emailEnabled: showing.emailEnabled,
                            followUpEnabled: showing.followUpEnabled,
                            followUpGapDays: showing.followUpGapDays,
                            followUpTemplateId: showing.followUpTemplateId,
                            id: showing.id,
                            outreachAt: showing.outreachAt ? showing.outreachAt.slice(0, 16) : "",
                            realtorName: showing.realtorName,
                            smsEnabled: showing.smsEnabled,
                          })}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {"Edit Schedule"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{"Import Realtor Showings"}</DialogTitle>
            <DialogDescription>{"Upload CSV, verify auto mapping, then configure direct outreach and follow-up."}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle>{"1. CSV File"}</CardTitle>
                <CardDescription>{fileName ? `${fileName} - ${rows.length} rows` : "Header row required. Maximum 2,000 rows per import."}</CardDescription>
              </CardHeader>
              <CardContent>
                <Input accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} type="file" />
              </CardContent>
            </Card>

            {headers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{"2. Column Mapping"}</CardTitle>
                  <CardDescription>{"Auto mapped where possible. Override any field for exact CSV structure."}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {mappingFields.map((field) => (
                    <label key={field.key} className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{field.label}</span>
                      <Select
                        modal={false}
                        onValueChange={(value) => setMapping((current) => ({ ...current, [field.key]: value === "none" ? "" : value }))}
                        value={mapping[field.key] || "none"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose CSV column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">{"Not mapped"}</SelectItem>
                            {headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </label>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{"3. Outreach Automation"}</CardTitle>
                <CardDescription>{"Same configuration applies to every imported row. Replies stop all remaining scheduled Email/SMS for that realtor lead."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Channels"}</span>
                  <label className="flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox checked={emailEnabled} onCheckedChange={(checked) => setEmailEnabled(checked === true)} />
                    {"Email"}
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox checked={smsEnabled} onCheckedChange={(checked) => setSmsEnabled(checked === true)} />
                    {"SMS"}
                  </label>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Send At"}</span>
                  <Input onChange={(event) => setOutreachAt(event.target.value)} type="datetime-local" value={outreachAt} />
                  <span className="text-xs text-muted-foreground">{"Leave empty to send immediately."}</span>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Direct Template"}</span>
                  <Select modal={false} onValueChange={(value) => setDirectTemplateId(value === "none" ? "" : value)} value={directTemplateId || "none"}>
                    <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{"Default reminder"}</SelectItem>
                        {directTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-3">
                  <Checkbox checked={followUpEnabled} onCheckedChange={(checked) => setFollowUpEnabled(checked === true)} />
                  {"Enable Follow-Up"}
                </label>
                {followUpEnabled ? (
                  <>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Follow-Up Template"}</span>
                      <Select modal={false} onValueChange={(value) => setFollowUpTemplateId(value === "none" ? "" : value)} value={followUpTemplateId || "none"}>
                        <SelectTrigger><SelectValue placeholder="Choose follow-up" /></SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">{"No follow-up template"}</SelectItem>
                            {followUpTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium">{"Gap Days"}</span>
                      <Input min={1} onChange={(event) => setFollowUpGapDays(Math.max(1, Number(event.target.value) || 1))} type="number" value={followUpGapDays} />
                    </label>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {parseError ? <p className="text-sm font-medium text-destructive">{parseError}</p> : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setImportOpen(false)} type="button" variant="outline">{"Cancel"}</Button>
            <Button disabled={importMutation.isPending || rows.length === 0} onClick={() => void handleImport()} type="button">
              {importMutation.isPending ? "Importing..." : `Import ${rows.length || 0} Rows`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{"Add Realtor Showing"}</DialogTitle>
            <DialogDescription>{"Create one showing, match property, then configure first message and follow-up."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Realtor Name"}</span>
              <Input onChange={(event) => setManualName(event.target.value)} value={manualName} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Showing Date/Time"}</span>
              <Input onChange={(event) => setManualShowingAt(event.target.value)} type="datetime-local" value={manualShowingAt} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Email"}</span>
              <Input onChange={(event) => setManualEmail(event.target.value)} type="email" value={manualEmail} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Phone"}</span>
              <Input onChange={(event) => setManualPhone(event.target.value)} value={manualPhone} />
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-sm font-medium">{"Property"}</span>
              <Select modal={false} onValueChange={(value) => setManualProperty(value === "none" ? "" : value)} value={manualProperty || "none"}>
                <SelectTrigger><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">{"Choose property"}</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={String(property.id)}>{`${property.title} - ${property.location}`}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox checked={emailEnabled} onCheckedChange={(checked) => setEmailEnabled(checked === true)} />
              {"Email"}
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox checked={smsEnabled} onCheckedChange={(checked) => setSmsEnabled(checked === true)} />
              {"SMS"}
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"First Message At"}</span>
              <Input onChange={(event) => setOutreachAt(event.target.value)} type="datetime-local" value={outreachAt} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">{"Direct Template"}</span>
              <Select modal={false} onValueChange={(value) => setDirectTemplateId(value === "none" ? "" : value)} value={directTemplateId || "none"}>
                <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">{"Default reminder"}</SelectItem>
                    {directTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3 sm:col-span-2">
              <Checkbox checked={followUpEnabled} onCheckedChange={(checked) => setFollowUpEnabled(checked === true)} />
              {"Enable Follow-Up"}
            </label>
            {followUpEnabled ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Follow-Up Template"}</span>
                  <Select modal={false} onValueChange={(value) => setFollowUpTemplateId(value === "none" ? "" : value)} value={followUpTemplateId || "none"}>
                    <SelectTrigger><SelectValue placeholder="Choose follow-up" /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{"No follow-up"}</SelectItem>
                        {followUpTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{"Gap Days"}</span>
                  <Input min={1} onChange={(event) => setFollowUpGapDays(Math.max(1, Number(event.target.value) || 1))} type="number" value={followUpGapDays} />
                </label>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setManualOpen(false)} type="button" variant="outline">{"Cancel"}</Button>
            <Button
              disabled={createMutation.isPending || (!manualEmail.trim() && !manualPhone.trim()) || !manualProperty}
              onClick={() => void handleManualCreate()}
              type="button"
            >
              {createMutation.isPending ? "Creating..." : "Create Showing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(automationEditor)} onOpenChange={(open) => !open && setAutomationEditor(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{"Edit Showing Automation"}</DialogTitle>
            <DialogDescription>
              {automationEditor ? `Update channels, templates, and timing for ${automationEditor.realtorName}. Existing pending items for this showing will be replaced.` : ""}
            </DialogDescription>
          </DialogHeader>
          {automationEditor ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border p-3">
                <Checkbox
                  checked={automationEditor.emailEnabled}
                  onCheckedChange={(checked) => setAutomationEditor((current) => current ? { ...current, emailEnabled: checked === true } : null)}
                />
                {"Email"}
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3">
                <Checkbox
                  checked={automationEditor.smsEnabled}
                  onCheckedChange={(checked) => setAutomationEditor((current) => current ? { ...current, smsEnabled: checked === true } : null)}
                />
                {"SMS"}
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium">{"Send At"}</span>
                <Input
                  onChange={(event) => setAutomationEditor((current) => current ? { ...current, outreachAt: event.target.value } : null)}
                  type="datetime-local"
                  value={automationEditor.outreachAt ?? ""}
                />
              </label>
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium">{"Direct Template"}</span>
                <Select
                  modal={false}
                  onValueChange={(value) => setAutomationEditor((current) => current ? { ...current, directTemplateId: value === "none" ? "" : value } : null)}
                  value={automationEditor.directTemplateId || "none"}
                >
                  <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">{"Default reminder"}</SelectItem>
                      {directTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 sm:col-span-2">
                <Checkbox
                  checked={automationEditor.followUpEnabled}
                  onCheckedChange={(checked) => setAutomationEditor((current) => current ? { ...current, followUpEnabled: checked === true } : null)}
                />
                {"Enable Follow-Up"}
              </label>
              {automationEditor.followUpEnabled ? (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{"Follow-Up Template"}</span>
                    <Select
                      modal={false}
                      onValueChange={(value) => setAutomationEditor((current) => current ? { ...current, followUpTemplateId: value === "none" ? "" : value } : null)}
                      value={automationEditor.followUpTemplateId || "none"}
                    >
                      <SelectTrigger><SelectValue placeholder="Choose follow-up" /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">{"No follow-up"}</SelectItem>
                          {followUpTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{"Gap Days"}</span>
                    <Input
                      min={1}
                      onChange={(event) => setAutomationEditor((current) => current ? { ...current, followUpGapDays: Math.max(1, Number(event.target.value) || 1) } : null)}
                      type="number"
                      value={automationEditor.followUpGapDays}
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setAutomationEditor(null)} type="button" variant="outline">{"Cancel"}</Button>
            <Button disabled={automationMutation.isPending} onClick={() => void handleAutomationSave()} type="button">
              {automationMutation.isPending ? "Saving..." : "Save Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
