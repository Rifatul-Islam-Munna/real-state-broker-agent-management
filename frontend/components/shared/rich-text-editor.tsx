// @ts-nocheck
"use client"

import { Bold, Italic, List, ListOrdered, Pilcrow } from "lucide-react"
import { Button } from "@/components/ui/button"

function sanitizeRichText(value?: string | null) {
  if (!value) return ""
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])javascript:.*?\2/gi, "")
}

function runCommand(command: string, value?: string) {
  if (typeof document === "undefined") return
  document.execCommand(command, false, value)
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here...",
  minHeightClassName = "min-h-40",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeightClassName?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("bold")}>
          <Bold className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("italic")}>
          <Italic className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("insertUnorderedList")}>
          <List className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("insertOrderedList")}>
          <ListOrdered className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => runCommand("formatBlock", "<p>")}>
          <Pilcrow className="size-4" />
        </Button>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        className={`${minHeightClassName} prose prose-sm max-w-none px-4 py-3 outline-none`}
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }}
      />
    </div>
  )
}

export function RichTextContent({
  value,
  className = "",
}: {
  value?: string | null
  className?: string
}) {
  return (
    <div
      className={`prose prose-sm max-w-none break-words text-slate-600 ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) || "<p></p>" }}
    />
  )
}
