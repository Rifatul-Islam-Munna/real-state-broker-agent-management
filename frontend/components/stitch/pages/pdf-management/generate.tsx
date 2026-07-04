"use client"

import { useEffect, useMemo, useState } from "react"

import type { DocumentRepositoryItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgentUsers, useDocumentRepository, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import { PDF_TEMPLATE_CATEGORY } from "@/lib/pdf/readme"
import { templateFieldNames } from "@/lib/pdf/runtime"
import { decodePdfTemplate } from "@/lib/pdf/util"

import { PdfTemplateViewerCanvas } from "./pdfme-canvas"
import { PdfShell } from "./shell"

export function PdfGenerationWorkspacePage({ initialTemplateId }: { initialTemplateId?: number }) {
  const templatesQuery = useDocumentRepository({ category: PDF_TEMPLATE_CATEGORY, isTemplate: true, page: 1, pageSize: 200 })
  const primaryQuery = useProperties({ page: 1, pageSize: 300 })
  const contactsQuery = useLeads({ page: 1, pageSize: 300 })
  const agentsQuery = useAgentUsers({ page: 1, pageSize: 300 })
  const [templateId, setTemplateId] = useState(initialTemplateId ? String(initialTemplateId) : "")
  const [primaryId, setPrimaryId] = useState("")
  const [contactId, setContactId] = useState("")
  const [agentId, setAgentId] = useState("")
  const [manualValues, setManualValues] = useState<Record<string, string>>({})

  useEffect(() => { if (initialTemplateId) setTemplateId(String(initialTemplateId)) }, [initialTemplateId])

  const templates = useMemo(() => (templatesQuery.data?.items ?? [])
    .map((document) => ({ document, template: decodePdfTemplate(document) }))
    .filter((item): item is { document: DocumentRepositoryItem; template: NonNullable<ReturnType<typeof decodePdfTemplate>> } => Boolean(item.template))
    .filter((item) => item.template.status !== "Archived"), [templatesQuery.data?.items])

  const primaryRecords = primaryQuery.data?.items ?? []
  const contacts = contactsQuery.data?.items ?? []
  const agents = agentsQuery.data ?? []
  const selectedTemplate = templates.find((item) => String(item.document.id) === templateId)
  const selectedPrimary = primaryRecords.find((item) => String(item.id) === primaryId)
  const selectedContact = contacts.find((item) => String(item.id) === contactId)
  const selectedAgent = agents.find((item) => String(item.id) === agentId)
  const now = new Date()
  const automaticValues: Record<string, string> = {
    "system.current_date": now.toLocaleDateString(), "system.current_time": now.toLocaleTimeString(), "system.current_year": String(now.getFullYear()), "system.generated_at": now.toISOString(),
    "record.id": String(selectedPrimary?.id ?? ""), "record.slug": selectedPrimary?.slug ?? "", "record.title": selectedPrimary?.title ?? "", "record.price": selectedPrimary?.price ?? "", "record.location": selectedPrimary?.location ?? "", "record.status": selectedPrimary?.status ?? "",
    "contact.id": String(selectedContact?.id ?? ""), "contact.name": selectedContact?.name ?? "", "contact.email": selectedContact?.email ?? "", "contact.phone": selectedContact?.phone ?? "",
    "agent.id": String(selectedAgent?.id ?? ""), "agent.name": selectedAgent?.fullName ?? "", "agent.email": selectedAgent?.email ?? "", "agent.phone": selectedAgent?.phone ?? "",
  }
  const values = { ...automaticValues, ...manualValues }
  const usedFields = selectedTemplate ? templateFieldNames(selectedTemplate.template.template) : []
  const missingFields = selectedTemplate ? selectedTemplate.template.requiredVariables.filter((key) => !values[key]?.trim()) : []
  const inputs = [Object.fromEntries(usedFields.map((key) => [key, values[key] ?? ""]))]

  return (
    <PdfShell description="Choose a template and related records, complete missing values, preview the final document, then download it." title="Generate & download PDFs">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Autofill source</CardTitle><CardDescription>{usedFields.length} mapped fields are ready.</CardDescription></CardHeader><CardContent className="space-y-4"><Select modal={false} onValueChange={setTemplateId} value={templateId}><SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger><SelectContent>{templates.map((item) => <SelectItem key={item.document.id} value={String(item.document.id)}>{item.template.name}</SelectItem>)}</SelectContent></Select><Select modal={false} onValueChange={(value) => setPrimaryId(value === "none" ? "" : value)} value={primaryId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose primary record" /></SelectTrigger><SelectContent><SelectItem value="none">No primary record</SelectItem>{primaryRecords.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent></Select><Select modal={false} onValueChange={(value) => setContactId(value === "none" ? "" : value)} value={contactId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose contact" /></SelectTrigger><SelectContent><SelectItem value="none">No contact</SelectItem>{contacts.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select><Select modal={false} onValueChange={(value) => setAgentId(value === "none" ? "" : value)} value={agentId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent><SelectItem value="none">No agent</SelectItem>{agents.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.fullName}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          {selectedTemplate ? <Card><CardHeader><CardTitle>Missing information</CardTitle><CardDescription>{missingFields.length ? `${missingFields.length} required values need attention.` : "All required values are ready."}</CardDescription></CardHeader><CardContent className="space-y-3">{missingFields.length === 0 ? <Badge>Ready</Badge> : null}{missingFields.map((key) => <Input key={key} onChange={(event) => setManualValues((current) => ({ ...current, [key]: event.target.value }))} placeholder={key} value={manualValues[key] ?? ""} />)}<Button className="w-full" disabled><AppIcon name="download" />Generate and download</Button></CardContent></Card> : null}
        </div>
        <Card><CardHeader><CardTitle>Live preview</CardTitle><CardDescription>Automatic and manual values are applied before generation.</CardDescription></CardHeader><CardContent>{selectedTemplate ? <PdfTemplateViewerCanvas inputs={inputs} template={selectedTemplate.template.template} /> : <div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Choose a template to preview it.</div>}</CardContent></Card>
      </div>
    </PdfShell>
  )
}
