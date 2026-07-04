"use client"

import Link from "next/link"
import { useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"

import { PdfShell } from "./shell"

export function PdfTemplateLibraryPage() {
  const [search, setSearch] = useState("")
  const query = usePdfTemplates({ page: 1, pageSize: 200, search })
  const templates = query.data?.items ?? []

  return (
    <PdfShell
      action={<Button render={<Link href="/dashboard/pdfs/templates/new" />}><AppIcon name="add" />Create template</Button>}
      description="Create and manage backend-stored PDF templates."
      title="PDF templates"
    >
      <Card>
        <CardHeader><CardTitle>Template library</CardTitle><CardDescription>{query.data?.totalCount ?? 0} saved templates</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" value={search} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <div className="rounded-xl border p-4" key={template.id}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-1 text-sm text-muted-foreground">{template.description || "No description"}</p></div><Badge variant="outline">{template.category}</Badge></div>
                <div className="mt-4 flex gap-2"><Button render={<Link href={`/dashboard/pdfs/templates/${template.id}`} />} size="sm" variant="outline">Edit</Button><Button render={<Link href={`/dashboard/pdfs/download?templateId=${template.id}`} />} size="sm">Use</Button></div>
              </div>
            ))}
          </div>
          {!query.isLoading && templates.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No templates found.</p> : null}
        </CardContent>
      </Card>
    </PdfShell>
  )
}
