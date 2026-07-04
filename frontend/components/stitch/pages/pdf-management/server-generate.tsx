"use client"

import { useEffect, useState } from "react"

import type { PdfResolveResult } from "@/@types/pdf-management"
import { useAgentUsers, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import {
  useGeneratePdf,
  usePdfTemplates,
  useResolvePdfTemplate,
} from "@/hooks/use-pdfs-api"

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

  return null
}
