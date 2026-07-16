"use client"

import { useMemo, useState } from "react"
import Papa from "papaparse"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{"Realtors"}</CardTitle>
              <CardDescription>{"Save realtor contacts once. Showing CSV/manual entry can use only email or phone later."}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadSample} type="button" variant="outline"><AppIcon name="download" />{"Sample CSV"}</Button>
              <Button onClick={() => setImportOpen(true)} type="button" variant="outline"><AppIcon name="upload_file" />{"Import CSV"}</Button>
              <Button onClick={() => setAddOpen(true)} type="button"><AppIcon name="add" />{"Add realtor"}</Button>
            </div>
          </CardHeader>
        </Card>
        {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">{"Realtor registry"}</CardTitle>
            <Input className="max-w-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Search realtor..." value={search} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>{"Name"}</TableHead><TableHead>{"Email"}</TableHead><TableHead>{"Phone"}</TableHead><TableHead>{"Brokerage"}</TableHead><TableHead>{"Notes"}</TableHead><TableHead className="text-right">{"History"}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {realtors.map((realtor) => (
                    <TableRow key={realtor.id}>
                      <TableCell className="font-medium">{realtor.name || "Realtor"}</TableCell>
                      <TableCell>{realtor.email || "-"}</TableCell>
                      <TableCell>{realtor.phone || "-"}</TableCell>
                      <TableCell>{realtor.brokerage || "-"}</TableCell>
                      <TableCell className="max-w-sm truncate">{realtor.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => setHistoryRealtorId(realtor.id)} size="sm" type="button" variant="outline">
                          {"View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog onOpenChange={setAddOpen} open={addOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{"Add realtor"}</DialogTitle><DialogDescription>{"Email or phone required."}</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            {fields.map(([key, label]) => (
              <label className="grid gap-1.5" key={key}>
                <Label>{label}</Label>
                <Input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
            <Button disabled={createMutation.isPending} onClick={() => void saveRealtor()} type="button">{"Save realtor"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setImportOpen} open={importOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{"Import realtors"}</DialogTitle><DialogDescription>{"Upload CSV, map columns manually, then import."}</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Input accept=".csv,text/csv" onChange={(event) => parseFile(event.target.files?.[0])} type="file" />
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map(([key, label]) => (
                <label className="grid gap-1.5" key={key}>
                  <Label>{label}</Label>
                  <Select onValueChange={(value) => setMapping((current) => ({ ...current, [key]: value === "none" ? "" : value }))} value={mapping[key] || "none"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{"Do not import"}</SelectItem>
                      {headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>
            <Button disabled={!canImport || importMutation.isPending} onClick={() => void importRows()} type="button">
              {`Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => !open && setHistoryRealtorId(null)} open={Boolean(historyRealtorId)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{historyQuery.data?.realtor.name || "Realtor history"}</DialogTitle>
            <DialogDescription>
              {historyQuery.data
                ? `${historyQuery.data.showingCount} showings, ${historyQuery.data.feedbackCount} feedback records.`
                : "Loading realtor timeline..."}
            </DialogDescription>
          </DialogHeader>
          {historyQuery.error ? <Alert variant="destructive"><AlertDescription>{historyQuery.error.message}</AlertDescription></Alert> : null}
          <div className="grid gap-3">
            {(historyQuery.data?.timeline ?? []).map((item) => (
              <div className="rounded-xl border bg-background p-3" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border px-2 py-0.5 text-xs font-semibold">{item.kind}</span>
                    {item.sentiment ? <span className="rounded-full border px-2 py-0.5 text-xs">{item.sentiment}</span> : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(item.at).toLocaleString()}</span>
                </div>
                <p className="mt-2 font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail || item.status || "-"}</p>
              </div>
            ))}
            {historyQuery.data && historyQuery.data.timeline.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {"No realtor history yet."}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
