"use client"

import { useEffect, useRef } from "react"
import type { Template } from "@pdfme/common"

import { createPdfmePlugins } from "@/lib/pdf/runtime"

type DesignerApi = {
  destroy: () => void
  onChangeTemplate: (callback: (template: Template) => void) => void
}

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
      designer = new ui.Designer({
        domContainer: containerRef.current,
        template,
        plugins,
        options: { lang: "en", sidebarOpen: true, zoomLevel: 0.9 },
      }) as unknown as DesignerApi
      designer.onChangeTemplate(onTemplateChange)
    }
    void mount()
    return () => {
      active = false
      designer?.destroy()
    }
  }, [onTemplateChange, template])

  return (
    <div className="h-[720px] overflow-hidden rounded-xl border bg-background">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  )
}
