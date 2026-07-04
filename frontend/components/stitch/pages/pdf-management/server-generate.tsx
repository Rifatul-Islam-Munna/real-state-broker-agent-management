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
  usePdfTemplates,
  useResolvePdfTemplate,
} from "@/hooks/use-pdfs-api"

import { PdfTemplateViewerCanvas } from "./pdfme-canvas"
import { PdfShell } from "./shell"

export function PdfServerGenerationWorkspace({ initialTemplateId }: { initialTemplateId?: number }) {
  const templatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const leadsQuery = useLeads({ page: 1, pageSize: 300 })
  const agentsQuery = useAgentUsers({ page: 1, pageSize: 300 })
  const resolveMutation = useResolvePdfTemplate()
  const generateMutation = useGeneratePdf()

  const [templateId, setTemplateId] = useState(initialTemplateId ? String(initialTemplateId) : "")
  const [propertyId, setPropertyId] = useState("")
  const [leadId, setLeadId] = useState("")
  const [agentId, setAgentId] = useState("")
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState<PdfResolveResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialTemplateId) setTemplateId(String(initialTemplateId))
  }, [initialTemplateId])

  async function resolvePdf(overrides = manualValues) {
    if (!templateId) {
      setResolved(null)
      return
    }
    setError(null)
    const result = await resolveMutation.mutateAsync({
      templateId: Number(templateId),
      propertyId: propertyId ? Number(propertyId) : null,
      leadId: leadId ? Number(leadId) : null,
      agentId: agentId ? Number(agentId) : null,
      manualValues: overrides,
    })
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to resolve the PDF.")
      return
    }
    setResolved(result.data)
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
  const properties = propertiesQuery.data?.items ?? []
  const leads = leadsQuery.data?.items ?? []
  const agents = agentsQuery.data ?? []
  const missingVariables = resolved?.missingVariables ?? []

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
              <Select modal={false} onValueChange={setTemplateId} value={templateId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger>
                <SelectContent>{templates.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setPropertyId(value === "none" ? "" : value)} value={propertyId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose property" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No property</SelectItem>{properties.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setLeadId(value === "none" ? "" : value)} value={leadId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose tenant or lead" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No tenant or lead</SelectItem>{leads.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setAgentId(value === "none" ? "" : value)} value={agentId || "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose agent" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Use assigned agent</SelectItem>{agents.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.fullName}</SelectItem>)}</SelectContent>
              </Select>
              <Button disabled={!templateId || resolveMutation.isPending} onClick={() => void resolvePdf()}>
                <AppIcon name="preview" />
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
              <PdfTemplateViewerCanvas
                inputs={resolved.inputs}
                template={resolved.template.templateJson}
              />
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
