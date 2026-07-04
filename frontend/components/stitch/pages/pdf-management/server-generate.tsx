"use client"

import { useEffect, useMemo, useState } from "react"

import type { PdfResolveResult } from "@/@types/pdf-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgentUsers, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import {
  useGeneratePdf,
  usePdfTemplate,
  usePdfTemplates,
  useResolvePdfTemplate,
} from "@/hooks/use-pdfs-api"

import { PdfShell } from "./shell"

type ReportRange = "custom" | "daily" | "weekly" | "monthly"
type ReportSource = "" | "leads" | "showings" | "feedback"

const reportTableLabels: Record<Exclude<ReportSource, "">, string> = {
  leads: "Lead table",
  showings: "Showing table",
  feedback: "Feedback table",
}

const allReportSources: Array<Exclude<ReportSource, "">> = ["leads", "showings", "feedback"]

function schemaNameKey(schema: unknown) {
  const name = `${(schema as { name?: unknown } | null)?.name ?? ""}`.trim()
  return name.match(/^\{\{\s*([^}]+?)\s*\}\}$/)?.[1]?.trim() ?? name
}

export function PdfServerGenerationWorkspace({ initialTemplateId }: { initialTemplateId?: number }) {
  const [templateId, setTemplateId] = useState(initialTemplateId ? String(initialTemplateId) : "")
  const [propertyId, setPropertyId] = useState("")
  const [leadId, setLeadId] = useState("")
  const [agentId, setAgentId] = useState("")
  const [reportSource, setReportSource] = useState<ReportSource>("")
  const [reportRange, setReportRange] = useState<ReportRange>("custom")
  const [reportFromDate, setReportFromDate] = useState("")
  const [reportToDate, setReportToDate] = useState("")
  const [templateSearch, setTemplateSearch] = useState("")
  const [propertySearch, setPropertySearch] = useState("")
  const [leadSearch, setLeadSearch] = useState("")
  const [agentSearch, setAgentSearch] = useState("")
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState<PdfResolveResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoResolvedTemplateId, setAutoResolvedTemplateId] = useState("")

  const templatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const selectedTemplateQuery = usePdfTemplate(templateId ? Number(templateId) : undefined)
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const leadsQuery = useLeads({ page: 1, pageSize: 300 })
  const agentsQuery = useAgentUsers({ page: 1, pageSize: 300 })
  const resolveMutation = useResolvePdfTemplate()
  const generateMutation = useGeneratePdf()

  useEffect(() => {
    if (initialTemplateId) setTemplateId(String(initialTemplateId))
  }, [initialTemplateId])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function clearPreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  function formatDateInput(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  function updateReportRange(value: ReportRange) {
    clearPreview()
    setResolved(null)
    setReportRange(value)
    const today = new Date()
    const from = new Date(today)
    const to = new Date(today)
    if (value === "daily") {
      setReportFromDate(formatDateInput(today))
      setReportToDate(formatDateInput(today))
      return
    }
    if (value === "weekly") {
      from.setDate(today.getDate() - today.getDay())
      to.setDate(from.getDate() + 6)
      setReportFromDate(formatDateInput(from))
      setReportToDate(formatDateInput(to))
      return
    }
    if (value === "monthly") {
      from.setDate(1)
      to.setMonth(today.getMonth() + 1, 0)
      setReportFromDate(formatDateInput(from))
      setReportToDate(formatDateInput(to))
    }
  }

  async function loadExactPreview(overrides: Record<string, string>) {
    const response = await fetch("/api/proxy/pdfs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: Number(templateId),
        propertyId: propertyId ? Number(propertyId) : null,
        leadId: leadId ? Number(leadId) : null,
        agentId: agentId ? Number(agentId) : null,
        manualValues: overrides,
        reportSource: hasReportTables ? reportSource : "",
        reportFromDate: reportFromDate || null,
        reportToDate: reportToDate || null,
      }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Unable to render the PDF preview."
      throw new Error(message)
    }
    const blob = await response.blob()
    const nextUrl = URL.createObjectURL(blob)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return nextUrl
    })
  }

  async function resolvePdf(overrides = manualValues) {
    if (!templateId) {
      setResolved(null)
      clearPreview()
      return
    }
    setError(null)
    clearPreview()
    const result = await resolveMutation.mutateAsync({
      templateId: Number(templateId),
      propertyId: propertyId ? Number(propertyId) : null,
      leadId: leadId ? Number(leadId) : null,
      agentId: agentId ? Number(agentId) : null,
      manualValues: overrides,
      reportSource: hasReportTables ? reportSource : "",
      reportFromDate: reportFromDate || null,
      reportToDate: reportToDate || null,
    })
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to resolve the PDF.")
      setAutoResolvedTemplateId(templateId)
      return
    }
    setResolved(result.data)
    setAutoResolvedTemplateId(templateId)
    if (result.data.missingVariables.length === 0) {
      await loadExactPreview(overrides).catch((previewError: Error) => {
        setError(previewError.message)
      })
    }
  }

  async function generatePdf() {
    if (!templateId) return
    setError(null)
    const result = await generateMutation.mutateAsync({
      templateId: Number(templateId),
      propertyId: propertyId ? Number(propertyId) : null,
      leadId: leadId ? Number(leadId) : null,
      agentId: agentId ? Number(agentId) : null,
      manualValues,
      reportSource: hasReportTables ? reportSource : "",
      reportFromDate: reportFromDate || null,
      reportToDate: reportToDate || null,
    })
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to generate the PDF.")
      return
    }
    const anchor = document.createElement("a")
    anchor.href = result.data.downloadUrl
    anchor.download = result.data.fileName
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    anchor.click()
  }

  const templates = (templatesQuery.data?.items ?? []).filter((item) => item.status !== "Archived")
  const selectedTemplate = selectedTemplateQuery.data
  const templateOptions =
    selectedTemplate && !templates.some((item) => item.id === selectedTemplate.id)
      ? [selectedTemplate, ...templates]
      : templates
  const properties = propertiesQuery.data?.items ?? []
  const leads = leadsQuery.data?.items ?? []
  const agents = agentsQuery.data ?? []
  const missingVariables = resolved?.missingVariables ?? []
  const reportTableOptions = useMemo(() => {
    const schemas = Array.isArray(selectedTemplate?.templateJson?.schemas)
      ? selectedTemplate.templateJson.schemas.flat()
      : []
    const tableSchemas = schemas.filter((schema) => (schema as { type?: unknown } | null)?.type === "table")
    if (tableSchemas.length === 0) return []
    const exactSources = tableSchemas
      .map((schema) => {
        const key = schemaNameKey(schema)
        if (key === "report.leads.table") return "leads"
        if (key === "report.showings.table") return "showings"
        if (key === "report.feedback.table") return "feedback"
        return null
      })
      .filter(Boolean) as Array<Exclude<ReportSource, "">>
    return exactSources.length ? [...new Set(exactSources)] : allReportSources
  }, [selectedTemplate?.templateJson])
  const hasReportTables = reportTableOptions.length > 0
  const filteredTemplates = templateOptions.filter((item) =>
    `${item.name} ${item.category}`.toLowerCase().includes(templateSearch.trim().toLowerCase()),
  )
  const filteredProperties = properties.filter((item) =>
    `${item.title} ${item.location ?? ""}`.toLowerCase().includes(propertySearch.trim().toLowerCase()),
  )
  const filteredLeads = leads.filter((item) =>
    `${item.name} ${item.email ?? ""} ${item.phone ?? ""} ${item.property ?? ""}`.toLowerCase().includes(leadSearch.trim().toLowerCase()),
  )
  const filteredAgents = agents.filter((item) =>
    item.fullName.toLowerCase().includes(agentSearch.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!hasReportTables || !reportSource || reportTableOptions.includes(reportSource)) return
    setReportSource("")
  }, [hasReportTables, reportSource, reportTableOptions])

  useEffect(() => {
    if (!initialTemplateId || !templateId || autoResolvedTemplateId === templateId || resolveMutation.isPending) return
    void resolvePdf()
    // Auto-load direct "Use" links once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId, templateId, autoResolvedTemplateId, resolveMutation.isPending])

  return (
    <PdfShell
      description="Resolve data and generate the final file through the backend PDF service."
      title="Generate & download PDFs"
    >
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Autofill source</CardTitle><CardDescription>Select the records used by this document.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setTemplateId(value) }} value={templateId}>
                <Label className="text-xs">Template</Label>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>
                  <Input className="mb-2 h-8" onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search template" value={templateSearch} />
                  {filteredTemplates.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setPropertyId(value === "none" ? "" : value) }} value={propertyId || "none"}>
                <Label className="text-xs">Property</Label>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent>
                  <Input className="mb-2 h-8" onChange={(event) => setPropertySearch(event.target.value)} placeholder="Search property" value={propertySearch} />
                  <SelectItem value="none">No property</SelectItem>
                  {filteredProperties.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setLeadId(value === "none" ? "" : value) }} value={leadId || "none"}>
                <Label className="text-xs">Tenant or lead</Label>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose tenant or lead" /></SelectTrigger>
                <SelectContent>
                  <Input className="mb-2 h-8" onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search lead" value={leadSearch} />
                  <SelectItem value="none">No tenant or lead</SelectItem>
                  {filteredLeads.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setAgentId(value === "none" ? "" : value) }} value={agentId || "none"}>
                <Label className="text-xs">Agent</Label>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose agent" /></SelectTrigger>
                <SelectContent>
                  <Input className="mb-2 h-8" onChange={(event) => setAgentSearch(event.target.value)} placeholder="Search agent" value={agentSearch} />
                  <SelectItem value="none">Use assigned agent</SelectItem>
                  {filteredAgents.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasReportTables ? (
                <>
                  <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setReportSource(value === "none" ? "" : (value as ReportSource)) }} value={reportSource || "none"}>
                    <Label className="text-xs">Report table</Label>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Report table data" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No report table</SelectItem>
                      {reportTableOptions.map((source) => (
                        <SelectItem key={source} value={source}>{reportTableLabels[source]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select modal={false} onValueChange={(value) => updateReportRange(value as ReportRange)} value={reportRange}>
                    <Label className="text-xs">Report date range</Label>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Report date range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Date to date</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">From date</Label>
                      <Input
                        onChange={(event) => { clearPreview(); setResolved(null); setReportRange("custom"); setReportFromDate(event.target.value) }}
                        type="date"
                        value={reportFromDate}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To date</Label>
                      <Input
                        onChange={(event) => { clearPreview(); setResolved(null); setReportRange("custom"); setReportToDate(event.target.value) }}
                        type="date"
                        value={reportToDate}
                      />
                    </div>
                  </div>
                </>
              ) : null}
              <Button disabled={!templateId || resolveMutation.isPending} onClick={() => void resolvePdf()}>
                <AppIcon name="visibility" />
                Resolve and preview
              </Button>
            </CardContent>
          </Card>

          {resolved ? (
            <Card>
              <CardHeader>
                <CardTitle>Required information</CardTitle>
                <CardDescription>
                  {missingVariables.length
                    ? `${missingVariables.length} values are missing. Enter them manually.`
                    : "All required values were resolved by the backend."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {missingVariables.length === 0 ? <Badge>Ready</Badge> : null}
                {missingVariables.map((variable) => (
                  <div className="space-y-1" key={variable.key}>
                    <label className="text-xs font-medium" htmlFor={`manual-${variable.key}`}>
                      {variable.label || variable.key}
                    </label>
                    <Input
                      id={`manual-${variable.key}`}
                      onChange={(event) => setManualValues((current) => ({
                        ...current,
                        [variable.key]: event.target.value,
                      }))}
                      placeholder={variable.key}
                      value={manualValues[variable.key] ?? ""}
                    />
                  </div>
                ))}
                {missingVariables.length > 0 ? (
                  <Button onClick={() => void resolvePdf()} variant="outline">
                    Apply manual values
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  disabled={generateMutation.isPending || missingVariables.length > 0}
                  onClick={() => void generatePdf()}
                >
                  <AppIcon name="download" />
                  Generate on server and download
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>{resolved?.fileName ?? "Resolve a template to continue."}</CardDescription>
          </CardHeader>
          <CardContent>
            {resolved ? (
              previewUrl ? (
                <iframe
                  className="h-[680px] w-full rounded-xl border bg-muted/20"
                  src={previewUrl}
                  title="PDF preview"
                />
              ) : (
                <div className="flex h-[680px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Complete required information to preview the exact PDF.
                </div>
              )
            ) : (
              <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No preview loaded
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PdfShell>
  )
}
