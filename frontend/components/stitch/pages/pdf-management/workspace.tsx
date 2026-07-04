"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Template } from "@pdfme/common"

import type { PdfTemplateSaveInput } from "@/@types/pdf-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreatePdfTemplate,
  usePdfTemplate,
  usePdfVariables,
  useUpdatePdfTemplate,
} from "@/hooks/use-pdfs-api"
import {
  addBlankPage,
  addTextField,
  cloneTemplate,
  createBlankTemplate,
  PDF_PAGE_SIZES,
  setTemplatePageSize,
  templateFieldNames,
} from "@/lib/pdf/runtime"

import { PdfTemplateDesignerCanvas, type PdfTemplateDesignerHandle } from "./pdfme-canvas"
import { PdfShell } from "./shell"

const categories = [
  "Universal",
  "Property",
  "Tenant",
  "Lead",
  "Lease",
  "Contract",
  "Agreement",
  "Disclosure",
  "Offer",
  "Inspection",
  "Custom",
]

function initialTemplate(): PdfTemplateSaveInput {
  return {
    name: "Untitled PDF template",
    description: "",
    category: "Universal",
    status: "Draft",
    sourceType: "Blank",
    templateJson: createBlankTemplate(),
    requiredVariables: [],
    tags: [],
    fileNamePattern: "document-{{property.slug}}",
    isActive: true,
    importedFields: [],
  }
}

