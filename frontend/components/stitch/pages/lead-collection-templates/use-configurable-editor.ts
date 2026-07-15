"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import PostalMime from "postal-mime"

import type {
  LeadCollectionFieldMapping,
  LeadCollectionParseResult,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"
import {
  useCreateLeadCollectionTemplate,
  useLeadCollectionFields,
  useLeadCollectionTemplate,
  usePrepareLeadCollectionSource,
  useTestLeadCollectionTemplate,
  useUpdateLeadCollectionTemplate,
} from "@/hooks/use-lead-collection-templates"
import { useMailInbox } from "@/hooks/use-real-estate-api"
import {
  applyZillowTemplatePreset,
  emptyLeadTemplate,
  htmlToVisibleTemplateText,
  MappingSource,
  mergeMapping,
  SelectedTemplateValue,
} from "./editor-utils"

const blankSelection: SelectedTemplateValue = {
  start: 0,
  end: 0,
  text: "",
  source: "email",
}

export function useConfigurableTemplateEditor({
  templateId,
  initialMailInboxId,
  initialPreset,
}: {
  templateId?: number
  initialMailInboxId?: number
  initialPreset?: string
}) {
  const router = useRouter()
  const templateQuery = useLeadCollectionTemplate(templateId)
  const fieldsQuery = useLeadCollectionFields()
  const inboxQuery = useMailInbox({ page: 1, pageSize: 200 })
  const prepareMutation = usePrepareLeadCollectionSource()
  const testMutation = useTestLeadCollectionTemplate()
  const createMutation = useCreateLeadCollectionTemplate()
  const updateMutation = useUpdateLeadCollectionTemplate()

  const [template, setTemplate] = useState<LeadCollectionTemplateSaveInput>(() => {
    const empty = emptyLeadTemplate(initialMailInboxId)
    return initialPreset?.toLowerCase() === "zillow"
      ? applyZillowTemplatePreset(empty)
      : empty
  })
  const [pastedHtml, setPastedHtml] = useState("")
  const [pastedText, setPastedText] = useState("")
  const [mappingSource, setMappingSourceState] = useState<MappingSource>("email")
  const [selectedField, setSelectedField] = useState("")
  const [selection, setSelection] = useState<SelectedTemplateValue>(blankSelection)
  const [testResult, setTestResult] = useState<LeadCollectionParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fields = useMemo(
    () => (fieldsQuery.data ?? []).filter((field) => field.writable),
    [fieldsQuery.data],
  )

  useEffect(() => {
    if (!templateQuery.data) return
    const item = templateQuery.data
    setTemplate({
      id: item.id,
      name: item.name,
      providerName: item.providerName,
      description: item.description,
      sourceType: item.sourceType,
      sourceMailInboxId: item.sourceMailInboxId,
      sampleFromAddress: item.sampleFromAddress,
      sampleSubject: item.sampleSubject,
      senderPatterns: item.senderPatterns,
      mailboxTags: item.mailboxTags ?? [],
      subjectPattern: item.subjectPattern,
      subjectMatchMode: item.subjectMatchMode,
      bodyFingerprint: item.bodyFingerprint,
      sourceHtml: item.sourceHtml,
      sourceText: item.sourceText,
      linkedPageConfig: item.linkedPageConfig ?? emptyLeadTemplate().linkedPageConfig,
      linkedPageSampleUrl: item.linkedPageSampleUrl ?? "",
      linkedPageSourceHtml: item.linkedPageSourceHtml ?? "",
      linkedPageSourceText: item.linkedPageSourceText ?? "",
      mappings: item.mappings,
      requiredFields: item.requiredFields,
      confidenceThreshold: item.confidenceThreshold,
      isActive: item.isActive,
    })
    setPastedHtml(item.sourceHtml)
    setPastedText(item.sourceText)
  }, [templateQuery.data])

  async function prepareSample() {
    setError(null)
    setTestResult(null)
    const response = await prepareMutation.mutateAsync({
      sourceType: template.sourceType,
      sourceMailInboxId:
        template.sourceType === "InboxEmail" ? template.sourceMailInboxId : null,
      sourceHtml:
        template.sourceType === "PastedHtml" || template.sourceType === "UploadedHtml"
          ? pastedHtml
          : "",
      sourceText:
        template.sourceType === "PastedText" ||
        (template.sourceType === "UploadedHtml" && !pastedHtml)
          ? pastedText
          : "",
      sampleFromAddress: template.sampleFromAddress,
      sampleSubject: template.sampleSubject,
      linkedPageConfig: template.linkedPageConfig,
    })
    if (response.error || !response.data) {
      setError(response.error?.message ?? "Unable to prepare this sample.")
      return
    }
    const prepared = response.data
    setTemplate((current) => ({
      ...current,
      sourceType: prepared.sourceType,
      sourceMailInboxId: prepared.sourceMailInboxId,
      sourceHtml: prepared.sourceHtml,
      sourceText: prepared.sourceText,
      sampleFromAddress: prepared.sampleFromAddress,
      sampleSubject: prepared.sampleSubject,
      senderPatterns: prepared.senderPatterns,
      subjectPattern: prepared.subjectPattern,
      subjectMatchMode: prepared.subjectMatchMode,
      bodyFingerprint: prepared.bodyFingerprint,
      linkedPageConfig: prepared.linkedPageConfig,
      linkedPageSampleUrl: prepared.linkedPageSampleUrl,
      linkedPageSourceHtml: prepared.linkedPageSourceHtml,
      linkedPageSourceText: prepared.linkedPageSourceText,
      mappings: [],
      requiredFields: [],
    }))
    setMappingSource(prepared.linkedPageSourceText ? "linked" : "email")
  }

  async function readUploadedFile(file?: File) {
    if (!file) return
    setError(null)
    const content = await file.text()
    const isEmail =
      /\.eml$/i.test(file.name) ||
      /^from:|^subject:|content-type:/im.test(content.slice(0, 2000))
    const parsed = isEmail
      ? await PostalMime.parse(content, { attachmentEncoding: "base64" })
      : null
    const html = parsed?.html ?? content
    const isHtml =
      Boolean(parsed?.html) ||
      /\.html?$/i.test(file.name) ||
      /<\s*(html|body|table|div|p)\b/i.test(content)
    const from = parsed?.from && "address" in parsed.from ? parsed.from.address : ""
    setTemplate((current) => ({
      ...current,
      sourceType: "UploadedHtml",
      sourceMailInboxId: null,
      sampleFromAddress: current.sampleFromAddress || from || "",
      sampleSubject:
        current.sampleSubject || parsed?.subject || file.name.replace(/\.[^.]+$/, ""),
    }))
    setPastedHtml(isHtml ? html : "")
    setPastedText(isHtml ? "" : parsed?.text || htmlToVisibleTemplateText(html))
  }

  function setMappingSource(source: MappingSource) {
    setMappingSourceState(source)
    setSelection({ ...blankSelection, source })
  }

  function addMapping() {
    const field = fields.find((item) => item.field === selectedField)
    if (!field || !selection.text) {
      setError("Choose a value and a Lead field first.")
      return
    }
    const mapping: Partial<LeadCollectionFieldMapping> = {
      field: field.field,
      label: field.label,
      source: selection.source === "linked" ? "LinkedPage" : "EmailBody",
      sampleValue: selection.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      prefix: selection.label ? `${selection.label}:` : "",
      suffix: "",
      occurrence: 0,
      required: field.requiredByDefault,
      transform: field.suggestedTransform,
    }
    setTemplate((current) => mergeMapping(current, mapping, field.requiredByDefault))
    setSelectedField("")
    setSelection({ ...blankSelection, source: mappingSource })
    setError(null)
  }

  function patchMapping(index: number, patch: Partial<LeadCollectionFieldMapping>) {
    setTemplate((current) => {
      const mappings = [...current.mappings]
      if (!mappings[index]) return current
      mappings[index] = { ...mappings[index], ...patch }
      const field = `${mappings[index].field ?? ""}`
      const requiredFields = patch.required === true
        ? [...new Set([...current.requiredFields, field])]
        : patch.required === false
          ? current.requiredFields.filter((item) => item !== field)
          : current.requiredFields
      return { ...current, mappings, requiredFields }
    })
  }

  function removeMapping(index: number) {
    setTemplate((current) => {
      const field = `${current.mappings[index]?.field ?? ""}`
      return {
        ...current,
        mappings: current.mappings.filter((_item, itemIndex) => itemIndex !== index),
        requiredFields: current.requiredFields.filter((item) => item !== field),
      }
    })
  }

  async function testTemplate() {
    setError(null)
    const response = await testMutation.mutateAsync(template)
    if (response.error || !response.data) {
      setError(response.error?.message ?? "Unable to test this template.")
      return
    }
    setTestResult(response.data)
  }

  async function saveTemplate() {
    setError(null)
    if (!template.sourceText.trim()) return setError("Prepare a sample email before saving.")
    if (template.linkedPageConfig.enabled && !template.linkedPageSourceText.trim()) {
      return setError(
        "Linked-page mode is enabled, but no detail page was loaded. Check the host and filters, then prepare again.",
      )
    }
    if (!template.mappings.length) return setError("Map at least one value to a Lead field.")
    const response = template.id
      ? await updateMutation.mutateAsync(template)
      : await createMutation.mutateAsync(template)
    if (response.error) return setError(response.error.message)
    router.push("/dashboard/lead-collection-templates")
  }

  return {
    template,
    setTemplate,
    pastedHtml,
    setPastedHtml,
    pastedText,
    setPastedText,
    mappingSource,
    setMappingSource,
    selectedField,
    setSelectedField,
    selection,
    setSelection,
    testResult,
    error,
    fields,
    inboxItems: inboxQuery.data?.items ?? [],
    preparing: prepareMutation.isPending,
    testing: testMutation.isPending,
    saving: createMutation.isPending || updateMutation.isPending,
    prepareSample,
    readUploadedFile,
    addMapping,
    patchMapping,
    removeMapping,
    testTemplate,
    saveTemplate,
  }
}
