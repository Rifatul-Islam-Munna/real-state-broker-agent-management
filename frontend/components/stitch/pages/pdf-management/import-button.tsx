"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { useImportPdfTemplate } from "@/hooks/use-pdfs-api"

export function PdfImportButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const importMutation = useImportPdfTemplate()
  const [error, setError] = useState<string | null>(null)

  async function importFile(file?: File) {
    if (!file) return
    setError(null)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("name", file.name.replace(/\.pdf$/i, ""))
    formData.set("category", "Universal")
    formData.set("status", "Draft")
    const result = await importMutation.mutateAsync(formData)
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Unable to import the PDF.")
      return
    }
    router.push(`/dashboard/pdfs/templates/${result.data.id}`)
  }

  return (
    <div className="space-y-2">
      <input
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          void importFile(event.target.files?.[0])
          event.target.value = ""
        }}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={importMutation.isPending}
        onClick={() => inputRef.current?.click()}
        variant="outline"
      >
        <AppIcon name="upload_file" />
        Import PDF
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
