"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  useRealtorShowings,
  useSendRealtorShowingMessage,
  useUpdateRealtorShowingAutomation,
  useUpdateRealtorShowingProperty,
} from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"
import {
  formatDateTimeInZone,
  toDateTimeLocalInZone,
} from "@/lib/time-zone"

import {
  RealtorShowingAutomationSheetV2,
  type ShowingAutomationEditor,
} from "./realtor-showing-automation-sheet-v2"
import { RealtorShowingEntryDialogsV2 } from "./realtor-showing-entry-dialogs-v2"

export function RealtorShowingsPageV2() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [propertyPickerShowingId, setPropertyPickerShowingId] = useState<number | null>(null)
  const [propertySearch, setPropertySearch] = useState("")
  const [automationEditor, setAutomationEditor] =
    useState<ShowingAutomationEditor | null>(null)

  const showingsQuery = useRealtorShowings(search)
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const templatesQuery = useLeadOutreachTemplates()
  const schedulingQuery = useSchedulingSettings()
  const propertyMutation = useUpdateRealtorShowingProperty()
  const automationMutation = useUpdateRealtorShowingAutomation()
  const sendMessageMutation = useSendRealtorShowingMessage()

  useEffect(() => {
    if (searchParams.get("import") === "1") setImportOpen(true)
  }, [searchParams])

  const rawShowings = showingsQuery.data
  const showings = Array.isArray(rawShowings)
    ? rawShowings
    : rawShowings?.items ?? []
  const totalShowings = Array.isArray(rawShowings)
    ? rawShowings.length
    : rawShowings?.totalCount ?? showings.length
  const properties = propertiesQuery.data?.items ?? []
  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"
  const templates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) =>
          template.isActive !== false &&
          (template.audience === "Realtor" ||
            template.audience === "LeadShowing" ||
            template.id === "showing-confirmation"),
      ),
    [templatesQuery.data],
  )
  const directTemplates = useMemo(
    () =>
      templates.filter(
        (template) => (template.sequenceType ?? "Direct") === "Direct",
      ),
    [templates],
  )
  const followUpTemplates = useMemo(
    () =>
      templates.filter(
        (template) => (template.sequenceType ?? "Direct") !== "Direct",
      ),
    [templates],
  )
  const matchedCount = showings.filter((item) => item.propertyId).length
  const scheduledCount = showings.filter(
    (item) => item.automationStatus === "Scheduled",
  ).length
  const stoppedCount = showings.filter(
    (item) => item.automationStatus === "StoppedByReply",
  ).length
  const completedCount = showings.filter((item) => item.automationStatus === "NotScheduled").length
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(showings.length / pageSize))
  const paginatedShowings = showings.slice((page - 1) * pageSize, page * pageSize)
  const matchRate = totalShowings > 0 ? Math.round((matchedCount / totalShowings) * 100) : 0
  const successRate = totalShowings > 0 ? Math.round(((scheduledCount + stoppedCount) / totalShowings) * 100) : 0
  const averageMatch = showings.length > 0 ? Math.round((showings.reduce((sum, item) => sum + item.propertyMatchScore, 0) / showings.length) * 100) : 0


  async function saveAutomation() {
    if (!automationEditor) return
    const response = await automationMutation.mutateAsync(automationEditor)
    if (!response.error) setAutomationEditor(null)
  }

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Showing Registry</h1>
            <p className="mt-2 text-base text-[var(--ether-on-surface-variant)]">Real-time property visit tracking and follow-up status.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" render={<Link href="/dashboard/settings#communication-templates" />} variant="outline"><AppIcon name="description" />Templates</Button>
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" onClick={() => setImportOpen(true)} type="button" variant="outline"><AppIcon name="upload_file" />Import</Button>
            <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)]" render={<Link href="/dashboard/realtor-showings/new" />} type="button"><AppIcon name="add" />New Showing</Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)] md:grid-cols-2 xl:grid-cols-4">
          <RegistryMetric label="Total Showings" value={totalShowings} meta="Live registry" tone="primary" />
          <RegistryMetric label="Matched" value={matchedCount} meta={`${matchRate}% rate`} tone="secondary" />
          <RegistryMetric label="Active Automations" value={scheduledCount} meta="Scheduled" tone="primary" />
          <RegistryMetric label="Replied / Stopped" value={stoppedCount} meta={`${completedCount} pending`} tone="tertiary" />
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3"><h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Registries</h2><Badge className="rounded-md border-0 bg-[var(--ether-primary-fixed)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-primary)]">Live</Badge></div>
            <div className="relative w-full lg:max-w-sm"><AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" /><Input className="h-11 rounded-lg border-0 bg-[var(--ether-surface-container-low)] pl-9 shadow-none" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Filter by realtor, property, email, or phone" value={search} /></div>
          </div>

          {showingsQuery.isLoading ? <div className="p-12 text-center text-sm text-[var(--ether-outline)]">Loading showings...</div> : showingsQuery.error ? <div className="p-6"><Alert variant="destructive"><AlertDescription>{showingsQuery.error.message}</AlertDescription></Alert></div> : paginatedShowings.length === 0 ? <div className="p-12 text-center text-sm text-[var(--ether-outline)]">No realtor showings match the current search.</div> : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader><TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)]"><TableHead className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Realtor</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Showing Date/Time</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Property Details</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Follow-up</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Status</TableHead><TableHead className="pr-6 text-right ether-label-caps text-[var(--ether-on-surface-variant)]">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{paginatedShowings.map((showing, index) => { const selectedProperty = properties.find((property) => property.id === showing.propertyId); const initials=(showing.realtorName||"Realtor").split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase(); return <TableRow className="border-0 transition hover:bg-[var(--ether-surface-container-low)]" key={showing.id}><TableCell className="px-6 py-5"><div className="flex items-center gap-3"><span className={index%2===0?"flex size-10 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-xs font-bold text-[var(--ether-primary)]":"flex size-10 items-center justify-center rounded-full bg-[var(--ether-secondary-container)] text-xs font-bold text-[var(--ether-secondary)]"}>{initials||"R"}</span><div><p className="font-bold text-[var(--ether-on-surface)]">{showing.realtorName||"Realtor"}</p><p className="mt-1 max-w-44 truncate text-xs text-[var(--ether-on-surface-variant)]">{showing.realtorEmail||showing.realtorPhone||"No contact"}</p></div></div></TableCell><TableCell className="text-sm text-[var(--ether-on-surface)]">{showing.showingAt?formatDateTimeInZone(showing.showingAt,timeZone):"Not provided"}</TableCell><TableCell className="min-w-[320px]"><button className="flex h-10 w-full items-center justify-between rounded-lg border border-[var(--ether-outline-variant)] bg-white px-3 text-left text-sm" disabled={propertyMutation.isPending} onClick={()=>{setPropertyPickerShowingId(showing.id);setPropertySearch("")}} type="button"><span className="line-clamp-1">{selectedProperty?`${selectedProperty.title} - ${selectedProperty.location}`:showing.propertyText||"Choose property"}</span><AppIcon className="shrink-0 text-[var(--ether-outline)]" name="search" /></button><div className="mt-2 flex items-center gap-2"><Badge className="rounded-md border-0 bg-[var(--ether-surface-container-high)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-on-surface-variant)]">{showing.propertyMatchMethod}</Badge><span className="text-xs text-[var(--ether-outline)]">{Math.round(showing.propertyMatchScore*100)}% match</span></div></TableCell><TableCell><div className="flex flex-wrap gap-2">{showing.emailEnabled?<Badge className="rounded-full border-0 bg-[var(--ether-primary-fixed)] px-2.5 py-1 text-[10px] text-[var(--ether-primary)]">Email</Badge>:null}{showing.smsEnabled?<Badge className="rounded-full border-0 bg-[var(--ether-secondary-container)]/35 px-2.5 py-1 text-[10px] text-[var(--ether-secondary)]">SMS</Badge>:null}</div><p className="mt-2 text-xs text-[var(--ether-outline)]">{showing.outreachAt?formatDateTimeInZone(showing.outreachAt,timeZone):"Send immediately"}</p></TableCell><TableCell><Badge className={showing.automationStatus==="StoppedByReply"?"rounded-full border-0 bg-[var(--ether-error-container)] px-3 py-1 text-[10px] font-bold text-[var(--ether-error)]":showing.automationStatus==="Scheduled"?"rounded-full border-0 bg-[var(--ether-primary-fixed)] px-3 py-1 text-[10px] font-bold text-[var(--ether-primary)]":"rounded-full border-0 bg-[var(--ether-secondary-container)]/35 px-3 py-1 text-[10px] font-bold text-[var(--ether-secondary)]"}>{showing.automationStatus==="StoppedByReply"?"Replied":showing.automationStatus}</Badge></TableCell><TableCell className="pr-6"><div className="flex justify-end gap-2">{showing.automationStatus==="NotScheduled"&&(showing.emailEnabled||showing.smsEnabled)?<Button className="h-9 rounded-lg px-3 text-xs font-semibold" disabled={sendMessageMutation.isPending} onClick={()=>void sendMessageMutation.mutateAsync({id:showing.id})} type="button"><AppIcon name="send" />Send</Button>:null}<Button className="h-9 rounded-lg px-3 text-xs font-semibold" onClick={()=>setAutomationEditor({directTemplateId:showing.directTemplateId,emailEnabled:showing.emailEnabled,followUpEnabled:showing.followUpEnabled,followUpGapDays:showing.followUpGapDays,followUpTemplateId:showing.followUpTemplateId,id:showing.id,outreachAt:toDateTimeLocalInZone(showing.outreachAt,timeZone),realtorName:showing.realtorName,smsEnabled:showing.smsEnabled})} type="button" variant="outline"><AppIcon name="edit" />Edit</Button></div></TableCell></TableRow>})}</TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_24%,transparent)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[var(--ether-on-surface-variant)]">Page {page} of {totalPages}</p><div className="flex items-center gap-2"><Button disabled={page<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))} size="sm" variant="outline">Previous</Button><Button disabled={page>=totalPages} onClick={()=>setPage((value)=>Math.min(totalPages,value+1))} size="sm" variant="outline">Next</Button></div></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
            <div className="flex items-center justify-between gap-4"><h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Conversion Insights</h2><Badge className="rounded-md border-0 bg-[var(--ether-secondary-container)]/35 px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-secondary)]">Live Optimization</Badge></div>
            <div className="mt-6 grid gap-6 md:grid-cols-[140px_1fr] md:items-center">
              <div className="relative mx-auto flex size-28 items-center justify-center rounded-full" style={{background:`conic-gradient(var(--ether-primary) ${successRate}%, var(--ether-surface-container-high) 0)`}}><div className="flex size-20 flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold text-[var(--ether-on-surface)]">{successRate}%</span><span className="text-[9px] font-bold uppercase text-[var(--ether-outline)]">Success</span></div></div>
              <div><p className="text-sm leading-7 text-[var(--ether-on-surface-variant)]">Automation workflows are currently converting showing visits into follow-ups using live registry data.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[var(--ether-outline-variant)]/40 p-4"><p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Average Match</p><p className="mt-2 text-lg font-bold text-[var(--ether-on-surface)]">{averageMatch}%</p></div><div className="rounded-xl border border-[var(--ether-outline-variant)]/40 p-4"><p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Automation Coverage</p><p className="mt-2 text-lg font-bold text-[var(--ether-on-surface)]">{scheduledCount} active</p></div></div></div>
            </div>
          </article>

          <article className="rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
            <div className="border-b border-[var(--ether-outline-variant)]/30 px-5 py-4"><h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Recent Logs</h2></div>
            <div className="space-y-4 p-5">{showings.slice(0,4).map((item,index)=><div className="flex gap-3" key={item.id}><span className={index===2?"mt-1 size-2 rounded-full bg-[var(--ether-error)]":"mt-1 size-2 rounded-full bg-[var(--ether-primary)]"}/><div><p className="text-sm font-semibold text-[var(--ether-on-surface)]">{item.realtorName||"Realtor"} ? {item.automationStatus}</p><p className="mt-1 text-xs text-[var(--ether-outline)]">{formatDateTimeInZone(item.updatedAt,timeZone)}</p></div></div>)}</div>
            <div className="border-t border-[var(--ether-outline-variant)]/30 px-5 py-4 text-center text-xs font-bold text-[var(--ether-primary)]">Live registry activity</div>
          </article>
        </section>
      </div>


      <Dialog open={propertyPickerShowingId !== null} onOpenChange={(open)=>!open&&setPropertyPickerShowingId(null)}>
        <DialogContent className="max-w-2xl rounded-[20px] border-0 p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
          <DialogHeader className="border-b border-[var(--ether-outline-variant)] px-6 py-5"><DialogTitle className="text-xl font-bold">Select property</DialogTitle><DialogDescription>Search by title or location, then assign it to this showing.</DialogDescription></DialogHeader>
          <div className="p-5">
            <div className="relative"><AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search"/><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)] pl-9" onChange={(event)=>setPropertySearch(event.target.value)} placeholder="Search properties..." value={propertySearch}/></div>
            <div className="custom-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              <button className="flex w-full items-center justify-between rounded-xl border border-dashed border-[var(--ether-outline-variant)] p-4 text-left hover:bg-[var(--ether-surface-container-low)]" onClick={()=>{if(propertyPickerShowingId!==null)void propertyMutation.mutateAsync({id:propertyPickerShowingId,propertyId:null});setPropertyPickerShowingId(null)}} type="button"><span><span className="block font-semibold">Unmatched</span><span className="mt-1 block text-xs text-[var(--ether-outline)]">Remove the current property match.</span></span><AppIcon name="close"/></button>
              {properties.filter((property)=>`${property.title} ${property.location}`.toLowerCase().includes(propertySearch.trim().toLowerCase())).map((property)=><button className="flex w-full items-center justify-between rounded-xl border border-transparent p-4 text-left hover:border-[var(--ether-outline-variant)] hover:bg-[var(--ether-surface-container-low)]" key={property.id} onClick={()=>{if(propertyPickerShowingId!==null)void propertyMutation.mutateAsync({id:propertyPickerShowingId,propertyId:property.id});setPropertyPickerShowingId(null)}} type="button"><span className="min-w-0"><span className="block truncate font-semibold">{property.title}</span><span className="mt-1 block truncate text-xs text-[var(--ether-outline)]">{property.location}</span></span><AppIcon className="text-[var(--ether-primary)]" name="chevron_right"/></button>)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RealtorShowingEntryDialogsV2 directTemplates={directTemplates} followUpTemplates={followUpTemplates} importOpen={importOpen} manualOpen={false} onImportOpenChange={setImportOpen} onManualOpenChange={() => undefined} properties={properties} timeZone={timeZone} />
      <RealtorShowingAutomationSheetV2 directTemplates={directTemplates} editor={automationEditor} followUpTemplates={followUpTemplates} isSaving={automationMutation.isPending} onChange={setAutomationEditor} onClose={() => setAutomationEditor(null)} onSave={() => void saveAutomation()} timeZone={timeZone} />
    </main>
  )
}

function RegistryMetric({ label, value, meta, tone }: { label: string; value: number; meta: string; tone: "primary" | "secondary" | "tertiary" }) {
  const valueClass = tone === "secondary" ? "text-[var(--ether-secondary)]" : tone === "tertiary" ? "text-[var(--ether-error)]" : "text-[var(--ether-primary)]"
  return <article className="px-5 py-3"><p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{label}</p><div className="mt-2 flex items-end gap-2"><span className={`text-2xl font-bold ${valueClass}`}>{value}</span><span className="pb-1 text-xs text-[var(--ether-on-surface-variant)]">{meta}</span></div></article>
}
