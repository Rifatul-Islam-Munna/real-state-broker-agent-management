"use client"

import { useEffect, useState } from "react"

import type { PdfResolveResult } from "@/@types/pdf-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgentUsers, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import {
  useGeneratePdf,
  usePdfTemplate,
  usePdfTemplates,
  useResolvePdfTemplate,
} from "@/hooks/use-pdfs-api"

import { PdfShell } from "./shell"

export function PdfServerGenerationWorkspace({ initialTemplateId }: { initialTemplateId?: number }) {
  const [templateId, setTemplateId] = useState(initialTemplateId ? String(initialTemplateId) : "")
  const [propertyId, setPropertyId] = useState("")
  const [leadId, setLeadId] = useState("")
  const [agentId, setAgentId] = useState("")
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
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>{templateOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setPropertyId(value === "none" ? "" : value) }} value={propertyId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No property</SelectItem>{properties.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setLeadId(value === "none" ? "" : value) }} value={leadId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose tenant or lead" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No tenant or lead</SelectItem>{leads.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => { clearPreview(); setResolved(null); setAgentId(value === "none" ? "" : value) }} value={agentId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose agent" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Use assigned agent</SelectItem>{agents.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.fullName}</SelectItem>)}</SelectContent>
              </Select>
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
