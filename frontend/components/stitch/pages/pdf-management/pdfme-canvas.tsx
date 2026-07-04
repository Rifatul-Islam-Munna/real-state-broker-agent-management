"use client"

import { useEffect, useRef } from "react"
import type { Template } from "@pdfme/common"

export function PdfTemplateDesignerCanvas({ template }: { template: Template }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { void template }, [template])
  return <div className="h-[720px] w-full" ref={containerRef} />
}
