"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import type { DocumentAccessLevel, DocumentRepositoryItem, DocumentRepositorySaveInput } from "@/@types/real-estate-api"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateDocumentRepositoryItem,
  useDeleteDocumentRepositoryItem,
  useDocumentRepository,
  useDocumentRepositorySummary,
  useUpdateDocumentRepositoryItem,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"

const PAGE_SIZE = 10
const accessOptions: DocumentAccessLevel[] = ["AdminOnly", "AgentAccess", "Public"]
const defaultCategories = ["General", "Contracts", "Agreements", "Floor Plans", "Legal", "Marketing", "Templates"]

type TemplateFilter = "all" | "template" | "standard"
type ModalState = { mode: "create" } | { mode: "edit"; document: DocumentRepositoryItem } | null
type FormValues = {
  accessLevel: DocumentAccessLevel
  category: string
  description: string
  fileName: string
  fileObjectName: string
  fileUrl: string
  folder: string
  isTemplate: boolean
  mimeType: string
  requiresSignature: boolean
  sizeBytes: number
  tags: string
  title: string
  versionLabel: string
}
type FormErrors = Partial<Record<keyof FormValues | "form", string>>

function emptyForm(): FormValues {
  return {
    accessLevel: "AdminOnly",
    category: "General",
    description: "",
    fileName: "",
    fileObjectName: "",
    fileUrl: "",
    folder: "Repository",
    isTemplate: false,
    mimeType: "",
    requiresSignature: false,
    sizeBytes: 0,
    tags: "",
    title: "",
    versionLabel: "v1.0",
  }
}

function toFormValues(document: DocumentRepositoryItem): FormValues {
  return {
    accessLevel: document.accessLevel ?? "AdminOnly",
    category: document.category ?? "General",
    description: document.description ?? "",
    fileName: document.fileName ?? "",
    fileObjectName: document.fileObjectName ?? "",
    fileUrl: document.fileUrl ?? "",
    folder: document.folder ?? "Repository",
    isTemplate: document.isTemplate ?? false,
    mimeType: document.mimeType ?? "",
    requiresSignature: document.requiresSignature ?? false,
    sizeBytes: document.sizeBytes ?? 0,
    tags: (document.tags ?? []).join("\n"),
    title: document.title ?? "",
    versionLabel: document.versionLabel ?? "v1.0",
  }
}

function splitTags(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function validate(values: FormValues) {
  const errors: FormErrors = {}

  if (values.title.trim().length === 0) {
    errors.title = "Title is required."
  }

  if (values.fileUrl.trim().length === 0 || values.fileName.trim().length === 0) {
    errors.fileUrl = "Upload a document before saving."
  }

  return errors
}

function toPayload(values: FormValues): DocumentRepositorySaveInput {
  return {
    accessLevel: values.accessLevel,
    category: values.category.trim() || "General",
    description: values.description.trim(),
    fileName: values.fileName.trim(),
    fileObjectName: values.fileObjectName.trim() || null,
    fileUrl: values.fileUrl.trim(),
    folder: values.folder.trim() || "Repository",
    isTemplate: values.isTemplate,
    mimeType: values.mimeType.trim(),
    requiresSignature: values.requiresSignature,
    sizeBytes: values.sizeBytes,
    tags: splitTags(values.tags),
    title: values.title.trim(),
    versionLabel: values.versionLabel.trim() || "v1.0",
  }
}

function formatAccessLabel(value: DocumentAccessLevel) {
  return value === "AdminOnly" ? "Admin Only" : value === "AgentAccess" ? "Agent Access" : "Public"
}

function accessBadgeClass(value: DocumentAccessLevel) {
  if (value === "AdminOnly") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (value === "AgentAccess") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  let value = sizeBytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}

function fileIconName(mimeType: string) {
  if (mimeType.includes("pdf")) {
    return "picture_as_pdf"
  }

  if (mimeType.includes("word")) {
    return "article"
  }

  if (mimeType.startsWith("image/")) {
    return "imagesmode"
  }

  return "description"
}

type EditorProps = {
  initialValues: FormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: FormValues) => Promise<void>
  open: boolean
  submitError?: string | null
}

