"use client"

import { useEffect, useRef, useState } from "react"

import type { DocumentAccessLevel, DocumentType, PropertyItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { uploadPropertyAsset } from "@/lib/upload-client"

import {
  type DocumentFormErrors,
  type DocumentFormValues,
  documentAccessOptions,
  documentFileIcon,
  documentTypeOptions,
  defaultDocumentCategories,
  formatDocumentType,
  formatDocumentAccess,
  formatDocumentSize,
  validateDocumentForm,
} from "./document-repository-shared"

type DocumentEditorDialogProps = {
  initialValues: DocumentFormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: DocumentFormValues) => Promise<boolean>
  open: boolean
  properties: PropertyItem[]
  submitError?: string | null
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs font-medium text-destructive">{error}</p> : null
}

export function DocumentEditorDialog({
  initialValues,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
  properties,
  submitError,
}: DocumentEditorDialogProps) {
  const [formValues, setFormValues] = useState<DocumentFormValues>(initialValues)
  const [errors, setErrors] = useState<DocumentFormErrors>({})
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isBusy = isSubmitting || isUploading

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
  }, [initialValues, open])

  function updateField<K extends keyof DocumentFormValues>(
    key: K,
    value: DocumentFormValues[K],
  ) {
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
        title:
          current.title.trim().length > 0
            ? current.title
            : file.name.replace(/\.[^.]+$/, ""),
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
        fileUrl:
          error instanceof Error ? error.message : "Failed to upload document.",
      }))
    } finally {
      setIsUploading(false)
    }
  }

  function closeDialog() {
    if (!isBusy) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? closeDialog() : undefined)}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-5xl gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-5 py-5 sm:px-6">
          <DialogTitle className="text-2xl">
            {mode === "create" ? "Upload document" : "Edit document"}
          </DialogTitle>
          <DialogDescription>
            {"Store the source file with clear access, property, template, and signature metadata."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validateDocumentForm(formValues)

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors)
              return
            }

            await onSubmit(formValues)
          }}
        >
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="document-title">{"Document title"}</Label>
                <Input
                  id="document-title"
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="Listing agreement package"
                  value={formValues.title}
                />
                <FieldError error={errors.title} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{"Category"}</Label>
                  <Select
                    modal={false}
                    onValueChange={(value) => updateField("category", value)}
                    value={formValues.category || "General"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultDocumentCategories.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-folder">{"Folder"}</Label>
                  <Input
                    id="document-folder"
                    onChange={(event) => updateField("folder", event.target.value)}
                    placeholder="Leasing"
                    value={formValues.folder}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{"Document type"}</Label>
                  <Select
                    modal={false}
                    onValueChange={(value) => {
                      const documentType = value as DocumentType
                      updateField("documentType", documentType)
                      if (documentType !== "Property") {
                        updateField("propertyId", null)
                        updateField("propertyTitle", "")
                      }
                    }}
                    value={formValues.documentType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypeOptions.map((item) => (
                        <SelectItem key={item} value={item}>
                          {formatDocumentType(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-version">{"Version"}</Label>
                  <Input
                    id="document-version"
                    onChange={(event) => updateField("versionLabel", event.target.value)}
                    placeholder="v1.0"
                    value={formValues.versionLabel}
                  />
                </div>
              </div>

              {formValues.documentType === "Property" ? (
                <div className="space-y-2">
                  <Label>{"Property document for"}</Label>
                  <Select
                    modal={false}
                    onValueChange={(value) => {
                      const property = properties.find((item) => String(item.id) === value)
                      updateField("propertyId", property?.id ?? null)
                      updateField("propertyTitle", property?.title ?? "")
                    }}
                    value={formValues.propertyId ? String(formValues.propertyId) : ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={String(property.id)}>
                          {`${property.title} — ${property.location}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError error={errors.propertyId} />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>{"Access level"}</Label>
                <Select
                  modal={false}
                  onValueChange={(value) =>
                    updateField("accessLevel", value as DocumentAccessLevel)
                  }
                  value={formValues.accessLevel}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentAccessOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {formatDocumentAccess(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-description">{"Description"}</Label>
                <Textarea
                  id="document-description"
                  className="min-h-28"
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Add context for admins and agents using this file."
                  value={formValues.description}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-tags">{"Tags"}</Label>
                <Textarea
                  id="document-tags"
                  className="min-h-24"
                  onChange={(event) => updateField("tags", event.target.value)}
                  placeholder="One tag per line or comma-separated values"
                  value={formValues.tags}
                />
              </div>
            </div>

            <div className="space-y-5">
              <Card className="border-dashed" size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{"Repository file"}</CardTitle>
                      <CardDescription>
                        {"Upload PDF, DOC, DOCX, JPG, PNG, or WEBP files up to 50MB."}
                      </CardDescription>
                    </div>
                    <Button
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {formValues.fileUrl ? "Replace" : "Upload"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <input
                    accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ""
                      if (file) void handleFileSelection(file)
                    }}
                    ref={fileInputRef}
                    type="file"
                  />

                  {formValues.fileUrl ? (
                    <div className="rounded-xl border bg-muted/25 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <AppIcon className="text-xl" name={documentFileIcon(formValues.mimeType)} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{formValues.fileName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {`${formValues.mimeType || "Unknown type"} • ${formatDocumentSize(formValues.sizeBytes)}`}
                          </p>
                          <Button
                            className="mt-2 h-auto p-0"
                            render={
                              <a
                                href={formValues.fileUrl}
                                rel="noreferrer"
                                target="_blank"
                              />
                            }
                            variant="link"
                          >
                            {"Open file"}
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="mt-4"
                        disabled={isBusy}
                        onClick={() => {
                          updateField("fileName", "")
                          updateField("fileObjectName", "")
                          updateField("fileUrl", "")
                          updateField("mimeType", "")
                          updateField("sizeBytes", 0)
                        }}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        {"Remove uploaded file"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="h-48 w-full flex-col border-dashed"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      variant="outline"
                    >
                      <AppIcon className="text-3xl" name="upload_file" />
                      <span>{isUploading ? "Uploading file..." : "Choose repository file"}</span>
                    </Button>
                  )}
                  <FieldError error={errors.fileUrl} />
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>{"Workflow options"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium">
                    <Checkbox
                      checked={formValues.isTemplate}
                      onCheckedChange={(checked) =>
                        updateField("isTemplate", Boolean(checked))
                      }
                    />
                    {"Mark as reusable template"}
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium">
                    <Checkbox
                      checked={formValues.requiresSignature}
                      onCheckedChange={(checked) =>
                        updateField("requiresSignature", Boolean(checked))
                      }
                    />
                    {"Requires signature workflow"}
                  </label>
                </CardContent>
              </Card>
            </div>
          </div>

          {submitError ? (
            <div className="px-5 pb-4 sm:px-6">
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          <DialogFooter className="mx-0 mb-0 rounded-none px-5 py-4 sm:px-6">
            <Button disabled={isBusy} onClick={closeDialog} type="button" variant="outline">
              {"Cancel"}
            </Button>
            <Button disabled={isBusy} type="submit">
              {isBusy
                ? mode === "create"
                  ? "Saving..."
                  : "Updating..."
                : mode === "create"
                  ? "Save document"
                  : "Update document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
