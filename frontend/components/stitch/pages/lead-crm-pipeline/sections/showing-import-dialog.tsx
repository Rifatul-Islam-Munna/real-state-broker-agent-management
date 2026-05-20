"use client"

import { useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ImportsTab } from "@/components/stitch/pages/property-feedback-workspace/imports-tab"
import { autoMap, parseCsv } from "@/components/stitch/pages/property-feedback-workspace/utils"
import { useImportPropertyFeedback, useImportPropertyShowings } from "@/hooks/use-real-estate-api"

const showingAliases = {
  propertyTitle: ["property", "property title", "listing"],
  propertyId: ["property id", "listing id"],
  contactName: ["name", "contact name", "visitor"],
  contactEmail: ["email", "contact email", "visitor email"],
  contactPhone: ["phone", "contact phone", "visitor phone"],
  startAt: ["date", "showing date", "showing time", "start at"],
  endAt: ["end at", "end time"],
  showingAgentName: ["broker", "broker name", "showing agent"],
  showingAgentEmail: ["broker email", "showing agent email"],
  showingAgentPhone: ["broker phone", "showing agent phone"],
  notes: ["notes", "note"],
} satisfies Record<string, string[]>

const feedbackAliases = {
  propertyTitle: ["property", "property title", "listing"],
  propertyId: ["property id", "listing id"],
  leadEmail: ["lead email", "email"],
  leadPhone: ["lead phone", "phone"],
  contactName: ["name", "contact name", "broker name"],
  contactEmail: ["contact email", "broker email"],
  contactPhone: ["contact phone", "broker phone"],
  feedbackAt: ["feedback date", "date"],
  sentiment: ["sentiment"],
  summary: ["summary"],
  feedbackText: ["feedback", "feedback text", "message"],
  issues: ["issues", "issue tags"],
} satisfies Record<string, string[]>

export function ShowingImportDialog({
  createdBy,
  open,
  onOpenChange,
}: {
  createdBy: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [showingImportHeaders, setShowingImportHeaders] = useState<string[]>([])
  const [showingImportRows, setShowingImportRows] = useState<Array<Record<string, string>>>([])
  const [showingImportMappings, setShowingImportMappings] = useState<Record<string, string>>({})
  const [showingBatchName, setShowingBatchName] = useState("")
  const [feedbackImportHeaders, setFeedbackImportHeaders] = useState<string[]>([])
  const [feedbackImportRows, setFeedbackImportRows] = useState<Array<Record<string, string>>>([])
  const [feedbackImportMappings, setFeedbackImportMappings] = useState<Record<string, string>>({})
  const [feedbackBatchName, setFeedbackBatchName] = useState("")
  const importShowingsMutation = useImportPropertyShowings()
  const importFeedbackMutation = useImportPropertyFeedback()

  async function handleShowingUpload(file: File) {
    const parsed = parseCsv(await file.text())
    setShowingImportHeaders(parsed.headers)
    setShowingImportRows(parsed.rows)
    setShowingImportMappings(autoMap(parsed.headers, showingAliases))
    setShowingBatchName(file.name.replace(/\.[^/.]+$/, ""))
  }

  async function handleFeedbackUpload(file: File) {
    const parsed = parseCsv(await file.text())
    setFeedbackImportHeaders(parsed.headers)
    setFeedbackImportRows(parsed.rows)
    setFeedbackImportMappings(autoMap(parsed.headers, feedbackAliases))
    setFeedbackBatchName(file.name.replace(/\.[^/.]+$/, ""))
  }

  async function handleImportShowings() {
    await importShowingsMutation.mutateAsync({
      batchName: showingBatchName || "Lead CRM showing import",
      fieldMappings: showingImportMappings,
      rows: showingImportRows,
      scheduleFeedbackRequest: true,
      createdBy,
    })
  }

  async function handleImportFeedback() {
    await importFeedbackMutation.mutateAsync({
      batchName: feedbackBatchName || "Lead CRM feedback import",
      fieldMappings: feedbackImportMappings,
      rows: feedbackImportRows,
      createdBy,
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex w-[min(100%-1.5rem,88rem)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
            {"Lead CRM import showing time"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Import showing schedule or feedback CSV here without leaving lead board."}
          </DialogDescription>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">
          <ImportsTab
            feedbackBatchName={feedbackBatchName}
            feedbackHeaders={feedbackImportHeaders}
            feedbackMappings={feedbackImportMappings}
            feedbackRows={feedbackImportRows}
            isFeedbackImporting={importFeedbackMutation.isPending}
            isShowingImporting={importShowingsMutation.isPending}
            onFeedbackBatchNameChange={setFeedbackBatchName}
            onFeedbackMappingChange={(key, value) => setFeedbackImportMappings((current) => ({ ...current, [key]: value }))}
            onFeedbackUpload={handleFeedbackUpload}
            onImportFeedback={handleImportFeedback}
            onImportShowings={handleImportShowings}
            onShowingBatchNameChange={setShowingBatchName}
            onShowingMappingChange={(key, value) => setShowingImportMappings((current) => ({ ...current, [key]: value }))}
            onShowingUpload={handleShowingUpload}
            showingBatchName={showingBatchName}
            showingHeaders={showingImportHeaders}
            showingMappings={showingImportMappings}
            showingRows={showingImportRows}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
