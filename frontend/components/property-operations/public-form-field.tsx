"use client"

import type { OperationsFormField } from "@/data/property-operations-presets"

export function PublicFormField({ field, value, change, upload, uploading }: { field: OperationsFormField; value: unknown; change: (value: unknown) => void; upload: (file: File) => void; uploading: boolean }) {
  const className = "mt-1.5 h-11 w-full rounded-xl border bg-background px-3 text-sm"
  return <label className="block text-sm font-medium">{field.label}{field.required ? " *" : ""}
    {field.type === "textarea" ? <textarea className="mt-1.5 min-h-28 w-full rounded-xl border p-3 text-sm" onChange={(e) => change(e.target.value)} required={field.required} value={String(value ?? "")} /> : null}
    {field.type === "select" ? <select className={className} onChange={(e) => change(e.target.value)} required={field.required} value={String(value ?? "")}><option value="">Select</option>{field.options?.map((item) => <option key={item}>{item}</option>)}</select> : null}
    {field.type === "checkbox" ? <span className="mt-2 flex items-center gap-2 rounded-xl border p-3"><input checked={Boolean(value)} onChange={(e) => change(e.target.checked)} required={field.required} type="checkbox" /> Confirm</span> : null}
    {field.type === "file" ? <input className={className} disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file) }} type="file" /> : null}
    {["text", "number", "date"].includes(field.type) ? <input className={className} onChange={(e) => change(e.target.value)} required={field.required} type={field.type} value={String(value ?? "")} /> : null}
  </label>
}