export function PdfTemplateEditorPage({ templateId }: { templateId?: number }) {
  const router = useRouter()
  const templateQuery = usePdfTemplate(templateId)
  const createMutation = useCreatePdfTemplate()
  const updateMutation = useUpdatePdfTemplate()
  const [value, setValue] = useState<PdfTemplateSaveInput>(initialTemplate)
  const [fieldSearch, setFieldSearch] = useState("")
  const [variableGroup, setVariableGroup] = useState("All")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [variablesOpen, setVariablesOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [designerRevision, setDesignerRevision] = useState(0)
  const designerRef = useRef<PdfTemplateDesignerHandle | null>(null)
  const variablesQuery = usePdfVariables(value.category)

  useEffect(() => {
    if (!templateQuery.data) return
    const template = templateQuery.data
    setValue({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      status: template.status,
      sourceType: template.sourceType,
      templateJson: template.templateJson,
      requiredVariables: template.requiredVariables,
      tags: template.tags,
      fileNamePattern: template.fileNamePattern,
      isActive: template.isActive,
      sourceFileName: template.sourceFileName,
      sourceFileUrl: template.sourceFileUrl,
      sourceFileObjectName: template.sourceFileObjectName,
      sourceMimeType: template.sourceMimeType,
      sourceSizeBytes: template.sourceSizeBytes,
      importedFields: template.importedFields,
    })
    setDesignerRevision((current) => current + 1)
  }, [templateQuery.data])

  const variables = useMemo(() => {
    const items = variablesQuery.data?.variables ?? []
    const search = fieldSearch.trim().toLowerCase()
    return items.filter((item) =>
      (variableGroup === "All" || item.group === variableGroup) &&
      (!search ||
        `${item.key} ${item.label} ${item.group}`.toLowerCase().includes(search))
    )
  }, [fieldSearch, variableGroup, variablesQuery.data?.variables])

  const variableGroups = useMemo(() => {
    const groups = (variablesQuery.data?.groups ?? []).map((item) => item.group)
    return ["All", ...groups]
  }, [variablesQuery.data?.groups])

  function toggleRequired(key: string) {
    setValue((current) => ({
      ...current,
      requiredVariables: current.requiredVariables.includes(key)
        ? current.requiredVariables.filter((item) => item !== key)
        : [...current.requiredVariables, key],
    }))
  }

  function mapImportedField(index: number, variableKey: string) {
    setValue((current) => {
      const importedFields = [...(current.importedFields ?? [])]
      const importedField = importedFields[index]
      if (!importedField) return current
      const previousName = importedField.name
      const templateJson = cloneTemplate(current.templateJson)
      const page = templateJson.schemas[importedField.pageIndex] ?? []
      const schema = page.find((item) => item.name === previousName)
      if (schema) schema.name = variableKey
      importedFields[index] = { ...importedField, name: variableKey }
      return { ...current, importedFields, templateJson }
    })
  }

  async function saveTemplate() {
    setError(null)
    const templateJson =
      (await designerRef.current?.saveTemplate()) ??
      designerRef.current?.getTemplate() ??
      value.templateJson
    const fieldNames = templateFieldNames(templateJson)
    const payload = {
      ...value,
      templateJson,
      requiredVariables: value.requiredVariables.filter((key) => fieldNames.includes(key)),
    }
    const result = value.id
      ? await updateMutation.mutateAsync(payload)
      : await createMutation.mutateAsync(payload)
    if (result.error) {
      setError(result.error.message)
      return
    }
    if (result.data) {
      setValue({
        id: result.data.id,
        name: result.data.name,
        description: result.data.description,
        category: result.data.category,
        status: result.data.status,
        sourceType: result.data.sourceType,
        templateJson: result.data.templateJson,
        requiredVariables: result.data.requiredVariables,
        tags: result.data.tags,
        fileNamePattern: result.data.fileNamePattern,
        isActive: result.data.isActive,
        sourceFileName: result.data.sourceFileName,
        sourceFileUrl: result.data.sourceFileUrl,
        sourceFileObjectName: result.data.sourceFileObjectName,
        sourceMimeType: result.data.sourceMimeType,
        sourceSizeBytes: result.data.sourceSizeBytes,
        importedFields: result.data.importedFields,
      })
      if (!value.id) router.replace(`/dashboard/pdfs/templates/${result.data.id}`)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending
  const pageCount = value.templateJson.schemas.length || 1
  const loadingSavedTemplate = Boolean(templateId) && templateQuery.isLoading && !templateQuery.data
  const savedTemplateError = templateQuery.error?.message
  const pageSizeValue = (() => {
    const basePdf = value.templateJson.basePdf as { width?: number; height?: number }
    return PDF_PAGE_SIZES.find((size) => size.width === basePdf?.width && size.height === basePdf?.height)?.value ?? "custom"
  })()

  return (
    <PdfShell
      description="Design the document, insert backend variables, and map fields detected from an imported PDF."
      fullBleed
      title={templateId ? "Edit PDF template" : "Create PDF template"}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {savedTemplateError ? (
        <Alert variant="destructive">
          <AlertDescription>{savedTemplateError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex h-[calc(100dvh-65px)] min-h-[620px] flex-col overflow-hidden bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 shadow-xs">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {pageCount} {pageCount === 1 ? "page" : "pages"} / {value.category} / {value.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/dashboard/pdfs/templates")} variant="outline">
              <AppIcon name="arrow_back" />
              Back
            </Button>
            <Button disabled={saving} onClick={() => void saveTemplate()}>
              <AppIcon name="save" />
              Save
            </Button>
            <Button
              disabled={!value.id}
              onClick={() => value.id && router.push(`/dashboard/pdfs/download?templateId=${value.id}`)}
              variant="outline"
            >
              <AppIcon name="picture_as_pdf" />
              Generate
            </Button>
            <Button
              onClick={() => setValue((current) => ({ ...current, templateJson: addBlankPage(current.templateJson) }))}
              variant="outline"
            >
              <AppIcon name="add" />
              Add page
            </Button>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <AppIcon name="settings" />
                Settings
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Template settings</DialogTitle>
                  <DialogDescription>
                    {value.sourceType === "UploadedPdf"
                      ? `Imported from ${value.sourceFileName || "PDF"}`
                      : "Blank pdfme template"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4 md:col-span-2">
              <Input
                onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
                placeholder="Template name"
                value={value.name}
              />
              <Textarea
                onChange={(event) => setValue((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
                value={value.description}
              />
                  </div>
              <Select
                modal={false}
                onValueChange={(category) => setValue((current) => ({ ...current, category }))}
                value={value.category}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                modal={false}
                onValueChange={(status) => setValue((current) => ({ ...current, status: status as PdfTemplateSaveInput["status"] }))}
                value={value.status}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select
                disabled={value.sourceType === "UploadedPdf"}
                modal={false}
                onValueChange={(sizeValue) => {
                  const size = PDF_PAGE_SIZES.find((item) => item.value === sizeValue)
                  if (!size) return
                  setValue((current) => ({
                    ...current,
                    templateJson: setTemplatePageSize(current.templateJson, size.width, size.height),
                  }))
                }}
                value={pageSizeValue}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Page size" /></SelectTrigger>
                <SelectContent>
                  {pageSizeValue === "custom" ? <SelectItem value="custom">Custom/imported PDF size</SelectItem> : null}
                  {PDF_PAGE_SIZES.map((size) => <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                onChange={(event) => setValue((current) => ({ ...current, fileNamePattern: event.target.value }))}
                placeholder="document-{{property.slug}}"
                value={value.fileNamePattern}
              />
              <Input
                onChange={(event) => setValue((current) => ({
                  ...current,
                  tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                }))}
                placeholder="Tags, comma separated"
                value={value.tags.join(", ")}
              />
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={variablesOpen} onOpenChange={setVariablesOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <AppIcon name="database" />
                Variables
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Variables and field mapping</DialogTitle>
                  <DialogDescription>
                    {variablesQuery.data?.total ?? 0} variables are available for {value.category}.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder="Search variables"
                  value={fieldSearch}
                />
                <div className="flex flex-wrap gap-2">
                  {variableGroups.map((group) => (
                    <Button
                      key={group}
                      onClick={() => setVariableGroup(group)}
                      size="sm"
                      variant={variableGroup === group ? "default" : "outline"}
                    >
                      {group}
                    </Button>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  {(value.importedFields?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Imported field mapping</h3>
                      <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
                {value.importedFields?.map((field, index) => (
                  <div className="space-y-2 rounded-lg border p-3" key={`${field.pageIndex}-${index}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Page {field.pageIndex + 1} · {field.type}</p>
                        <code className="text-xs">{field.name}</code>
                      </div>
                      <Badge variant="outline">Detected</Badge>
                    </div>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      onChange={(event) => mapImportedField(index, event.target.value)}
                      value={field.name}
                    >
                      <option value={field.name}>{field.name}</option>
                      {variables.map((variable) => (
                        <option key={variable.key} value={variable.key}>
                          {variable.group} — {variable.key}
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => toggleRequired(field.name)} size="sm" variant="ghost">
                      {value.requiredVariables.includes(field.name) ? "Remove required" : "Mark required"}
                    </Button>
                  </div>
                ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Available variables</h3>
                    <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
                {variables.map((item) => (
                  <div className="rounded-lg border p-3" key={item.key}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{item.group}</p>
                        <code className="text-xs">{item.key}</code>
                      </div>
                      <Badge variant={value.requiredVariables.includes(item.key) ? "default" : "outline"}>
                        {value.requiredVariables.includes(item.key) ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() => setValue((current) => ({
                          ...current,
                          templateJson: addTextField(current.templateJson, item.key, item.label),
                        }))}
                        size="sm"
                        variant="outline"
                      >
                        Add field
                      </Button>
                      <Button onClick={() => toggleRequired(item.key)} size="sm" variant="ghost">
                        Required
                      </Button>
                      <Button
                        onClick={() => void navigator.clipboard.writeText(item.key)}
                        size="sm"
                        variant="ghost"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {loadingSavedTemplate ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading saved PDF template...
            </div>
          ) : (
            <PdfTemplateDesignerCanvas
              key={`${value.id ?? "new"}-${designerRevision}`}
              onTemplateChange={(template: Template) => setValue((current) => ({ ...current, templateJson: template }))}
              ref={designerRef}
              template={value.templateJson}
            />
          )}
        </div>
      </div>
    </PdfShell>
  )
}
