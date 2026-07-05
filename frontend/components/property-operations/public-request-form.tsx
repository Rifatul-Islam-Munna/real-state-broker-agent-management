"use client"

import { useEffect } from "react"
import { CheckCircle2 } from "lucide-react"
import type { OperationsFormField } from "@/data/property-operations-presets"
import { PublicFormField } from "./public-form-field"
import { usePublicRequest } from "./use-public-request"
import { usePublicUpload } from "./use-public-upload"

export function PublicRequestForm({ token }: { token: string }) {
  const form = usePublicRequest(token)
  const files = usePublicUpload()
  useEffect(() => {
    if (files.urls.length) form.setAnswers((current) => ({ ...current, attachmentUrls: files.urls }))
  }, [files.urls])
  if (form.loading && !form.request) return <main className="flex min-h-screen items-center justify-center">Loading form...</main>
  if (!form.request) return <main className="flex min-h-screen items-center justify-center p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{form.error || "This form is unavailable."}</div></main>
  if (form.submitted) return <main className="flex min-h-screen items-center justify-center p-6"><div className="rounded-3xl border bg-background p-8 text-center"><CheckCircle2 className="mx-auto size-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold">Response submitted</h1><p className="mt-2 text-sm text-muted-foreground">The property administrator can now review your response.</p></div></main>
  let fields: OperationsFormField[] = []
  try { fields = JSON.parse(form.request.formSchemaJson || "[]") as OperationsFormField[] } catch { fields = [] }
  return <main className="min-h-screen bg-muted/20 p-4 md:p-8"><div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-background">
    <header className="border-b p-6" style={{ borderTopColor: form.request.brandColor, borderTopWidth: 6 }}><p className="text-sm font-semibold" style={{ color: form.request.brandColor }}>{form.request.businessName}</p><h1 className="mt-2 text-2xl font-bold">{form.request.title}</h1><p className="mt-2 text-sm text-muted-foreground">{form.request.propertyTitle}{form.request.showPropertyAddress ? ` · ${form.request.propertyLocation}` : ""}</p></header>
    <form className="space-y-5 p-6" onSubmit={(event) => { event.preventDefault(); void form.submit() }}>
      {form.request.welcomeMessage ? <p className="rounded-xl bg-muted/40 p-4 text-sm">{form.request.welcomeMessage}</p> : null}
      {form.request.instructions ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{form.request.instructions}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <PublicFormField change={(value) => form.setAnswers((current) => ({ ...current, [field.key]: value }))} field={field} key={field.key} upload={(file) => void files.upload(file)} uploading={files.uploading} value={form.answers[field.key]} />)}</div>
      {files.urls.length ? <p className="rounded-xl border p-3 text-xs text-muted-foreground">{files.urls.length} attachment(s) uploaded.</p> : null}
      {form.request.termsText ? <label className="flex gap-3 rounded-xl border p-4 text-sm"><input checked={form.accepted} onChange={(e) => form.setAccepted(e.target.checked)} required type="checkbox" /><span>{form.request.termsText}</span></label> : null}
      {form.error || files.error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{form.error || files.error}</p> : null}
      <button className="h-12 w-full rounded-xl font-semibold text-white disabled:opacity-50" disabled={form.loading || files.uploading} style={{ backgroundColor: form.request.brandColor }} type="submit">Submit response</button>
      <p className="text-center text-xs text-muted-foreground">No account is required. This form expires {new Date(form.request.expiresAt).toLocaleString()}.</p>
    </form>
  </div></main>
}
