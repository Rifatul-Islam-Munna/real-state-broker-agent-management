"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type {
  CreateLeadHistoryEntryInput,
  LeadHistoryDirection,
  LeadHistoryKind,
  LeadHistoryStatus,
} from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateLeadHistory, useLead, useLeadHistory, useLeads } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"

type FormState = {
  kind: LeadHistoryKind
  direction: LeadHistoryDirection
  status: LeadHistoryStatus
  title: string
  summary: string
  body: string
  provider: string
  createdBy: string
  scheduledAt: string
}

const blankForm = (): FormState => ({
  kind: "Call",
  direction: "Internal",
  status: "Logged",
  title: "",
  summary: "",
  body: "",
  provider: "",
  createdBy: "Admin",
  scheduledAt: "",
})

const kindLabels: Record<string, string> = {
  Call: "Call",
  ContactForm: "Contact form",
  Email: "Email",
  MailInbox: "Mail inbox",
  Note: "Note",
  PropertyChat: "Property chat",
  Sms: "SMS",
  System: "System",
}

export function LeadHistoryPageV2() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)
  const rawLeadId = searchParams.get("leadId")
  const leadId = rawLeadId ? Number(rawLeadId) : NaN
  const selected = Number.isFinite(leadId)

  const leadsQuery = useLeads({ page: 1, pageSize: 200 })
  const leadQuery = useLead(selected ? leadId : undefined)
  const historyQuery = useLeadHistory(selected ? leadId : undefined)
  const mutation = useCreateLeadHistory()
  const [form, setForm] = useState<FormState>(() => blankForm())
  const [error, setError] = useState<string | null>(null)

  const leads = useMemo(() => leadsQuery.data?.items ?? [], [leadsQuery.data?.items])
  const timeline = useMemo(() => historyQuery.data ?? [], [historyQuery.data])
  const counts = useMemo(() => ({
    incoming: timeline.filter((item) => item.direction === "Incoming").length,
    outgoing: timeline.filter((item) => item.direction === "Outgoing").length,
    scheduled: timeline.filter((item) => item.status === "Scheduled").length,
    total: timeline.length,
  }), [timeline])

  function selectLead(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("leadId", value)
    else params.delete("leadId")
    router.replace(params.toString() ? `${pathname}?${params}` : pathname)
  }

  function patch(next: Partial<FormState>) {
    setForm((current) => ({ ...current, ...next }))
  }

  async function save() {
    if (!selected) return setError("Choose a lead before adding an activity.")
    if (![form.title, form.summary, form.body].some((value) => value.trim())) {
      return setError("Add a title, summary, or detailed note.")
    }
    setError(null)
    const payload: CreateLeadHistoryEntryInput = {
      leadId,
      kind: form.kind,
      direction: form.direction,
      status: form.status,
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body.trim(),
      provider: form.provider.trim() || undefined,
      createdBy: form.createdBy.trim() || undefined,
      scheduledAt: form.scheduledAt || undefined,
    }
    const response = await mutation.mutateAsync(payload)
    if (response.error) return setError(response.error.message)
    setForm(blankForm())
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="outline">{"Lead workspace"}</Badge>
              <CardTitle className="mt-3 text-2xl">{"Communication history"}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl leading-6">
                {"Review mail, SMS, calls, property chat, contact forms, system events, and scheduled follow-ups in one professional timeline."}
              </CardDescription>
            </div>
            <Button render={<Link href={portalRoutes.leads} />} variant="outline">
              <AppIcon name="arrow_back" />
              {"Back to leads"}
            </Button>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label>{"Select lead"}</Label>
              <Select onValueChange={selectLead} value={selected ? String(leadId) : "none"}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose a lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{"Choose a lead"}</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={String(lead.id)}>
                      {`${lead.name} — ${lead.property || "No property"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {leadQuery.data ? `${leadQuery.data.email || "No email"} · ${leadQuery.data.phone || "No phone"}` : "Select a lead to open the timeline."}
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="history" label="Total activity" value={counts.total} />
          <MetricCard icon="call_received" label="Incoming" value={counts.incoming} />
          <MetricCard icon="call_made" label="Outgoing" value={counts.outgoing} />
          <MetricCard icon="schedule" label="Scheduled" value={counts.scheduled} />
        </section>

        {!selected ? (
          <Alert><AlertDescription>{"Choose a lead above to review and add communication activity."}</AlertDescription></Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <Card className="h-fit shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">{"Add activity"}</CardTitle>
              <CardDescription>{"Log a note, call, message, email, or scheduled action."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Type">
                  <Select onValueChange={(value) => patch({ kind: value as LeadHistoryKind })} value={form.kind}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Call", "Sms", "Email", "Note", "System"].map((value) => <SelectItem key={value} value={value}>{kindLabels[value]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Direction">
                  <Select onValueChange={(value) => patch({ direction: value as LeadHistoryDirection })} value={form.direction}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Internal", "Incoming", "Outgoing", "Scheduled"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Status">
                  <Select onValueChange={(value) => patch({ status: value as LeadHistoryStatus })} value={form.status}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Logged", "Scheduled", "Sent", "Completed", "Failed"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Scheduled time"><Input onChange={(event) => patch({ scheduledAt: event.target.value })} type="datetime-local" value={form.scheduledAt} /></Field>
              </div>
              <Field label="Title"><Input onChange={(event) => patch({ title: event.target.value })} placeholder="Viewing reminder call" value={form.title} /></Field>
              <Field label="Summary"><Input onChange={(event) => patch({ summary: event.target.value })} placeholder="Client requested a follow-up" value={form.summary} /></Field>
              <Field label="Details"><Textarea className="min-h-32" onChange={(event) => patch({ body: event.target.value })} placeholder="Add complete notes or instructions." value={form.body} /></Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Provider / channel"><Input onChange={(event) => patch({ provider: event.target.value })} placeholder="Twilio, Gmail, Manual" value={form.provider} /></Field>
                <Field label="Created by"><Input onChange={(event) => patch({ createdBy: event.target.value })} value={form.createdBy} /></Field>
              </div>
              {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Button className="w-full" disabled={!selected || mutation.isPending} onClick={() => void save()} type="button">
                <AppIcon name="add_circle" />
                {mutation.isPending ? "Saving..." : "Save activity"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">{leadQuery.data ? leadQuery.data.name : "Timeline"}</CardTitle>
              <CardDescription>{leadQuery.data?.property || "All communication for the selected lead."}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyQuery.isLoading ? <EmptyState text="Loading timeline..." /> : historyQuery.error ? <div className="p-5"><Alert variant="destructive"><AlertDescription>{historyQuery.error.message}</AlertDescription></Alert></div> : timeline.length === 0 ? <EmptyState text="No activity has been recorded for this lead." /> : (
                <div className="divide-y">
                  {timeline.map((entry) => (
                    <article className="p-5" key={`${entry.id}-${entry.createdAt}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30"><AppIcon name={iconForKind(entry.kind)} /></span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{entry.title || kindLabels[entry.kind]}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{entry.summary}</p>
                          </div>
                        </div>
                        <div className="flex gap-2"><Badge variant="outline">{kindLabels[entry.kind] ?? entry.kind}</Badge><Badge variant={entry.status === "Failed" ? "destructive" : "secondary"}>{entry.status}</Badge></div>
                      </div>
                      {entry.body ? <div className="mt-4 whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm leading-6 text-foreground">{entry.body}</div> : null}
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span>{entry.direction}</span>
                        <span>{entry.provider || "No provider"}</span>
                        <span>{entry.createdBy || "System"}</span>
                        {entry.scheduledAt ? <span>{`Scheduled ${formatDateTimeLabel(entry.scheduledAt)}`}</span> : null}
                        <span>{formatDateTimeLabel(entry.occurredAt ?? entry.createdAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function MetricCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return <Card className="shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30"><AppIcon name={icon} /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-64 items-center justify-center p-8 text-sm text-muted-foreground">{text}</div>
}

function iconForKind(kind: LeadHistoryKind) {
  if (kind === "Email" || kind === "MailInbox") return "mail"
  if (kind === "Sms") return "sms"
  if (kind === "Call") return "call"
  if (kind === "PropertyChat") return "forum"
  if (kind === "ContactForm") return "contact_page"
  if (kind === "System") return "settings"
  return "note"
}
