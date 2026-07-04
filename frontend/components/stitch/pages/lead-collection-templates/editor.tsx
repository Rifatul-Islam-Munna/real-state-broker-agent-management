"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import type {
  LeadCollectionFieldMapping,
  LeadCollectionFieldTransform,
  LeadCollectionParseResult,
  LeadCollectionTemplateSaveInput,
  LeadCollectionTemplateSourceType,
} from "@/@types/lead-collection-template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateLeadCollectionTemplate,
  useLeadCollectionFields,
  useLeadCollectionTemplate,
  usePrepareLeadCollectionSource,
  useTestLeadCollectionTemplate,
  useUpdateLeadCollectionTemplate,
} from "@/hooks/use-lead-collection-templates"
import { useMailInbox } from "@/hooks/use-real-estate-api"

const transforms: LeadCollectionFieldTransform[] = ["Text", "Email", "Phone", "Number", "Date"]

function initialValue(mailInboxId?: number): LeadCollectionTemplateSaveInput {
  return {
    name: "Untitled lead email template",
    providerName: "",
    description: "",
    sourceType: mailInboxId ? "InboxEmail" : "PastedText",
    sourceMailInboxId: mailInboxId ?? null,
    sampleFromAddress: "",
    sampleSubject: "",
    senderPatterns: [],
    subjectPattern: "",
    subjectMatchMode: "Contains",
    bodyFingerprint: [],
    sourceHtml: "",
    sourceText: "",
    mappings: [],
    requiredFields: [],
    confidenceThreshold: 0.82,
    isActive: true,
  }
}

