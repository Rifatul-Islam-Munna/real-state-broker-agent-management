"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, Link2, QrCode, RefreshCw, Trash2 } from "lucide-react"
import { sileo } from "sileo"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  propertyOperationsApi,
  type OperationsPublicAccess,
  type OperationsRecord,
  type OperationsWorkspace,
} from "@/lib/property-operations-api"

const modules = [
  "tenants", "leases", "tickets", "work-orders", "inspections", "vendors", "vendor-quotes",
  "billing", "finance", "documents", "recurring-maintenance", "assets",
]

export function PropertyOperationsPublicLinksPage() {
  const [workspaces, setWorkspaces] = useState<OperationsWorkspace[]>([])
  const [records, setRecords] = useState<OperationsRecord[]>([])
  const [links, setLinks] = useState<OperationsPublicAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [propertyId, setPropertyId] = useState("")
  const [moduleKey, setModuleKey] = useState("billing")
  const [recordId, setRecordId] = useState("")
  const [title, setTitle] = useState("Secure property request")
  const [instructions, setInstructions] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentCurrency, setPaymentCurrency] = useState("USD")

  const filteredRecords = useMemo(
    () => records.filter((item) => String(item.propertyId) === propertyId && item.moduleKey === moduleKey),
    [records, propertyId, moduleKey],
  )

  async function reload() {
    setLoading(true)
    try {
      const spaces = await propertyOperationsApi.getWorkspaces()
      setWorkspaces(spaces)
      const selected = propertyId || String(spaces[0]?.propertyId ?? "")
      if (!propertyId && selected) setPropertyId(selected)
      const [allLinks, recordGroups] = await Promise.all([
        propertyOperationsApi.getPublicLinks(),
        Promise.all(spaces.map((space) => propertyOperationsApi.getRecords(space.propertyId))),
      ])
      setLinks(allLinks)
      setRecords(recordGroups.flat())
    } catch (error) {
      sileo.error({ title: "Unable to load public links", description: error instanceof Error ? error.message : "Request failed" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  async function createLink() {
    if (!propertyId) return sileo.error({ title: "Select a property" })
    setSaving(true)
    try {
      await propertyOperationsApi.createPublicLink({
        propertyId: Number(propertyId),
        recordId: recordId || null,
        moduleKey,
        title: title.trim() || "Secure property request",
        instructions,
        recipientLabel: moduleKey === "billing" ? "Payer" : "External participant",
        recipientName,
        recipientEmail,
        recipientPhone,
        paymentAmount: paymentAmount ? Number(paymentAmount) : null,
        paymentCurrency,
        expiresInHours: 168,
        maxUses: 10,
        oneTime: false,
        allowFileUploads: true,
        formSchemaJson: JSON.stringify([
          { key: "message", label: "Response", type: "textarea", required: true },
          { key: "reference", label: "Reference", type: "text", required: false },
        ]),
      })
      sileo.success({ title: "Secure link and QR code created" })
      setRecordId("")
      await reload()
    } catch (error) {
      sileo.error({ title: "Unable to create link", description: error instanceof Error ? error.message : "Request failed" })
    } finally {
      setSaving(false)
    }
  }

  async function copy(value: string | null | undefined) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    sileo.success({ title: "Link copied" })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-background p-5">
        <Badge variant="outline" className="border-blue-200 text-blue-700">Public access</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Secure links, QR codes and payments</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Residents, vendors and workers do not need accounts. Send a secure link or QR code for requests, uploads, approvals and payments.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="shadow-none">
          <CardHeader><CardTitle>Create public access</CardTitle><CardDescription>Connect the link to an existing property and optional operations record.</CardDescription></CardHeader>
          <CardContent>
            <FieldGroup>
              <Field><FieldLabel>Property</FieldLabel><Select value={propertyId} onValueChange={setPropertyId}><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger><SelectContent>{workspaces.map((item) => <SelectItem key={item.propertyId} value={String(item.propertyId)}>{item.propertyTitle}</SelectItem>)}</SelectContent></Select></Field>
              <Field><FieldLabel>Feature</FieldLabel><Select value={moduleKey} onValueChange={(value) => { setModuleKey(value); setRecordId("") }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{modules.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select></Field>
              <Field><FieldLabel>Linked record (optional)</FieldLabel><Select value={recordId || "none"} onValueChange={(value) => setRecordId(value === "none" ? "" : value)}><SelectTrigger><SelectValue placeholder="No linked record" /></SelectTrigger><SelectContent><SelectItem value="none">No linked record</SelectItem>{filteredRecords.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></Field>
              <Field><FieldLabel>Title</FieldLabel><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
              <Field><FieldLabel>Instructions</FieldLabel><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>Recipient name</FieldLabel><Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></Field><Field><FieldLabel>Email</FieldLabel><Input type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /></Field></div>
              <Field><FieldLabel>Phone</FieldLabel><Input value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>Payment amount (optional)</FieldLabel><Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></Field><Field><FieldLabel>Currency</FieldLabel><Input value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value.toUpperCase())} /></Field></div>
              <Button onClick={() => void createLink()} disabled={saving || !propertyId}>{saving ? "Creating…" : "Create link and QR"}</Button>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Active links</CardTitle><CardDescription>{links.length} public access records</CardDescription></div><Button variant="outline" size="icon" onClick={() => void reload()}><RefreshCw className="size-4" /></Button></CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : links.map((item) => (
              <article key={item.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p><Badge variant="outline">{item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{item.propertyTitle} · {item.moduleKey} · {item.useCount}/{item.maxUses} uses</p>{item.paymentAmount ? <p className="mt-2 text-sm font-medium">Payment: {item.paymentCurrency} {item.paymentAmount} {item.paymentVerified ? "· Paid" : "· Pending"}</p> : null}</div>
                  {item.qrDataUrl ? <img src={item.qrDataUrl} alt={`QR code for ${item.title}`} className="size-28 rounded-xl border bg-white p-1" /> : <QrCode className="size-16 text-muted-foreground" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void copy(item.publicUrl)}><Copy className="size-4" />Copy</Button>{item.publicUrl ? <a className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted" href={item.publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open</a> : null}<Button variant="outline" size="sm" onClick={() => void propertyOperationsApi.revokePublicLink(item.id).then(reload)} disabled={item.status !== "Active"}><Trash2 className="size-4" />Revoke</Button></div>
              </article>
            ))}
            {!loading && !links.length ? <div className="rounded-2xl border border-dashed p-10 text-center"><Link2 className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">No links created yet.</p></div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
