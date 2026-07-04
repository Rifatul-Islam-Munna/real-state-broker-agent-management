"use client"

import { useEffect, useRef } from "react"
import type { Template } from "@pdfme/common"

import { createPdfmePlugins } from "@/lib/pdf/runtime"

type DesignerApi = {
  destroy: () => void
  onChangeTemplate: (callback: (template: Template) => void) => void
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

  useEffect(() => {
    let designer: DesignerApi | null = null
    let active = true
    async function mount() {
      if (!containerRef.current) return
      const ui = await import("@pdfme/ui")
      const plugins = await createPdfmePlugins()
      if (!active || !containerRef.current) return
      designer = new ui.Designer({ domContainer: containerRef.current, template, plugins, options: { lang: "en", sidebarOpen: true, zoomLevel: 0.9 } }) as unknown as DesignerApi
      designer.onChangeTemplate(onTemplateChange)
    }
    void mount()
    return () => {
      active = false
      designer?.destroy()
    }
  }, [onTemplateChange, template])

  return <div className="h-[720px] overflow-hidden rounded-xl border bg-background"><div className="h-full w-full" ref={containerRef} /></div>
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
      viewer = new ui.Viewer({ domContainer: containerRef.current, template, inputs, plugins, options: { lang: "en", zoomLevel: 0.85 } }) as unknown as ViewerApi
    }
    void mount()
    return () => {
      active = false
      viewer?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])

  return <div className="h-[680px] overflow-hidden rounded-xl border bg-muted/20"><div className="h-full w-full" ref={containerRef} /></div>
}
