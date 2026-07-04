"use client"

import { useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLeads, useProperties } from "@/hooks/use-real-estate-api"
import {
  useDeletePdfGeneration,
  usePdfGenerations,
  usePdfTemplates,
} from "@/hooks/use-pdfs-api"

function downloadDocument(url: string, fileName: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.target = "_blank"
  anchor.rel = "noopener noreferrer"
  anchor.click()
}

export function PdfDownloadHistory() {
  const [propertyId, setPropertyId] = useState("")
  const [leadId, setLeadId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const generationsQuery = usePdfGenerations({
    page: 1,
    pageSize: 200,
    propertyId: propertyId || undefined,
    leadId: leadId || undefined,
    templateId: templateId || undefined,
  })
  const templatesQuery = usePdfTemplates({ page: 1, pageSize: 200 })
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const leadsQuery = useLeads({ page: 1, pageSize: 300 })
  const deleteMutation = useDeletePdfGeneration()
  const generations = generationsQuery.data?.items ?? []

  async function removeGeneration(id: number, fileName: string) {
    if (!window.confirm(`Delete “${fileName}” and its stored file?`)) return
    await deleteMutation.mutateAsync({ id })
  }

  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <CardTitle>Generated PDF archive</CardTitle>
          <CardDescription>
            Backend generation history with property, tenant / lead, and template filters.
          </CardDescription>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[760px]">
          <Select
            modal={false}
            onValueChange={(value) => setPropertyId(value === "all" ? "" : value)}
            value={propertyId || "all"}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="All properties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {(propertiesQuery.data?.items ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            modal={false}
            onValueChange={(value) => setLeadId(value === "all" ? "" : value)}
            value={leadId || "all"}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="All tenants / leads" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tenants / leads</SelectItem>
              {(leadsQuery.data?.items ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            modal={false}
            onValueChange={(value) => setTemplateId(value === "all" ? "" : value)}
            value={templateId || "all"}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="All templates" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {(templatesQuery.data?.items ?? []).map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Tenant / lead</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {(Number(item.sizeBytes) / 1024).toFixed(1)} KB
                    </div>
                  </TableCell>
                  <TableCell>{item.propertyTitle || "—"}</TableCell>
                  <TableCell>{item.leadName || "—"}</TableCell>
                  <TableCell>{item.templateName}</TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => downloadDocument(item.fileUrl, item.fileName)}
                        size="sm"
                        variant="outline"
                      >
                        <AppIcon name="download" />
                        Download
                      </Button>
                      <Button
                        disabled={deleteMutation.isPending}
                        onClick={() => void removeGeneration(item.id, item.fileName)}
                        size="sm"
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!generationsQuery.isLoading && generations.length === 0 ? (
                <TableRow>
                  <TableCell className="h-28 text-center text-muted-foreground" colSpan={6}>
                    No generated PDFs match these filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
