"use client"

import { useEffect, useMemo, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useDocumentRepository, usePortalCurrentUser, type LeadItem } from "@/hooks/use-real-estate-api"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"

import { leadButtonClass } from "./lead-shared"
import type { LeadOutreachComposerValues, LeadOutreachMode } from "./lead-outreach-types"

const emptyTemplateValue = "__none__"
const sequenceRank: Record<string, number> = { Direct: 0, FollowUp1: 1, FollowUp2: 2, FollowUp3: 3 }

function resolveTemplateTokens(templateText: string, lead: LeadItem, agentName?: string | null) {
  const replacements: Record<string, string> = {
    "{{client_name}}": lead.name ?? "Client",
    "{{property_address}}": lead.property ?? "the property",
    "{{agent_name}}": (lead.agent || agentName || "our agent").trim(),
    "{{agency_name}}": "EstateBlue",
    "{{showing_time}}": lead.timeline ?? "the requested time",
    "{{closing_date}}": lead.timeline ?? "the scheduled date",
  }

  return Object.entries(replacements).reduce(
    (current, [token, value]) => current.replaceAll(token, value || ""),
    templateText,
  )
}

export function LeadOutreachDialog({
  isSubmitting,
  lead,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {
  isSubmitting: boolean
  lead: LeadItem | null
  mode: LeadOutreachMode | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: LeadOutreachComposerValues) => Promise<string | null>
  open: boolean
}) {
  const currentUserQuery = usePortalCurrentUser()
  const templatesQuery = useLeadOutreachTemplates()
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const [templateId, setTemplateId] = useState(emptyTemplateValue)
  const [pdfTemplateId, setPdfTemplateId] = useState(emptyTemplateValue)
  const [pdfSearch, setPdfSearch] = useState("")
  const [documentSearch, setDocumentSearch] = useState("")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [values, setValues] = useState<LeadOutreachComposerValues>({
    title: "",
    message: "",
    scheduledAt: "",
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setTemplateId(emptyTemplateValue)
    setPdfTemplateId(emptyTemplateValue)
    setPdfSearch("")
    setDocumentSearch("")
    setSelectedDocumentIds([])
    setValues({ title: "", message: "", scheduledAt: "" })
    setError(null)
  }, [lead?.id, mode, open])

  const filteredTemplates = useMemo(() => {
    const templates = templatesQuery.data ?? []

    return templates.filter((template) => {
      if (template.isActive === false) {
        return false
      }

      if (mode === "email") {
        return template.channels.includes("Email")
      }

      if (mode === "message") {
        return template.channels.includes("SMS")
      }

      return false
    }).sort((left, right) => (sequenceRank[left.sequenceType ?? "Direct"] ?? 99) - (sequenceRank[right.sequenceType ?? "Direct"] ?? 99))
  }, [mode, templatesQuery.data])

  const pdfTemplates = useMemo(() => {
    const search = pdfSearch.trim().toLowerCase()
    return (pdfTemplatesQuery.data?.items ?? [])
      .filter((template) => template.status !== "Archived")
      .filter((template) => !search || `${template.name} ${template.category}`.toLowerCase().includes(search))
  }, [pdfSearch, pdfTemplatesQuery.data?.items])

  const allDocuments = documentsQuery.data?.items ?? []
  const documents = useMemo(() => {
    const search = documentSearch.trim().toLowerCase()
    return allDocuments
      .filter((doc) => !search || `${doc.title} ${doc.category} ${doc.documentType}`.toLowerCase().includes(search))
  }, [allDocuments, documentSearch])

  const selectedDocumentUrls = useMemo(
    () => allDocuments
      .filter((doc) => selectedDocumentIds.includes(doc.id))
      .map((doc) => doc.fileUrl)
      .filter(Boolean),
    [allDocuments, selectedDocumentIds],
  )

  if (!lead || !mode) {
    return null
  }

  const recipientLabel = mode === "email" ? lead.email ?? "No email" : lead.phone ?? "No phone"
  const title = mode === "email" ? "Send Email" : mode === "call" ? "Call Lead" : "Send Message"
  const description =
    mode === "call"
      ? `Trigger or schedule a call reminder for ${lead.name}.`
      : `Send a ${mode} update to ${lead.name}.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border border-slate-200 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </DialogDescription>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {recipientLabel}
            </div>
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => {
                setValues((current) => ({ ...current, scheduledAt: event.target.value }))
                setError(null)
              }}
              type="datetime-local"
              value={values.scheduledAt}
            />
          </div>

          {mode !== "call" ? (
            <Select
              modal={false}
              onValueChange={(nextValue) => {
                setTemplateId(nextValue ?? emptyTemplateValue)
                setError(null)

                if (!nextValue || nextValue === emptyTemplateValue) {
                  return
                }

                const selectedTemplate = filteredTemplates.find((item) => item.id === nextValue)
                if (!selectedTemplate) {
                  return
                }

                const agentName = currentUserQuery.data?.fullName ?? null
                const nextTitle = mode === "email"
                  ? resolveTemplateTokens(selectedTemplate.subject, lead, agentName)
                  : selectedTemplate.name

                setValues((current) => ({
                  ...current,
                  attachmentDocumentCategory: selectedTemplate.attachmentDocumentCategory ?? "",
                  attachmentDocumentType: selectedTemplate.attachmentDocumentType ?? "",
                  attachmentMode: selectedTemplate.attachmentMode ?? (selectedTemplate.attachPropertyDocuments !== false ? "property" : "none"),
                  attachPropertyDocuments: selectedTemplate.attachPropertyDocuments !== false,
                  pdfTemplateId: selectedTemplate.pdfTemplateId ?? current.pdfTemplateId,
                  title: nextTitle,
                  message: resolveTemplateTokens(selectedTemplate.body, lead, agentName),
                  templateId: selectedTemplate.id,
                }))
              }}
              value={templateId}
            >
              <SelectTrigger className="rounded-none border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptyTemplateValue}>{"No template"}</SelectItem>
                {filteredTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {`${template.name} - ${template.sequenceType ?? "Direct"} (${template.gapDays ?? 0}d)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {mode !== "call" ? (
            <div className="space-y-2 border border-slate-200 p-3 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{"Attach saved documents"}</p>
              <Input
                className="rounded-none border-slate-200 dark:border-white/10"
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Search docs by title, category, type"
                value={documentSearch}
              />
              <div className="max-h-44 space-y-2 overflow-auto pr-1">
                {documents.map((doc) => (
                  <label className="flex items-start gap-2 text-sm" key={doc.id}>
                    <input
                      checked={selectedDocumentIds.includes(doc.id)}
                      className="mt-1"
                      onChange={(event) => setSelectedDocumentIds((current) =>
                        event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id),
                      )}
                      type="checkbox"
                    />
                    <span>
                      <span className="font-semibold">{doc.title}</span>
                      <span className="block text-xs text-slate-500">{`${doc.documentType} - ${doc.category}`}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {mode !== "call" ? (
            <Select
              modal={false}
              onValueChange={(nextValue) => {
                setPdfTemplateId(nextValue ?? emptyTemplateValue)
                setError(null)
              }}
              value={pdfTemplateId}
            >
              <SelectTrigger className="rounded-none border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
                <SelectValue placeholder="Attach generated PDF" />
              </SelectTrigger>
              <SelectContent>
                <Input
                  className="mb-2 h-8 rounded-none"
                  onChange={(event) => setPdfSearch(event.target.value)}
                  placeholder="Search PDF template"
                  value={pdfSearch}
                />
                <SelectItem value={emptyTemplateValue}>{"No generated PDF"}</SelectItem>
                {pdfTemplates.map((template) => (
                  <SelectItem key={template.id} value={String(template.id)}>
                    {`${template.name} - ${template.category}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {mode !== "message" ? (
            <Input
              className="rounded-none border-slate-200 dark:border-white/10"
              onChange={(event) => {
                setValues((current) => ({ ...current, title: event.target.value }))
                setError(null)
              }}
              placeholder={mode === "email" ? "Email subject" : "Call title"}
              value={values.title}
            />
          ) : null}

          <Textarea
            className="min-h-40 rounded-none border-slate-200 dark:border-white/10"
            onChange={(event) => {
              setValues((current) => ({ ...current, message: event.target.value }))
              setError(null)
            }}
            placeholder={mode === "call" ? "What should the reminder call say?" : `Write the ${mode} message here...`}
            value={values.message}
          />
          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <button
            className={leadButtonClass}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {"Close"}
          </button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              if (mode !== "message" && values.title.trim().length < 3) {
                setError(mode === "email" ? "Subject must be at least 3 characters." : "Title must be at least 3 characters.")
                return
              }

              if (values.message.trim().length < 5) {
                setError("Message must be at least 5 characters.")
                return
              }

              const responseError = await onSubmit({
                title: values.title.trim(),
                message: values.message.trim(),
                scheduledAt: values.scheduledAt,
                attachmentDocumentCategory: values.attachmentDocumentCategory,
                attachmentDocumentType: values.attachmentDocumentType,
                attachmentMode: values.attachmentMode,
                attachPropertyDocuments: values.attachPropertyDocuments !== false,
                mediaUrls: selectedDocumentUrls,
                templateId: templateId === emptyTemplateValue ? undefined : templateId,
                pdfTemplateId: pdfTemplateId === emptyTemplateValue ? values.pdfTemplateId : pdfTemplateId,
              })

              if (responseError) {
                setError(responseError)
                return
              }

              setTemplateId(emptyTemplateValue)
              setPdfTemplateId(emptyTemplateValue)
              setSelectedDocumentIds([])
              setValues({ title: "", message: "", scheduledAt: "" })
              setError(null)
              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting
              ? values.scheduledAt
                ? "Saving..."
                : "Sending..."
              : values.scheduledAt
                ? mode === "call"
                  ? "Schedule Call"
                  : mode === "email"
                    ? "Schedule Email"
                    : "Schedule SMS"
                : mode === "call"
                  ? "Call Now"
                  : title}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
