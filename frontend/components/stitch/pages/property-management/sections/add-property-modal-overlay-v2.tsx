import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type { AgentUserOption } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"

import {
  FieldError,
  type PendingPropertyDocument,
  type PendingUploadFile,
  type PropertyFormErrors,
  type PropertyFormValues,
} from "./property-form-shared"
import { PropertyDocumentsSection } from "./property-documents-section"
import { PropertyFormFieldsSection } from "./property-form-fields"
import { PropertyMediaSection } from "./property-media-section"

type AddPropertyModalOverlaySectionProps = {
  agentOptions: AgentUserOption[]
  initialValues: PropertyFormValues
  isAgentOptionsLoading?: boolean
  isSubmitting?: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: PropertyFormValues) => Promise<boolean> | boolean
  submitError?: string | null
}

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"]
const maxFileSizeBytes = 10 * 1024 * 1024
const maxGalleryImages = 8

function validatePropertyForm(
  values: PropertyFormValues,
  options: { galleryCount: number; hasThumbnail: boolean },
) {
  const errors: PropertyFormErrors = {}

  if (!values.title.trim()) errors.title = "Listing title is required."
  if (!values.price.trim()) errors.price = "Price is required."
  if (!values.location.trim()) errors.location = "Location is required."
  if (!values.exactLocation.trim()) errors.exactLocation = "Street address is required."
  if (!values.bedRoom.trim()) errors.bedRoom = "Bedrooms are required."
  if (!values.bathRoom.trim()) errors.bathRoom = "Bathrooms are required."
  if (!values.width.trim()) errors.width = "Property size is required."
  if (!values.description.trim() || values.description.trim().length < 20) {
    errors.description = "Description must be at least 20 characters."
  }
  if (!options.hasThumbnail) errors.thumbnailUrl = "A thumbnail image is required."
  if (options.galleryCount === 0) errors.imageUrls = "Add at least one gallery image."
  if ((values.propertyDocuments ?? []).some((document) => !document.name.trim())) {
    errors.propertyDocuments = "Every document needs a name."
  }
  if (
    (values.neighborhoodInsights ?? []).some((item) => {
      const type = item.type?.trim() ?? ""
      const description = item.description?.trim() ?? ""
      return (
        (type.length > 0 || description.length > 0) &&
        (type.length === 0 || description.length === 0)
      )
    })
  ) {
    errors.neighborhoodInsights =
      "Each neighborhood insight needs both a type and a description."
  }
  if (
    (values.preQuestions ?? []).some((item) => {
      const prompt = item.prompt?.trim() ?? ""
      const helperText = item.helperText?.trim() ?? ""
      const hasAttachment = Boolean(item.attachmentUrl || item.attachmentObjectName)
      return (helperText.length > 0 || hasAttachment) && prompt.length === 0
    })
  ) {
    errors.preQuestions =
      "Each pre-question needs a prompt before you add help text or files."
  }

  return errors
}

function validateImageFile(file: File) {
  if (!acceptedImageTypes.includes(file.type)) {
    return "Only JPG, PNG, or WEBP images are allowed."
  }
  if (file.size > maxFileSizeBytes) return "Each image must be 10MB or smaller."
  return null
}

function createPendingUploadFile(file: File): PendingUploadFile {
  return {
    file,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    previewUrl: URL.createObjectURL(file),
  }
}

