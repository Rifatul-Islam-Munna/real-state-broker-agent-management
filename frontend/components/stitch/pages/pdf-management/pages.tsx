"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { DocumentRepositoryItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
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

  async function removeTemplate(document: DocumentRepositoryItem) {
    if (!window.confirm(`Delete “${document.title}”?`)) return
    await deleteMutation.mutateAsync({ id: String(document.id) })
  }

  return (
    <PdfShell action={<Button render={<Link href="/dashboard/pdfs/templates/new" />}><AppIcon name="add" />Create template</Button>} description="Design reusable fillable documents and prepare them from live records." title="PDF templates">
      <Card>
        <CardHeader><CardTitle>Template library</CardTitle><CardDescription>{templates.length} saved templates</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" value={search} />
          <p className="text-sm text-muted-foreground">{query.isLoading ? "Loading…" : `${templates.length} templates ready`}</p>
        </CardContent>
      </Card>
    </PdfShell>
  )
}
