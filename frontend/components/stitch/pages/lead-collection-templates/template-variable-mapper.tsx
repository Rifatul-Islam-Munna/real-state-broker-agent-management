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
  extractTemplateLinks,
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
  onSelectContactButton,
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
  onSelectContactButton: (url: string, linkText: string) => void
}) {
  const sourceText = source === "linked" ? template.linkedPageSourceText : template.sourceText
  const sourceHtml = source === "linked" ? template.linkedPageSourceHtml : template.sourceHtml
  const detected = mergeDetectedValues(
    detectTemplateValues(sourceText),
    source === "email" ? extractTemplateLinks(sourceHtml, sourceText) : [],
  )
  const selectedLink = source === "email"
    ? findSelectedLink(template.sourceHtml, template.sourceText, selection.text)
    : null

  function captureVisibleSelection() {
    const text = normalizeTemplateText(window.getSelection()?.toString() ?? "")
    if (!text) return
    onSelectionChange(selectedTemplateValue(sourceText, text, source))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Map fields</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
                  Selected button / URL
                </Button>
              ) : null}
            </div>

            {sourceHtml ? (
              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="border-b px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Select a value directly from this {source === "linked" ? "selected button result" : "email"}
                </div>
                <div
                  className="max-h-[360px] overflow-auto bg-white p-3 text-sm text-slate-900 [&_img]:max-w-full [&_table]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(sourceHtml) }}
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null
                    if (target?.closest("a")) event.preventDefault()
                  }}
                  onKeyUp={captureVisibleSelection}
                  onMouseUp={captureVisibleSelection}
                />
              </div>
            ) : (
              <div className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm leading-6">
                {sourceText}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Detected variables
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {detected.length ? (
                  detected.map((item, index) => (
                    <button
                      className={`rounded-md border p-2 text-left transition-colors hover:border-primary ${
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

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected value
              </p>
              <p className="mt-2 break-words text-sm">
                {selection.text || "Choose a detected variable or highlight text above."}
              </p>
              {selectedLink ? (
                <Button
                  className="mt-3 w-full"
                  onClick={() => onSelectContactButton(selectedLink.url, selectedLink.text || selection.text)}
                  type="button"
                  variant="outline"
                >
                  <AppIcon name="link" />
                  Use as contact button
                </Button>
              ) : null}
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
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Prepare a sample email first.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function findSelectedLink(html: string, text: string, selected: string) {
  const needle = normalizeTemplateText(selected).toLowerCase()
  if (!needle) return null
  return extractTemplateLinks(html, text).find((link) => {
    const label = normalizeTemplateText(link.text || link.host).toLowerCase()
    return label && (label.includes(needle) || needle.includes(label))
  }) ?? null
}

function mergeDetectedValues(
  values: Array<{ label: string; value: string }>,
  links: Array<{ text: string; url: string; host: string }>,
) {
  const merged = [...values]
  const seen = new Set(values.map((item) => item.value.trim().toLowerCase()))
  for (const link of links) {
    const value = normalizeTemplateText(link.text)
    if (!value || seen.has(value.toLowerCase())) continue
    merged.push({ label: "Link text", value })
    seen.add(value.toLowerCase())
  }
  return merged.slice(0, 40)
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Mapped fields</CardTitle>
        <CardDescription>{mappings.length} values</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mappings.map((mapping, index) => (
          <div
            className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_150px_auto] lg:items-center"
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
