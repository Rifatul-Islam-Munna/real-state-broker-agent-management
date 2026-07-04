"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { Template } from "@pdfme/common"

import type { DocumentRepositoryItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAgentUsers, useCreateDocumentRepositoryItem, useDocumentRepository, useLeads, useProperties, useUpdateDocumentRepositoryItem } from "@/hooks/use-real-estate-api"
import type { StoredPdfTemplate } from "@/lib/pdf/model"
import { PDF_TEMPLATE_CATEGORY } from "@/lib/pdf/readme"
import { addTextField, createBlankTemplate, templateFieldNames } from "@/lib/pdf/runtime"
import { buildPdfTemplateDocument, decodePdfTemplate } from "@/lib/pdf/util"

import { PdfTemplateDesignerCanvas } from "./pdfme-canvas"
import { PdfShell } from "./shell"

function createInitialTemplate(): StoredPdfTemplate {
  return { version: 1, name: "Untitled PDF template", description: "", category: "Universal", status: "Draft", fileNamePattern: "document-{{record.slug}}", requiredVariables: [], tags: [], template: createBlankTemplate() }
}

function sourceFields(prefix: string, group: string, source?: Record<string, unknown>) {
  return Object.keys(source ?? {}).map((field) => ({ key: `${prefix}.${field}`, group, label: field.replaceAll("_", " ") }))
}

export function PdfTemplateEditorPage({ templateId }: { templateId?: number }) {
  const router = useRouter()
  const documentsQuery = useDocumentRepository({ category: PDF_TEMPLATE_CATEGORY, isTemplate: true, page: 1, pageSize: 200 })
  const primaryQuery = useProperties({ page: 1, pageSize: 1 })
  const contactQuery = useLeads({ page: 1, pageSize: 1 })
  const agentsQuery = useAgentUsers({ page: 1, pageSize: 1 })
  const createMutation = useCreateDocumentRepositoryItem()
  const updateMutation = useUpdateDocumentRepositoryItem()
  const [value, setValue] = useState<StoredPdfTemplate>(createInitialTemplate)
  const [document, setDocument] = useState<DocumentRepositoryItem | null>(null)
  const [fieldSearch, setFieldSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateId || !documentsQuery.data) return
    const match = documentsQuery.data.items.find((item) => item.id === templateId)
    const decoded = match ? decodePdfTemplate(match) : null
    if (match && decoded) { setDocument(match); setValue(decoded) }
  }, [documentsQuery.data, templateId])

  const availableFields = useMemo(() => {
    const primary = primaryQuery.data?.items[0] as unknown as Record<string, unknown> | undefined
    const contact = contactQuery.data?.items[0] as unknown as Record<string, unknown> | undefined
    const agent = agentsQuery.data?.[0] as unknown as Record<string, unknown> | undefined
    const fields = [
      { key: "system.current_date", group: "System", label: "current date" },
      { key: "system.current_time", group: "System", label: "current time" },
      { key: "system.current_year", group: "System", label: "current year" },
      { key: "system.generated_at", group: "System", label: "generated at" },
      ...sourceFields("record", "Primary record", primary),
      ...sourceFields("contact", "Related contact", contact),
      ...sourceFields("agent", "Agent", agent),
    ]
    return fields.filter((item) => `${item.key} ${item.label}`.toLowerCase().includes(fieldSearch.toLowerCase()))
  }, [agentsQuery.data, contactQuery.data?.items, fieldSearch, primaryQuery.data?.items])

  function toggleRequired(key: string) {
    setValue((current) => ({ ...current, requiredVariables: current.requiredVariables.includes(key) ? current.requiredVariables.filter((item) => item !== key) : [...current.requiredVariables, key] }))
  }

  async function saveTemplate() {
    setError(null)
    const fieldNames = templateFieldNames(value.template)
    const payload = buildPdfTemplateDocument({ ...value, requiredVariables: value.requiredVariables.filter((key) => fieldNames.includes(key)) })
    const response = document ? await updateMutation.mutateAsync({ ...payload, id: document.id }) : await createMutation.mutateAsync(payload)
    if (response.error) { setError(response.error.message); return }
    router.push("/dashboard/pdfs/templates")
  }

  return (
    <PdfShell action={<Button disabled={createMutation.isPending || updateMutation.isPending} onClick={() => void saveTemplate()}><AppIcon name="save" />Save template</Button>} description="Build and edit a reusable fillable document with pdfme." title={templateId ? "Edit PDF template" : "Create PDF template"}>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>Template settings</CardTitle><CardDescription>Stored in the existing document repository.</CardDescription></CardHeader><CardContent className="space-y-4"><Input onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} placeholder="Template name" value={value.name} /><Textarea onChange={(event) => setValue((current) => ({ ...current, description: event.target.value }))} placeholder="Description" value={value.description} /><Input onChange={(event) => setValue((current) => ({ ...current, category: event.target.value }))} placeholder="Category" value={value.category} /><Input onChange={(event) => setValue((current) => ({ ...current, fileNamePattern: event.target.value }))} placeholder="document-{{record.slug}}" value={value.fileNamePattern} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Available variables</CardTitle><CardDescription>{availableFields.length} live fields. Add, copy, or mark them required.</CardDescription></CardHeader><CardContent className="space-y-3"><Input onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search variables" value={fieldSearch} /><div className="max-h-[520px] space-y-2 overflow-auto pr-1">{availableFields.map((item) => <div className="rounded-lg border p-3" key={item.key}><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-muted-foreground">{item.group}</p><code className="text-xs">{item.key}</code></div><Badge variant={value.requiredVariables.includes(item.key) ? "default" : "outline"}>{value.requiredVariables.includes(item.key) ? "Required" : "Optional"}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => setValue((current) => ({ ...current, template: addTextField(current.template, item.key, item.label) }))} size="sm" variant="outline">Add</Button><Button onClick={() => toggleRequired(item.key)} size="sm" variant="ghost">Required</Button><Button onClick={() => void navigator.clipboard.writeText(item.key)} size="sm" variant="ghost">Copy</Button></div></div>)}</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>pdfme designer</CardTitle><CardDescription>Drag, resize, style, and position fillable fields.</CardDescription></CardHeader><CardContent><PdfTemplateDesignerCanvas onTemplateChange={(template: Template) => setValue((current) => ({ ...current, template }))} template={value.template} /></CardContent></Card>
      </div>
    </PdfShell>
  )
}
