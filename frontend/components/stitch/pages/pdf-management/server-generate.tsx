"use client"

import { useEffect, useState } from "react"

import type { PdfResolveResult } from "@/@types/pdf-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgentUsers, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import {
  useGeneratePdf,
  usePdfTemplates,
  useResolvePdfTemplate,
} from "@/hooks/use-pdfs-api"

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

  return (
    <PdfShell
      description="Resolve data and generate the final file through the backend PDF service."
      title="Generate & download PDFs"
    >
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
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
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle><CardDescription>{resolved?.fileName ?? "Resolve a template to continue."}</CardDescription></CardHeader>
          <CardContent className="flex min-h-[500px] items-center justify-center text-sm text-muted-foreground">
            {resolved ? `${resolved.variablesUsed.length} fields resolved` : "No preview loaded"}
          </CardContent>
        </Card>
      </div>
      <span className="sr-only">{generateMutation.isPending ? "Generating" : "Ready"}{Object.keys(manualValues).length}{setManualValues ? "" : ""}{generatePdf ? "" : ""}</span>
    </PdfShell>
  )
}
