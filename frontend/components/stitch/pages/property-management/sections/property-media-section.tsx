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
  return (
    <section>
      <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <AppIcon className="text-primary" name="imagesmode" />
        {" Property Media "}
      </h4>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr,1.6fr]">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {"Thumbnail"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {"Primary cover image for property cards and previews."}
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              onClick={() => thumbnailInputRef.current?.click()}
              type="button"
            >
              {thumbnailPreviewUrl ? "Replace" : "Upload"}
            </button>
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onThumbnailInputChange}
            ref={thumbnailInputRef}
            type="file"
          />
          <div className="mt-5">
            {thumbnailPreviewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div
                  className="h-52 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${thumbnailPreviewUrl}")` }}
                />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {thumbnailStatusLabel}
                  </p>
                  <button
                    className="text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
                    onClick={onRemoveThumbnail}
                    type="button"
                  >
                    {"Remove"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="flex h-52 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                onClick={() => thumbnailInputRef.current?.click()}
                type="button"
              >
                <AppIcon className="text-4xl" name="add_photo_alternate" />
                <span className="mt-3 text-sm font-bold">
                  {"Choose thumbnail image"}
                </span>
                <span className="mt-1 text-xs">
                  {"JPG, PNG, or WEBP up to 10MB"}
                </span>
              </button>
            )}
          </div>
          <FieldError error={thumbnailError} />
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {"Gallery Images"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {`Upload up to ${maxGalleryImages} gallery images for the property details and slider.`}
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
              onClick={() => galleryInputRef.current?.click()}
              type="button"
            >
              {"Add Images"}
            </button>
          </div>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            multiple
            onChange={onGalleryInputChange}
            ref={galleryInputRef}
            type="file"
          />
          {galleryPreviewItems.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
              {galleryPreviewItems.map((item, index) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  <div
                    className="h-28 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${item.previewUrl}")` }}
                  />
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                        {item.isPending ? "New image" : `Gallery ${index + 1}`}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.isPending ? "Will upload on save" : "Saved image"}
                      </p>
                    </div>
                    <button
                      className="text-xs font-bold text-rose-600 transition-colors hover:text-rose-700"
                      onClick={() =>
                        item.isPending
                          ? onRemovePendingGalleryImage(item.id)
                          : onRemoveExistingGalleryImage(item.index)
                      }
                      type="button"
                    >
                      {"Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button
              className="mt-5 flex h-36 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              onClick={() => galleryInputRef.current?.click()}
              type="button"
            >
              <AppIcon className="text-4xl" name="imagesmode" />
              <span className="mt-3 text-sm font-bold">
                {"Add gallery images"}
              </span>
              <span className="mt-1 text-xs">
                {"These appear in the property photo set"}
              </span>
            </button>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{`${galleryPreviewItems.length}/${maxGalleryImages} selected`}</span>
            <span>{"JPG, PNG, WEBP"}</span>
          </div>
          <FieldError error={galleryError} />
        </div>
      </div>
    </section>
  )
}
