"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  useDeleteLeadCollectionTemplate,
  useLeadCollectionTemplates,
} from "@/hooks/use-lead-collection-templates"

export function LeadCollectionTemplatesPage() {
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const query = useLeadCollectionTemplates({ page: 1, pageSize: 200, search })
  const deleteMutation = useDeleteLeadCollectionTemplate()
  const templates = query.data?.items ?? []

  const summary = useMemo(() => {
    const matchCount = templates.reduce((sum, item) => sum + item.matchCount, 0)
    const successCount = templates.reduce((sum, item) => sum + item.successCount, 0)
    const aiFallbackCount = templates.reduce((sum, item) => sum + item.aiFallbackCount, 0)
    const totalHandled = successCount + aiFallbackCount
    return {
      matchCount,
      successCount,
      aiFallbackCount,
      savedPercent: totalHandled ? Math.round((successCount / totalHandled) * 100) : 0,
    }
  }, [templates])

  async function removeTemplate(id: number, name: string) {
    if (!window.confirm(`Delete “${name}”?`)) return
    const result = await deleteMutation.mutateAsync({ id })
    if (result.error) setError(result.error.message)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AppIcon name="document_scanner" />
            <h1 className="text-2xl font-black tracking-tight">Lead collection templates</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Parse repeated Zillow, Apartments.com, portal, and partner email layouts without paying for an AI request on every lead.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/dashboard/mail" />} variant="outline">
            <AppIcon name="mail" />
            Open inbox
          </Button>
          <Button render={<Link href="/dashboard/lead-collection-templates/new" />}>
            <AppIcon name="add" />
            Create template
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active layouts</CardDescription><CardTitle>{templates.filter((item) => item.isActive).length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Template matches</CardDescription><CardTitle>{summary.matchCount}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>AI calls avoided</CardDescription><CardTitle>{summary.successCount}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Template success share</CardDescription><CardTitle>{summary.savedPercent}%</CardTitle></CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Saved provider layouts</CardTitle>
            <CardDescription>{query.data?.totalCount ?? 0} templates</CardDescription>
          </div>
          <Input
            className="lg:max-w-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search provider or template"
            value={search}
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => {
              const attempts = template.successCount + template.aiFallbackCount
              const rate = attempts ? Math.round((template.successCount / attempts) * 100) : 0
              return (
                <article className="rounded-xl border p-4" key={template.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{template.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {template.providerName || template.sampleFromAddress || "Custom provider"}
                      </p>
                    </div>
                    <Badge variant={template.isActive ? "default" : "outline"}>
                      {template.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {template.description || template.sampleSubject || "No description"}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-muted p-2"><strong className="block text-base">{template.mappings.length}</strong>fields</div>
                    <div className="rounded-lg bg-muted p-2"><strong className="block text-base">{template.successCount}</strong>saved AI</div>
                    <div className="rounded-lg bg-muted p-2"><strong className="block text-base">{rate}%</strong>success</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button render={<Link href={`/dashboard/lead-collection-templates/${template.id}`} />} size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button
                      disabled={deleteMutation.isPending}
                      onClick={() => void removeTemplate(template.id, template.name)}
                      size="sm"
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
          {!query.isLoading && templates.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No templates yet. Start from an inbox email or paste a provider sample.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
