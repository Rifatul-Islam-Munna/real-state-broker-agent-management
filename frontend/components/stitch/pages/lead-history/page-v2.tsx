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
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateLeadHistory, useLead, useLeadHistory, useLeads } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"
import { cn } from "@/lib/utils"

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
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)

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

  const selectedLead = leadQuery.data
  const initials = (selectedLead?.name ?? "Lead").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-md bg-[var(--ether-primary-fixed)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ether-primary)]">Lead Workspace</span>
            <h1 className="ether-display-lg mt-3 text-[var(--ether-on-surface)]">Communication History</h1>
            <div className="mt-4 inline-flex items-center gap-3 rounded-xl bg-white p-3 shadow-[var(--shadow-surface-1)]">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--ether-primary-fixed)] font-bold text-[var(--ether-primary)]">{initials}</span>
              <div>
                <p className="text-sm font-bold text-[var(--ether-on-surface)]">{selectedLead?.name ?? "Select a lead"}</p>
                <p className="mt-1 text-[10px] text-[var(--ether-on-surface-variant)]">{selected ? `Lead ID: #${leadId}` : "No lead selected"}</p>
              </div>
            </div>
          </div>
          <Button className="h-10 rounded-lg border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] px-4 font-semibold text-[var(--ether-on-surface-variant)]" render={<Link href={portalRoutes.leads} />} variant="outline">
            <AppIcon name="arrow_back" /> Back to leads
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="stacked_line_chart" label="Total Activities" value={counts.total} tone="primary" />
          <MetricCard icon="call_received" label="Incoming" value={counts.incoming} tone="secondary" />
          <MetricCard icon="call_made" label="Outgoing" value={counts.outgoing} tone="primary" />
          <MetricCard icon="schedule" label="Scheduled" value={counts.scheduled} tone="tertiary" />
        </section>

        <section className="rounded-[24px] bg-white p-3 shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex-1">
              <button
                className="flex h-11 w-full items-center justify-between rounded-lg bg-[var(--ether-surface-container-low)] px-3 text-left text-sm text-[var(--ether-on-surface)] transition hover:bg-[var(--ether-surface-container-high)]"
                onClick={() => setLeadPickerOpen(true)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <AppIcon className="shrink-0 text-[var(--ether-outline)]" name="person_search" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{selectedLead?.name ?? "Search or select a lead"}</span>
                    {selectedLead ? <span className="mt-0.5 block truncate text-[10px] text-[var(--ether-outline)]">{selectedLead.property || "No property selected"}</span> : null}
                  </span>
                </span>
                <AppIcon className="shrink-0 text-[var(--ether-outline)]" name="expand_more" />
              </button>

              <CommandDialog
                className="max-w-xl rounded-[20px]! border-0 bg-white shadow-[0_30px_90px_rgba(11,28,48,0.24)]"
                description="Search and choose a lead to view its communication history."
                onOpenChange={setLeadPickerOpen}
                open={leadPickerOpen}
                showCloseButton
                title="Select Lead"
              >
                <Command className="rounded-[20px]! p-2">
                  <div className="px-3 pb-2 pt-3">
                    <p className="text-lg font-bold text-[var(--ether-on-surface)]">Select a lead</p>
                    <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Search by client, property, email, or phone.</p>
                  </div>
                  <CommandInput className="h-10" placeholder="Search leads..." />
                  <CommandList className="max-h-[420px] p-2">
                    <CommandEmpty>No matching leads found.</CommandEmpty>
                    <CommandGroup heading={`${leads.length} leads available`}>
                      {leads.map((lead) => {
                        const itemInitials = lead.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
                        return (
                          <CommandItem
                            checked={selected && lead.id === leadId}
                            className="gap-3 rounded-xl! px-3 py-3"
                            key={lead.id}
                            onSelect={() => {
                              const nextLeadId = String(lead.id)
                              setLeadPickerOpen(false)
                              window.setTimeout(() => selectLead(nextLeadId), 100)
                            }}
                            value={`${lead.name} ${lead.property ?? ""} ${lead.email ?? ""} ${lead.phone ?? ""}`}
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ether-primary-fixed)] text-xs font-bold text-[var(--ether-primary)]">{itemInitials || "LD"}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold text-[var(--ether-on-surface)]">{lead.name}</span>
                              <span className="mt-1 block truncate text-xs text-[var(--ether-on-surface-variant)]">{lead.property || "No property selected"}</span>
                              <span className="mt-1 block truncate text-[10px] text-[var(--ether-outline)]">{lead.email || lead.phone || `Lead #${lead.id}`}</span>
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </CommandDialog>
            </div>
            <Select onValueChange={(value) => patch({ kind: value as LeadHistoryKind })} value={form.kind}>
              <SelectTrigger className="h-11 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 shadow-none xl:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{["Call", "Sms", "Email", "Note", "System"].map((value) => <SelectItem key={value} value={value}>{kindLabels[value]}</SelectItem>)}</SelectContent>
            </Select>
            <Select onValueChange={(value) => patch({ status: value as LeadHistoryStatus })} value={form.status}>
              <SelectTrigger className="h-11 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 shadow-none xl:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{["Logged", "Scheduled", "Sent", "Completed", "Failed"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-11 rounded-lg border-0 bg-[var(--ether-surface-container-low)] shadow-none xl:w-52" onChange={(event) => patch({ scheduledAt: event.target.value })} type="datetime-local" value={form.scheduledAt} />
            <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white" disabled={!selected || mutation.isPending} onClick={() => void save()} type="button">
              <AppIcon name="add" /> {mutation.isPending ? "Saving..." : "Log Activity"}
            </Button>
          </div>
        </section>

        {!selected ? <Alert><AlertDescription>Choose a lead above to review and add communication activity.</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <div>
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Activity Timeline</h2>
              <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{selectedLead?.property || "All communication for the selected lead."}</p>
            </div>
            <button className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ether-primary)]" type="button">Export to CSV</button>
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="absolute bottom-6 left-[37px] top-0 w-px bg-[color-mix(in_srgb,var(--ether-outline-variant)_45%,transparent)]" />
            {historyQuery.isLoading ? <EmptyState text="Loading timeline..." /> : historyQuery.error ? <Alert variant="destructive"><AlertDescription>{historyQuery.error.message}</AlertDescription></Alert> : timeline.length === 0 ? <EmptyState text="No activity has been recorded for this lead." /> : (
              <div className="space-y-4">
                {timeline.map((entry) => {
                  const failed = entry.status === "Failed"
                  const tone = failed ? "error" : entry.direction === "Incoming" ? "secondary" : entry.direction === "Outgoing" ? "primary" : "neutral"
                  return (
                    <article className="relative pl-12" key={`${entry.id}-${entry.createdAt}`}>
                      <span className={cn("absolute left-0 top-2 flex size-7 items-center justify-center rounded-full border-2 border-white", tone === "error" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : tone === "secondary" ? "bg-[var(--ether-secondary)] text-white" : tone === "primary" ? "bg-[var(--ether-primary)] text-white" : "bg-[var(--ether-outline-variant)] text-white")}>
                        <AppIcon className="text-sm" name={iconForKind(entry.kind)} />
                      </span>
                      <div className="rounded-xl bg-[var(--ether-surface-container-low)]/55 p-4 transition hover:bg-[var(--ether-surface-container-low)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2"><AppIcon className="text-base text-[var(--ether-on-surface-variant)]" name={iconForKind(entry.kind)} /><h3 className="text-sm font-bold text-[var(--ether-on-surface)]">{entry.title || kindLabels[entry.kind]}</h3></div>
                            <p className="mt-2 text-sm leading-6 text-[var(--ether-on-surface-variant)]">{entry.summary || entry.body}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className="rounded-md border-0 bg-[var(--ether-surface-container-high)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--ether-on-surface-variant)]">{kindLabels[entry.kind] ?? entry.kind}</Badge>
                            <Badge className={cn("rounded-md border-0 px-2 py-1 text-[9px] font-bold uppercase", failed ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-secondary-container)] text-[var(--ether-on-secondary-container)]")}>{entry.status}</Badge>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_30%,transparent)] pt-3 text-[10px] font-semibold text-[var(--ether-on-surface-variant)] sm:flex-row sm:items-center sm:justify-between">
                          <span>{entry.provider || "System"} ? {entry.direction}</span>
                          <span>{formatDateTimeLabel(entry.occurredAt ?? entry.createdAt)}</span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: "primary" | "secondary" | "tertiary" }) {
  const toneClass = tone === "secondary" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return <article className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]"><div className="flex items-center gap-4"><span className={`flex size-10 items-center justify-center rounded-xl ${toneClass}`}><AppIcon name={icon} /></span><div><p className="ether-numeric-lg text-[var(--ether-on-surface)]">{value}</p><p className="mt-1 ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">{label}</p></div></div></article>
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
