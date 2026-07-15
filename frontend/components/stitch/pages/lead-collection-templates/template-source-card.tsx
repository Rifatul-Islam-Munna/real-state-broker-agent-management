"use client"

import type {
  LeadCollectionTemplateSaveInput,
  LeadCollectionTemplateSourceType,
} from "@/@types/lead-collection-template"
import type { MailInboxItem } from "@/@types/real-estate-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function TemplateSourceCard({
  template,
  inboxItems,
  pastedHtml,
  pastedText,
  onTemplateChange,
  onHtmlChange,
  onTextChange,
  onUpload,
}: {
  template: LeadCollectionTemplateSaveInput
  inboxItems: MailInboxItem[]
  pastedHtml: string
  pastedText: string
  onTemplateChange: (value: LeadCollectionTemplateSaveInput) => void
  onHtmlChange: (value: string) => void
  onTextChange: (value: string) => void
  onUpload: (file?: File) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sample email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          onValueChange={(sourceType) =>
            onTemplateChange({
              ...template,
              sourceType: sourceType as LeadCollectionTemplateSourceType,
              sourceMailInboxId:
                sourceType === "InboxEmail" ? template.sourceMailInboxId : null,
            })
          }
          value={template.sourceType}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="InboxEmail">Existing inbox email</SelectItem>
            <SelectItem value="PastedText">Paste visible email text</SelectItem>
            <SelectItem value="PastedHtml">Paste complete email HTML</SelectItem>
            <SelectItem value="UploadedHtml">Upload .eml, HTML, or text</SelectItem>
          </SelectContent>
        </Select>

        {template.sourceType === "InboxEmail" ? (
          <Select
            onValueChange={(mailId) =>
              onTemplateChange({ ...template, sourceMailInboxId: Number(mailId) })
            }
            value={template.sourceMailInboxId ? String(template.sourceMailInboxId) : ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a provider email" />
            </SelectTrigger>
            <SelectContent>
              {inboxItems.map((mail) => (
                <SelectItem key={mail.id} value={String(mail.id)}>
                  {mail.subject || mail.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {template.sourceType === "PastedText" ? (
          <Textarea
            className="min-h-32"
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Paste the email as you see it"
            value={pastedText}
          />
        ) : null}

        {template.sourceType === "PastedHtml" ? (
          <Textarea
            className="min-h-32 font-mono text-xs"
            onChange={(event) => onHtmlChange(event.target.value)}
            placeholder="Paste the complete email HTML"
            value={pastedHtml}
          />
        ) : null}

        {template.sourceType === "UploadedHtml" ? (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-sm font-semibold hover:border-primary hover:text-primary">
            <span className="flex size-7 items-center justify-center rounded-full border text-lg">+</span>
            Choose .eml, HTML, or text file
            <input
              accept=".eml,.html,.htm,.txt,message/rfc822,text/html,text/plain"
              className="sr-only"
              onChange={(event) => onUpload(event.target.files?.[0])}
              type="file"
            />
          </label>
        ) : null}

        {template.sourceType !== "InboxEmail" ? (
          <div className="grid gap-3">
            <Input
              onChange={(event) =>
                onTemplateChange({ ...template, sampleFromAddress: event.target.value })
              }
              placeholder="Sample sender email"
              value={template.sampleFromAddress}
            />
            <Input
              onChange={(event) =>
                onTemplateChange({ ...template, sampleSubject: event.target.value })
              }
              placeholder="Sample subject"
              value={template.sampleSubject}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
