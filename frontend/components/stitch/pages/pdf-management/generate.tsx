"use client"

import { useEffect, useMemo, useState } from "react"

import type { DocumentRepositoryItem } from "@/@types/real-estate-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAgentUsers, useDocumentRepository, useLeads, useProperties } from "@/hooks/use-real-estate-api"
import { PDF_TEMPLATE_CATEGORY } from "@/lib/pdf/readme"
import { decodePdfTemplate } from "@/lib/pdf/util"

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

  useEffect(() => {
    if (initialTemplateId) setTemplateId(String(initialTemplateId))
  }, [initialTemplateId])

  const templates = useMemo(() => {
    return (templatesQuery.data?.items ?? [])
      .map((document) => ({ document, template: decodePdfTemplate(document) }))
      .filter((item): item is { document: DocumentRepositoryItem; template: NonNullable<ReturnType<typeof decodePdfTemplate>> } => Boolean(item.template))
      .filter((item) => item.template.status !== "Archived")
  }, [templatesQuery.data?.items])

  const primaryRecords = primaryQuery.data?.items ?? []
  const contacts = contactsQuery.data?.items ?? []
  const agents = agentsQuery.data ?? []

  return (
    <PdfShell description="Choose a template and related records, complete missing values, preview the final document, then download it." title="Generate & download PDFs">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>Autofill source</CardTitle><CardDescription>Select any combination of records.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Select modal={false} onValueChange={setTemplateId} value={templateId}><SelectTrigger className="w-full"><SelectValue placeholder="Choose template" /></SelectTrigger><SelectContent>{templates.map((item) => <SelectItem key={item.document.id} value={String(item.document.id)}>{item.template.name}</SelectItem>)}</SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setPrimaryId(value === "none" ? "" : value)} value={primaryId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose primary record" /></SelectTrigger><SelectContent><SelectItem value="none">No primary record</SelectItem>{primaryRecords.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setContactId(value === "none" ? "" : value)} value={contactId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose contact" /></SelectTrigger><SelectContent><SelectItem value="none">No contact</SelectItem>{contacts.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>
            <Select modal={false} onValueChange={(value) => setAgentId(value === "none" ? "" : value)} value={agentId || "none"}><SelectTrigger className="w-full"><SelectValue placeholder="Choose agent" /></SelectTrigger><SelectContent><SelectItem value="none">No agent</SelectItem>{agents.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.fullName}</SelectItem>)}</SelectContent></Select>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Live preview</CardTitle><CardDescription>Select a template to begin.</CardDescription></CardHeader><CardContent><div className="flex h-[500px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Preview will appear here.</div></CardContent></Card>
      </div>
    </PdfShell>
  )
}
