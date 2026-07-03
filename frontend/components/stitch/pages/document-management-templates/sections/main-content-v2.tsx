"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  DocumentAccessLevel,
  DocumentRepositoryItem,
} from "@/@types/real-estate-api"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useCreateDocumentRepositoryItem,
  useDeleteDocumentRepositoryItem,
  useDocumentRepository,
  useDocumentRepositorySummary,
  useProperties,
  useUpdateDocumentRepositoryItem,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { deleteUploadedAsset } from "@/lib/upload-client"

import { DocumentEditorDialog } from "./document-editor-dialog-v2"
import {
  type DocumentFormValues,
  type DocumentModalState,
  type TemplateFilter,
  buildDocumentPayload,
  createEmptyDocumentForm,
  defaultDocumentCategories,
  documentAccessOptions,
  documentFileIcon,
  formatDocumentAccess,
  formatDocumentSize,
  mapDocumentToFormValues,
} from "./document-repository-shared"

const PAGE_SIZE = 10

function accessBadgeVariant(value: DocumentAccessLevel) {
  if (value === "Public") return "default" as const
  if (value === "AgentAccess") return "secondary" as const
  return "outline" as const
}

export function MainContentSection() {
  const [accessFilter, setAccessFilter] = useState<"" | DocumentAccessLevel>("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [modalState, setModalState] = useState<DocumentModalState>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all")
  const [pendingDelete, setPendingDelete] = useState<DocumentRepositoryItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const documentsQuery = useDocumentRepository({
    accessLevel: accessFilter || undefined,
    category: categoryFilter || undefined,
    isTemplate: templateFilter === "all" ? undefined : templateFilter === "template",
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
  })
  const summaryQuery = useDocumentRepositorySummary()
  const createDocumentMutation = useCreateDocumentRepositoryItem()
  const updateDocumentMutation = useUpdateDocumentRepositoryItem()
  const deleteDocumentMutation = useDeleteDocumentRepositoryItem()

  const documents = useMemo(
    () => documentsQuery.data?.items ?? [],
    [documentsQuery.data?.items],
  )
  const properties = useMemo(
    () => propertiesQuery.data?.items ?? [],
    [propertiesQuery.data?.items],
  )
  const isInitialLoading =
    !documentsQuery.data &&
    (documentsQuery.isLoading || documentsQuery.isFetching)
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultDocumentCategories,
          ...documents.map((item) => item.category).filter(Boolean),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [documents],
  )
  const stats = useMemo(
    () => [
      ["Total documents", summaryQuery.data?.totalDocuments ?? 0, "description"],
      ["Admin only", summaryQuery.data?.adminOnlyCount ?? 0, "admin_panel_settings"],
      ["Agent access", summaryQuery.data?.agentAccessCount ?? 0, "badge"],
      ["Public", summaryQuery.data?.publicCount ?? 0, "public"],
      ["Templates", summaryQuery.data?.templateCount ?? 0, "content_copy"],
      ["Need signature", summaryQuery.data?.signatureRequiredCount ?? 0, "ink_pen"],
    ] as const,
    [summaryQuery.data],
  )
  const initialValues = useMemo(
    () =>
      modalState?.mode === "edit"
        ? mapDocumentToFormValues(modalState.document)
        : createEmptyDocumentForm(),
    [modalState],
  )

  useEffect(() => {
    setSubmitError(null)
  }, [modalState])

  async function handleSubmit(values: DocumentFormValues) {
    setSubmitError(null)
    const payload = buildDocumentPayload(values)

    if (modalState?.mode === "edit") {
      const previousObjectName = modalState.document.fileObjectName ?? null
      const response = await updateDocumentMutation.mutateAsync({
        ...payload,
        id: modalState.document.id,
      })

      if (response.error) {
        setSubmitError(response.error.message)
        return false
      }

      if (previousObjectName && previousObjectName !== payload.fileObjectName) {
        await Promise.allSettled([deleteUploadedAsset(previousObjectName)])
      }
    } else {
      const response = await createDocumentMutation.mutateAsync(payload)

      if (response.error) {
        setSubmitError(response.error.message)
        return false
      }
    }

    setModalState(null)
    return true
  }

  function openDeleteDialog(document: DocumentRepositoryItem) {
    setDeleteError(null)
    setPendingDelete(document)
  }

  function closeDeleteDialog() {
    if (deleteDocumentMutation.isPending) return
    setDeleteError(null)
    setPendingDelete(null)
  }

  async function handleDelete() {
    if (!pendingDelete) return

    setDeleteError(null)
    const response = await deleteDocumentMutation.mutateAsync({
      id: String(pendingDelete.id),
    })

    if (response.error) {
      setDeleteError(response.error.message)
      return
    }

    if (pendingDelete.fileObjectName) {
      await Promise.allSettled([deleteUploadedAsset(pendingDelete.fileObjectName)])
    }

    setPendingDelete(null)
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-2xl">{"Document repository"}</CardTitle>
              <CardDescription className="max-w-3xl">
                {"Upload and manage contracts, disclosures, reusable templates, property files, and signature workflows."}
              </CardDescription>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {`Stored size: ${formatDocumentSize(summaryQuery.data?.totalSizeBytes ?? 0)}`}
              </p>
            </div>
            <Button
              onClick={() => setModalState({ mode: "create" })}
              type="button"
            >
              <AppIcon name="upload_file" />
              {"Upload document"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))]">
              <div className="relative">
                <AppIcon
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  name="search"
                />
                <Input
                  className="pl-9"
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search title, file, category, or folder"
                  value={searchTerm}
                />
              </div>

              <Select
                modal={false}
                onValueChange={(value) => {
                  setAccessFilter(
                    !value || value === "all"
                      ? ""
                      : (value as DocumentAccessLevel),
                  )
                  setPage(1)
                }}
                value={accessFilter || "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"All access"}</SelectItem>
                  {documentAccessOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatDocumentAccess(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                modal={false}
                onValueChange={(value) => {
                  setCategoryFilter(!value || value === "all" ? "" : value)
                  setPage(1)
                }}
                value={categoryFilter || "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"All categories"}</SelectItem>
                  {categoryOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                modal={false}
                onValueChange={(value) => {
                  setTemplateFilter((value || "all") as TemplateFilter)
                  setPage(1)
                }}
                value={templateFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All documents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"All documents"}</SelectItem>
                  <SelectItem value="template">{"Templates only"}</SelectItem>
                  <SelectItem value="standard">{"Standard files"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {stats.map(([label, value, icon]) => (
            <Card key={label} size="sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <AppIcon name={icon} />
                </span>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{"Repository files"}</CardTitle>
            <CardDescription>
              {"Edit metadata, download source files, or remove outdated documents."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInitialLoading ? (
              <Alert>
                <AlertDescription>{"Loading repository documents..."}</AlertDescription>
              </Alert>
            ) : documentsQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>{documentsQuery.error.message}</AlertDescription>
              </Alert>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/25 p-10 text-center text-sm text-muted-foreground">
                {"No repository files match the current filters."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"Document"}</TableHead>
                    <TableHead>{"Category"}</TableHead>
                    <TableHead>{"Type"}</TableHead>
                    <TableHead>{"Access"}</TableHead>
                    <TableHead>{"Version"}</TableHead>
                    <TableHead>{"Modified"}</TableHead>
                    <TableHead className="text-right">{"Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <AppIcon
                              className="text-xl"
                              name={documentFileIcon(document.mimeType)}
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold">{document.title}</p>
                            <p className="max-w-xs truncate text-xs text-muted-foreground">
                              {`${document.fileName} • ${formatDocumentSize(document.sizeBytes)}`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {document.isTemplate ? (
                                <Badge variant="secondary">{"Template"}</Badge>
                              ) : null}
                              {document.requiresSignature ? (
                                <Badge variant="outline">{"Needs signature"}</Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{document.category}</p>
                        <p className="text-xs text-muted-foreground">{document.folder}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{document.documentType}</p>
                        {document.propertyTitle ? (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {document.propertyTitle}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={accessBadgeVariant(document.accessLevel)}>
                          {formatDocumentAccess(document.accessLevel)}
                        </Badge>
                      </TableCell>
                      <TableCell>{document.versionLabel}</TableCell>
                      <TableCell>{formatDateTimeLabel(document.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            render={
                              <a
                                href={document.fileUrl}
                                rel="noreferrer"
                                target="_blank"
                              />
                            }
                            size="sm"
                            variant="outline"
                          >
                            {"Download"}
                          </Button>
                          <Button
                            onClick={() => setModalState({ mode: "edit", document })}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {"Edit"}
                          </Button>
                          <Button
                            onClick={() => openDeleteDialog(document)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            {"Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <PagePagination
              currentPage={page}
              onPageChange={setPage}
              totalPages={documentsQuery.data?.totalPages ?? 1}
            />
          </CardContent>
        </Card>
      </div>

      <DocumentEditorDialog
        initialValues={initialValues}
        isSubmitting={
          createDocumentMutation.isPending || updateDocumentMutation.isPending
        }
        mode={modalState?.mode ?? "create"}
        onClose={() => setModalState(null)}
        onSubmit={handleSubmit}
        open={modalState !== null}
        properties={properties}
        submitError={submitError}
      />

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => (!open ? closeDeleteDialog() : undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{"Delete document"}</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Delete “${pendingDelete.title}” from the repository and remove its uploaded file?`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              disabled={deleteDocumentMutation.isPending}
              onClick={closeDeleteDialog}
              type="button"
              variant="outline"
            >
              {"Cancel"}
            </Button>
            <Button
              disabled={deleteDocumentMutation.isPending}
              onClick={() => void handleDelete()}
              type="button"
              variant="destructive"
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
