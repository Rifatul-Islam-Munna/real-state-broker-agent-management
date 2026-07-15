"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { applyZillowTemplatePreset } from "./editor-utils"
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AppIcon name="document_scanner" />
            <h1 className="text-2xl font-black tracking-tight">
              {templateId ? "Edit lead collection template" : "Create lead collection template"}
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Create one template per provider. The email identifies the provider; an optional
            configured detail link supplies information that is not present in the email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            disabled={!editor.template.sourceText || editor.testing}
            onClick={() => void editor.testTemplate()}
            type="button"
            variant="outline"
          >
            Test template
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

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template identity</CardTitle>
              <CardDescription>
                Future emails are matched using this provider, sender, subject, and layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <CardHeader>
                <CardTitle>Automatic email matching</CardTitle>
                <CardDescription>
                  These rules identify future emails before opening the detail link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  placeholder="Sender patterns"
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

        <div className="space-y-4">
          <TemplateVariableMapper
            fields={editor.fields}
            onAddMapping={editor.addMapping}
            onFieldChange={editor.setSelectedField}
            onSelectionChange={editor.setSelection}
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

          {editor.testResult ? <ParserTestResult result={editor.testResult} /> : null}
        </div>
      </div>
    </div>
  )
}

function ParserTestResult({ result }: { result: NonNullable<ReturnType<typeof useConfigurableTemplateEditor>["testResult"]> }) {
  const ready =
    result.confidence >= result.threshold && result.missingRequiredFields.length === 0
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Parser test</CardTitle>
            <CardDescription>Exactly what will be saved to the Lead record.</CardDescription>
          </div>
          <Badge variant={ready ? "default" : "destructive"}>
            {Math.round(result.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(result.values).map(([field, value]) => (
            <div className="rounded-lg border p-3" key={field}>
              <code className="text-xs text-muted-foreground">{field}</code>
              <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
            </div>
          ))}
        </div>
        {result.missingRequiredFields.length ? (
          <Alert variant="destructive">
            <AlertDescription>
              Missing required: {result.missingRequiredFields.join(", ")}
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
