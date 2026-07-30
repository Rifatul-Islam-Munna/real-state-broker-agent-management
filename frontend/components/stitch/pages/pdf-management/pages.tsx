"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, FileInput, FilePlus2, FileText, Search, Sparkles } from "lucide-react"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"

import { PdfImportButton } from "./import-button"

export function PdfTemplateLibraryPage() {
  const [search, setSearch] = useState("")
  const query = usePdfTemplates({ page: 1, pageSize: 200, search })
  const templates = useMemo(() => query.data?.items ?? [], [query.data?.items])
  const summary = useMemo(
    () => ({
      total: query.data?.totalCount ?? 0,
      imported: templates.filter((item) => item.sourceType === "UploadedPdf").length,
      blank: templates.filter((item) => item.sourceType !== "UploadedPdf").length,
      fields: templates.reduce((sum, item) => sum + item.importedFields.length, 0),
    }),
    [query.data?.totalCount, templates]
  )

  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 py-6 text-[#0b1c30] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="mb-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#4343d5]">
              <FileText className="size-4" /> PDF workspace
            </div>
            <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em]">PDF Templates</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#464555]">
              Create blank pdfme designs or import existing fillable PDFs. Imported fields are detected and placed in the editor automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PdfImportButton />
            <Button
              className="h-11 rounded-xl bg-[#4343d5] px-5 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]"
              render={<Link href="/dashboard/pdfs/templates/new" />}
            >
              <AppIcon name="add" /> Create blank template
            </Button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<FileText className="size-5" />} label="Total templates" value={summary.total} />
          <SummaryCard icon={<FileInput className="size-5" />} label="Imported PDFs" value={summary.imported} />
          <SummaryCard icon={<FilePlus2 className="size-5" />} label="Blank designs" value={summary.blank} />
          <SummaryCard icon={<Sparkles className="size-5" />} label="Detected fields" value={summary.fields} teal />
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Template library</h2>
              <p className="mt-1 text-xs text-[#464555]">{summary.total} backend templates available</p>
            </div>
            <div className="relative w-full lg:w-[360px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#767586]" />
              <Input
                className="h-11 rounded-xl border-[#c7c4d7] bg-white pl-10 shadow-none"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates"
                value={search}
              />
            </div>
          </div>

          <div className="p-6">
            {query.isLoading ? (
              <div className="py-16 text-center text-sm text-[#464555]">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c7c4d7] bg-[#f8f9ff] px-6 py-16 text-center">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#e1e0ff] text-[#4343d5]">
                  <FileText className="size-6" />
                </span>
                <h3 className="text-lg font-bold">No templates found</h3>
                <p className="mt-2 text-sm text-[#464555]">Try another search or create a new PDF template.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <article
                    className="group rounded-2xl border border-[#d8d6e3] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#4343d5]/40 hover:shadow-[0_12px_28px_rgba(67,67,213,0.09)]"
                    key={template.id}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
                        <FileText className="size-5" />
                      </span>
                      <Badge className="rounded-full border-[#c7c4d7] bg-[#f8f9ff] text-[#464555]" variant="outline">
                        {template.category}
                      </Badge>
                    </div>
                    <h3 className="mt-5 text-lg font-bold tracking-[-0.02em]">{template.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#464555]">
                      {template.description || "No description"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#eff4ff] px-2.5 py-1 text-[10px] font-bold text-[#4343d5]">
                        {template.sourceType === "UploadedPdf" ? "Imported PDF" : "Blank design"}
                      </span>
                      <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-bold text-[#4b5563]">
                        {template.importedFields.length} fields
                      </span>
                      <span className="rounded-full bg-[#d9fff8] px-2.5 py-1 text-[10px] font-bold text-[#006b5f]">
                        {template.requiredVariables.length} required
                      </span>
                    </div>
                    <div className="mt-5 flex gap-2 border-t border-[#ecebf1] pt-4">
                      <Button
                        className="h-9 flex-1 rounded-lg border-[#c7c4d7] bg-white text-[#4343d5]"
                        render={<Link href={`/dashboard/pdfs/templates/${template.id}`} />}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        className="h-9 flex-1 rounded-lg bg-[#4343d5] text-white hover:bg-[#3737bd]"
                        render={<Link href={`/dashboard/pdfs/download?templateId=${template.id}`} />}
                        size="sm"
                      >
                        Use <ArrowRight className="ml-1 size-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  icon,
  label,
  teal = false,
  value,
}: {
  icon: React.ReactNode
  label: string
  teal?: boolean
  value: number
}) {
  return (
    <div className="rounded-2xl border border-[#c7c4d7] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#464555]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.03em]">{value.toLocaleString()}</p>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${teal ? "bg-[#d9fff8] text-[#006b5f]" : "bg-[#e1e0ff] text-[#4343d5]"}`}>
          {icon}
        </span>
      </div>
    </div>
  )
}
