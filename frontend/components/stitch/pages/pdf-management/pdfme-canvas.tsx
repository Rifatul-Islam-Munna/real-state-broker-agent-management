"use client"

import { useEffect, useRef } from "react"
import type { Template } from "@pdfme/common"

import { createPdfmePlugins } from "@/lib/pdf/runtime"

type DesignerApi = {
  destroy: () => void
  onChangeTemplate: (callback: (template: Template) => void) => void
  updateTemplate: (template: Template) => void
}
type ViewerApi = { destroy: () => void }

export function PdfTemplateDesignerCanvas({
  template,
  onTemplateChange,
}: {
  template: Template
  onTemplateChange: (template: Template) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const designerRef = useRef<DesignerApi | null>(null)
  const changeRef = useRef(onTemplateChange)
  const lastDesignerValueRef = useRef("")

  useEffect(() => {
    changeRef.current = onTemplateChange
  }, [onTemplateChange])

  useEffect(() => {
    let active = true
    async function mount() {
      if (!containerRef.current) return
      const ui = await import("@pdfme/ui")
      const plugins = await createPdfmePlugins()
      if (!active || !containerRef.current) return
      const designer = new ui.Designer({
        domContainer: containerRef.current,
        template,
        plugins,
        options: { lang: "en", sidebarOpen: true, zoomLevel: 0.9 },
      }) as unknown as DesignerApi
      designer.onChangeTemplate((nextTemplate) => {
        lastDesignerValueRef.current = JSON.stringify(nextTemplate)
        changeRef.current(nextTemplate)
      })
      designerRef.current = designer
    }
    void mount()
    return () => {
      active = false
      designerRef.current?.destroy()
      designerRef.current = null
    }
    // The designer owns this DOM node after the first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const serialized = JSON.stringify(template)
    if (!designerRef.current || serialized === lastDesignerValueRef.current) return
    lastDesignerValueRef.current = serialized
    designerRef.current.updateTemplate(template)
  }, [template])

  return (
    <div className="h-[720px] overflow-hidden rounded-xl border bg-background">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  )
}

export function PdfTemplateViewerCanvas({
  template,
  inputs,
}: {
  template: Template
  inputs: Array<Record<string, string>>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const serialized = JSON.stringify({ template, inputs })

  useEffect(() => {
    let viewer: ViewerApi | null = null
    let active = true
    async function mount() {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ""
      const ui = await import("@pdfme/ui")
      const plugins = await createPdfmePlugins()
      if (!active || !containerRef.current) return
      viewer = new ui.Viewer({
        domContainer: containerRef.current,
        template,
        inputs,
        plugins,
        options: { lang: "en", zoomLevel: 0.85 },
      }) as unknown as ViewerApi
    }
    void mount()
    return () => {
      active = false
      viewer?.destroy()
    }
    // serialized deliberately rebuilds the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])

  return (
    <div className="h-[680px] overflow-hidden rounded-xl border bg-muted/20">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  )
}
