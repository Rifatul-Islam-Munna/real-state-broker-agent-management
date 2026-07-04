"use client"

import type {
  LeadCollectionFieldMapping,
  LeadCollectionLeadField,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  detectTemplateValues,
  MappingSource,
  normalizeTemplateText,
  sanitizeTemplateHtml,
  SelectedTemplateValue,
  selectedTemplateValue,
} from "./editor-utils"

export function TemplateVariableMapper({
  template,
  fields,
  source,
  selectedField,
  selection,
  onSourceChange,
  onFieldChange,
  onSelectionChange,
  onAddMapping,
}: {
  template: LeadCollectionTemplateSaveInput
  fields: LeadCollectionLeadField[]
  source: MappingSource
  selectedField: string
  selection: SelectedTemplateValue
  onSourceChange: (source: MappingSource) => void
  onFieldChange: (field: string) => void
  onSelectionChange: (selection: SelectedTemplateValue) => void
  onAddMapping: () => void
}) {
  const sourceText = source === "linked" ? template.linkedPageSourceText : template.sourceText
  const sourceHtml = source === "linked" ? template.linkedPageSourceHtml : template.sourceHtml
  const detected = detectTemplateValues(sourceText)

  function captureVisibleSelection() {
    const text = normalizeTemplateText(window.getSelection()?.toString() ?? "")
    if (!text) return
    onSelectionChange(selectedTemplateValue(sourceText, text, source))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map values directly</CardTitle>
        <CardDescription>
          Select a detected value or highlight it in the visible page, then choose the Lead
          field. The internal normalized parser text is no longer shown as a required step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {template.sourceText ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onSourceChange("email")}
                type="button"
                variant={source === "email" ? "default" : "outline"}
              >
                <AppIcon name="mail" />
                Email
              </Button>
              {template.linkedPageSourceText ? (
                <Button
                  onClick={() => onSourceChange("linked")}
                  type="button"
                  variant={source === "linked" ? "default" : "outline"}
                >
                  <AppIcon name="open_in_new" />
                  Linked detail page
                </Button>
              ) : null}
            </div>

            {sourceHtml ? (
              <div className="overflow-hidden rounded-xl border bg-white">
                <div className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Select a value directly from this {source === "linked" ? "detail page" : "email"}
                </div>
                <div
                  className="max-h-[520px] overflow-auto bg-white p-4 text-sm text-slate-900 [&_img]:max-w-full [&_table]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(sourceHtml) }}
                  onKeyUp={captureVisibleSelection}
                  onMouseUp={captureVisibleSelection}
                />
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm leading-6">
                {sourceText}
              </div>
            )}

            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detected variables
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {detected.length ? (
                  detected.map((item, index) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition-colors hover:border-primary ${
                        selection.text === item.value
                          ? "border-primary bg-primary/5"
                          : "bg-background"
                      }`}
                      key={`${item.label}-${index}`}
                      onClick={() =>
                        onSelectionChange(
                          selectedTemplateValue(sourceText, item.value, source, item.label),
                        )
                      }
                      type="button"
                    >
                      <span className="block text-xs font-semibold text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="mt-1 block break-words text-sm">{item.value}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Highlight a value directly in the preview above.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected value
              </p>
              <p className="mt-2 break-words text-sm">
                {selection.text || "Choose a detected variable or highlight text above."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select onValueChange={onFieldChange} value={selectedField}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Lead field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((field) => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selection.text || !selectedField}
                onClick={onAddMapping}
                type="button"
              >
                Map value
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Prepare a sample email first.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MappedLeadFields({
  mappings,
  onRequiredChange,
  onTransformChange,
  onRemove,
}: {
  mappings: Array<Partial<LeadCollectionFieldMapping>>
  onRequiredChange: (index: number, required: boolean) => void
  onTransformChange: (index: number, transform: LeadCollectionFieldMapping["transform"]) => void
  onRemove: (index: number) => void
}) {
  if (!mappings.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapped Lead fields</CardTitle>
        <CardDescription>{mappings.length} values will be extracted automatically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings.map((mapping, index) => (
          <div
            className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-center"
            key={`${mapping.field}-${index}`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{mapping.label || mapping.field}</strong>
                {mapping.required ? <Badge>Required</Badge> : <Badge variant="outline">Optional</Badge>}
              </div>
              <p className="mt-2 break-words text-sm">{mapping.sampleValue}</p>
            </div>
            <div className="space-y-2">
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                onChange={(event) =>
                  onTransformChange(
                    index,
                    event.target.value as LeadCollectionFieldMapping["transform"],
                  )
                }
                value={mapping.transform || "Text"}
              >
                {(["Text", "Email", "Phone", "Number", "Date"] as const).map(
                  (transform) => (
                    <option key={transform} value={transform}>{transform}</option>
                  ),
                )}
              </select>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  checked={mapping.required === true}
                  onChange={(event) => onRequiredChange(index, event.target.checked)}
                  type="checkbox"
                />
                Required
              </label>
            </div>
            <Button onClick={() => onRemove(index)} size="sm" type="button" variant="ghost">
              Remove
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
