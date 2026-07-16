"use client"

import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { applyZillowTemplatePreset, linkedPageConfigForUrl } from "./editor-utils"
import { LinkedPageSettings } from "./linked-page-settings"
import { TemplateSourceCard } from "./template-source-card"
import { MappedLeadFields, TemplateVariableMapper } from "./template-variable-mapper"
import { useConfigurableTemplateEditor } from "./use-configurable-editor"

export function ConfigurableLeadCollectionTemplateEditor({
  templateId,
  initialMailInboxId,
  initialPreset,
}: {
  templateId?: number
  initialMailInboxId?: number
  initialPreset?: string
}) {
  const editor = useConfigurableTemplateEditor({
    templateId,
    initialMailInboxId,
    initialPreset,
  })
  const senderChoices = inferSenderChoices(editor.template.sampleFromAddress)

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden p-3 md:p-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {templateId ? "Edit parser rules" : "Create parser rules"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {"Map exact email values, choose optional button URLs, then test extraction."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href="/dashboard/lead-collection-templates" />}
            type="button"
            variant="outline"
          >
            <AppIcon name="arrow_back" />
            Back
          </Button>
          <Button
            onClick={() =>
              editor.setTemplate((current) => applyZillowTemplatePreset(current))
            }
            type="button"
            variant="outline"
          >
            Apply Zillow preset
          </Button>
          <Button
            disabled={editor.saving}
            onClick={() => void editor.saveTemplate()}
            type="button"
          >
            Save template
          </Button>
        </div>
      </header>

      {editor.error ? (
        <Alert variant="destructive">
          <AlertDescription>{editor.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                onChange={(event) =>
                  editor.setTemplate((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Template name"
                value={editor.template.name}
              />
              <Input
                onChange={(event) =>
                  editor.setTemplate((current) => ({
                    ...current,
                    providerName: event.target.value,
                  }))
                }
                placeholder="Provider, e.g. Zillow"
                value={editor.template.providerName}
              />
              <Input
                onChange={(event) =>
                  editor.setTemplate((current) => ({
                    ...current,
                    mailboxTags: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Mailbox tags, e.g. gmail, zillow"
                value={editor.template.mailboxTags.join(", ")}
              />
              <Textarea
                className="min-h-16"
                onChange={(event) =>
                  editor.setTemplate((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What kind of email does this handle?"
                value={editor.template.description}
              />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  checked={editor.template.isActive}
                  onChange={(event) =>
                    editor.setTemplate((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Use automatically during inbox sync
              </label>
            </CardContent>
          </Card>

          <TemplateSourceCard
            inboxItems={editor.inboxItems}
            onHtmlChange={editor.setPastedHtml}
            onTemplateChange={editor.setTemplate}
            onTextChange={editor.setPastedText}
            onUpload={(file) => void editor.readUploadedFile(file)}
            pastedHtml={editor.pastedHtml}
            pastedText={editor.pastedText}
            template={editor.template}
          />

          <LinkedPageSettings
            onChange={editor.setTemplate}
            onPrepare={() => void editor.prepareSample()}
            preparing={editor.preparing}
            template={editor.template}
          />

          {editor.template.sourceText ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Who sends this email?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {senderChoices.length ? (
                  <div className="flex flex-wrap gap-2">
                    {senderChoices.map((choice) => (
                      <Button
                        key={choice}
                        onClick={() =>
                          editor.setTemplate((current) => ({
                            ...current,
                            senderPatterns: [choice],
                          }))
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <Input
                  onChange={(event) =>
                    editor.setTemplate((current) => ({
                      ...current,
                      senderPatterns: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Allowed senders, e.g. *@zillow.com"
                  value={editor.template.senderPatterns.join(", ")}
                />
                <Input
                  onChange={(event) =>
                    editor.setTemplate((current) => ({
                      ...current,
                      subjectPattern: event.target.value,
                    }))
                  }
                  placeholder="Subject contains"
                  value={editor.template.subjectPattern}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-3">
          <Card>
            <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Check extraction</p>
                <p className="text-xs text-muted-foreground">Runs template and shows exact Lead fields.</p>
              </div>
              <Button
                disabled={!editor.template.sourceText || editor.testing}
                onClick={() => void editor.testTemplate()}
                type="button"
              >
                <AppIcon name="search_check" />
                {editor.testing ? "Testing..." : "Test template"}
              </Button>
            </CardContent>
          </Card>

          {editor.testResult ? <ParserTestResult result={editor.testResult} /> : null}

          <TemplateVariableMapper
            fields={editor.fields}
            onAddMapping={editor.addMapping}
            onFieldChange={editor.setSelectedField}
            onSelectionChange={editor.setSelection}
            onSelectContactButton={(url, linkText) => {
              editor.setTemplate((current) => ({
                ...current,
                linkedPageConfig: {
                  ...linkedPageConfigForUrl(
                    url,
                    linkText,
                    current.linkedPageConfig.openPage !== false,
                  ),
                },
                linkedPageSampleUrl: "",
                linkedPageSourceHtml: "",
                linkedPageSourceText: "",
              }))
            }}
            onSourceChange={editor.setMappingSource}
            selectedField={editor.selectedField}
            selection={editor.selection}
            source={editor.mappingSource}
            template={editor.template}
          />

          <MappedLeadFields
            mappings={editor.template.mappings}
            onRemove={editor.removeMapping}
            onRequiredChange={(index, required) =>
              editor.patchMapping(index, { required })
            }
            onTransformChange={(index, transform) =>
              editor.patchMapping(index, { transform })
            }
          />

        </div>
      </div>
    </div>
  )
}

function inferSenderChoices(address: string) {
  const clean = `${address ?? ""}`.trim().toLowerCase()
  const domain = clean.split("@")[1]
  if (!domain) return []
  const parts = domain.split(".")
  const root = parts.length > 2 ? parts.slice(-2).join(".") : domain
  return [...new Set([clean, `*@${domain}`, `*@${root}`])]
}

function ParserTestResult({ result }: { result: NonNullable<ReturnType<typeof useConfigurableTemplateEditor>["testResult"]> }) {
  const ready =
    result.confidence >= result.threshold && result.missingRequiredFields.length === 0
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Extracted result</CardTitle>
          </div>
          <Badge variant={ready ? "default" : "destructive"}>
            {Math.round(result.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(result.values).map(([field, value]) => (
            <div className="rounded-lg border p-2" key={field}>
              <code className="text-xs text-muted-foreground">{field}</code>
              <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
            </div>
          ))}
        </div>
        {result.missingRequiredFields.length ? (
          <Alert variant="destructive">
            <AlertDescription>
              Missing required: {result.missingRequiredFields.join(", ")}. Inbox sync can still use AI fallback.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>
              Template is ready. Matching emails can skip AI.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
