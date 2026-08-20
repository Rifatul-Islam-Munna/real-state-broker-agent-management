"use client"

import { useEffect, useMemo, useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAgencySettings, useDocumentRepository, usePortalCurrentUser, type LeadItem } from "@/hooks/use-real-estate-api"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"

import type { LeadOutreachComposerValues, LeadOutreachMode } from "./lead-outreach-types"

const emptyTemplateValue = "__none__"
const sequenceRank: Record<string, number> = { Direct: 0, FollowUp1: 1, FollowUp2: 2, FollowUp3: 3 }

function resolveTemplateTokens(templateText: string, lead: LeadItem, agentName?: string | null, agencyName?: string | null) {
  const replacements: Record<string, string> = {
    "{{client_name}}": lead.name ?? "Client",
    "{{property_address}}": lead.property ?? "the property",
    "{{agent_name}}": (lead.agent || agentName || "our agent").trim(),
    "{{agency_name}}": agencyName?.trim() || "EstateBlue",
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
  onSubmit: (values: LeadOutreachComposerValues, deliveryMode: LeadOutreachMode) => Promise<string | null>
  open: boolean
}) {
  const currentUserQuery = usePortalCurrentUser()
  const agencySettingsQuery = useAgencySettings()
  const templatesQuery = useLeadOutreachTemplates()
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const [templateId, setTemplateId] = useState(emptyTemplateValue)
  const [pdfTemplateId, setPdfTemplateId] = useState(emptyTemplateValue)
  const [pdfSearch, setPdfSearch] = useState("")
  const [documentSearch, setDocumentSearch] = useState("")
  const [documentCategory, setDocumentCategory] = useState("all")
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [deliveryMode, setDeliveryMode] = useState<LeadOutreachMode>("both")
  const [composerView, setComposerView] = useState<"preview" | "edit">("preview")
  const [defaultTemplateApplied, setDefaultTemplateApplied] = useState(false)
  const [values, setValues] = useState<LeadOutreachComposerValues>({
    attachPropertyDocuments: false,
    attachmentMode: "none",
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
    setDocumentCategory("all")
    setSelectedDocumentIds([])
    setDeliveryMode(mode === "both"
      ? lead?.email?.trim()
        ? lead.phone?.trim() ? "both" : "email"
        : lead?.phone?.trim() ? "message" : "both"
      : mode ?? "both")
    setComposerView("preview")
    setDefaultTemplateApplied(false)
    setValues({ attachPropertyDocuments: false, attachmentMode: "none", title: "", message: "", scheduledAt: "" })
    setError(null)
  }, [lead?.id, mode, open])

  const filteredTemplates = useMemo(() => {
    const templates = templatesQuery.data ?? []

    return templates.filter((template) => {
      if (template.isActive === false) {
        return false
      }

      if (deliveryMode === "email") {
        return template.channels.includes("Email")
      }

      if (deliveryMode === "message") {
        return template.channels.includes("SMS")
      }

      if (deliveryMode === "both") {
        return template.channels.includes("Email") && template.channels.includes("SMS")
      }

      return false
    }).sort((left, right) => (sequenceRank[left.sequenceType ?? "Direct"] ?? 99) - (sequenceRank[right.sequenceType ?? "Direct"] ?? 99))
  }, [deliveryMode, templatesQuery.data])

  const pdfTemplates = useMemo(() => {
    const search = pdfSearch.trim().toLowerCase()
    return (pdfTemplatesQuery.data?.items ?? [])
      .filter((template) => template.status !== "Archived")
      .filter((template) => !search || `${template.name} ${template.category}`.toLowerCase().includes(search))
  }, [pdfSearch, pdfTemplatesQuery.data?.items])

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

  const selectedDocumentUrls = useMemo(
    () => allDocuments
      .filter((doc) => selectedDocumentIds.includes(doc.id))
      .map((doc) => doc.fileUrl)
      .filter(Boolean),
    [allDocuments, selectedDocumentIds],
  )

  useEffect(() => {
    if (!open || !lead || mode === "call" || defaultTemplateApplied || filteredTemplates.length === 0) return

    const configuredId = agencySettingsQuery.data?.leadAutomation?.directTemplateId
    const selectedTemplate = filteredTemplates.find((template) => template.id === configuredId)
      ?? filteredTemplates.find((template) => (template.sequenceType ?? "Direct") === "Direct")
      ?? filteredTemplates[0]
    const agentName = currentUserQuery.data?.fullName ?? null
    const agencyName = agencySettingsQuery.data?.profile?.agencyName ?? null

    setTemplateId(selectedTemplate.id)
    setPdfTemplateId(selectedTemplate.pdfTemplateId ? String(selectedTemplate.pdfTemplateId) : emptyTemplateValue)
    setValues((current) => ({
      ...current,
      attachmentDocumentCategory: selectedTemplate.attachmentDocumentCategory ?? "",
      attachmentDocumentType: selectedTemplate.attachmentDocumentType ?? "",
      attachmentMode: selectedTemplate.attachmentMode ?? (selectedTemplate.attachPropertyDocuments !== false ? "property" : "none"),
      attachPropertyDocuments: selectedTemplate.attachPropertyDocuments !== false,
      pdfTemplateId: selectedTemplate.pdfTemplateId,
      title: deliveryMode === "email" || deliveryMode === "both"
        ? resolveTemplateTokens(selectedTemplate.subject, lead, agentName, agencyName)
        : selectedTemplate.name,
      message: resolveTemplateTokens(selectedTemplate.body, lead, agentName, agencyName),
      templateId: selectedTemplate.id,
    }))
    setDefaultTemplateApplied(true)
  }, [agencySettingsQuery.data?.leadAutomation?.directTemplateId, agencySettingsQuery.data?.profile?.agencyName, currentUserQuery.data?.fullName, defaultTemplateApplied, deliveryMode, filteredTemplates, lead, mode, open])

  if (!lead || !mode) {
    return null
  }

  const recipientLabel = deliveryMode === "both"
    ? `${lead.email || "No email"} + ${lead.phone || "No phone"}`
    : deliveryMode === "email"
      ? lead.email ?? "No email"
      : lead.phone ?? "No phone"
  const title = deliveryMode === "both" ? "Send Email + SMS" : deliveryMode === "email" ? "Send Email" : deliveryMode === "call" ? "Call Lead" : "Send SMS"
  const selectedDocuments = allDocuments.filter((doc) => selectedDocumentIds.includes(doc.id))
  const selectedTemplate = filteredTemplates.find((template) => template.id === templateId)
  const automaticDocuments = allDocuments.filter((doc) => {
    if (!selectedTemplate) return false
    const attachmentMode = selectedTemplate.attachmentMode ?? (selectedTemplate.attachPropertyDocuments !== false ? "property" : "none")
    if (attachmentMode === "document") {
      const matchesConfig = (!selectedTemplate.attachmentDocumentCategory || doc.category === selectedTemplate.attachmentDocumentCategory)
        && (!selectedTemplate.attachmentDocumentType || doc.documentType === selectedTemplate.attachmentDocumentType)
      if (!matchesConfig) return false
      if (doc.documentType !== "Property") return true
      if (selectedTemplate.attachmentDocumentType && selectedTemplate.attachmentDocumentType !== "Property") return true
      if (lead.propertyId) return doc.propertyId === lead.propertyId
      const property = `${lead.property ?? ""}`.trim().toLowerCase()
      const docProperty = `${doc.propertyTitle || doc.title || ""}`.trim().toLowerCase()
      return Boolean(property && docProperty && property === docProperty)
    }
    if (attachmentMode !== "property") return false
    if (lead.propertyId && doc.propertyId === lead.propertyId) return true
    const property = `${lead.property ?? ""}`.trim().toLowerCase()
    const docProperty = `${doc.propertyTitle || doc.title || ""}`.trim().toLowerCase()
    return Boolean(property && docProperty && (property.includes(docProperty) || docProperty.includes(property)))
  })
  const previewDocuments = [...automaticDocuments, ...selectedDocuments]
    .filter((doc, index, items) => items.findIndex((item) => item.id === doc.id) === index)
  const selectedTemplateLabel = templateId === emptyTemplateValue
    ? "No template"
    : filteredTemplates.find((template) => template.id === templateId)?.name ?? "No template"
  const selectedPdfTemplateLabel = pdfTemplateId === emptyTemplateValue
    ? "No generated PDF"
    : pdfTemplates.find((template) => String(template.id) === pdfTemplateId)?.name ?? "No generated PDF"
  const availableVariables = [
    { token: "{{client_name}}", label: "Client name", value: lead.name ?? "Client" },
    { token: "{{property_address}}", label: "Property", value: lead.property ?? "the property" },
    { token: "{{agent_name}}", label: "Agent", value: (lead.agent || currentUserQuery.data?.fullName || "our agent").trim() },
    { token: "{{agency_name}}", label: "Agency", value: "EstateBlue" },
    { token: "{{showing_time}}", label: "Showing time", value: lead.timeline ?? "the requested time" },
    { token: "{{closing_date}}", label: "Closing date", value: lead.timeline ?? "the scheduled date" },
  ]

  function insertVariable(value: string) {
    setValues((current) => ({
      ...current,
      message: `${current.message}${current.message ? " " : ""}${value}`,
    }))
    setError(null)
  }

  async function handleSubmit() {
    if ((deliveryMode === "email" || deliveryMode === "both") && !lead.email?.trim()) {
      setError("Lead has no email address.")
      return
    }

    if ((deliveryMode === "message" || deliveryMode === "both") && !lead.phone?.trim()) {
      setError("Lead has no phone number.")
      return
    }

    if (deliveryMode !== "message" && values.title.trim().length < 3) {
      setError(deliveryMode === "email" || deliveryMode === "both" ? "Subject must be at least 3 characters." : "Title must be at least 3 characters.")
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
      sequenceType: filteredTemplates.find((template) => template.id === templateId)?.sequenceType,
      pdfTemplateId: pdfTemplateId === emptyTemplateValue ? values.pdfTemplateId : pdfTemplateId,
    }, deliveryMode)

    if (responseError) {
      setError(responseError)
      return
    }

    setTemplateId(emptyTemplateValue)
    setPdfTemplateId(emptyTemplateValue)
    setSelectedDocumentIds([])
    setValues({ attachPropertyDocuments: false, attachmentMode: "none", title: "", message: "", scheduledAt: "" })
    setError(null)
    onOpenChange(false)
  }

  const submitLabel = isSubmitting
    ? values.scheduledAt
      ? "Saving..."
      : "Sending..."
    : values.scheduledAt
      ? deliveryMode === "call"
        ? "Schedule Call"
        : deliveryMode === "email"
          ? "Schedule Email"
          : deliveryMode === "both"
            ? "Schedule Email + SMS"
            : "Schedule SMS"
      : deliveryMode === "call"
        ? "Call Now"
        : title

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="!flex h-[90dvh] max-h-[90dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-white p-0 shadow-[0_30px_90px_rgba(11,28,48,0.28)]">
        <header className="flex items-center justify-between border-b border-[var(--ether-outline-variant)] px-6 py-4">
          <div>
            <DialogTitle className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
              {mode === "call" ? "Call reminder for " : "Update for "}
              <span className="font-semibold text-[var(--ether-primary)]">{lead.name}</span>
            </DialogDescription>
          </div>
          <button
            aria-label="Close outreach dialog"
            className="flex size-9 items-center justify-center rounded-full text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-high)]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <AppIcon name="close" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <section className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6 lg:border-r lg:border-[var(--ether-outline-variant)]">
            {mode !== "call" ? (
              <label className="flex flex-col gap-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Send Via</span>
                <Select
                  modal={false}
                  onValueChange={(nextValue) => {
                    setDeliveryMode((nextValue ?? "both") as LeadOutreachMode)
                    setTemplateId(emptyTemplateValue)
                    setDefaultTemplateApplied(false)
                    setError(null)
                  }}
                  value={deliveryMode}
                >
                  <SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white">
                    <span>{deliveryMode === "both" ? "Email + SMS" : deliveryMode === "email" ? "Email only" : "SMS only"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="both">Email + SMS</SelectItem>
                      <SelectItem value="email">Email only</SelectItem>
                      <SelectItem value="message">SMS only</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{deliveryMode === "both" ? "Recipients" : deliveryMode === "email" ? "To" : deliveryMode === "message" ? "Phone" : "Contact"}</span>
                <div className="relative">
                  <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-on-surface-variant)]" name={deliveryMode === "email" || deliveryMode === "both" ? "alternate_email" : "call"} />
                  <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white pl-10 shadow-none" readOnly value={recipientLabel} />
                </div>
              </label>

              <label className="space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Scheduled For</span>
                <div className="relative">
                  <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-on-surface-variant)]" name="schedule" />
                  <Input
                    className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white pl-10 shadow-none"
                    onChange={(event) => {
                      setValues((current) => ({ ...current, scheduledAt: event.target.value }))
                      setError(null)
                    }}
                    type="datetime-local"
                    value={values.scheduledAt}
                  />
                </div>
              </label>
            </div>

            {deliveryMode !== "call" ? (
              <label className="block space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{deliveryMode === "both" ? "Email + SMS Template" : deliveryMode === "email" ? "Email Template" : "SMS Template"}</span>
                <Select
                  modal={false}
                  onValueChange={(nextValue) => {
                    setTemplateId(nextValue ?? emptyTemplateValue)
                    setDefaultTemplateApplied(true)
                    setError(null)
                    if (!nextValue || nextValue === emptyTemplateValue) {
                      setPdfTemplateId(emptyTemplateValue)
                      setValues((current) => ({
                        ...current,
                        attachPropertyDocuments: false,
                        attachmentDocumentCategory: "",
                        attachmentDocumentType: "",
                        attachmentMode: "none",
                        templateId: undefined,
                        pdfTemplateId: undefined,
                      }))
                      return
                    }
                    const selectedTemplate = filteredTemplates.find((item) => item.id === nextValue)
                    if (!selectedTemplate) return
                    setPdfTemplateId(selectedTemplate.pdfTemplateId ? String(selectedTemplate.pdfTemplateId) : emptyTemplateValue)
                    const agentName = currentUserQuery.data?.fullName ?? null
                    const agencyName = agencySettingsQuery.data?.profile?.agencyName ?? null
                    const nextTitle = deliveryMode === "email" || deliveryMode === "both"
                      ? resolveTemplateTokens(selectedTemplate.subject, lead, agentName, agencyName)
                      : selectedTemplate.name
                    setValues((current) => ({
                      ...current,
                      attachmentDocumentCategory: selectedTemplate.attachmentDocumentCategory ?? "",
                      attachmentDocumentType: selectedTemplate.attachmentDocumentType ?? "",
                      attachmentMode: selectedTemplate.attachmentMode ?? (selectedTemplate.attachPropertyDocuments !== false ? "property" : "none"),
                      attachPropertyDocuments: selectedTemplate.attachPropertyDocuments !== false,
                      pdfTemplateId: selectedTemplate.pdfTemplateId ?? current.pdfTemplateId,
                      title: nextTitle,
                      message: resolveTemplateTokens(selectedTemplate.body, lead, agentName, agencyName),
                      templateId: selectedTemplate.id,
                    }))
                  }}
                  value={templateId}
                >
                  <SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white">
                    <span className="truncate">{selectedTemplateLabel}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptyTemplateValue}>No template</SelectItem>
                    {filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {`${template.name} - ${template.sequenceType ?? "Direct"} (${template.gapDays ?? 0}d)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}

            {deliveryMode !== "call" ? (
              <div className="flex rounded-lg bg-[var(--ether-surface-container-low)] p-1" aria-label="Message view">
                {(["preview", "edit"] as const).map((view) => (
                  <button
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${composerView === view ? "bg-white text-[var(--ether-primary)] shadow-sm" : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]"}`}
                    key={view}
                    onClick={() => setComposerView(view)}
                    type="button"
                  >
                    {view === "preview" ? "Preview" : "Edit message"}
                  </button>
                ))}
              </div>
            ) : null}

            {deliveryMode !== "call" && composerView === "preview" ? (
              <section className="space-y-4 rounded-xl border border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] p-5" aria-label="Resolved message preview">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Ready-to-send preview</p>
                    <p className="mt-1 text-xs text-[var(--ether-outline)]">Template variables replaced for {lead.name}.</p>
                  </div>
                  <span className="rounded-full bg-[var(--ether-primary-fixed)] px-2.5 py-1 text-[10px] font-bold text-[var(--ether-primary)]">{selectedTemplateLabel}</span>
                </div>
                {deliveryMode !== "message" ? (
                  <div className="rounded-lg bg-white p-4">
                    <p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">Subject</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ether-on-surface)]">{values.title || "No subject yet"}</p>
                  </div>
                ) : null}
                <div className="min-h-48 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-6 text-[var(--ether-on-surface)]">
                  {values.message || "No message yet. Choose a template or edit message."}
                </div>
              </section>
            ) : null}

            {composerView === "edit" && deliveryMode !== "message" ? (
              <label className="block space-y-2">
                <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{deliveryMode === "email" || deliveryMode === "both" ? "Subject Line" : "Call Title"}</span>
                <Input
                  className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white shadow-none"
                  onChange={(event) => {
                    setValues((current) => ({ ...current, title: event.target.value }))
                    setError(null)
                  }}
                  placeholder={deliveryMode === "email" || deliveryMode === "both" ? "e.g. Weekly property performance update" : "Call follow-up title"}
                  value={values.title}
                />
              </label>
            ) : null}

            {composerView === "edit" && deliveryMode !== "call" ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Fillable Variables</span>
                  <span className="text-[10px] text-[var(--ether-outline)]">Click to insert</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableVariables.map((variable) => (
                    <button
                      className="rounded-full bg-[var(--ether-primary-fixed)] px-3 py-1.5 text-[10px] font-bold text-[var(--ether-primary)] transition hover:bg-[var(--ether-primary-fixed-dim)]"
                      key={variable.token}
                      onClick={() => insertVariable(variable.value)}
                      title={`${variable.token} ? ${variable.value}`}
                      type="button"
                    >
                      {variable.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {composerView === "edit" || deliveryMode === "call" ? <label className="block space-y-2">
              <span className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{deliveryMode === "call" ? "Call Notes" : "Message"}</span>
              <div className="overflow-hidden rounded-lg border border-[var(--ether-outline-variant)] bg-white">
                {deliveryMode !== "call" ? (
                  <div className="flex items-center gap-1 border-b border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-2 py-2 text-[var(--ether-on-surface-variant)]">
                    {['format_bold','format_italic','format_list_bulleted','link'].map((icon) => (
                      <button className="flex size-8 items-center justify-center rounded transition hover:bg-white hover:text-[var(--ether-primary)]" key={icon} type="button"><AppIcon name={icon} /></button>
                    ))}
                    <button className="ml-auto flex size-8 items-center justify-center rounded transition hover:bg-white hover:text-[var(--ether-primary)]" type="button"><AppIcon name="image" /></button>
                  </div>
                ) : null}
                <Textarea
                  className="min-h-64 resize-none rounded-none border-0 p-4 shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setValues((current) => ({ ...current, message: event.target.value }))
                    setError(null)
                  }}
                  placeholder={deliveryMode === "call" ? "What should the reminder call say?" : `Write the ${deliveryMode === "both" ? "email and SMS" : deliveryMode === "message" ? "SMS" : deliveryMode} message here...`}
                  value={values.message}
                />
              </div>
            </label> : null}

            {error ? <p className="rounded-lg bg-[var(--ether-error-container)] px-4 py-3 text-sm font-semibold text-[var(--ether-error)]">{error}</p> : null}
          </section>

          {deliveryMode !== "call" ? (
            <aside className="flex min-h-0 w-full flex-col bg-[color-mix(in_srgb,var(--ether-surface-container-low)_45%,white)] p-4 lg:w-[340px]">
              <div className="flex items-center justify-between">
                <h3 className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Attachments</h3>
                <span className="rounded-full bg-[var(--ether-primary-fixed)] px-2 py-1 text-[10px] font-bold text-[var(--ether-primary)]">{allDocuments.length} available</span>
              </div>

              <div className="mt-4 grid gap-3">
                <Select
                  modal={false}
                  onValueChange={(nextValue) => {
                    const category = nextValue ?? "all"
                    setDocumentCategory(category)
                  }}
                  value={documentCategory}
                >
                  <SelectTrigger className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white">
                    <span className="truncate">{documentCategory === "all" ? "All categories" : documentCategory}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {documentCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
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
                      <input
                        checked={selected}
                        className="mt-1 size-4 rounded border-[var(--ether-outline-variant)] text-[var(--ether-primary)] focus:ring-[var(--ether-primary)]"
                        onChange={(event) => setSelectedDocumentIds((current) => event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id))}
                        type="checkbox"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="rounded bg-[var(--ether-secondary-container)]/45 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--ether-secondary)]">{doc.category}</span>
                          <span className="truncate text-[9px] text-[var(--ether-outline)]">{doc.documentType}</span>
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-[var(--ether-on-surface)]">{doc.title}</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 space-y-3">
                <Select modal={false} onValueChange={(nextValue) => {
                  const value = nextValue ?? emptyTemplateValue
                  setPdfTemplateId(value)
                  setValues((current) => ({ ...current, pdfTemplateId: value === emptyTemplateValue ? undefined : value }))
                  setError(null)
                }} value={pdfTemplateId}>
                  <SelectTrigger className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-white"><span className="truncate">{selectedPdfTemplateLabel}</span></SelectTrigger>
                  <SelectContent>
                    <Input className="mb-2 h-8" onChange={(event) => setPdfSearch(event.target.value)} placeholder="Search PDF template" value={pdfSearch} />
                    <SelectItem value={emptyTemplateValue}>No generated PDF</SelectItem>
                    {pdfTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{`${template.name} - ${template.category}`}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="rounded-lg border border-[var(--ether-outline-variant)] bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--ether-on-surface)]">Will attach</p>
                    <span className="text-[10px] text-[var(--ether-outline)]">{previewDocuments.length + (pdfTemplateId !== emptyTemplateValue ? 1 : 0)} item(s)</span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs text-[var(--ether-on-surface-variant)]">
                    {previewDocuments.map((doc) => <p className="truncate" key={doc.id}>• {doc.title}</p>)}
                    {pdfTemplateId !== emptyTemplateValue ? <p className="truncate">• Generated PDF: {selectedPdfTemplateLabel}</p> : null}
                    {previewDocuments.length === 0 && pdfTemplateId === emptyTemplateValue ? <p>No attachments selected.</p> : null}
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        <footer className="flex flex-col gap-3 border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--ether-on-surface-variant)]">
            <span className="flex size-7 items-center justify-center rounded-md bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"><AppIcon name="description" /></span>
            <span>{previewDocuments.length + (pdfTemplateId !== emptyTemplateValue ? 1 : 0)} attachment{previewDocuments.length + (pdfTemplateId !== emptyTemplateValue ? 1 : 0) === 1 ? "" : "s"} ready</span>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button className="rounded-lg px-5 py-2 text-sm font-semibold text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-high)]" onClick={() => onOpenChange(false)} type="button">Cancel</button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--ether-primary)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(67,67,213,0.28)] transition hover:bg-[var(--ether-primary-container)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void handleSubmit()}
              type="button"
            >
              <AppIcon name={deliveryMode === "call" ? "call" : "send"} />
              {submitLabel}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
