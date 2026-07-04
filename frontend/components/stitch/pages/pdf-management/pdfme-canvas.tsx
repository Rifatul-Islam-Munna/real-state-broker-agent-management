"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import type { Template } from "@pdfme/common"

import { createPdfmePlugins } from "@/lib/pdf/runtime"

type DesignerApi = {
  destroy: () => void
  getTemplate: () => Template
  onSaveTemplate: (callback: (template: Template) => void) => void
  saveTemplate: () => void
  onChangeTemplate: (callback: (template: Template) => void) => void
  updateTemplate: (template: Template) => void
}
type ViewerApi = { destroy: () => void }

export type PdfTemplateDesignerHandle = {
  getTemplate: () => Template | null
  saveTemplate: () => Promise<Template | null>
}

export const PdfTemplateDesignerCanvas = forwardRef<PdfTemplateDesignerHandle, {
  template: Template
  onTemplateChange: (template: Template) => void
}>(function PdfTemplateDesignerCanvas({
  template,
  onTemplateChange,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const designerRef = useRef<DesignerApi | null>(null)
  const changeRef = useRef(onTemplateChange)
  const lastDesignerValueRef = useRef("")
  const saveResolverRef = useRef<((template: Template | null) => void) | null>(null)

  useImperativeHandle(ref, () => ({
    getTemplate: () => designerRef.current?.getTemplate() ?? null,
    saveTemplate: () => {
      const designer = designerRef.current
      if (!designer) return Promise.resolve(null)

      return new Promise<Template | null>((resolve) => {
        let finished = false
        let timeout: ReturnType<typeof window.setTimeout> | undefined
        const resolveOnce = (template: Template | null) => {
          if (finished) return
          finished = true
          if (timeout) window.clearTimeout(timeout)
          saveResolverRef.current = null
          resolve(template)
        }
        timeout = window.setTimeout(() => {
          resolveOnce(designer.getTemplate())
        }, 500)
        saveResolverRef.current = resolveOnce
        designer.saveTemplate()
      })
    },
  }), [])

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
      designer.onSaveTemplate((nextTemplate) => {
        lastDesignerValueRef.current = JSON.stringify(nextTemplate)
        changeRef.current(nextTemplate)
        saveResolverRef.current?.(nextTemplate)
        saveResolverRef.current = null
      })
      designerRef.current = designer
    }
    void mount()
    return () => {
      active = false
      designerRef.current?.destroy()
      saveResolverRef.current?.(null)
      saveResolverRef.current = null
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
    <div className="h-full min-h-[520px] overflow-hidden bg-background">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  )
})

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
