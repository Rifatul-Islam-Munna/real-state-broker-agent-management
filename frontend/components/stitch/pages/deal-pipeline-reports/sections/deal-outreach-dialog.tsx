"use client"

import { useEffect, useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useDocumentRepository, usePortalCurrentUser, type DealItem, type LeadItem } from "@/hooks/use-real-estate-api"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"

import type { OutreachType } from "./deal-shared"

const emptyTemplateValue = "__none__"
const sequenceRank: Record<string, number> = { Direct: 0, FollowUp1: 1, FollowUp2: 2, FollowUp3: 3 }

function resolveTemplateTokens(templateText: string, deal: DealItem, lead: LeadItem | null, agentName?: string | null) {
  const replacements: Record<string, string> = {
    "{{client_name}}": deal.client || lead?.name || "Client",
    "{{property_address}}": lead?.property || deal.title || "the property",
    "{{agent_name}}": (deal.agent || lead?.agent || agentName || "our agent").trim(),
    "{{agency_name}}": "EstateBlue",
    "{{showing_time}}": lead?.timeline || deal.deadline || "the requested time",
    "{{closing_date}}": deal.expectedClosingDate || deal.deadline || "the scheduled date",
  }

  return Object.entries(replacements).reduce(
    (current, [token, value]) => current.replaceAll(token, value || ""),
    templateText,
  )
}

