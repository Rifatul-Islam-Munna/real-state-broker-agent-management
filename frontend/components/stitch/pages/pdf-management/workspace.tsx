"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import type { Template } from "@pdfme/common"

import type { PdfTemplateSaveInput } from "@/@types/pdf-management"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  addTextField,
  cloneTemplate,
  createBlankTemplate,
  templateFieldNames,
} from "@/lib/pdf/runtime"

import { PdfTemplateDesignerCanvas } from "./pdfme-canvas"
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
  const [error, setError] = useState<string | null>(null)
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
  }, [templateQuery.data])

  const variables = useMemo(() => {
    const items = variablesQuery.data?.variables ?? []
    const search = fieldSearch.trim().toLowerCase()
    if (!search) return items
    return items.filter((item) =>
      `${item.key} ${item.label} ${item.group}`.toLowerCase().includes(search),
    )
  }, [fieldSearch, variablesQuery.data?.variables])

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
    const fieldNames = templateFieldNames(value.templateJson)
    const payload = {
      ...value,
      requiredVariables: value.requiredVariables.filter((key) => fieldNames.includes(key)),
    }
    const result = value.id
      ? await updateMutation.mutateAsync(payload)
      : await createMutation.mutateAsync(payload)
    if (result.error) {
      setError(result.error.message)
      return
    }
    router.push("/dashboard/pdfs/templates")
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <PdfShell
      action={
        <Button disabled={saving} onClick={() => void saveTemplate()}>
          <AppIcon name="save" />
          Save template
        </Button>
      }
      description="Design the document, insert backend variables, and map fields detected from an imported PDF."
      title={templateId ? "Edit PDF template" : "Create PDF template"}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template settings</CardTitle>
              <CardDescription>
                {value.sourceType === "UploadedPdf"
                  ? `Imported from ${value.sourceFileName || "PDF"}`
                  : "Blank pdfme template"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {(value.importedFields?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Imported field mapping</CardTitle>
                <CardDescription>
                  Map each detected PDF field to any backend variable.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[440px] space-y-3 overflow-auto">
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
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Available variables</CardTitle>
              <CardDescription>
                {variablesQuery.data?.total ?? 0} variables are available for {value.category}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                onChange={(event) => setFieldSearch(event.target.value)}
                placeholder="Search variables"
                value={fieldSearch}
              />
              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
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
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>pdfme designer</CardTitle>
            <CardDescription>Drag, resize, style, rename, and position every field.</CardDescription>
          </CardHeader>
          <CardContent>
            <PdfTemplateDesignerCanvas
              onTemplateChange={(template: Template) => setValue((current) => ({ ...current, templateJson: template }))}
              template={value.templateJson}
            />
          </CardContent>
        </Card>
      </div>
    </PdfShell>
  )
}
