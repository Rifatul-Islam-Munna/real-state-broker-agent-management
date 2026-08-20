"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  DocumentType,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"
import {
  defaultDocumentCategories,
  documentTypeOptions,
  formatDocumentType,
} from "@/components/stitch/pages/document-management-templates/sections/document-repository-shared"

type TemplateAudience = "Lead" | "LeadShowing" | "Realtor" | "OwnerFeedback"
type AttachmentMode = "none" | "property" | "pdf" | "document"
type EditorState =
  | { mode: "create"; audience: TemplateAudience }
  | { mode: "edit"; id: string }
  | null

const sequenceOptions = ["Direct", "FollowUp1", "FollowUp2", "FollowUp3"] as const
const leadTokens = [
  "{{client_name}}",
  "{{property_address}}",
  "{{agent_name}}",
  "{{agency_name}}",
  "{{showing_time}}",
  "{{closing_date}}",
]
const ownerTokens = [
  "{{property_address}}",
  "{{fromdate}}",
  "{{todate}}",
  "{{feedback_summary}}",
  "{{feedback1}}",
  "{{feedback2}}",
  "{{feedback3}}",
]

function newTemplate(audience: TemplateAudience): AgencyCommunicationTemplateItem {
  const owner = audience === "OwnerFeedback"
  const leadShowing = audience === "LeadShowing"
  return {
    audience,
    attachPropertyDocuments: !owner,
    attachmentDocumentCategory: "",
    attachmentDocumentType: "",
    attachmentMode: owner ? "none" : "property",
    body: owner
      ? "Showing feedback for {{property_address}} from {{fromdate}} to {{todate}}:\n\n{{feedback_summary}}\n{{feedback1}}\n{{feedback2}}\n{{feedback3}}"
      : leadShowing
        ? "Hi {{client_name}}, thank you for visiting {{property_address}}. What did you like, what concerns do you have, and would you like to apply or schedule a second visit?"
        : "Hi {{client_name}}, thanks for your interest in {{property_address}}. Reply here and our team will help with the next step.",
    channels: ["Email"],
    gapDays: 0,
    id: `custom-${crypto.randomUUID()}`,
    isActive: true,
    name: owner ? "Owner Feedback Report" : leadShowing ? "Lead Showing Follow-up" : `${audience} Message`,
    sequenceType: "Direct",
    subject: owner
      ? "Showing feedback: {{property_address}}"
      : leadShowing
        ? "How was your showing at {{property_address}}?"
        : "Property update: {{property_address}}",
    variableTokens: owner ? ownerTokens : leadTokens,
    pdfTemplateId: "",
  }
}

function audienceLabel(value?: TemplateAudience) {
  return value === "OwnerFeedback" ? "Owner feedback" : value === "LeadShowing" ? "Lead showing" : value ?? "Lead"
}