export function DealOutreachDialog({
  deal,
  isSubmitting,
  lead,
  mode,
  onOpenChange,
  onSubmit,
  open,
}: {
  deal: DealItem | null
  isSubmitting: boolean
  lead: LeadItem | null
  mode: OutreachType | null
  onOpenChange: (open: boolean) => void
  onSubmit: (message: string) => Promise<string | null>
  open: boolean
}) {
  const currentUserQuery = usePortalCurrentUser()
  const templatesQuery = useLeadOutreachTemplates()
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const [templateId, setTemplateId] = useState(emptyTemplateValue)
  const [pdfTemplateId, setPdfTemplateId] = useState(emptyTemplateValue)
  const [documentSearch, setDocumentSearch] = useState("")
  const [documentCategory, setDocumentCategory] = useState("all")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTemplateId(emptyTemplateValue)
    setPdfTemplateId(emptyTemplateValue)
    setDocumentSearch("")
    setDocumentCategory("all")
    setSelectedDocumentIds([])
    setTitle("")
    setMessage("")
    setScheduledAt("")
    setError(null)
  }, [deal?.id, mode, open])

  const filteredTemplates = useMemo(() => {
    return (templatesQuery.data ?? [])
      .filter((template) => template.isActive !== false)
      .filter((template) => mode === "email" ? template.channels.includes("Email") : template.channels.includes("SMS"))
      .sort((left, right) => (sequenceRank[left.sequenceType ?? "Direct"] ?? 99) - (sequenceRank[right.sequenceType ?? "Direct"] ?? 99))
  }, [mode, templatesQuery.data])

  const allDocuments = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data?.items])
  const documentCategories = useMemo(
    () => Array.from(new Set(allDocuments.map((doc) => doc.category).filter(Boolean))).sort(),
    [allDocuments],
  )
  const documents = useMemo(() => {
    const search = documentSearch.trim().toLowerCase()
    return allDocuments
      .filter((doc) => documentCategory === "all" || doc.category === documentCategory)
      .filter((doc) => !search || `${doc.title} ${doc.category} ${doc.documentType}`.toLowerCase().includes(search))
  }, [allDocuments, documentCategory, documentSearch])
  const pdfTemplates = useMemo(
    () => (pdfTemplatesQuery.data?.items ?? []).filter((template) => template.status !== "Archived"),
    [pdfTemplatesQuery.data?.items],
  )

  if (!deal || !mode) return null

  const recipient = mode === "email" ? lead?.email || "No linked lead email" : lead?.phone || "No linked lead phone"
  const dialogTitle = mode === "email" ? "Send Email" : "Send Message"
  const selectedDocuments = allDocuments.filter((doc) => selectedDocumentIds.includes(doc.id))
  const selectedTemplateLabel = templateId === emptyTemplateValue
    ? "No template"
    : filteredTemplates.find((template) => template.id === templateId)?.name ?? "No template"
  const selectedPdfLabel = pdfTemplateId === emptyTemplateValue
    ? "No generated PDF"
    : pdfTemplates.find((template) => String(template.id) === pdfTemplateId)?.name ?? "No generated PDF"
  const availableVariables = [
    { label: "Client name", value: deal.client || lead?.name || "Client" },
    { label: "Property", value: lead?.property || deal.title },
    { label: "Agent", value: deal.agent || lead?.agent || currentUserQuery.data?.fullName || "our agent" },
    { label: "Agency", value: "EstateBlue" },
    { label: "Closing date", value: deal.expectedClosingDate || deal.deadline || "the scheduled date" },
  ]

  async function handleSubmit() {
    if (mode === "email" && title.trim().length < 3) {
      setError("Subject must be at least 3 characters.")
      return
    }
    if (message.trim().length < 5) {
      setError("Message must be at least 5 characters.")
      return
    }

    const attachmentLines = selectedDocuments.map((doc) => `Attachment: ${doc.title} (${doc.fileUrl})`)
    const pdfLine = pdfTemplateId === emptyTemplateValue ? [] : [`Generated PDF template: ${selectedPdfLabel}`]
    const scheduleLine = scheduledAt ? [`Scheduled for: ${scheduledAt}`] : []
    const composed = [mode === "email" ? `Subject: ${title.trim()}` : "", message.trim(), ...scheduleLine, ...attachmentLines, ...pdfLine]
      .filter(Boolean)
      .join("\n")

    const responseError = await onSubmit(composed)
    if (responseError) {
      setError(responseError)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="!flex h-[90dvh] max-h-[90dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.28)]">
        <header className="flex items-center justify-between border-b border-[var(--ether-outline-variant)] px-6 py-4">
          <div>
            <DialogTitle className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">{dialogTitle}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
              Update for <span className="font-semibold text-[var(--ether-primary)]">{deal.client || deal.title}</span>
            </DialogDescription>
          </div>
          <button aria-label="Close outreach dialog" className="flex size-9 items-center justify-center rounded-full text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-high)]" onClick={() => onOpenChange(false)} type="button">
            <AppIcon name="close" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 lg:border-r lg:border-[var(--ether-outline-variant)]">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{mode === "email" ? "To" : "Phone"}</span>
                <div className="relative">
                  <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-on-surface-variant)]" name={mode === "email" ? "alternate_email" : "call"} />
                  <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white pl-10 shadow-none" readOnly value={recipient} />
                </div>
              </label>
              <label className="space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Scheduled For</span>
                <div className="relative">
                  <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-on-surface-variant)]" name="schedule" />
                  <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white pl-10 shadow-none" onChange={(event) => setScheduledAt(event.target.value)} type="datetime-local" value={scheduledAt} />
                </div>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{mode === "email" ? "Email Template" : "SMS Template"}</span>
              <Select modal={false} onValueChange={(nextValue) => {
                const value = nextValue ?? emptyTemplateValue
                setTemplateId(value)
                if (value === emptyTemplateValue) return
                const template = filteredTemplates.find((item) => item.id === value)
                if (!template) return
                setTitle(mode === "email" ? resolveTemplateTokens(template.subject, deal, lead, currentUserQuery.data?.fullName) : template.name)
                setMessage(resolveTemplateTokens(template.body, deal, lead, currentUserQuery.data?.fullName))
              }} value={templateId}>
                <SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white"><span className="truncate">{selectedTemplateLabel}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptyTemplateValue}>No template</SelectItem>
                  {filteredTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{`${template.name} - ${template.sequenceType ?? "Direct"}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>

            {mode === "email" ? (
              <label className="block space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Subject Line</span>
                <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white shadow-none" onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Deal progress update" value={title} />
              </label>
            ) : null}

            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Fillable Variables</span>
                <span className="text-[10px] text-[var(--ether-outline)]">Click to insert</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableVariables.map((variable) => (
                  <button className="rounded-full bg-[var(--ether-primary-fixed)] px-3 py-1.5 text-[10px] font-bold text-[var(--ether-primary)] transition hover:bg-[var(--ether-primary-fixed-dim)]" key={variable.label} onClick={() => setMessage((current) => `${current}${current ? " " : ""}${variable.value}`)} type="button">{variable.label}</button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Message</span>
              <div className="overflow-hidden rounded-lg border border-[var(--ether-outline-variant)] bg-white">
                <div className="flex items-center gap-1 border-b border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-2 py-2 text-[var(--ether-on-surface-variant)]">
                  {['format_bold','format_italic','format_list_bulleted','link'].map((icon) => <button className="flex size-8 items-center justify-center rounded transition hover:bg-white hover:text-[var(--ether-primary)]" key={icon} type="button"><AppIcon name={icon} /></button>)}
                  <button className="ml-auto flex size-8 items-center justify-center rounded transition hover:bg-white hover:text-[var(--ether-primary)]" type="button"><AppIcon name="image" /></button>
                </div>
                <Textarea className="min-h-64 resize-none rounded-none border-0 p-4 shadow-none focus-visible:ring-0" onChange={(event) => { setMessage(event.target.value); setError(null) }} placeholder={`Write the ${mode} message here...`} value={message} />
              </div>
            </label>
            {error ? <p className="rounded-lg bg-[var(--ether-error-container)] px-4 py-3 text-sm font-semibold text-[var(--ether-error)]">{error}</p> : null}
          </section>

          <aside className="flex min-h-0 w-full flex-col bg-[color-mix(in_srgb,var(--ether-surface-container-low)_45%,white)] p-4 lg:w-[340px]">
            <div className="flex items-center justify-between">
              <h3 className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Attachments</h3>
              <span className="rounded-full bg-[var(--ether-primary-fixed)] px-2 py-1 text-[10px] font-bold text-[var(--ether-primary)]">{allDocuments.length} available</span>
            </div>
            <div className="mt-4 grid gap-3">
              <Select modal={false} onValueChange={(value) => setDocumentCategory(value ?? "all")} value={documentCategory}>
                <SelectTrigger className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white"><span>{documentCategory === "all" ? "All categories" : documentCategory}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {documentCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-on-surface-variant)]" name="search" />
                <Input className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white pl-9 shadow-none" onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search docs..." value={documentSearch} />
              </div>
            </div>
            <div className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {documents.map((doc) => {
                const selected = selectedDocumentIds.includes(doc.id)
                return (
                  <label className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition ${selected ? "border border-[var(--ether-primary)] bg-white shadow-sm" : "border border-transparent hover:border-[var(--ether-outline-variant)] hover:bg-white"}`} key={doc.id}>
                    <input checked={selected} className="mt-1 size-4 rounded border-[var(--ether-outline-variant)] text-[var(--ether-primary)]" onChange={(event) => setSelectedDocumentIds((current) => event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id))} type="checkbox" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="rounded bg-[var(--ether-secondary-container)]/45 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--ether-secondary)]">{doc.category}</span><span className="text-[9px] text-[var(--ether-outline)]">{doc.documentType}</span></span>
                      <span className="mt-1 block truncate text-sm font-semibold text-[var(--ether-on-surface)]">{doc.title}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-4">
              <Select modal={false} onValueChange={(value) => setPdfTemplateId(value ?? emptyTemplateValue)} value={pdfTemplateId}>
                <SelectTrigger className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white"><span className="truncate">{selectedPdfLabel}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value={emptyTemplateValue}>No generated PDF</SelectItem>
                  {pdfTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{`${template.name} - ${template.category}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--ether-on-surface-variant)]"><span className="flex size-7 items-center justify-center rounded-md bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"><AppIcon name="description" /></span><span>{selectedDocuments.length} file{selectedDocuments.length === 1 ? "" : "s"} attached</span></div>
          <div className="flex items-center justify-end gap-3">
            <button className="rounded-lg px-5 py-2 text-sm font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-high)]" onClick={() => onOpenChange(false)} type="button">Cancel</button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--ether-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,67,213,0.28)] hover:bg-[var(--ether-primary-container)] disabled:opacity-60" disabled={isSubmitting} onClick={() => void handleSubmit()} type="button"><AppIcon name="send" />{isSubmitting ? "Sending..." : scheduledAt ? `Schedule ${mode === "email" ? "Email" : "SMS"}` : dialogTitle}</button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
