import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"

import type { AgentUserOption } from "@/types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"

import {
  type PendingUploadFile,
  type PropertyFormErrors,
  type PropertyFormValues,
} from "./property-form-shared"
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

function validatePropertyForm(values: PropertyFormValues, options: { galleryCount: number; hasThumbnail: boolean }) {
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
  if (
    (values.neighborhoodInsights ?? []).some((item) => {
      const type = item.type?.trim() ?? ""
      const description = item.description?.trim() ?? ""
      return (type.length > 0 || description.length > 0) && (type.length === 0 || description.length === 0)
    })
  ) {
    errors.neighborhoodInsights = "Each neighborhood insight needs both a type and a description."
  }

  return errors
}

function validateImageFile(file: File) {
  if (!acceptedImageTypes.includes(file.type)) return "Only JPG, PNG, or WEBP images are allowed."
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
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setErrors({})
    setPendingThumbnail(null)
    setPendingGalleryFiles([])
  }, [initialValues])

  useEffect(() => {
    return () => {
      if (pendingThumbnail) URL.revokeObjectURL(pendingThumbnail.previewUrl)
      pendingGalleryFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [pendingGalleryFiles, pendingThumbnail])

  const selectedAmenities = useMemo(() => new Set(formValues.keyAmenities ?? []), [formValues.keyAmenities])
  const thumbnailPreviewUrl = pendingThumbnail?.previewUrl ?? formValues.thumbnailUrl
  const galleryPreviewItems = useMemo(
    () => [
      ...(formValues.imageUrls ?? []).map((url, index) => ({ id: `existing-${index}`, index, isPending: false, previewUrl: url })),
      ...pendingGalleryFiles.map((item) => ({ id: item.id, index: -1, isPending: true, previewUrl: item.previewUrl })),
    ],
    [formValues.imageUrls, pendingGalleryFiles],
  )
  const isBusy = isSubmitting || isUploading

  function updateField<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
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

    const availableSlots = maxGalleryImages - (formValues.imageUrls?.length ?? 0) - pendingGalleryFiles.length
    if (availableSlots <= 0) {
      setErrors((current) => ({ ...current, imageUrls: `You can upload up to ${maxGalleryImages} gallery images.` }))
      return
    }

    const nextFiles = files.slice(0, availableSlots)
    const firstInvalid = nextFiles.find((file) => validateImageFile(file))
    if (firstInvalid) {
      setErrors((current) => ({ ...current, imageUrls: validateImageFile(firstInvalid) ?? "Invalid image file." }))
      return
    }

    setPendingGalleryFiles((current) => [...current, ...nextFiles.map(createPendingUploadFile)])
    clearFieldErrors("imageUrls", "form")
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
    updateField("imageUrls", (formValues.imageUrls ?? []).filter((_, itemIndex) => itemIndex !== index))
    updateField("imageObjectNames", (formValues.imageObjectNames ?? []).filter((_, itemIndex) => itemIndex !== index))
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
      }

      if (pendingThumbnail) {
        const uploadedThumbnail = await uploadPropertyAsset(pendingThumbnail.file, "properties/thumbnail")
        uploadedObjectNames.push(uploadedThumbnail.objectName)
        nextValues = { ...nextValues, thumbnailObjectName: uploadedThumbnail.objectName, thumbnailUrl: uploadedThumbnail.url }
      }

      if (pendingGalleryFiles.length > 0) {
        const uploadedGallery = await Promise.all(pendingGalleryFiles.map((item) => uploadPropertyAsset(item.file, "properties/gallery")))
        uploadedGallery.forEach((item) => uploadedObjectNames.push(item.objectName))
        nextValues = {
          ...nextValues,
          imageObjectNames: [...nextValues.imageObjectNames, ...uploadedGallery.map((item) => item.objectName)],
          imageUrls: [...nextValues.imageUrls, ...uploadedGallery.map((item) => item.url)],
        }
      }

      const submissionSucceeded = await onSubmit(nextValues)
      if (!submissionSucceeded) {
        await Promise.allSettled(uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)))
        return
      }

      const removedObjectNames = [
        ...(initialValues.thumbnailObjectName && initialValues.thumbnailObjectName !== nextValues.thumbnailObjectName ? [initialValues.thumbnailObjectName] : []),
        ...(initialValues.imageObjectNames ?? []).filter(
          (objectName) => !(nextValues.imageObjectNames ?? []).includes(objectName),
        ),
      ].filter(Boolean)

      if (removedObjectNames.length > 0) {
        await Promise.allSettled(removedObjectNames.map((objectName) => deleteUploadedAsset(objectName)))
      }
    } catch (error) {
      await Promise.allSettled(uploadedObjectNames.map((objectName) => deleteUploadedAsset(objectName)))
      setErrors((current) => ({ ...current, form: error instanceof Error ? error.message : "Failed to save property media." }))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {mode === "create" ? "Add New Property" : "Update Property"}
            </h3>
            <p className="text-sm text-slate-500">
              {mode === "create"
                ? "Fill in the details to list a new property on the market."
                : "Adjust the listing details without leaving the property manager."}
            </p>
          </div>
          <button className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200" onClick={onClose} type="button">
            <AppIcon className="text-3xl" name="close" />
          </button>
        </div>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-10 overflow-y-auto p-8">
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
              thumbnailStatusLabel={pendingThumbnail ? "New thumbnail selected" : "Current property thumbnail"}
            />
            <PropertyFormFieldsSection
              agentOptions={agentOptions}
              errors={errors}
              formValues={formValues}
              isAgentOptionsLoading={isAgentOptionsLoading}
              selectedAmenities={selectedAmenities}
              updateField={updateField}
            />
          </div>
          <div className="flex justify-end gap-4 border-t border-slate-200 bg-slate-50 px-8 py-6 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="mr-auto">
              {errors.form || submitError ? (
                <p className="text-sm font-semibold text-rose-600">{errors.form ?? submitError}</p>
              ) : null}
            </div>
            <button className="rounded-xl px-6 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700" onClick={onClose} type="button">
              {" Cancel "}
            </button>
            <button className="rounded-xl bg-primary px-8 py-3 font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70" disabled={isBusy} type="submit">
              {isBusy
                ? mode === "create"
                  ? isUploading ? "Uploading & Creating..." : "Creating..."
                  : isUploading ? "Uploading & Saving..." : "Saving..."
                : mode === "create"
                  ? "Create Property Listing"
                  : "Save Property Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export type { PropertyFormValues } from "./property-form-shared"