export function AddPropertyModalOverlaySection({
  agentOptions,
  initialValues,
  isAgentOptionsLoading = false,
  isSubmitting = false,
  mode,
  onClose,
  onSubmit,
  submitError,
}: AddPropertyModalOverlaySectionProps) {
  const [formValues, setFormValues] = useState(initialValues)
  const [errors, setErrors] = useState<PropertyFormErrors>({})
  const [isUploading, setIsUploading] = useState(false)
  const [pendingThumbnail, setPendingThumbnail] = useState<PendingUploadFile | null>(null)
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<PendingUploadFile[]>([])
  const [pendingDocuments, setPendingDocuments] = useState<PendingPropertyDocument[]>([])
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const documentInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
    setPendingThumbnail(null)
    setPendingGalleryFiles([])
    setPendingDocuments([])
  }, [initialValues])

  useEffect(() => {
    return () => {
      if (pendingThumbnail) URL.revokeObjectURL(pendingThumbnail.previewUrl)
      pendingGalleryFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [pendingGalleryFiles, pendingThumbnail])

  const selectedAmenities = useMemo(
    () => new Set(formValues.keyAmenities ?? []),
    [formValues.keyAmenities],
  )
  const thumbnailPreviewUrl = pendingThumbnail?.previewUrl ?? formValues.thumbnailUrl
  const galleryPreviewItems = useMemo(
    () => [
      ...(formValues.imageUrls ?? []).map((url, index) => ({
        id: `existing-${index}`,
        index,
        isPending: false,
        previewUrl: url,
      })),
      ...pendingGalleryFiles.map((item) => ({
        id: item.id,
        index: -1,
        isPending: true,
        previewUrl: item.previewUrl,
      })),
    ],
    [formValues.imageUrls, pendingGalleryFiles],
  )
  const isBusy = isSubmitting || isUploading

  function updateField<K extends keyof PropertyFormValues>(
    key: K,
    value: PropertyFormValues[K],
  ) {
    setFormValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const nextErrors = { ...current }
      delete nextErrors[key]
      delete nextErrors.form
      return nextErrors
    })
  }

  function clearFieldErrors(...keys: Array<keyof PropertyFormErrors>) {
    setErrors((current) => {
      const nextErrors = { ...current }
      keys.forEach((key) => delete nextErrors[key])
      return nextErrors
    })
  }

  function handleThumbnailSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const validationMessage = validateImageFile(file)
    if (validationMessage) {
      setErrors((current) => ({ ...current, thumbnailUrl: validationMessage }))
      return
    }

    if (pendingThumbnail) URL.revokeObjectURL(pendingThumbnail.previewUrl)
    setPendingThumbnail(createPendingUploadFile(file))
    clearFieldErrors("thumbnailUrl", "form")
  }

  function handleGallerySelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    const availableSlots =
      maxGalleryImages -
      (formValues.imageUrls?.length ?? 0) -
      pendingGalleryFiles.length
    if (availableSlots <= 0) {
      setErrors((current) => ({
        ...current,
        imageUrls: `You can upload up to ${maxGalleryImages} gallery images.`,
      }))
      return
    }

    const nextFiles = files.slice(0, availableSlots)
    const firstInvalid = nextFiles.find((file) => validateImageFile(file))
    if (firstInvalid) {
      setErrors((current) => ({
        ...current,
        imageUrls: validateImageFile(firstInvalid) ?? "Invalid image file.",
      }))
      return
    }

    setPendingGalleryFiles((current) => [
      ...current,
      ...nextFiles.map(createPendingUploadFile),
    ])
    clearFieldErrors("imageUrls", "form")
  }

  function handleDocumentSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    setPendingDocuments((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name.replace(/\.[^.]+$/, ""),
      })),
    ])
  }

  function renamePendingDocument(id: string, name: string) {
    setPendingDocuments((current) =>
      current.map((document) => (document.id === id ? { ...document, name } : document)),
    )
  }

  function renameExistingDocument(index: number, name: string) {
    updateField(
      "propertyDocuments",
      (formValues.propertyDocuments ?? []).map((document, itemIndex) =>
        itemIndex === index ? { ...document, name } : document,
      ),
    )
  }

  function handleRemoveThumbnail() {
    if (pendingThumbnail) {
      URL.revokeObjectURL(pendingThumbnail.previewUrl)
      setPendingThumbnail(null)
      clearFieldErrors("form")
      return
    }

    updateField("thumbnailUrl", "")
    updateField("thumbnailObjectName", "")
  }

  function handleRemoveExistingGalleryImage(index: number) {
    updateField(
      "imageUrls",
      (formValues.imageUrls ?? []).filter((_, itemIndex) => itemIndex !== index),
    )
    updateField(
      "imageObjectNames",
      (formValues.imageObjectNames ?? []).filter((_, itemIndex) => itemIndex !== index),
    )
  }

  function handleRemovePendingGalleryImage(id: string) {
    setPendingGalleryFiles((current) => {
      const file = current.find((item) => item.id === id)
      if (file) URL.revokeObjectURL(file.previewUrl)
      return current.filter((item) => item.id !== id)
    })
    clearFieldErrors("imageUrls", "form")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pendingDocuments.some((document) => !document.name.trim())) {
      setErrors((current) => ({
        ...current,
        propertyDocuments: "Every document needs a name.",
      }))
      return
    }

    const nextErrors = validatePropertyForm(formValues, {
      galleryCount: (formValues.imageUrls?.length ?? 0) + pendingGalleryFiles.length,
      hasThumbnail: Boolean(formValues.thumbnailUrl || pendingThumbnail),
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsUploading(true)
    const uploadedObjectNames: string[] = []

    try {
      let nextValues = {
        ...formValues,
        imageObjectNames: [...(formValues.imageObjectNames ?? [])],
        imageUrls: [...(formValues.imageUrls ?? [])],
        propertyDocuments: [...(formValues.propertyDocuments ?? [])],
      }

      if (pendingThumbnail) {
        const uploadedThumbnail = await uploadPropertyAsset(
          pendingThumbnail.file,
          "properties/thumbnail",
        )
        uploadedObjectNames.push(uploadedThumbnail.objectName)
        nextValues = {
          ...nextValues,
          thumbnailObjectName: uploadedThumbnail.objectName,
          thumbnailUrl: uploadedThumbnail.url,
        }
      }

      if (pendingGalleryFiles.length > 0) {
        const uploadedGallery = await Promise.all(
          pendingGalleryFiles.map((item) =>
            uploadPropertyAsset(item.file, "properties/gallery"),
          ),
        )
        uploadedGallery.forEach((item) => uploadedObjectNames.push(item.objectName))
        nextValues = {
          ...nextValues,
          imageObjectNames: [
            ...nextValues.imageObjectNames,
            ...uploadedGallery.map((item) => item.objectName),
          ],
          imageUrls: [
            ...nextValues.imageUrls,
            ...uploadedGallery.map((item) => item.url),
          ],
        }
      }

      if (pendingDocuments.length > 0) {
        const uploadedDocuments: Array<{
          document: PendingPropertyDocument
          uploaded: Awaited<ReturnType<typeof uploadPropertyAsset>>
        }> = []
        for (const document of pendingDocuments) {
          const uploaded = await uploadPropertyAsset(
            document.file,
            "properties/documents",
          )
          uploadedObjectNames.push(uploaded.objectName)
          uploadedDocuments.push({ document, uploaded })
        }
        nextValues = {
          ...nextValues,
          propertyDocuments: [
            ...nextValues.propertyDocuments,
            ...uploadedDocuments.map(({ document, uploaded }) => ({
              fileName: document.file.name,
              fileObjectName: uploaded.objectName,
              fileUrl: uploaded.url,
              mimeType:
                uploaded.mimeType || document.file.type || "application/octet-stream",
              name: document.name.trim(),
              sizeBytes: uploaded.sizeBytes || document.file.size,
            })),
          ],
        }
      }

      const submissionSucceeded = await onSubmit(nextValues)
      if (!submissionSucceeded) {
        await Promise.allSettled(
          uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)),
        )
        return
      }

      const removedObjectNames = [
        ...(initialValues.thumbnailObjectName &&
        initialValues.thumbnailObjectName !== nextValues.thumbnailObjectName
          ? [initialValues.thumbnailObjectName]
          : []),
        ...(initialValues.imageObjectNames ?? []).filter(
          (objectName) => !(nextValues.imageObjectNames ?? []).includes(objectName),
        ),
        ...(initialValues.propertyDocuments ?? [])
          .filter(
            (document) =>
              !(nextValues.propertyDocuments ?? []).some(
                (item) => item.fileObjectName === document.fileObjectName,
              ),
          )
          .map((document) => document.fileObjectName),
      ].filter(Boolean)

      if (removedObjectNames.length > 0) {
        await Promise.allSettled(
          removedObjectNames.map((objectName) => deleteUploadedAsset(objectName)),
        )
      }
    } catch (error) {
      await Promise.allSettled(
        uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)),
      )
      setErrors((current) => ({
        ...current,
        form:
          error instanceof Error ? error.message : "Failed to save property media.",
      }))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="!flex h-[92dvh] max-h-[92dvh] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[94vw] lg:w-[78vw] xl:w-[70vw]">
        <DialogHeader className="border-b px-6 py-5 sm:px-8">
          <DialogTitle className="text-2xl">
            {mode === "create" ? "Add new property" : "Update property"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fill in the details to list a new property on the market."
              : "Adjust the listing details without leaving the property manager."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-10 overflow-y-auto p-5 sm:p-8">
            <PropertyMediaSection
              galleryError={errors.imageUrls}
              galleryInputRef={galleryInputRef}
              galleryPreviewItems={galleryPreviewItems}
              onGalleryInputChange={handleGallerySelection}
              onRemoveExistingGalleryImage={handleRemoveExistingGalleryImage}
              onRemovePendingGalleryImage={handleRemovePendingGalleryImage}
              onRemoveThumbnail={handleRemoveThumbnail}
              onThumbnailInputChange={handleThumbnailSelection}
              thumbnailError={errors.thumbnailUrl}
              thumbnailInputRef={thumbnailInputRef}
              thumbnailPreviewUrl={thumbnailPreviewUrl}
              thumbnailStatusLabel={
                pendingThumbnail ? "New thumbnail selected" : "Current property thumbnail"
              }
            />
            <PropertyDocumentsSection
              documents={formValues.propertyDocuments ?? []}
              fileInputRef={documentInputRef}
              onFileSelection={handleDocumentSelection}
              onRemoveExisting={(index) =>
                updateField(
                  "propertyDocuments",
                  (formValues.propertyDocuments ?? []).filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
              onRemovePending={(id) =>
                setPendingDocuments((current) =>
                  current.filter((document) => document.id !== id),
                )
              }
              onRenameExisting={renameExistingDocument}
              onRenamePending={renamePendingDocument}
              pendingDocuments={pendingDocuments}
            />
            <FieldError error={errors.propertyDocuments} />
            <PropertyFormFieldsSection
              agentOptions={agentOptions}
              errors={errors}
              formValues={formValues}
              isAgentOptionsLoading={isAgentOptionsLoading}
              selectedAmenities={selectedAmenities}
              updateField={updateField}
            />
          </div>

          <div className="flex flex-col gap-3 border-t bg-muted/35 p-5 sm:flex-row sm:items-center sm:justify-end sm:px-8">
            <div className="sm:mr-auto sm:max-w-xl">
              {errors.form || submitError ? (
                <Alert variant="destructive">
                  <AlertDescription>{errors.form ?? submitError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <Button onClick={onClose} type="button" variant="outline">
              {"Cancel"}
            </Button>
            <Button disabled={isBusy} type="submit">
              {isBusy
                ? mode === "create"
                  ? isUploading
                    ? "Uploading & creating..."
                    : "Creating..."
                  : isUploading
                    ? "Uploading & saving..."
                    : "Saving..."
                : mode === "create"
                  ? "Create property listing"
                  : "Save property changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type { PropertyFormValues } from "./property-form-shared"
