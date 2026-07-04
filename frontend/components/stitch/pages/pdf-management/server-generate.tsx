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

  return null
}
