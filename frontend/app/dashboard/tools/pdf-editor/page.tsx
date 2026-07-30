"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import type { Template } from "@pdfme/common"
import { ArrowLeft, Download, FilePenLine, ShieldCheck, UploadCloud } from "lucide-react"

import { PdfTemplateDesignerCanvas, type PdfTemplateDesignerHandle } from "@/components/stitch/pages/pdf-management/pdfme-canvas"
import { Button } from "@/components/ui/button"
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
    const activeTemplate = (await designerRef.current?.saveTemplate()) ?? template
    if (!activeTemplate) return
    setBusy(true)
    try {
      const [{ generate }, plugins] = await Promise.all([
        import("@pdfme/generator"),
        createPdfmePlugins(),
      ])
      const inputs = Object.fromEntries(
        templateFieldNames(activeTemplate).map((field) => [field, ""])
      )
      const pdf = await generate({ template: activeTemplate, inputs: [inputs], plugins })
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }))
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = name || "edited-document.pdf"
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 py-6 text-[#0b1c30] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-8">
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4343d5]" href="/dashboard/tools">
            <ArrowLeft className="size-4" /> Back to Tools
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">
                <FilePenLine className="size-4" /> Document workspace
              </div>
              <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em]">PDF Editor</h1>
              <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#464555]">
                Upload an existing PDF and add text, signatures, images, fields, shapes, dates, tables, and QR codes.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[#c7c4d7] bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#d9fff8] text-[#006b5f]">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#006b5f]">Browser workspace</p>
                <p className="text-xs text-[#464555]">Your original file stays unchanged.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-5">
            <h2 className="text-xl font-bold">Edit an existing PDF</h2>
            <p className="mt-1 text-xs text-[#464555]">Choose a source file, set the export name, then use the editor below.</p>
          </div>
          <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.05em] text-[#464555]" htmlFor="pdf-upload">
                Choose PDF
              </Label>
              <Input
                accept="application/pdf,.pdf"
                className="h-12 rounded-xl border-[#c7c4d7] bg-[#f8f9ff] file:mr-4 file:rounded-lg file:border-0 file:bg-[#e1e0ff] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#4343d5]"
                id="pdf-upload"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importPdf(file)
                }}
                type="file"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-[0.05em] text-[#464555]" htmlFor="pdf-name">
                Download filename
              </Label>
              <Input
                className="h-12 rounded-xl border-[#c7c4d7] bg-[#f8f9ff] shadow-none"
                id="pdf-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <Button
              className="h-12 rounded-xl bg-[#4343d5] px-6 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]"
              disabled={!template || busy}
              onClick={() => void download()}
            >
              <Download className="mr-2 size-4" />
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </section>

        {template ? (
          <section className="overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-[#c7c4d7] bg-white px-5 py-3">
              <div>
                <p className="text-sm font-bold">Active document</p>
                <p className="text-xs text-[#464555]">Changes are reflected in the exported copy.</p>
              </div>
              <span className="rounded-full bg-[#d9fff8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#006b5f]">Ready</span>
            </div>
            <div className="h-[760px] bg-[#eef1f7] p-0">
              <PdfTemplateDesignerCanvas ref={designerRef} onTemplateChange={setTemplate} template={template} />
            </div>
          </section>
        ) : (
          <section className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#aeb3c4] bg-white px-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#eff0ff] text-[#4343d5]">
              <UploadCloud className="size-7" />
            </span>
            <h2 className="text-xl font-bold">Upload a PDF to begin</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#464555]">
              Select a PDF above to open the full document editor and prepare a new downloadable copy.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
