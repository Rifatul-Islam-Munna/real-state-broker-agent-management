import type { ChangeEvent, RefObject } from "react"

import type { PropertyDocumentItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import type { PendingPropertyDocument } from "./property-form-shared"

type PropertyDocumentsSectionProps = {
  documents: PropertyDocumentItem[]
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveExisting: (index: number) => void
  onRemovePending: (id: string) => void
  onRenameExisting: (index: number, name: string) => void
  onRenamePending: (id: string, name: string) => void
  pendingDocuments: PendingPropertyDocument[]
}

export function PropertyDocumentsSection({
  documents,
  fileInputRef,
  onFileSelection,
  onRemoveExisting,
  onRemovePending,
  onRenameExisting,
  onRenamePending,
  pendingDocuments,
}: PropertyDocumentsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <AppIcon className="text-primary" name="description" />
            {"Important Property Documents"}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Upload multiple contracts, disclosures, plans, certificates, or other property files. Give every file a clear name."}
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} type="button" variant="outline">
          <AppIcon data-icon="inline-start" name="upload_file" />
          {"Add Documents"}
        </Button>
        <Input
          className="hidden"
          multiple
          onChange={onFileSelection}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {documents.length === 0 && pendingDocuments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {"No important documents added."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((document, index) => (
            <Card key={`${document.fileObjectName}-${index}`}>
              <CardContent className="flex flex-col gap-3 p-4">
                <Input
                  onChange={(event) => onRenameExisting(index, event.target.value)}
                  placeholder="Document display name"
                  value={document.name}
                />
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm text-muted-foreground">{document.fileName}</p>
                  <Button onClick={() => onRemoveExisting(index)} size="sm" type="button" variant="destructive">
                    {"Remove"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingDocuments.map((document) => (
            <Card key={document.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <Input
                  onChange={(event) => onRenamePending(document.id, event.target.value)}
                  placeholder="Document display name"
                  value={document.name}
                />
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm text-muted-foreground">{document.file.name}</p>
                  <Button onClick={() => onRemovePending(document.id)} size="sm" type="button" variant="destructive">
                    {"Remove"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
