// @ts-nocheck
"use client"

import { useId } from "react"
import { FilePlus2, ImagePlus, Trash2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { useFileUploadMutation } from "@/hooks/use-file-upload"
import { useImageUploadMutation } from "@/hooks/use-image-upload"

export function UploadCollectionField({
  label,
  optional = true,
  accept,
  kind,
  values,
  onChange,
}: {
  label: string
  optional?: boolean
  accept: string
  kind: "image" | "file"
  values: string[]
  onChange: (values: string[]) => void
}) {
  const inputId = useId()
  const imageUpload = useImageUploadMutation()
  const fileUpload = useFileUploadMutation()
  const isPending = imageUpload.isPending || fileUpload.isPending

  return (
    <div className="space-y-3">
      <FieldLabel htmlFor={inputId}>
        {label} {optional ? "(Optional)" : ""}
      </FieldLabel>

      <label
        htmlFor={inputId}
        className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-blue-50/70 p-4 transition hover:border-blue-300 hover:from-blue-50 hover:to-sky-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
            <UploadCloud className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-950">
              {kind === "image" ? "Choose image files" : "Choose document files"}
            </p>
            <p className="truncate text-xs text-slate-500">
              Tap to browse from your device
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition group-hover:text-blue-700">
          {isPending ? "Uploading..." : "Browse files"}
        </div>
      </label>

      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? [])
          if (!files.length) return

          const uploaded: string[] = []
          for (const file of files) {
            if (kind === "image") {
              const result = await imageUpload.mutateAsync(file)
              uploaded.push(result.url)
            } else {
              const result = await fileUpload.mutateAsync({
                file,
                category: label.toLowerCase(),
              })
              uploaded.push(result.url)
            }
          }

          onChange([...values, ...uploaded])
          event.target.value = ""
        }}
      />

      <FieldDescription>
        Upload from your PC or phone. No manual URL paste needed.
      </FieldDescription>

      <div className="space-y-2">
        {values.length ? values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              {kind === "image" ? <ImagePlus className="size-4" /> : <FilePlus2 className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                Uploaded {kind === "image" ? "image" : "file"} {index + 1}
              </p>
              <p className="truncate text-xs text-slate-500">{value}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 shadow-none"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No uploaded {kind === "image" ? "images" : "files"} yet.
          </div>
        )}
      </div>
    </div>
  )
}
