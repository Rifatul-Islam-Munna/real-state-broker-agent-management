"use client"

import { useEffect, useId, useState } from "react"
import { Download, ImagePlus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useGmailSignatureImport } from "@/hooks/use-real-estate-api"

export type EmailSignatureValues = {
  emailSignatureEnabled: boolean
  emailSignatureHtml: string
  emailSignatureText: string
  emailSignatureImageUrl: string
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

export function EmailSignatureField({
  values, onChange, fromEmail, gmailConnected, onError, onBusyChange,
}: {
  values: EmailSignatureValues
  onChange: (value: Partial<EmailSignatureValues>) => void
  fromEmail: string
  gmailConnected: boolean
  onError: (message: string | null) => void
  onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const gmailImport = useGmailSignatureImport()
  const [readingImage, setReadingImage] = useState(false)
  useEffect(() => {
    onBusyChange(readingImage || gmailImport.isPending)
    return () => onBusyChange(false)
  }, [readingImage, gmailImport.isPending, onBusyChange])
  const signatureHtml = values.emailSignatureHtml ||
    `<div style="white-space:pre-wrap">${escapeHtml(values.emailSignatureText).replace(/\r\n|\r|\n/g, "<br>")}</div>`
  const previewHtml = signatureHtml + (values.emailSignatureImageUrl
    ? `<div><img src="${escapeHtml(values.emailSignatureImageUrl)}" alt="Signature" style="display:block;max-width:320px;height:auto" width="320"></div>`
    : "")
  const hasContent = Boolean(values.emailSignatureHtml || values.emailSignatureText.trim() || values.emailSignatureImageUrl)

  async function importGmail() {
    onError(null)
    try {
      const response = await gmailImport.mutateAsync({ fromEmail: fromEmail.trim() || undefined })
      if (response.error || !response.data) {
        onError(response.error?.message ?? "Could not import Gmail signature.")
        return
      }
      onChange({
        emailSignatureEnabled: true,
        emailSignatureHtml: response.data.html,
        emailSignatureText: response.data.text,
        emailSignatureImageUrl: "",
      })
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not import Gmail signature.")
    }
  }

  async function chooseImage(file?: File) {
    if (!file) return
    onError(null)
    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type) || file.size > 200 * 1024) {
      onError("Choose a PNG, JPEG, GIF, or WebP image up to 200 KB.")
      return
    }
    setReadingImage(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("Could not read signature image."))
        reader.readAsDataURL(file)
      })
      onChange({ emailSignatureImageUrl: dataUrl, emailSignatureEnabled: true })
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not read signature image.")
    } finally {
      setReadingImage(false)
    }
  }

  return (
    <FieldSet className="rounded-xl border p-4">
      <FieldLegend>Email signature</FieldLegend>
      <FieldDescription>Add your name and logo, or import your existing Gmail signature.</FieldDescription>
      <FieldGroup>
        <Field orientation="horizontal">
          <Checkbox id={`${id}-enabled`} checked={values.emailSignatureEnabled} onCheckedChange={(checked) => onChange({ emailSignatureEnabled: checked === true })} />
          <FieldLabel htmlFor={`${id}-enabled`}>Append to outgoing emails, including owner reports</FieldLabel>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!gmailConnected || gmailImport.isPending || readingImage} onClick={() => void importGmail()}>
            <Download data-icon="inline-start" />
            {gmailImport.isPending ? "Importing..." : "Import Gmail signature"}
          </Button>
          {values.emailSignatureHtml ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ emailSignatureHtml: "" })}>
              Write custom signature
            </Button>
          ) : null}
        </div>
        {!gmailConnected ? <FieldDescription>Connect Gmail to import, or add your own signature below.</FieldDescription> : null}
        {!values.emailSignatureHtml ? (
          <Field>
            <FieldLabel htmlFor={`${id}-text`}>Signature text</FieldLabel>
            <Textarea id={`${id}-text`} value={values.emailSignatureText} maxLength={10000} rows={5} placeholder={"Your name\nLicensed Real Estate Agent\nCompany\nEmail · Phone"} onChange={(event) => onChange({ emailSignatureText: event.target.value })} />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`${id}-image`}><ImagePlus />Logo or signature image</FieldLabel>
          <Input id={`${id}-image`} type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={readingImage || gmailImport.isPending} onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            void chooseImage(file)
          }} />
          <FieldDescription>Up to 200 KB. Uploaded images appear inline beneath your signature text.</FieldDescription>
          {values.emailSignatureImageUrl ? (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange({ emailSignatureImageUrl: "" })}>
              <Trash2 data-icon="inline-start" />Remove image
            </Button>
          ) : null}
        </Field>
        {hasContent ? (
          <Field>
            <FieldLabel>Signature preview</FieldLabel>
            <iframe
              title="Email signature preview"
              sandbox=""
              className="h-56 w-full rounded-lg border bg-white"
              srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{margin:0;padding:16px;color:#111;font:14px Arial,sans-serif}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${previewHtml}</body></html>`}
            />
            <FieldDescription>Save connection to apply. Remove any signature already written in templates to avoid duplicates.</FieldDescription>
          </Field>
        ) : null}
      </FieldGroup>
    </FieldSet>
  )
}
