"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { DocumentRepositoryItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useDeleteDocumentRepositoryItem, useDocumentRepository } from "@/hooks/use-real-estate-api"
import { PDF_TEMPLATE_CATEGORY } from "@/lib/pdf/readme"
import { decodePdfTemplate } from "@/lib/pdf/util"

import { PdfShell } from "./shell"

export function PdfTemplateLibraryPage() {
  const [search, setSearch] = useState("")
  const query = useDocumentRepository({ category: PDF_TEMPLATE_CATEGORY, isTemplate: true, page: 1, pageSize: 200 })
  const deleteMutation = useDeleteDocumentRepositoryItem()
  const templates = useMemo(() => {
    return (query.data?.items ?? [])
      .map((document) => ({ document, template: decodePdfTemplate(document) }))
      .filter((item): item is { document: DocumentRepositoryItem; template: NonNullable<ReturnType<typeof decodePdfTemplate>> } => Boolean(item.template))
      .filter((item) => `${item.template.name} ${item.template.category}`.toLowerCase().includes(search.toLowerCase()))
  }, [query.data?.items, search])

  return (
    <PdfShell action={<Button render={<Link href="/dashboard/pdfs/templates/new" />}><AppIcon name="add" />Create template</Button>} description="Design reusable fillable documents and prepare them from live records." title="PDF templates">
      <Card>
        <CardHeader><CardTitle>Template library</CardTitle><CardDescription>{templates.length} saved templates</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" value={search} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map(({ document, template }) => (
              <div className="rounded-xl border p-4" key={document.id}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-1 text-sm text-muted-foreground">{template.description || "No description"}</p></div><Badge variant="outline">{template.category}</Badge></div>
                <div className="mt-4 flex gap-2"><Button render={<Link href={`/dashboard/pdfs/templates/${document.id}`} />} size="sm" variant="outline">Edit</Button><Button render={<Link href={`/dashboard/pdfs/download?templateId=${document.id}`} />} size="sm">Use</Button></div>
              </div>
            ))}
          </div>
          {!query.isLoading && templates.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No templates found.</p> : null}
          <span className="sr-only">{deleteMutation.isPending ? "Working" : "Ready"}</span>
        </CardContent>
      </Card>
    </PdfShell>
  )
}
