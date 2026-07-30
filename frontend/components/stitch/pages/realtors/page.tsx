"use client"

import { useMemo, useState } from "react"
import Papa from "papaparse"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateRealtor, useImportRealtors, useRealtorHistory, useRealtors } from "@/hooks/use-real-estate-api"

const emptyMapping = { brokerage: "", email: "", name: "", notes: "", phone: "" }
const fields = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["brokerage", "Brokerage"],
  ["notes", "Notes"],
] as const

export function RealtorsPage() {
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState({ brokerage: "", email: "", name: "", notes: "", phone: "" })
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [mapping, setMapping] = useState({ ...emptyMapping })
  const [message, setMessage] = useState<string | null>(null)
  const [historyRealtorId, setHistoryRealtorId] = useState<number | null>(null)
  const realtorsQuery = useRealtors({ search })
  const historyQuery = useRealtorHistory(historyRealtorId)
  const createMutation = useCreateRealtor()
  const importMutation = useImportRealtors()
  const realtors = realtorsQuery.data ?? []
  const canImport = rows.length > 0 && (mapping.email || mapping.phone)

  const sampleCsv = useMemo(
    () => "name,email,phone,brokerage,notes\nJane Realtor,jane@example.com,754-222-1111,Sunrise Realty,Preferred buyer agent\n",
    [],
  )

  function downloadSample() {
    const url = URL.createObjectURL(new Blob([sampleCsv], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.download = "realtors-sample.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  function parseFile(file?: File) {
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      complete: (result) => {
        const nextHeaders = result.meta.fields ?? []
        setHeaders(nextHeaders)
        setRows(result.data.filter((row) => Object.values(row).some((value) => `${value ?? ""}`.trim())))
        setMapping({
          brokerage: nextHeaders.find((item) => /broker/i.test(item)) ?? "",
          email: nextHeaders.find((item) => /email/i.test(item)) ?? "",
          name: nextHeaders.find((item) => /name|realtor/i.test(item)) ?? "",
          notes: nextHeaders.find((item) => /note/i.test(item)) ?? "",
          phone: nextHeaders.find((item) => /phone|mobile/i.test(item)) ?? "",
        })
      },
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    })
  }

  async function saveRealtor() {
    const response = await createMutation.mutateAsync(form)
    if (response.error) {
      setMessage(response.error.message)
      return
    }
    setForm({ brokerage: "", email: "", name: "", notes: "", phone: "" })
    setAddOpen(false)
  }

  async function importRows() {
    const response = await importMutation.mutateAsync({ mapping, rows })
    if (response.error) {
      setMessage(response.error.message)
      return
    }
    setMessage(response.data ? `${response.data.createdCount} realtors saved. ${response.data.failedCount} failed.` : null)
    setHeaders([])
    setRows([])
    setMapping({ ...emptyMapping })
  }

  const totalRealtors = realtors.length
  const withBrokerage = realtors.filter((realtor) => Boolean(realtor.brokerage)).length
  const withEmail = realtors.filter((realtor) => Boolean(realtor.email)).length
  const withPhone = realtors.filter((realtor) => Boolean(realtor.phone)).length

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Realtor Directory</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--ether-on-surface-variant)]">Manage realtor contacts, import registry data, and review showing and feedback history.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" onClick={downloadSample} type="button" variant="outline"><AppIcon name="download" />Sample CSV</Button>
            <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold" onClick={() => setImportOpen(true)} type="button" variant="outline"><AppIcon name="upload_file" />Import CSV</Button>
            <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)]" onClick={() => setAddOpen(true)} type="button"><AppIcon name="person_add" />Add Realtor</Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DirectoryMetric icon="groups" label="Total Realtors" value={totalRealtors} tone="primary" />
          <DirectoryMetric icon="apartment" label="With Brokerage" value={withBrokerage} tone="secondary" />
          <DirectoryMetric icon="mail" label="Email Ready" value={withEmail} tone="primary" />
          <DirectoryMetric icon="call" label="Phone Ready" value={withPhone} tone="tertiary" />
        </section>

        {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_28%,transparent)] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Realtor Registry</h2><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Live contacts from the realtor API.</p></div>
            <div className="relative w-full lg:max-w-sm"><AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" /><Input className="h-11 rounded-lg border-0 bg-[var(--ether-surface-container-low)] pl-9 shadow-none" onChange={(event) => setSearch(event.target.value)} placeholder="Search realtor, email, phone, brokerage..." value={search} /></div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1040px]">
              <TableHeader><TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)]"><TableHead className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Realtor</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Contact</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Brokerage</TableHead><TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Notes</TableHead><TableHead className="pr-6 text-right ether-label-caps text-[var(--ether-on-surface-variant)]">History</TableHead></TableRow></TableHeader>
              <TableBody>
                {realtors.map((realtor, index) => {
                  const initials=(realtor.name||"Realtor").split(" ").filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase()
                  return <TableRow className="border-0 transition hover:bg-[var(--ether-surface-container-low)]" key={realtor.id}><TableCell className="px-6 py-5"><div className="flex items-center gap-3"><span className={index%2===0?"flex size-10 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-xs font-bold text-[var(--ether-primary)]":"flex size-10 items-center justify-center rounded-full bg-[var(--ether-secondary-container)] text-xs font-bold text-[var(--ether-secondary)]"}>{initials||"R"}</span><div><p className="font-bold text-[var(--ether-on-surface)]">{realtor.name||"Realtor"}</p><p className="mt-1 text-xs text-[var(--ether-outline)]">ID #{realtor.id}</p></div></div></TableCell><TableCell><p className="text-sm font-medium text-[var(--ether-on-surface)]">{realtor.email||"No email"}</p><p className="mt-1 text-xs text-[var(--ether-on-surface-variant)]">{realtor.phone||"No phone"}</p></TableCell><TableCell><span className="rounded-full bg-[var(--ether-surface-container-high)] px-3 py-1 text-xs font-semibold text-[var(--ether-on-surface-variant)]">{realtor.brokerage||"Independent"}</span></TableCell><TableCell className="max-w-sm"><p className="line-clamp-2 text-sm text-[var(--ether-on-surface-variant)]">{realtor.notes||"No notes saved."}</p></TableCell><TableCell className="pr-6 text-right"><Button className="h-9 rounded-lg px-3 text-xs font-semibold" onClick={() => setHistoryRealtorId(realtor.id)} type="button" variant="outline"><AppIcon name="timeline" />View History</Button></TableCell></TableRow>
                })}
                {realtors.length===0?<TableRow className="border-0"><TableCell className="h-32 text-center text-sm text-[var(--ether-outline)]" colSpan={5}>{realtorsQuery.isLoading?"Loading realtors...":"No realtors match the current search."}</TableCell></TableRow>:null}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog onOpenChange={setAddOpen} open={addOpen}>
        <DialogContent className="max-w-2xl rounded-[20px] border-0 p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
          <DialogHeader className="border-b border-[var(--ether-outline-variant)] px-6 py-5"><DialogTitle className="text-2xl font-bold">Add Realtor</DialogTitle><DialogDescription>Email or phone is required.</DialogDescription></DialogHeader>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            {fields.map(([key, label]) => <label className={key==="notes"?"grid gap-2 sm:col-span-2":"grid gap-2"} key={key}><Label className="text-xs font-semibold text-[var(--ether-on-surface-variant)]">{label}</Label><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--ether-outline-variant)] px-6 py-4"><Button onClick={()=>setAddOpen(false)} variant="ghost">Cancel</Button><Button className="bg-[var(--ether-primary)] text-white" disabled={createMutation.isPending} onClick={() => void saveRealtor()} type="button">{createMutation.isPending?"Saving...":"Save Realtor"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setImportOpen} open={importOpen}>
        <DialogContent className="max-w-3xl rounded-[20px] border-0 p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
          <DialogHeader className="border-b border-[var(--ether-outline-variant)] px-6 py-5"><DialogTitle className="text-2xl font-bold">Import Realtors</DialogTitle><DialogDescription>Upload a CSV, map columns, then import live registry records.</DialogDescription></DialogHeader>
          <div className="space-y-5 p-6"><Input accept=".csv,text/csv" className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => parseFile(event.target.files?.[0])} type="file" /><div className="grid gap-4 md:grid-cols-2">{fields.map(([key,label])=><label className="grid gap-2" key={key}><Label className="text-xs font-semibold text-[var(--ether-on-surface-variant)]">{label}</Label><Select onValueChange={(value)=>setMapping((current)=>({...current,[key]:value==="none"?"":value}))} value={mapping[key]||"none"}><SelectTrigger className="h-11 rounded-lg border-[var(--ether-outline-variant)]"><span>{mapping[key]||"Do not import"}</span></SelectTrigger><SelectContent><SelectItem value="none">Do not import</SelectItem>{headers.map((header)=><SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></label>)}</div></div>
          <div className="flex justify-end gap-3 border-t border-[var(--ether-outline-variant)] px-6 py-4"><Button onClick={()=>setImportOpen(false)} variant="ghost">Cancel</Button><Button className="bg-[var(--ether-primary)] text-white" disabled={!canImport||importMutation.isPending} onClick={()=>void importRows()}>{importMutation.isPending?"Importing...":`Import ${rows.length} row${rows.length===1?"":"s"}`}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setHistoryRealtorId(null)} open={Boolean(historyRealtorId)}>
        <DialogContent className="max-h-[90vh] overflow-hidden rounded-[20px] border-0 p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)] sm:max-w-3xl">
          <DialogHeader className="border-b border-[var(--ether-outline-variant)] px-6 py-5"><DialogTitle className="text-2xl font-bold">{historyQuery.data?.realtor.name || "Realtor History"}</DialogTitle><DialogDescription>{historyQuery.data?`${historyQuery.data.showingCount} showings, ${historyQuery.data.feedbackCount} feedback records.`:"Loading realtor timeline..."}</DialogDescription></DialogHeader>
          <div className="custom-scrollbar max-h-[70vh] overflow-y-auto p-6">{historyQuery.error?<Alert variant="destructive"><AlertDescription>{historyQuery.error.message}</AlertDescription></Alert>:null}<div className="relative ml-3 space-y-4 border-l border-[var(--ether-outline-variant)] pl-6">{(historyQuery.data?.timeline??[]).map((item)=><div className="relative rounded-xl bg-[var(--ether-surface-container-low)] p-4" key={item.id}><span className="absolute -left-[31px] top-5 size-2 rounded-full bg-[var(--ether-primary)] ring-2 ring-white"/><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><span className="rounded-full bg-[var(--ether-primary-fixed)] px-2 py-1 text-[9px] font-bold text-[var(--ether-primary)]">{item.kind}</span>{item.sentiment?<span className="rounded-full bg-[var(--ether-secondary-container)]/35 px-2 py-1 text-[9px] font-bold text-[var(--ether-secondary)]">{item.sentiment}</span>:null}</div><span className="text-xs text-[var(--ether-outline)]">{new Date(item.at).toLocaleString()}</span></div><p className="mt-3 font-bold text-[var(--ether-on-surface)]">{item.title}</p><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{item.detail||item.status||"-"}</p></div>)}{historyQuery.data&&historyQuery.data.timeline.length===0?<div className="rounded-xl border border-dashed border-[var(--ether-outline-variant)] p-6 text-center text-sm text-[var(--ether-outline)]">No realtor history yet.</div>:null}</div></div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function DirectoryMetric({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: "primary" | "secondary" | "tertiary" }) {
  const toneClass = tone === "secondary" ? "bg-[var(--ether-secondary-container)]/35 text-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]"><div className="flex items-center justify-between gap-4"><div><p className="ether-label-caps text-[var(--ether-on-surface-variant)]">{label}</p><p className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">{value}</p></div><span className={`flex size-12 items-center justify-center rounded-2xl ${toneClass}`}><AppIcon name={icon} /></span></div></article>
}
