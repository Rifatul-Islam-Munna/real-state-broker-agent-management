"use client"

import { useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDocumentRepository, useProperties } from "@/hooks/use-real-estate-api"
import { GENERATED_PDF_CATEGORY } from "@/lib/pdf/readme"

function downloadDocument(url: string, fileName: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
}

export function PdfDownloadHistory() {
  const [propertyId, setPropertyId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const documentsQuery = useDocumentRepository({ category: GENERATED_PDF_CATEGORY, isTemplate: false, page: 1, pageSize: 200 })
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })

  const documents = useMemo(() => {
    return (documentsQuery.data?.items ?? []).filter((item) => {
      const matchesProperty = !propertyId || String(item.propertyId ?? "") === propertyId
      const matchesTemplate = !templateId || item.tags.includes(`pdf-template:${templateId}`)
      return matchesProperty && matchesTemplate
    })
  }, [documentsQuery.data?.items, propertyId, templateId])

  const templateOptions = useMemo(() => {
    const values = new Map<string, string>()
    for (const item of documentsQuery.data?.items ?? []) {
      const tag = item.tags.find((value) => value.startsWith("pdf-template:"))
      if (tag) values.set(tag.slice("pdf-template:".length), item.description || item.title)
    }
    return [...values.entries()]
  }, [documentsQuery.data?.items])

  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Generated PDF archive</CardTitle>
          <CardDescription>Filter previously generated files by primary record or template and download them again.</CardDescription>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[520px]">
          <Select modal={false} onValueChange={(value) => setPropertyId(value === "all" ? "" : value)} value={propertyId || "all"}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All primary records" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All primary records</SelectItem>{(propertiesQuery.data?.items ?? []).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
          </Select>
          <Select modal={false} onValueChange={(value) => setTemplateId(value === "all" ? "" : value)} value={templateId || "all"}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All templates" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All templates</SelectItem>{templateOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Primary record</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {documents.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.fileName}</div></TableCell>
                  <TableCell>{item.propertyTitle || "—"}</TableCell>
                  <TableCell>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</TableCell>
                  <TableCell className="text-right"><Button onClick={() => downloadDocument(item.fileUrl, item.fileName)} size="sm" variant="outline"><AppIcon name="download" />Download</Button></TableCell>
                </TableRow>
              ))}
              {!documentsQuery.isLoading && documents.length === 0 ? <TableRow><TableCell className="h-28 text-center text-muted-foreground" colSpan={4}>No generated PDFs match these filters.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
