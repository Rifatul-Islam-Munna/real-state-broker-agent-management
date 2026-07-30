import type { ChangeEvent, RefObject } from "react"

import { AppIcon } from "@/components/ui/app-icon"

import { FieldError } from "./property-form-shared"

type GalleryPreviewItem = {
  id: string
  index: number
  isPending: boolean
  previewUrl: string
}

type PropertyMediaSectionProps = {
  galleryError?: string
  galleryInputRef: RefObject<HTMLInputElement | null>
  galleryPreviewItems: GalleryPreviewItem[]
  onGalleryInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveExistingGalleryImage: (index: number) => void
  onRemovePendingGalleryImage: (id: string) => void
  onThumbnailInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveThumbnail: () => void
  thumbnailError?: string
  thumbnailInputRef: RefObject<HTMLInputElement | null>
  thumbnailPreviewUrl?: string
  thumbnailStatusLabel: string
}

const maxGalleryImages = 8
const visibleGallerySlots = 4

export function PropertyMediaSection({
  galleryError,
  galleryInputRef,
  galleryPreviewItems,
  onGalleryInputChange,
  onRemoveExistingGalleryImage,
  onRemovePendingGalleryImage,
  onRemoveThumbnail,
  onThumbnailInputChange,
  thumbnailError,
  thumbnailInputRef,
  thumbnailPreviewUrl,
  thumbnailStatusLabel,
}: PropertyMediaSectionProps) {
  const emptySlotCount = Math.max(0, visibleGallerySlots - galleryPreviewItems.length)

  return (
    <section>
      <div className="mb-5 flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] pb-3">
        <AppIcon className="text-2xl text-[var(--ether-secondary)]" name="photo_camera" />
        <h2 className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">Property Media</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <div>
          <p className="ether-label-caps mb-3 text-[var(--ether-on-surface-variant)]">Primary Thumbnail (4:3)</p>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onThumbnailInputChange}
            ref={thumbnailInputRef}
            type="file"
          />

          {thumbnailPreviewUrl ? (
            <div className="overflow-hidden rounded-xl bg-[var(--ether-surface-container-low)]">
              <div
                className="aspect-[4/3] w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${thumbnailPreviewUrl}")` }}
              />
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-xs font-semibold text-[var(--ether-on-surface-variant)]">{thumbnailStatusLabel}</p>
                <div className="flex gap-3">
                  <button
                    className="text-xs font-bold text-[var(--ether-primary)]"
                    onClick={() => thumbnailInputRef.current?.click()}
                    type="button"
                  >
                    Replace
                  </button>
                  <button
                    className="text-xs font-bold text-[var(--ether-error)]"
                    onClick={onRemoveThumbnail}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="flex aspect-[4/3] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-6 text-center transition hover:border-[var(--ether-primary)] hover:bg-[var(--ether-primary-fixed)]/35"
              onClick={() => thumbnailInputRef.current?.click()}
              type="button"
            >
              <AppIcon className="text-5xl text-[var(--ether-primary)]" name="cloud_upload" />
              <span className="mt-4 text-base font-semibold text-[var(--ether-on-surface)] sm:text-lg">Drag & drop cover photo</span>
              <span className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">or click to browse from device</span>
              <span className="mt-3 text-xs text-[var(--ether-outline)]">JPG, PNG, or WEBP up to 10MB</span>
            </button>
          )}
          <FieldError error={thumbnailError} />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="ether-label-caps text-[var(--ether-on-surface-variant)]">Gallery Images (Min. 1)</p>
            <span className="text-xs font-semibold text-[var(--ether-outline)]">{galleryPreviewItems.length}/{maxGalleryImages}</span>
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            multiple
            onChange={onGalleryInputChange}
            ref={galleryInputRef}
            type="file"
          />

          <div className="grid grid-cols-2 gap-4">
            {galleryPreviewItems.slice(0, maxGalleryImages).map((item, index) => (
              <div className="group relative aspect-square overflow-hidden rounded-xl bg-[var(--ether-surface-container-low)]" key={item.id}>
                <div
                  className="h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url("${item.previewUrl}")` }}
                />
                <button
                  aria-label="Remove gallery image"
                  className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/95 text-[var(--ether-error)] opacity-100 shadow-sm transition hover:scale-105 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() =>
                    item.isPending
                      ? onRemovePendingGalleryImage(item.id)
                      : onRemoveExistingGalleryImage(item.index)
                  }
                  type="button"
                >
                  <AppIcon name="close" />
                </button>
                <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-[var(--ether-on-surface-variant)]">
                  {item.isPending ? "New" : `Gallery ${index + 1}`}
                </span>
              </div>
            ))}

            {Array.from({ length: emptySlotCount }).map((_, index) => (
              <button
                aria-label="Add gallery image"
                className="flex aspect-square items-center justify-center rounded-xl bg-[var(--ether-surface-container-low)] text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]"
                key={`empty-gallery-slot-${index}`}
                onClick={() => galleryInputRef.current?.click()}
                type="button"
              >
                <AppIcon className="text-3xl" name="add" />
              </button>
            ))}
          </div>

          {galleryPreviewItems.length >= visibleGallerySlots && galleryPreviewItems.length < maxGalleryImages ? (
            <button
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ether-primary)]"
              onClick={() => galleryInputRef.current?.click()}
              type="button"
            >
              <AppIcon name="add_photo_alternate" />
              Add more images
            </button>
          ) : null}
          <FieldError error={galleryError} />
        </div>
      </div>
    </section>
  )
}