function TemplateCard({
  onEdit,
  template,
}: {
  onEdit: () => void
  template: AgencyCommunicationTemplateItem
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline">{audienceLabel(template.audience)}</Badge>
          <Badge variant={template.isActive === false ? "outline" : "secondary"}>
            {template.isActive === false ? "Paused" : "Active"}
          </Badge>
        </div>
        <div>
          <CardTitle className="line-clamp-1 text-base text-foreground">
            {template.name}
          </CardTitle>
          <CardDescription className="mt-1 line-clamp-2 leading-5">
            {template.subject || "No subject"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{template.sequenceType ?? "Direct"}</Badge>
          {(template.channels ?? []).map((channel) => (
            <Badge key={channel} variant="outline">{channel}</Badge>
          ))}
          {(template.gapDays ?? 0) > 0 ? (
            <Badge variant="outline">{`${template.gapDays}d`}</Badge>
          ) : null}
        </div>
        <Button className="w-full" onClick={onEdit} type="button" variant="outline">
          {"Edit template"}
        </Button>
      </CardContent>
    </Card>
  )
}

export function CommunicationTemplateWorkspaceV2({
  isSaving,
  onChange,
  templates,
}: {
  isSaving: boolean
  onChange: (templates: AgencyCommunicationTemplateItem[]) => Promise<boolean>
  templates: AgencyCommunicationTemplateItem[]
}) {
  const [editor, setEditor] = useState<EditorState>(null)
  const activeTemplate = useMemo(() => {
    if (!editor) return null
    return editor.mode === "create"
      ? newTemplate(editor.audience)
      : templates.find((item) => item.id === editor.id) ?? null
  }, [editor, templates])

  return (
    <section className="space-y-4 scroll-mt-24" id="communication-templates">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {"Communication templates"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Cards show status and delivery channels. Full editing opens in a side sheet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setEditor({ mode: "create", audience: "Lead" })}
            size="sm"
            type="button"
          >
            <AppIcon name="add" />
            {"Lead template"}
          </Button>
          <Button
            onClick={() => setEditor({ mode: "create", audience: "LeadShowing" })}
            size="sm"
            type="button"
            variant="outline"
          >
            {"Lead showing template"}
          </Button>
          <Button
            onClick={() => setEditor({ mode: "create", audience: "Realtor" })}
            size="sm"
            type="button"
            variant="outline"
          >
            {"Realtor template"}
          </Button>
          <Button
            onClick={() => setEditor({ mode: "create", audience: "OwnerFeedback" })}
            size="sm"
            type="button"
            variant="outline"
          >
            {"Owner report"}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {"No communication templates have been created."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              onEdit={() => setEditor({ mode: "edit", id: template.id })}
              template={template}
            />
          ))}
        </div>
      )}

      <TemplateSheet
        editor={editor}
        isSaving={isSaving}
        onClose={() => setEditor(null)}
        onDelete={async (id) => {
          const saved = await onChange(templates.filter((item) => item.id !== id))
          if (saved) setEditor(null)
        }}
        onDuplicate={async (template) => {
          const duplicate = {
            ...template,
            channels: [...template.channels],
            id: `custom-${crypto.randomUUID()}`,
            name: `${template.name} Copy`,
            variableTokens: [...template.variableTokens],
          }
          const saved = await onChange([duplicate, ...templates])
          if (saved) setEditor({ mode: "edit", id: duplicate.id })
        }}
        onSave={async (template) => {
          const saved = await onChange(
            editor?.mode === "create"
              ? [template, ...templates]
              : templates.map((item) => (item.id === template.id ? template : item)),
          )
          if (saved) setEditor(null)
        }}
        template={activeTemplate}
      />
    </section>
  )
}