function DocumentEditorDialog({ initialValues, isSubmitting, mode, onClose, onSubmit, open, submitError }: EditorProps) {
  const [formValues, setFormValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
  }, [initialValues, open])

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setFormValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      delete next.form
      return next
    })
  }

  async function handleFileSelection(file: File) {
    setIsUploading(true)

    try {
      const uploaded = await uploadPropertyAsset(file, "documents/repository")
      setFormValues((current) => ({
        ...current,
        fileName: file.name,
        fileObjectName: uploaded.objectName,
        fileUrl: uploaded.url,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        title: current.title.trim().length > 0 ? current.title : file.name.replace(/\.[^.]+$/, ""),
      }))
      setErrors((current) => {
        const next = { ...current }
        delete next.fileUrl
        delete next.form
        return next
      })
    } catch (error) {
      setErrors((current) => ({
        ...current,
        fileUrl: error instanceof Error ? error.message : "Failed to upload document.",
      }))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="flex w-[min(100%-1.5rem,78rem)] max-h-[calc(100dvh-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-2xl font-black text-slate-900">{mode === "create" ? "Upload Document" : "Edit Document"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Store documents with access level, tags, template status, and signature requirements."}
          </DialogDescription>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validate(formValues)

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors)
              return
            }

            await onSubmit(formValues)
          }}
        >
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Document Title"}</span>
                <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => updateField("title", event.target.value)} placeholder="Listing agreement package" value={formValues.title} />
                {errors.title ? <span className="text-xs font-semibold text-rose-600">{errors.title}</span> : null}
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Category"}</span>
                  <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => updateField("category", event.target.value)} placeholder="Contracts" value={formValues.category} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Folder"}</span>
                  <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => updateField("folder", event.target.value)} placeholder="Leasing" value={formValues.folder} />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Version"}</span>
                  <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => updateField("versionLabel", event.target.value)} placeholder="v1.0" value={formValues.versionLabel} />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{"Access Level"}</span>
                  <Select modal={false} onValueChange={(value) => updateField("accessLevel", value as DocumentAccessLevel)} value={formValues.accessLevel}>
                    <SelectTrigger className="h-auto w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <SelectValue placeholder="Select access level" />
                    </SelectTrigger>
                    <SelectContent>
                      {accessOptions.map((item) => (
                        <SelectItem key={item} value={item}>{formatAccessLabel(item)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Description"}</span>
                <Textarea className="min-h-32 rounded-xl border-slate-200 bg-slate-50 p-4" onChange={(event) => updateField("description", event.target.value)} placeholder="Add context for admins and agents using this file." value={formValues.description} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Tags"}</span>
                <Textarea className="min-h-28 rounded-xl border-slate-200 bg-slate-50 p-4" onChange={(event) => updateField("tags", event.target.value)} placeholder={"One tag per line or comma-separated values."} value={formValues.tags} />
              </label>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{"Repository File"}</p>
                    <p className="mt-1 text-xs text-slate-500">{"Upload PDF, DOC, DOCX, JPG, PNG, or WEBP files up to 50MB."}</p>
                  </div>
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary" onClick={() => fileInputRef.current?.click()} type="button">
                    {formValues.fileUrl ? "Replace" : "Upload"}
                  </button>
                </div>

                <input
                  accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (file) {
                      void handleFileSelection(file)
                    }
                  }}
                  ref={fileInputRef}
                  type="file"
                />

                <div className="mt-5">
                  {formValues.fileUrl ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <AppIcon className="text-2xl" name={fileIconName(formValues.mimeType)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">{formValues.fileName}</p>
                          <p className="mt-1 text-xs text-slate-500">{`${formValues.mimeType || "Unknown type"} | ${formatFileSize(formValues.sizeBytes)}`}</p>
                          <a className="mt-3 inline-flex text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline" href={formValues.fileUrl} rel="noreferrer" target="_blank">{"Open File"}</a>
                        </div>
                      </div>
                      <button
                        className="mt-4 text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
                        onClick={() => {
                          updateField("fileName", "")
                          updateField("fileObjectName", "")
                          updateField("fileUrl", "")
                          updateField("mimeType", "")
                          updateField("sizeBytes", 0)
                        }}
                        type="button"
                      >
                        {"Remove uploaded file"}
                      </button>
                    </div>
                  ) : (
                    <button className="flex h-52 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary" onClick={() => fileInputRef.current?.click()} type="button">
                      <AppIcon className="text-4xl" name="upload_file" />
                      <span className="mt-3 text-sm font-bold">{"Choose repository file"}</span>
                    </button>
                  )}
                </div>

                {errors.fileUrl ? <p className="mt-3 text-xs font-semibold text-rose-600">{errors.fileUrl}</p> : null}
              </section>

              <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input checked={formValues.isTemplate} className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary" onChange={(event) => updateField("isTemplate", event.target.checked)} type="checkbox" />
                  {"Mark as reusable template"}
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input checked={formValues.requiresSignature} className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary" onChange={(event) => updateField("requiresSignature", event.target.checked)} type="checkbox" />
                  {"Requires signature workflow"}
                </label>
                {isUploading ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{"Uploading file..."}</p> : null}
              </section>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5">
            {submitError ? <p className="mr-auto text-sm font-semibold text-rose-600">{submitError}</p> : null}
            <button className="rounded-xl px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100" onClick={onClose} type="button">{"Cancel"}</button>
            <button className="rounded-xl bg-primary px-7 py-3 font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting || isUploading} type="submit">
              {isSubmitting || isUploading ? (mode === "create" ? "Saving..." : "Updating...") : mode === "create" ? "Save Document" : "Update Document"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MainContentSection() {
  const [accessFilter, setAccessFilter] = useState<"" | DocumentAccessLevel>("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [modalState, setModalState] = useState<ModalState>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all")

  const documentsQuery = useDocumentRepository({
    accessLevel: accessFilter || undefined,
    category: categoryFilter || undefined,
    isTemplate: templateFilter === "all" ? undefined : templateFilter === "template",
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
  })
  const summaryQuery = useDocumentRepositorySummary()
  const createDocumentMutation = useCreateDocumentRepositoryItem()
  const updateDocumentMutation = useUpdateDocumentRepositoryItem()
  const deleteDocumentMutation = useDeleteDocumentRepositoryItem()

  const documents = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data?.items])
  const isInitialLoading = !documentsQuery.data && (documentsQuery.isLoading || documentsQuery.isFetching)
  const categoryOptions = useMemo(
    () => Array.from(new Set([...defaultCategories, ...documents.map((item) => item.category).filter(Boolean)])).sort((left, right) => left.localeCompare(right)),
    [documents],
  )
  const stats = useMemo(
    () => [
      ["Total Documents", `${summaryQuery.data?.totalDocuments ?? 0}`],
      ["Admin Only", `${summaryQuery.data?.adminOnlyCount ?? 0}`],
      ["Agent Access", `${summaryQuery.data?.agentAccessCount ?? 0}`],
      ["Public", `${summaryQuery.data?.publicCount ?? 0}`],
      ["Templates", `${summaryQuery.data?.templateCount ?? 0}`],
      ["Need Signature", `${summaryQuery.data?.signatureRequiredCount ?? 0}`],
    ],
    [summaryQuery.data],
  )
  const initialValues = useMemo(() => (modalState?.mode === "edit" ? toFormValues(modalState.document) : emptyForm()), [modalState])

  useEffect(() => {
    setSubmitError(null)
  }, [modalState])

  async function handleSubmit(values: FormValues) {
    setSubmitError(null)
    const payload = toPayload(values)

    if (modalState?.mode === "edit") {
      const previousObjectName = modalState.document.fileObjectName ?? null
      const response = await updateDocumentMutation.mutateAsync({ ...payload, id: modalState.document.id })

      if (response.error) {
        setSubmitError(response.error.message)
        return
      }

      if (previousObjectName && previousObjectName !== payload.fileObjectName) {
        await Promise.allSettled([deleteUploadedAsset(previousObjectName)])
      }
    } else {
      const response = await createDocumentMutation.mutateAsync(payload)

      if (response.error) {
        setSubmitError(response.error.message)
        return
      }
    }

    setModalState(null)
  }

  async function handleDelete(document: DocumentRepositoryItem) {
    if (!window.confirm(`Delete "${document.title}" from the repository?`)) {
      return
    }

    const response = await deleteDocumentMutation.mutateAsync({ id: `${document.id}` })

    if (response.error) {
      return
    }

    if (document.fileObjectName) {
      await Promise.allSettled([deleteUploadedAsset(document.fileObjectName)])
    }
  }

  return (
    <main className="min-h-screen bg-background-light px-4 py-6 text-slate-900 dark:bg-background-dark dark:text-slate-100 md:px-6">
      <section className="border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{"Document Repository"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{"Upload and manage contracts, disclosures, templates, and other repository files from one admin view."}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{`Stored size: ${formatFileSize(summaryQuery.data?.totalSizeBytes ?? 0)}`}</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90" onClick={() => setModalState({ mode: "create" })} type="button">
            <AppIcon name="upload_file" />
            {"Upload Document"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))]">
          <Input className="h-auto border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5" onChange={(event) => { setSearchTerm(event.target.value); setPage(1) }} placeholder="Search title, file name, category, folder" value={searchTerm} />

          <Select modal={false} onValueChange={(value) => { setAccessFilter(!value || value === "all" ? "" : (value as DocumentAccessLevel)); setPage(1) }} value={accessFilter || "all"}>
            <SelectTrigger className="h-auto w-full border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <SelectValue placeholder="All Access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"All Access"}</SelectItem>
              {accessOptions.map((item) => (
                <SelectItem key={item} value={item}>{formatAccessLabel(item)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select modal={false} onValueChange={(value) => { setCategoryFilter(!value || value === "all" ? "" : value); setPage(1) }} value={categoryFilter || "all"}>
            <SelectTrigger className="h-auto w-full border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"All Categories"}</SelectItem>
              {categoryOptions.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select modal={false} onValueChange={(value) => { setTemplateFilter((value || "all") as TemplateFilter); setPage(1) }} value={templateFilter}>
            <SelectTrigger className="h-auto w-full border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
              <SelectValue placeholder="All Documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"All Documents"}</SelectItem>
              <SelectItem value="template">{"Templates Only"}</SelectItem>
              <SelectItem value="standard">{"Standard Files"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <article key={label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{"Repository Files"}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{"Edit metadata, download source files, or remove outdated documents."}</p>
        </div>

        {isInitialLoading ? (
          <div className="px-6 py-8 text-center"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading repository documents..."}</p></div>
        ) : documentsQuery.error ? (
          <div className="px-6 py-8 text-center"><p className="text-sm font-semibold text-rose-600">{documentsQuery.error.message}</p></div>
        ) : documents.length === 0 ? (
          <div className="px-6 py-8 text-center"><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No repository files match the current filters."}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Document"}</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Category"}</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Access"}</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Version"}</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Last Modified"}</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{"Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {documents.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <AppIcon className="text-xl" name={fileIconName(document.mimeType)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{document.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{`${document.fileName} | ${formatFileSize(document.sizeBytes)}`}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {document.isTemplate ? <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">{"Template"}</span> : null}
                            {document.requiresSignature ? <span className="border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">{"Needs Signature"}</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{document.category}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{document.folder}</p>
                    </td>
                    <td className="px-6 py-4"><span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${accessBadgeClass(document.accessLevel)}`}>{formatAccessLabel(document.accessLevel)}</span></td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{document.versionLabel}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatDateTimeLabel(document.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <a className="border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300" href={document.fileUrl} rel="noreferrer" target="_blank">{"Download"}</a>
                        <button className="border border-slate-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300" onClick={() => setModalState({ mode: "edit", document })} type="button">{"Edit"}</button>
                        <button className="border border-rose-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-600 transition-colors hover:border-rose-300 hover:text-rose-700" onClick={() => void handleDelete(document)} type="button">{"Delete"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 px-6 py-4 dark:border-white/10">
          <PagePagination currentPage={page} onPageChange={setPage} totalPages={documentsQuery.data?.totalPages ?? 1} />
        </div>
      </section>

      <DocumentEditorDialog
        initialValues={initialValues}
        isSubmitting={createDocumentMutation.isPending || updateDocumentMutation.isPending}
        mode={modalState?.mode ?? "create"}
        onClose={() => setModalState(null)}
        onSubmit={handleSubmit}
        open={modalState !== null}
        submitError={submitError}
      />
    </main>
  )
}
