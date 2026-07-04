"use client"

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { PdfShell } from "./shell"

export function PdfTemplateLibraryPage() {
  return (
    <PdfShell
      action={<Button render={<Link href="/dashboard/pdfs/templates/new" />}><AppIcon name="add" />Create template</Button>}
      description="Design reusable fillable documents and prepare them from live records."
      title="PDF templates"
    >
      <Card>
        <CardHeader>
          <CardTitle>Template library</CardTitle>
          <CardDescription>Saved templates appear here.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </PdfShell>
  )
}