function TemplateSheet({
  editor,
  isSaving,
  onClose,
  onDelete,
  onDuplicate,
  onSave,
  template,
}: {
  editor: EditorState
  isSaving: boolean
  onClose: () => void
  onDelete: (id: string) => Promise<void>
  onDuplicate: (template: AgencyCommunicationTemplateItem) => Promise<void>
  onSave: (template: AgencyCommunicationTemplateItem) => Promise<void>
  template: AgencyCommunicationTemplateItem | null
}) {
  const [draft, setDraft] = useState<AgencyCommunicationTemplateItem | null>(template)
  const [pdfSearch, setPdfSearch] = useState("")
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const pdfTemplates = useMemo(() => {
    const search = pdfSearch.trim().toLowerCase()
    return (pdfTemplatesQuery.data?.items ?? [])
      .filter((item) => item.status !== "Archived")
      .filter((item) => !search || `${item.name} ${item.category}`.toLowerCase().includes(search))
  }, [pdfSearch, pdfTemplatesQuery.data?.items])

  useEffect(() => {
    setDraft(template)
  }, [editor, template])

  function update<K extends keyof AgencyCommunicationTemplateItem>(
    key: K,
    value: AgencyCommunicationTemplateItem[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  function toggleChannel(channel: AgencyCommunicationChannel, checked: boolean) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        channels: checked
          ? Array.from(new Set([...(current.channels ?? []), channel]))
          : (current.channels ?? []).filter((item) => item !== channel),
      }
    })
  }

  function setAttachmentMode(mode: AttachmentMode) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        attachPropertyDocuments: mode === "property",
        attachmentDocumentCategory: mode === "document" ? (current.attachmentDocumentCategory ?? "") : "",
        attachmentDocumentType: mode === "document" ? (current.attachmentDocumentType ?? "") : "",
        attachmentMode: mode,
        pdfTemplateId: mode === "pdf" ? (current.pdfTemplateId ?? "") : "",
      }
    })
  }

  return (
    <Sheet open={editor !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[38rem] sm:max-w-[38rem]">
        <SheetHeader className="border-b">
          <SheetTitle>
            {editor?.mode === "create" ? "Create template" : "Edit template"}
          </SheetTitle>
          <SheetDescription>
            {"Configure audience, channels, sequence, subject, message, and variables."}
          </SheetDescription>
        </SheetHeader>

        {draft ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{"Audience"}</Label>
                <Select
                  onValueChange={(value) => {
                    const audience = value as TemplateAudience
                    update("audience", audience)
                    update("variableTokens", audience === "OwnerFeedback" ? ownerTokens : leadTokens)
                  }}
                  value={draft.audience ?? "Lead"}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">{"Lead"}</SelectItem>
                    <SelectItem value="LeadShowing">{"Lead showing"}</SelectItem>
                    <SelectItem value="Realtor">{"Realtor"}</SelectItem>
                    <SelectItem value="OwnerFeedback">{"Owner feedback"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{"Template name"}</Label>
                <Input onChange={(event) => update("name", event.target.value)} value={draft.name} />
              </div>
              <div className="space-y-2">
                <Label>{"Sequence"}</Label>
                <Select
                  onValueChange={(value) =>
                    update("sequenceType", value as AgencyCommunicationTemplateItem["sequenceType"])
                  }
                  value={draft.sequenceType ?? "Direct"}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sequenceOptions.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{"Gap days"}</Label>
                <Input
                  min={0}
                  onChange={(event) => update("gapDays", Math.max(0, Number(event.target.value) || 0))}
                  type="number"
                  value={draft.gapDays ?? 0}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={draft.isActive !== false}
                label="Template active"
                onChange={(checked) => update("isActive", checked)}
              />
              {(["Email", "SMS"] as AgencyCommunicationChannel[]).map((channel) => (
                <Toggle
                  checked={(draft.channels ?? []).includes(channel)}
                  key={channel}
                  label={channel}
                  onChange={(checked) => toggleChannel(channel, checked)}
                />
              ))}
            </div>

            <div className="space-y-3 rounded-xl border p-3">
              <div className="space-y-2">
                <Label>{"Attachment"}</Label>
                <Select
                  onValueChange={(value) => setAttachmentMode(value as AttachmentMode)}
                  value={draft.attachmentMode ?? (draft.attachPropertyDocuments !== false ? "property" : "none")}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{"No attachment"}</SelectItem>
                    <SelectItem value="property">{"Auto attach property documents"}</SelectItem>
                    <SelectItem value="pdf">{"Auto generate custom PDF"}</SelectItem>
                    <SelectItem value="document">{"Attach saved document category"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(draft.attachmentMode ?? (draft.attachPropertyDocuments !== false ? "property" : "none")) === "pdf" ? (
                <div className="space-y-2">
                  <Label>{"PDF template"}</Label>
                  <Select
                    onValueChange={(value) => update("pdfTemplateId", value === "none" ? "" : value)}
                    value={draft.pdfTemplateId || "none"}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose PDF template" /></SelectTrigger>
                    <SelectContent>
                      <Input className="mb-2 h-8" onChange={(event) => setPdfSearch(event.target.value)} placeholder="Search PDF template" value={pdfSearch} />
                      <SelectItem value="none">{"No PDF selected"}</SelectItem>
                      {pdfTemplates.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>{`${item.name} - ${item.category}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {(draft.attachmentMode ?? (draft.attachPropertyDocuments !== false ? "property" : "none")) === "document" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{"Document type"}</Label>
                    <Select
                      onValueChange={(value) => update("attachmentDocumentType", value === "any" ? "" : (value as DocumentType))}
                      value={draft.attachmentDocumentType || "any"}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{"Any type"}</SelectItem>
                        {documentTypeOptions.map((item) => (
                          <SelectItem key={item} value={item}>{formatDocumentType(item)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{"Category"}</Label>
                    <Select
                      onValueChange={(value) => update("attachmentDocumentCategory", value === "any" ? "" : value)}
                      value={draft.attachmentDocumentCategory || "any"}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{"Any category"}</SelectItem>
                        {defaultDocumentCategories.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{"Email subject"}</Label>
              <Input onChange={(event) => update("subject", event.target.value)} value={draft.subject} />
            </div>
            <div className="space-y-2">
              <Label>{"Message body"}</Label>
              <Textarea
                className="min-h-56"
                onChange={(event) => update("body", event.target.value)}
                value={draft.body}
              />
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {"Available variables"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(draft.variableTokens ?? []).map((token) => (
                  <Badge key={token} variant="outline">{token}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <SheetFooter>
          {editor?.mode === "edit" && draft ? (
            <div className="flex gap-2">
              <Button
                disabled={isSaving}
                onClick={() => void onDelete(draft.id)}
                type="button"
                variant="destructive"
              >
                {isSaving ? "Saving..." : "Delete"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => void onDuplicate(draft)}
                type="button"
                variant="outline"
              >
                {"Duplicate"}
              </Button>
            </div>
          ) : null}
          <Button
            disabled={
              isSaving ||
              !draft?.name.trim() ||
              !draft?.body.trim() ||
              (draft?.channels.length ?? 0) === 0
            }
            onClick={() => draft && void onSave(draft)}
            type="button"
          >
            {isSaving
              ? "Saving..."
              : editor?.mode === "create"
                ? "Save template"
                : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  )
}
