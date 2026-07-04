"use client"

import Link from "next/link"
import { useState } from "react"

import type {
  LeadCollectionTemplateItem,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  useCreateLeadCollectionTemplate,
  useDeleteLeadCollectionTemplate,
  useLeadCollectionTemplates,
  useUpdateLeadCollectionTemplate,
} from "@/hooks/use-lead-collection-templates"

export function ProviderTemplateList() {
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const query = useLeadCollectionTemplates({ page: 1, pageSize: 200, search })
  const createMutation = useCreateLeadCollectionTemplate()
  const updateMutation = useUpdateLeadCollectionTemplate()
  const deleteMutation = useDeleteLeadCollectionTemplate()
  const templates = query.data?.items ?? []
  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  async function toggle(item: LeadCollectionTemplateItem) {
    setError(null)
    const response = await updateMutation.mutateAsync({
      ...toSaveInput(item),
      id: item.id,
      isActive: !item.isActive,
    })
    if (response.error) setError(response.error.message)
  }

  async function copy(item: LeadCollectionTemplateItem) {
    setError(null)
    const response = await createMutation.mutateAsync({
      ...toSaveInput(item),
      name: `${item.name} Copy`,
      isActive: false,
    })
    if (response.error) setError(response.error.message)
  }

  async function remove(item: LeadCollectionTemplateItem) {
    if (!window.confirm(`Remove “${item.name}”?`)) return
    setError(null)
    const response = await deleteMutation.mutateAsync({ id: item.id })
    if (response.error) setError(response.error.message)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Lead collection templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Create one template for each provider. Detail-page templates can collect information
            that is behind a link in the email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/dashboard/lead-collection-templates/new?preset=zillow" />}>
            Zillow template
          </Button>
          <Button render={<Link href="/dashboard/lead-collection-templates/new" />} variant="outline">
            Other provider
          </Button>
        </div>
      </div>

      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>{templates.length} templates</CardDescription>
          <Input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
            value={search}
          />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {templates.map((item) => (
              <article className="flex min-h-64 flex-col rounded-xl border p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{item.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.providerName || "Custom provider"}
                    </p>
                  </div>
                  <Badge variant={item.isActive ? "default" : "outline"}>
                    {item.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.linkedPageConfig?.enabled
                    ? `Detail page: ${item.linkedPageConfig.allowedHosts.join(", ")}`
                    : "Email-only parser"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                  <span>Fields: {item.mappings.length}</span>
                  <span>Matches: {item.matchCount}</span>
                  <span>Success: {item.successCount}</span>
                  <span>AI fallback: {item.aiFallbackCount}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button
                    render={<Link href={`/dashboard/lead-collection-templates/${item.id}`} />}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                  <Button disabled={busy} onClick={() => void copy(item)} size="sm" variant="outline">
                    Copy
                  </Button>
                  <Button disabled={busy} onClick={() => void toggle(item)} size="sm" variant="ghost">
                    {item.isActive ? "Pause" : "Activate"}
                  </Button>
                  <Button disabled={busy} onClick={() => void remove(item)} size="sm" variant="ghost">
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!query.isLoading && templates.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No templates found.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function toSaveInput(item: LeadCollectionTemplateItem): LeadCollectionTemplateSaveInput {
  return {
    name: item.name,
    providerName: item.providerName,
    description: item.description,
    sourceType: item.sourceType,
    sourceMailInboxId: item.sourceMailInboxId,
    sampleFromAddress: item.sampleFromAddress,
    sampleSubject: item.sampleSubject,
    senderPatterns: [...item.senderPatterns],
    subjectPattern: item.subjectPattern,
    subjectMatchMode: item.subjectMatchMode,
    bodyFingerprint: [...item.bodyFingerprint],
    sourceHtml: item.sourceHtml,
    sourceText: item.sourceText,
    linkedPageConfig: { ...item.linkedPageConfig },
    linkedPageSampleUrl: item.linkedPageSampleUrl,
    linkedPageSourceHtml: item.linkedPageSourceHtml,
    linkedPageSourceText: item.linkedPageSourceText,
    mappings: item.mappings.map((mapping) => ({ ...mapping })),
    requiredFields: [...item.requiredFields],
    confidenceThreshold: item.confidenceThreshold,
    isActive: item.isActive,
  }
}