export function LeadCollectionTemplateEditor({
  templateId,
  initialMailInboxId,
}: {
  templateId?: number
  initialMailInboxId?: number
}) {
  const router = useRouter()
  const sourceTextRef = useRef<HTMLTextAreaElement | null>(null)
  const templateQuery = useLeadCollectionTemplate(templateId)
  const fieldsQuery = useLeadCollectionFields()
  const inboxQuery = useMailInbox({ page: 1, pageSize: 200 })
  const prepareMutation = usePrepareLeadCollectionSource()
  const testMutation = useTestLeadCollectionTemplate()
  const createMutation = useCreateLeadCollectionTemplate()
  const updateMutation = useUpdateLeadCollectionTemplate()

  const [value, setValue] = useState<LeadCollectionTemplateSaveInput>(() => initialValue(initialMailInboxId))
  const [pastedHtml, setPastedHtml] = useState("")
  const [pastedText, setPastedText] = useState("")
  const [selectedField, setSelectedField] = useState("")
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" })
  const [testResult, setTestResult] = useState<LeadCollectionParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateQuery.data) return
    const template = templateQuery.data
    setValue({
      id: template.id,
      name: template.name,
      providerName: template.providerName,
      description: template.description,
      sourceType: template.sourceType,
      sourceMailInboxId: template.sourceMailInboxId,
      sampleFromAddress: template.sampleFromAddress,
      sampleSubject: template.sampleSubject,
      senderPatterns: template.senderPatterns,
      subjectPattern: template.subjectPattern,
      subjectMatchMode: template.subjectMatchMode,
      bodyFingerprint: template.bodyFingerprint,
      sourceHtml: template.sourceHtml,
      sourceText: template.sourceText,
      mappings: template.mappings,
      requiredFields: template.requiredFields,
      confidenceThreshold: template.confidenceThreshold,
      isActive: template.isActive,
    })
    setPastedHtml(template.sourceHtml)
    setPastedText(template.sourceText)
  }, [templateQuery.data])

  const fields = useMemo(
    () => (fieldsQuery.data ?? []).filter((field) => field.writable),
    [fieldsQuery.data],
  )
  const selectedFieldDefinition = fields.find((field) => field.field === selectedField)
  const inboxItems = inboxQuery.data?.items ?? []
  const preparing = prepareMutation.isPending
  const saving = createMutation.isPending || updateMutation.isPending

  async function prepareSource() {
    setError(null)
    setTestResult(null)
    const payload: Record<string, unknown> = {
      sourceType: value.sourceType,
      sourceMailInboxId: value.sourceType === "InboxEmail" ? value.sourceMailInboxId : null,
      sourceHtml:
        value.sourceType === "PastedHtml" || value.sourceType === "UploadedHtml" ? pastedHtml : "",
      sourceText:
        value.sourceType === "PastedText" || (value.sourceType === "UploadedHtml" && !pastedHtml)
          ? pastedText
          : "",
      sampleFromAddress: value.sampleFromAddress,
      sampleSubject: value.sampleSubject,
    }
    const result = await prepareMutation.mutateAsync(payload)
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to prepare this email sample.")
      return
    }
    const prepared = result.data
    setValue((current) => ({
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
      mappings: [],
      requiredFields: [],
    }))
    setSelection({ start: 0, end: 0, text: "" })
  }

  async function readUploadedFile(file?: File) {
    if (!file) return
    setError(null)
    const content = await file.text()
    const isHtml = /\.html?$/i.test(file.name) || /<\s*(html|body|table|div|p)\b/i.test(content)
    setValue((current) => ({
      ...current,
      sourceType: "UploadedHtml",
      sourceMailInboxId: null,
      sourceHtml: isHtml ? content : "",
      sourceText: isHtml ? "" : content,
      sampleSubject: current.sampleSubject || file.name.replace(/\.[^.]+$/, ""),
    }))
    setPastedHtml(isHtml ? content : "")
    setPastedText(isHtml ? "" : content)
  }

  function captureSelection() {
    const element = sourceTextRef.current
    if (!element) return
    let start = element.selectionStart
    let end = element.selectionEnd
    while (start < end && /\s/.test(value.sourceText[start] ?? "")) start += 1
    while (end > start && /\s/.test(value.sourceText[end - 1] ?? "")) end -= 1
    setSelection({ start, end, text: value.sourceText.slice(start, end) })
  }

  function addMapping() {
    if (!selectedFieldDefinition || !selection.text.trim()) {
      setError("Select an exact value in the prepared email, then choose a Lead field.")
      return
    }
    setError(null)
    const mapping: Partial<LeadCollectionFieldMapping> = {
      field: selectedFieldDefinition.field,
      label: selectedFieldDefinition.label,
      sampleValue: selection.text,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      prefix: "",
      suffix: "",
      occurrence: 0,
      required: selectedFieldDefinition.requiredByDefault,
      transform: selectedFieldDefinition.suggestedTransform,
    }
    setValue((current) => {
      const mappings = current.mappings.filter((item) => item.field !== selectedFieldDefinition.field)
      const nextMappings = [...mappings, mapping]
      return {
        ...current,
        mappings: nextMappings,
        requiredFields: selectedFieldDefinition.requiredByDefault
          ? [...new Set([...current.requiredFields, selectedFieldDefinition.field])]
          : current.requiredFields,
      }
    })
    setSelectedField("")
    setSelection({ start: 0, end: 0, text: "" })
  }

  function updateMapping(index: number, patch: Partial<LeadCollectionFieldMapping>) {
    setValue((current) => {
      const mappings = [...current.mappings]
      const currentMapping = mappings[index]
      if (!currentMapping) return current
      mappings[index] = { ...currentMapping, ...patch }
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
    setValue((current) => {
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
    const result = await testMutation.mutateAsync(value)
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to test this template.")
      return
    }
    setTestResult(result.data)
  }

  async function saveTemplate() {
    setError(null)
    if (!value.sourceText.trim()) {
      setError("Prepare the sample email before saving the template.")
      return
    }
    if (!value.mappings.length) {
      setError("Map at least one selected value to a Lead field.")
      return
    }
    const result = value.id
      ? await updateMutation.mutateAsync(value)
      : await createMutation.mutateAsync(value)
    if (result.error) {
      setError(result.error.message)
      return
    }
    router.push("/dashboard/lead-collection-templates")
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AppIcon name="document_scanner" />
            <h1 className="text-2xl font-black tracking-tight">
              {templateId ? "Edit lead collection template" : "Create lead collection template"}
            </h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Choose a representative email, highlight each changing value, and map it to the Lead entity. Matching emails skip AI when confidence is sufficient.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!value.sourceText || testMutation.isPending} onClick={() => void testTemplate()} variant="outline">
            <AppIcon name="science" />
            Test template
          </Button>
          <Button disabled={saving} onClick={() => void saveTemplate()}>
            <AppIcon name="save" />
            Save template
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Template settings</CardTitle><CardDescription>Identify the provider and control matching confidence.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Input onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} placeholder="Template name" value={value.name} />
              <Input onChange={(event) => setValue((current) => ({ ...current, providerName: event.target.value }))} placeholder="Provider, e.g. Zillow" value={value.providerName} />
              <Textarea onChange={(event) => setValue((current) => ({ ...current, description: event.target.value }))} placeholder="Description" value={value.description} />
              <label className="space-y-2 text-sm font-medium">
                <span>Minimum confidence: {Math.round(value.confidenceThreshold * 100)}%</span>
                <input
                  className="w-full"
                  max="0.99"
                  min="0.5"
                  onChange={(event) => setValue((current) => ({ ...current, confidenceThreshold: Number(event.target.value) }))}
                  step="0.01"
                  type="range"
                  value={value.confidenceThreshold}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input checked={value.isActive} onChange={(event) => setValue((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />
                Use this template during inbox sync
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sample source</CardTitle><CardDescription>Use an inbox message, pasted content, or uploaded HTML/text.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <Select
                modal={false}
                onValueChange={(sourceType) => setValue((current) => ({
                  ...current,
                  sourceType: sourceType as LeadCollectionTemplateSourceType,
                  sourceMailInboxId: sourceType === "InboxEmail" ? current.sourceMailInboxId : null,
                }))}
                value={value.sourceType}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="InboxEmail">Existing inbox email</SelectItem>
                  <SelectItem value="PastedText">Paste rendered email text</SelectItem>
                  <SelectItem value="PastedHtml">Paste email HTML</SelectItem>
                  <SelectItem value="UploadedHtml">Upload HTML or text file</SelectItem>
                </SelectContent>
              </Select>

              {value.sourceType === "InboxEmail" ? (
                <Select
                  modal={false}
                  onValueChange={(mailId) => setValue((current) => ({ ...current, sourceMailInboxId: Number(mailId) }))}
                  value={value.sourceMailInboxId ? String(value.sourceMailInboxId) : ""}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose inbox email" /></SelectTrigger>
                  <SelectContent>
                    {inboxItems.map((mail) => <SelectItem key={mail.id} value={String(mail.id)}>{mail.subject || mail.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}

              {value.sourceType === "PastedText" ? (
                <Textarea className="min-h-56 font-mono text-xs" onChange={(event) => setPastedText(event.target.value)} placeholder="Paste the visible email text" value={pastedText} />
              ) : null}

              {value.sourceType === "PastedHtml" ? (
                <Textarea className="min-h-56 font-mono text-xs" onChange={(event) => setPastedHtml(event.target.value)} placeholder="Paste the complete email HTML" value={pastedHtml} />
              ) : null}

              {value.sourceType === "UploadedHtml" ? (
                <Input accept=".html,.htm,.txt,.eml,text/html,text/plain,message/rfc822" onChange={(event) => void readUploadedFile(event.target.files?.[0])} type="file" />
              ) : null}

              {value.sourceType !== "InboxEmail" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input onChange={(event) => setValue((current) => ({ ...current, sampleFromAddress: event.target.value }))} placeholder="Sample sender email" value={value.sampleFromAddress} />
                  <Input onChange={(event) => setValue((current) => ({ ...current, sampleSubject: event.target.value }))} placeholder="Sample subject" value={value.sampleSubject} />
                </div>
              ) : null}

              <Button disabled={preparing} onClick={() => void prepareSource()} variant="outline">
                <AppIcon name="auto_fix_high" />
                Prepare sample
              </Button>
            </CardContent>
          </Card>

          {value.sourceText ? (
            <Card>
              <CardHeader><CardTitle>Matching rules</CardTitle><CardDescription>These defaults are inferred from the sample and remain editable.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Input
                  onChange={(event) => setValue((current) => ({ ...current, senderPatterns: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="Sender patterns"
                  value={value.senderPatterns.join(", ")}
                />
                <Select modal={false} onValueChange={(subjectMatchMode) => setValue((current) => ({ ...current, subjectMatchMode: subjectMatchMode as LeadCollectionTemplateSaveInput["subjectMatchMode"] }))} value={value.subjectMatchMode}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Contains">Subject contains</SelectItem><SelectItem value="Exact">Exact subject</SelectItem><SelectItem value="Regex">Subject regular expression</SelectItem></SelectContent>
                </Select>
                <Input onChange={(event) => setValue((current) => ({ ...current, subjectPattern: event.target.value }))} placeholder="Subject pattern" value={value.subjectPattern} />
                <p className="text-xs text-muted-foreground">{value.bodyFingerprint.length} static body fingerprints will also be checked.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select and map values</CardTitle>
              <CardDescription>Highlight the exact changing value—not its label—then assign it to a Lead field.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {value.sourceText ? (
                <>
                  <Textarea
                    className="min-h-[460px] whitespace-pre-wrap font-mono text-sm leading-6"
                    onKeyUp={captureSelection}
                    onMouseUp={captureSelection}
                    readOnly
                    ref={sourceTextRef}
                    value={value.sourceText}
                  />
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current selection</p>
                    <p className="mt-2 break-words text-sm">{selection.text || "Highlight a value in the email above."}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select modal={false} onValueChange={setSelectedField} value={selectedField}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Choose Lead field" /></SelectTrigger>
                      <SelectContent>{fields.map((field) => <SelectItem key={field.field} value={field.field}>{field.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button disabled={!selection.text || !selectedField} onClick={addMapping}>Map selected value</Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Prepare a source email to begin mapping.</div>
              )}
            </CardContent>
          </Card>

          {value.mappings.length ? (
            <Card>
              <CardHeader><CardTitle>Mapped Lead fields</CardTitle><CardDescription>{value.mappings.length} values will be extracted without AI.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {value.mappings.map((mapping, index) => (
                  <div className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-center" key={`${mapping.field}-${index}`}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><strong>{mapping.label || mapping.field}</strong>{mapping.required ? <Badge>Required</Badge> : <Badge variant="outline">Optional</Badge>}</div>
                      <code className="mt-1 block text-xs text-muted-foreground">{mapping.field}</code>
                      <p className="mt-2 break-words text-sm">{mapping.sampleValue}</p>
                    </div>
                    <div className="space-y-2">
                      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" onChange={(event) => updateMapping(index, { transform: event.target.value as LeadCollectionFieldTransform })} value={mapping.transform || "Text"}>
                        {transforms.map((transform) => <option key={transform} value={transform}>{transform}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-xs font-medium"><input checked={mapping.required === true} onChange={(event) => updateMapping(index, { required: event.target.checked })} type="checkbox" />Required</label>
                    </div>
                    <Button onClick={() => removeMapping(index)} size="sm" variant="ghost">Remove</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {testResult ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><CardTitle>Parser test</CardTitle><CardDescription>Exactly what the inbox sync would extract before considering AI.</CardDescription></div>
                  <Badge variant={testResult.confidence >= testResult.threshold && testResult.missingRequiredFields.length === 0 ? "default" : "destructive"}>{Math.round(testResult.confidence * 100)}% confidence</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(testResult.values).map(([field, fieldValue]) => <div className="rounded-lg border p-3" key={field}><code className="text-xs text-muted-foreground">{field}</code><p className="mt-1 break-words text-sm font-medium">{fieldValue || "—"}</p></div>)}
                </div>
                {testResult.missingRequiredFields.length ? <Alert variant="destructive"><AlertDescription>Missing required: {testResult.missingRequiredFields.join(", ")}. This email would continue to the fallback or AI stage.</AlertDescription></Alert> : <Alert><AlertDescription>Template confidence is sufficient. AI would be skipped for this email.</AlertDescription></Alert>}
                <details className="text-sm"><summary className="cursor-pointer font-medium">Diagnostics</summary><ul className="mt-2 space-y-1 text-muted-foreground">{testResult.diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}</ul></details>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
