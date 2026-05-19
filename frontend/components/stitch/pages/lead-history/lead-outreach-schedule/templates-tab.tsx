import { Badge } from "@/components/ui/badge"
import { AppIcon } from "@/components/ui/app-icon"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"

import { templateChannelOptions } from "./constants"
import type { FeedbackState, TemplateEditorState } from "./types"
import { FeedbackBox, Field, SectionIntro } from "./utils"

export function TemplatesTab({
  deletePending,
  onDelete,
  onEditorChange,
  onLoadTemplate,
  onNewTemplate,
  onSave,
  onTextUpload,
  savePending,
  templateEditor,
  templateError,
  templateFeedback,
  templates,
}: {
  deletePending: boolean
  onDelete: () => Promise<void>
  onEditorChange: (updater: (current: TemplateEditorState) => TemplateEditorState) => void
  onLoadTemplate: (template: AgencyCommunicationTemplateItem) => void
  onNewTemplate: () => void
  onSave: () => Promise<void>
  onTextUpload: (file: File) => Promise<void>
  savePending: boolean
  templateEditor: TemplateEditorState
  templateError: string | null
  templateFeedback: FeedbackState | null
  templates: AgencyCommunicationTemplateItem[]
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.5fr)]">
      <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
        <CardHeader className="border-b border-border">
          <SectionIntro
            eyebrow="Reusable content"
            helper="Save text templates in DB. Upload plain text if easier. Reuse later in CSV campaign or manual outreach."
            title="Template Vault"
          />
        </CardHeader>
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-foreground"
              onClick={onNewTemplate}
              type="button"
            >
              {"New"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
              <AppIcon className="text-base" name="draft" />
              <span>{"Upload text"}</span>
              <input
                accept=".txt,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void onTextUpload(file)
                  }
                }}
                type="file"
              />
            </label>
          </div>

          <Field label="Template name">
            <Input
              className="rounded-2xl"
              onChange={(event) => onEditorChange((current) => ({ ...current, name: event.target.value }))}
              placeholder="Buyer warm follow-up"
              value={templateEditor.name}
            />
          </Field>

          <Field label="Email subject">
            <Input
              className="rounded-2xl"
              onChange={(event) => onEditorChange((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Checking in about {{property_address}}"
              value={templateEditor.subject}
            />
          </Field>

          <Field label="Channels">
            <div className="grid gap-2 md:grid-cols-3">
              {templateChannelOptions.map((channel) => {
                const active = templateEditor.channels.includes(channel)

                return (
                  <button
                    key={channel}
                    className={`cursor-pointer rounded-2xl border px-3 py-3 text-sm font-bold transition-colors duration-200 ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                    }`}
                    onClick={() =>
                      onEditorChange((current) => ({
                        ...current,
                        channels: active
                          ? current.channels.filter((item) => item !== channel)
                          : [...current.channels, channel],
                      }))
                    }
                    type="button"
                  >
                    {channel}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Variable tokens">
            <Input
              className="rounded-2xl"
              onChange={(event) => onEditorChange((current) => ({ ...current, variableTokensText: event.target.value }))}
              placeholder="{{client_name}}, {{property_address}}, {{agent_name}}"
              value={templateEditor.variableTokensText}
            />
          </Field>

          <Field label="Template body">
            <Textarea
              className="min-h-64 rounded-[1.6rem] bg-background"
              onChange={(event) => onEditorChange((current) => ({ ...current, body: event.target.value }))}
              placeholder="Hi {{client_name}}, wanted to check in..."
              value={templateEditor.body}
            />
          </Field>

          <FeedbackBox error={templateError} feedback={templateFeedback} />

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
              disabled={savePending}
              onClick={() => void onSave()}
              type="button"
            >
              {savePending ? "Saving..." : "Save"}
            </button>
            <button
              className="rounded-full border border-destructive/25 bg-destructive/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-destructive disabled:opacity-60"
              disabled={deletePending}
              onClick={() => void onDelete()}
              type="button"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-2xl font-black">{"Saved Templates"}</CardTitle>
          <CardDescription>{"Pick any template to load it into editor."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 py-6 md:grid-cols-2">
          {templates.length === 0 ? (
            <p className="text-sm font-semibold text-muted-foreground">{"No saved template yet."}</p>
          ) : (
            templates.map((template) => (
              <button
                className="group rounded-[1.6rem] border border-border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5"
                key={template.id}
                onClick={() => onLoadTemplate(template)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-foreground">{template.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{template.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.channels.map((channel) => (
                      <Badge className="rounded-full bg-primary/10 px-2 py-1 text-primary" key={`${template.id}-${channel}`} variant="secondary">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                {template.subject ? <p className="mt-3 text-sm font-semibold text-foreground">{template.subject}</p> : null}
                <p className="mt-3 line-clamp-5 text-sm leading-6 text-muted-foreground">{template.body}</p>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
