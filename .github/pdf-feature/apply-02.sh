#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$(dirname 'frontend/components/stitch/pages/pdf-management/pdfme-canvas.tsx')"
cat > 'frontend/components/stitch/pages/pdf-management/pdfme-canvas.tsx' <<'PDF_SOURCE_2_3'
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Template } from "@pdfme/common"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPdfmePlugins } from "@/lib/pdfme-runtime"

type DesignerLike = {
  destroy: () => void
  getTemplate: () => Template
  onChangeTemplate: (callback: (template: Template) => void) => void
  updateTemplate: (template: Template) => void
}

type ViewerLike = {
  destroy: () => void
}

type PdfTemplateDesignerCanvasProps = {
  template: Template
  onTemplateChange: (template: Template) => void
}

export function PdfTemplateDesignerCanvas({
  template,
  onTemplateChange,
}: PdfTemplateDesignerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const designerRef = useRef<DesignerLike | null>(null)
  const onChangeRef = useRef(onTemplateChange)
  const lastDesignerValueRef = useRef("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    onChangeRef.current = onTemplateChange
  }, [onTemplateChange])

  useEffect(() => {
    let active = true

    async function mountDesigner() {
      if (!containerRef.current) return
      setIsLoading(true)
      setError(null)

      try {
        const [{ Designer }, plugins] = await Promise.all([
          import("@pdfme/ui"),
          createPdfmePlugins(),
        ])
        if (!active || !containerRef.current) return

        const designer = new Designer({
          domContainer: containerRef.current,
          template,
          plugins,
          options: {
            lang: "en",
            sidebarOpen: true,
            zoomLevel: 0.9,
            theme: {
              token: {
                borderRadius: 8,
                colorPrimary: "#2563eb",
              },
            },
          },
        }) as unknown as DesignerLike

        designer.onChangeTemplate((nextTemplate) => {
          lastDesignerValueRef.current = JSON.stringify(nextTemplate)
          onChangeRef.current(nextTemplate)
        })
        designerRef.current = designer
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load the PDF designer.")
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void mountDesigner()
    return () => {
      active = false
      designerRef.current?.destroy()
      designerRef.current = null
    }
    // pdfme owns the canvas after mounting. External template changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const serialized = JSON.stringify(template)
    if (!designerRef.current || serialized === lastDesignerValueRef.current) return
    lastDesignerValueRef.current = serialized
    designerRef.current.updateTemplate(template)
  }, [template])

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="relative min-h-[720px] overflow-hidden rounded-xl border bg-background">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
            Loading pdfme designer…
          </div>
        ) : null}
        <div className="h-[720px] w-full" ref={containerRef} />
      </div>
    </div>
  )
}

type PdfTemplateViewerCanvasProps = {
  template: Template
  inputs: Array<Record<string, string>>
}

export function PdfTemplateViewerCanvas({ template, inputs }: PdfTemplateViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ViewerLike | null>(null)
  const [error, setError] = useState<string | null>(null)
  const serialized = useMemo(() => JSON.stringify({ template, inputs }), [inputs, template])

  useEffect(() => {
    let active = true

    async function mountViewer() {
      if (!containerRef.current) return
      setError(null)
      viewerRef.current?.destroy()
      containerRef.current.innerHTML = ""

      try {
        const [{ Viewer }, plugins] = await Promise.all([
          import("@pdfme/ui"),
          createPdfmePlugins(),
        ])
        if (!active || !containerRef.current) return
        viewerRef.current = new Viewer({
          domContainer: containerRef.current,
          template,
          inputs,
          plugins,
          options: {
            lang: "en",
            zoomLevel: 0.85,
            theme: {
              token: {
                borderRadius: 8,
                colorPrimary: "#2563eb",
              },
            },
          },
        }) as unknown as ViewerLike
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load the PDF preview.")
      }
    }

    void mountViewer()
    return () => {
      active = false
      viewerRef.current?.destroy()
      viewerRef.current = null
    }
    // serialized deliberately forces a clean Viewer rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="h-[680px] overflow-hidden rounded-xl border bg-muted/20">
        <div className="h-full w-full" ref={containerRef} />
      </div>
    </div>
  )
}

PDF_SOURCE_2_3

mkdir -p "$(dirname 'frontend/app/dashboard/pdfs/generate/page.tsx')"
cat > 'frontend/app/dashboard/pdfs/generate/page.tsx' <<'PDF_SOURCE_2_8'
import type { Metadata } from "next"

import { PdfGenerationWorkspacePage } from "@/components/stitch/pages/pdf-management/pdf-pages"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Generate PDFs",
  description: "Autofill, preview, complete, and download real estate PDFs.",
}

type PageProps = {
  searchParams: Promise<{ templateId?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  await requireDashboardAccess(undefined, true)
  const { templateId } = await searchParams
  const parsedTemplateId = Number(templateId)
  return (
    <PdfGenerationWorkspacePage
      initialTemplateId={Number.isInteger(parsedTemplateId) && parsedTemplateId > 0 ? parsedTemplateId : undefined}
    />
  )
}

PDF_SOURCE_2_8

mkdir -p "$(dirname 'frontend/app/dashboard/pdfs/page.tsx')"
cat > 'frontend/app/dashboard/pdfs/page.tsx' <<'PDF_SOURCE_2_13'
import { redirect } from "next/navigation"

import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  redirect("/dashboard/pdfs/templates")
}

PDF_SOURCE_2_13

mkdir -p "$(dirname 'frontend/app/dashboard/pdfs/templates/[id]/page.tsx')"
cat > 'frontend/app/dashboard/pdfs/templates/[id]/page.tsx' <<'PDF_SOURCE_2_18'
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PdfTemplateEditorPage } from "@/components/stitch/pages/pdf-management/pdf-pages"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Edit PDF Template",
  description: "Edit a fillable PDF template and its automatic variables.",
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  await requireDashboardAccess(undefined, true)
  const { id } = await params
  const templateId = Number(id)
  if (!Number.isInteger(templateId) || templateId <= 0) notFound()
  return <PdfTemplateEditorPage templateId={templateId} />
}

PDF_SOURCE_2_18

mkdir -p "$(dirname 'frontend/app/dashboard/pdfs/templates/new/page.tsx')"
cat > 'frontend/app/dashboard/pdfs/templates/new/page.tsx' <<'PDF_SOURCE_2_23'
import type { Metadata } from "next"

import { PdfTemplateEditorPage } from "@/components/stitch/pages/pdf-management/pdf-pages"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Create PDF Template",
  description: "Design a fillable PDF template with pdfme.",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <PdfTemplateEditorPage />
}

PDF_SOURCE_2_23

mkdir -p "$(dirname 'frontend/app/dashboard/pdfs/templates/page.tsx')"
cat > 'frontend/app/dashboard/pdfs/templates/page.tsx' <<'PDF_SOURCE_2_28'
import type { Metadata } from "next"

import { PdfTemplateLibraryPage } from "@/components/stitch/pages/pdf-management/pdf-pages"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "PDF Templates",
  description: "Create and manage fillable real estate PDF templates.",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <PdfTemplateLibraryPage />
}

PDF_SOURCE_2_28
