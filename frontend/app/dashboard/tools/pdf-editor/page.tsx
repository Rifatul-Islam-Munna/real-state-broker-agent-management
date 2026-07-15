"use client"

import { useRef, useState } from "react"
import type { Template } from "@pdfme/common"
import { Download, FilePenLine } from "lucide-react"
import { PdfTemplateDesignerCanvas, type PdfTemplateDesignerHandle } from "@/components/stitch/pages/pdf-management/pdfme-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPdfmePlugins, templateFieldNames } from "@/lib/pdf/runtime"

export default function PdfEditorPage() {
  const designerRef = useRef<PdfTemplateDesignerHandle | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [name, setName] = useState("edited-document.pdf")
  const [busy, setBusy] = useState(false)

  async function importPdf(file: File) {
    setName(file.name.replace(/\.pdf$/i, "") + "-edited.pdf")
    setTemplate({ basePdf: await file.arrayBuffer(), schemas: [[]], pdfmeVersion: "6.0.0" } as Template)
  }

  async function download() {
    const activeTemplate = await designerRef.current?.saveTemplate() ?? template
    if (!activeTemplate) return
    setBusy(true)
    try {
      const [{ generate }, plugins] = await Promise.all([import("@pdfme/generator"), createPdfmePlugins()])
      const inputs = Object.fromEntries(templateFieldNames(activeTemplate).map((field) => [field, ""]))
      const pdf = await generate({ template: activeTemplate, inputs: [inputs], plugins })
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }))
      const anchor = document.createElement("a")
      anchor.href = url; anchor.download = name || "edited-document.pdf"; anchor.click(); URL.revokeObjectURL(url)
    } finally { setBusy(false) }
  }

  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-3xl font-bold tracking-tight">PDF Editor</h1><p className="mt-1 text-muted-foreground">Upload an existing PDF and add text, signatures, images, fields, shapes, dates, tables, and QR codes.</p></div>
    <Card><CardHeader><CardTitle>Edit an existing PDF</CardTitle><CardDescription>The original file is not changed. Download a new copy after editing.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2"><Label htmlFor="pdf-upload">Choose PDF</Label><Input id="pdf-upload" type="file" accept="application/pdf,.pdf" onChange={(event) => { const file=event.target.files?.[0]; if(file) void importPdf(file) }}/></div>
      <div className="flex-1 space-y-2"><Label htmlFor="pdf-name">Download filename</Label><Input id="pdf-name" value={name} onChange={(event)=>setName(event.target.value)}/></div>
      <Button disabled={!template || busy} onClick={()=>void download()}><Download className="mr-2 size-4"/>{busy?"Preparing…":"Download PDF"}</Button>
    </CardContent></Card>
    {template ? <Card className="overflow-hidden"><CardContent className="h-[760px] p-0"><PdfTemplateDesignerCanvas ref={designerRef} template={template} onTemplateChange={setTemplate}/></CardContent></Card> : <Card className="border-dashed"><CardContent className="flex min-h-80 flex-col items-center justify-center text-center"><FilePenLine className="mb-4 size-12 text-muted-foreground"/><h2 className="text-xl font-semibold">Upload a PDF to begin</h2><p className="mt-2 text-sm text-muted-foreground">Your document remains in the browser while you edit it.</p></CardContent></Card>}
  </div>
}
