"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type {
  LeadCollectionTemplateItem,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCreateLeadCollectionTemplate,
  useDeleteLeadCollectionTemplate,
  useLeadCollectionTemplates,
  useUpdateLeadCollectionTemplate,
} from "@/hooks/use-lead-collection-templates"

type StatusFilter = "all" | "active" | "paused" | "review"
type SortMode = "updated" | "success" | "matches" | "provider"

export function LeadCollectionTemplatesPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [provider, setProvider] = useState("all")
  const [sort, setSort] = useState<SortMode>("updated")
  const [error, setError] = useState<string | null>(null)
  const query = useLeadCollectionTemplates({ page: 1, pageSize: 200, search })
  const deleteMutation = useDeleteLeadCollectionTemplate()
  const createMutation = useCreateLeadCollectionTemplate()
  const updateMutation = useUpdateLeadCollectionTemplate()
  const templates = query.data?.items ?? []

  const providers = useMemo(
    () =>
      Array.from(
        new Set(
          templates
            .map((item) => item.providerName || providerFromAddress(item.sampleFromAddress))
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [templates]
  )

  const visibleTemplates = useMemo(() => {
    const filtered = templates.filter((template) => {
      const health = templateHealth(template)
      if (status === "active" && !template.isActive) return false
      if (status === "paused" && template.isActive) return false
      if (status === "review" && health !== "Needs review") return false
      const templateProvider =
        template.providerName || providerFromAddress(template.sampleFromAddress)
      if (provider !== "all" && templateProvider !== provider) return false
      return true
    })

    return [...filtered].sort((left, right) => {
      if (sort === "success") return successRate(right) - successRate(left)
      if (sort === "matches") return right.matchCount - left.matchCount
      if (sort === "provider") {
        return (left.providerName || left.sampleFromAddress).localeCompare(
          right.providerName || right.sampleFromAddress
        )
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    })
  }, [provider, sort, status, templates])

  const summary = useMemo(() => {
    const matchCount = templates.reduce((sum, item) => sum + item.matchCount, 0)
    const successCount = templates.reduce((sum, item) => sum + item.successCount, 0)
    const aiFallbackCount = templates.reduce((sum, item) => sum + item.aiFallbackCount, 0)
    const reviewCount = templates.filter(
      (item) => templateHealth(item) === "Needs review"
    ).length
    const totalHandled = successCount + aiFallbackCount
    return {
      matchCount,
      successCount,
      aiFallbackCount,
      reviewCount,
      savedPercent: totalHandled
        ? Math.round((successCount / totalHandled) * 100)
        : 0,
    }
  }, [templates])

  async function removeTemplate(id: number, name: string) {
    if (!window.confirm(`Delete “${name}”?`)) return
    setError(null)
    const result = await deleteMutation.mutateAsync({ id })
    if (result.error) setError(result.error.message)
  }

  async function toggleTemplate(template: LeadCollectionTemplateItem) {
    setError(null)
    const result = await updateMutation.mutateAsync({
      ...toSaveInput(template),
      id: template.id,
      isActive: !template.isActive,
    })
    if (result.error) setError(result.error.message)
  }

  async function duplicateTemplate(template: LeadCollectionTemplateItem) {
    setError(null)
    const result = await createMutation.mutateAsync({
      ...toSaveInput(template),
      name: `${template.name} Copy`,
      isActive: false,
    })
    if (result.error) setError(result.error.message)
  }

  const busy =
    deleteMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AppIcon name="document_scanner" />
            <h1 className="text-2xl font-black tracking-tight">
              Lead collection templates
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Build, test, monitor, and optimize provider-specific parsers. Healthy
            templates skip AI, while low-confidence layouts are surfaced for review.
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
      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Active layouts"
          value={templates.filter((item) => item.isActive).length}
          icon="verified"
        />
        <SummaryCard label="Template matches" value={summary.matchCount} icon="search_check" />
        <SummaryCard label="AI calls avoided" value={summary.successCount} icon="savings" />
        <SummaryCard label="Success share" value={`${summary.savedPercent}%`} icon="monitoring" />
        <SummaryCard label="Needs review" value={summary.reviewCount} icon="warning" />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Provider parser registry</CardTitle>
              <CardDescription>
                {visibleTemplates.length} of {query.data?.totalCount ?? 0} templates shown
              </CardDescription>
            </div>
            <Input
              className="lg:max-w-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search provider, sender, or template"
              value={search}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All health states</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="paused">Paused only</SelectItem>
                <SelectItem value="review">Needs review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {providers.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="success">Highest success rate</SelectItem>
                <SelectItem value="matches">Most matches</SelectItem>
                <SelectItem value="provider">Provider name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleTemplates.map((template) => {
              const rate = successRate(template)
              const health = templateHealth(template)
              const providerLabel =
                template.providerName ||
                providerFromAddress(template.sampleFromAddress) ||
                "Custom provider"
              return (
                <article className="flex min-h-[22rem] flex-col rounded-xl border p-4" key={template.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{template.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{providerLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={template.isActive ? "default" : "outline"}>
                        {template.isActive ? "Active" : "Paused"}
                      </Badge>
                      <HealthBadge health={health} />
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {template.description || template.sampleSubject || "No description"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <Metric label="fields" value={template.mappings.length} />
                    <Metric label="matches" value={template.matchCount} />
                    <Metric label="success" value={`${rate}%`} />
                  </div>

                  <div className="mt-4 space-y-2 rounded-lg bg-muted/30 p-3 text-xs">
                    <Row label="Subject rule" value={`${template.subjectMatchMode}: ${template.subjectPattern || "Any"}`} />
                    <Row label="Confidence" value={`${Math.round(template.confidenceThreshold * 100)}% minimum`} />
                    <Row label="Required fields" value={String(template.requiredFields.length)} />
                    <Row label="AI fallbacks" value={String(template.aiFallbackCount)} />
                    <Row label="Last matched" value={formatDate(template.lastMatchedAt)} />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button
                      render={<Link href={`/dashboard/lead-collection-templates/${template.id}`} />}
                      size="sm"
                      variant="outline"
                    >
                      <AppIcon name="edit" />
                      Edit
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => void duplicateTemplate(template)}
                      size="sm"
                      variant="outline"
                    >
                      <AppIcon name="content_copy" />
                      Duplicate
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => void toggleTemplate(template)}
                      size="sm"
                      variant="ghost"
                    >
                      {template.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      disabled={busy}
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
          {!query.isLoading && visibleTemplates.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No templates match the current filters. Create a template from an
              inbox email, pasted sample, or uploaded .eml file.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: number | string
}) {
  return (
    <Card>
      <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-3 pb-3">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle>{value}</CardTitle>
        </div>
        <AppIcon name={icon} />
      </CardHeader>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <strong className="block text-base">{value}</strong>
      {label}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium" title={value}>{value}</span>
    </div>
  )
}

function HealthBadge({ health }: { health: "Healthy" | "Learning" | "Needs review" }) {
  if (health === "Needs review") return <Badge variant="destructive">Needs review</Badge>
  if (health === "Healthy") return <Badge variant="secondary">Healthy</Badge>
  return <Badge variant="outline">Learning</Badge>
}

function successRate(template: LeadCollectionTemplateItem) {
  const attempts = template.successCount + template.aiFallbackCount
  return attempts ? Math.round((template.successCount / attempts) * 100) : 0
}

function templateHealth(template: LeadCollectionTemplateItem) {
  const attempts = template.successCount + template.aiFallbackCount
  const rate = successRate(template)
  if (!template.mappings.length || (attempts >= 3 && rate < 60)) return "Needs review" as const
  if (attempts >= 5 && rate >= 80) return "Healthy" as const
  return "Learning" as const
}

function providerFromAddress(value: string) {
  const domain = value.split("@")[1]?.trim().toLowerCase()
  return domain ? domain.replace(/^mail\./, "") : ""
}

function formatDate(value?: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleString()
}

function toSaveInput(template: LeadCollectionTemplateItem): LeadCollectionTemplateSaveInput {
  return {
    name: template.name,
    providerName: template.providerName,
    description: template.description,
    sourceType: template.sourceType,
    sourceMailInboxId: template.sourceMailInboxId,
    sampleFromAddress: template.sampleFromAddress,
    sampleSubject: template.sampleSubject,
    senderPatterns: [...template.senderPatterns],
    subjectPattern: template.subjectPattern,
    subjectMatchMode: template.subjectMatchMode,
    bodyFingerprint: [...template.bodyFingerprint],
    sourceHtml: template.sourceHtml,
    sourceText: template.sourceText,
    mappings: template.mappings.map((mapping) => ({ ...mapping })),
    requiredFields: [...template.requiredFields],
    confidenceThreshold: template.confidenceThreshold,
    isActive: template.isActive,
  }
}
