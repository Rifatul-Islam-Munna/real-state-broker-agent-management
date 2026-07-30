"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useContactRequests, useConvertContactRequestToLead } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type ContactStatus = "" | "New" | "Reviewing" | "Converted"

function initialsFor(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CI"
  )
}

export function ContactInboxApiPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ContactStatus>("")
  const [agentFilter, setAgentFilter] = useState("all")

  const contactRequestsQuery = useContactRequests({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  })
  const convertContactRequestToLead = useConvertContactRequestToLead()
  const isInitialLoading =
    !contactRequestsQuery.data && (contactRequestsQuery.isLoading || contactRequestsQuery.isFetching)

  const contactRequests = useMemo(
    () => contactRequestsQuery.data?.items ?? [],
    [contactRequestsQuery.data?.items],
  )

  const agentOptions = useMemo(
    () =>
      Array.from(
        new Set(contactRequests.map((item) => item.agentName).filter((value): value is string => Boolean(value))),
      ).sort(),
    [contactRequests],
  )

  const visibleRequests = useMemo(
    () =>
      contactRequests.filter((item) =>
        agentFilter === "all"
          ? true
          : agentFilter === "unassigned"
            ? !item.agentName
            : item.agentName === agentFilter,
      ),
    [agentFilter, contactRequests],
  )

  const counts = useMemo(
    () => ({
      new: contactRequests.filter((item) => item.status === "New").length,
      reviewing: contactRequests.filter((item) => item.status === "Reviewing").length,
      converted: contactRequests.filter((item) => item.status === "Converted").length,
    }),
    [contactRequests],
  )

  const total = contactRequestsQuery.data?.total ?? contactRequests.length
  const totalPages = contactRequestsQuery.data?.totalPages ?? 1
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="min-h-full bg-[var(--ether-surface)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Contact Inbox</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--ether-on-surface-variant)]">
              Manage and convert public inquiries from your property listings and website contact forms.
            </p>
          </div>
          <Button
            className="h-11 rounded-xl bg-[var(--ether-secondary)] px-6 font-bold text-white shadow-[var(--shadow-surface-1)] hover:bg-[var(--ether-secondary)]/90"
            render={<Link href="/dashboard/leads" />}
          >
            <AppIcon name="person_add" />
            Create Lead
          </Button>
        </section>

        <section className="relative h-[240px] overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--ether-outline-variant)_30%,transparent)] bg-[var(--ether-surface-container-low)] shadow-[var(--shadow-surface-1)]">
          <div className="absolute inset-0 p-4 opacity-55 blur-[2px] sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-4"><p className="text-[10px] uppercase text-[var(--ether-outline)]">New contacts</p><p className="mt-2 text-2xl font-bold">{counts.new}</p></div>
              <div className="rounded-xl bg-white p-4"><p className="text-[10px] uppercase text-[var(--ether-outline)]">Reviewing</p><p className="mt-2 text-2xl font-bold">{counts.reviewing}</p></div>
              <div className="rounded-xl bg-white p-4"><p className="text-[10px] uppercase text-[var(--ether-outline)]">Converted</p><p className="mt-2 text-2xl font-bold">{counts.converted}</p></div>
            </div>
            <div className="mt-4 space-y-3">
              {contactRequests.slice(0, 3).map((item) => (
                <div className="grid grid-cols-[1.2fr_2fr_auto] gap-4 rounded-xl bg-white p-4" key={item.id}>
                  <div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-[var(--ether-outline)]">{item.propertyTitle || item.inquiryType}</p></div>
                  <p className="truncate text-sm text-[var(--ether-on-surface-variant)]">{item.message}</p>
                  <span className="rounded-lg bg-[var(--ether-primary-fixed)] px-3 py-1 text-xs font-semibold text-[var(--ether-primary)]">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,28,48,0.72),rgba(11,28,48,0.28),rgba(11,28,48,0.08))]" />
          <div className="relative flex h-full items-center p-8 sm:p-12">
            <div className="max-w-xl text-white">
              <span className="inline-flex rounded-full bg-[var(--ether-primary)]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]">Real-time activity</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Performance Insights</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/80 sm:text-base">
                Live inquiry activity from your website and property listings, updated directly from the current contact feed.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <MetricCard icon="inbox" label="New Contacts" value={counts.new} tone="primary" trend="Live" />
          <MetricCard icon="visibility" label="Reviewing" value={counts.reviewing} tone="secondary" trend="Current" />
          <MetricCard icon="check_circle" label="Converted" value={counts.converted} tone="tertiary" trend="Total" />
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_25%,transparent)] p-5 sm:p-6">
            <div className="relative">
              <AppIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
              <Input
                className="h-12 rounded-xl border-0 bg-[var(--ether-surface-container-low)] pl-11 shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder="Search contacts, email, phone, property, or message"
                value={searchTerm}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <Select
                  modal={false}
                  onValueChange={(value) => {
                    setStatusFilter(!value || value === "all" ? "" : (value as Exclude<ContactStatus, "">))
                    setPage(1)
                  }}
                  value={statusFilter || "all"}
                >
                  <SelectTrigger className="h-10 w-40 rounded-xl border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none">
                    <span>{statusFilter ? `Status: ${statusFilter}` : "Status: All"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Reviewing">Reviewing</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                  </SelectContent>
                </Select>

                <Select modal={false} onValueChange={(value) => setAgentFilter(value ?? "all")} value={agentFilter}>
                  <SelectTrigger className="h-10 w-40 rounded-xl border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none">
                    <span>{agentFilter === "all" ? "Agent: All" : agentFilter === "unassigned" ? "Unassigned" : agentFilter}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agentOptions.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}
                  </SelectContent>
                </Select>

                <button className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-low)]" type="button">
                  <AppIcon name="tune" />
                  Advanced Filters
                </button>
              </div>
              <p className="text-sm text-[var(--ether-on-surface-variant)]">Showing <strong>{rangeStart}-{rangeEnd}</strong> of {total} inquiries</p>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="p-8"><Alert><AlertDescription>Loading contact requests...</AlertDescription></Alert></div>
          ) : contactRequestsQuery.error ? (
            <div className="p-8"><Alert variant="destructive"><AlertDescription>{contactRequestsQuery.error.message}</AlertDescription></Alert></div>
          ) : visibleRequests.length === 0 ? (
            <div className="p-12 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--ether-surface-container-low)] text-[var(--ether-outline)]"><AppIcon className="text-2xl" name="inbox" /></span>
              <h3 className="mt-4 font-bold text-[var(--ether-on-surface)]">No contact requests</h3>
              <p className="mt-2 text-sm text-[var(--ether-on-surface-variant)]">No inquiries match the current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-[color-mix(in_srgb,var(--ether-outline-variant)_20%,transparent)]">
              {visibleRequests.map((item, index) => (
                <article className="p-5 transition hover:bg-[var(--ether-surface-container-low)]/45 sm:p-6" key={item.id}>
                  <div className="flex gap-5">
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold", index % 3 === 0 ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : index % 3 === 1 ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]" : "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-tertiary)]")}>
                      {initialsFor(item.name)}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-6 lg:grid-cols-[minmax(220px,1fr)_minmax(360px,2fr)_minmax(220px,0.85fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-bold text-[var(--ether-on-surface)]">{item.name}</h2>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-sm text-[var(--ether-on-surface-variant)]"><AppIcon className="text-sm" name="location_on" />{item.propertyTitle || item.inquiryType}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--ether-outline)]">
                          <span className="flex items-center gap-1"><AppIcon className="text-sm" name={item.email ? "mail" : "call"} />{item.email || item.phone}</span>
                          <span className="flex items-center gap-1"><AppIcon className="text-sm" name="schedule" />{formatDateTimeLabel(item.createdAt)}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-[var(--ether-surface-container-low)]/45 p-4">
                        <p className="text-sm italic leading-7 text-[var(--ether-on-surface-variant)]">“{item.message}”</p>
                      </div>

                      <div className="flex flex-col justify-between gap-4 lg:items-end">
                        <div className="text-sm text-[var(--ether-on-surface-variant)]">
                          {item.agentName ? <p className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-[9px] font-bold text-[var(--ether-primary)]">{initialsFor(item.agentName)}</span>Agent: <span className="font-semibold text-[var(--ether-on-surface)]">{item.agentName}</span></p> : <p className="italic">Unassigned</p>}
                        </div>
                        {item.leadId ? (
                          <Button className="h-10 rounded-xl border-[var(--ether-primary)] bg-[var(--ether-primary-fixed)] px-4 font-semibold text-[var(--ether-primary)]" render={<Link href={`/dashboard/lead-history?leadId=${item.leadId}`} />} variant="outline">
                            Open Lead History
                          </Button>
                        ) : (
                          <Button
                            className="h-10 rounded-xl bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[var(--shadow-surface-1)] hover:bg-[var(--ether-primary-container)]"
                            disabled={convertContactRequestToLead.isPending}
                            onClick={() => void convertContactRequestToLead.mutateAsync({ contactRequestId: item.id })}
                            type="button"
                          >
                            {convertContactRequestToLead.isPending ? "Converting..." : "Convert to Lead"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_20%,transparent)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="ghost"><AppIcon name="chevron_left" />Previous</Button>
            <PagePagination currentPage={page} onPageChange={setPage} totalPages={totalPages} />
            <Button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} size="sm" variant="ghost">Next<AppIcon name="chevron_right" /></Button>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ icon, label, value, tone, trend }: { icon: string; label: string; value: number; tone: "primary" | "secondary" | "tertiary"; trend: string }) {
  const toneClass = tone === "secondary" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]" : tone === "tertiary" ? "bg-[var(--ether-error-container)] text-[var(--ether-tertiary)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return (
    <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex size-12 items-center justify-center rounded-xl ${toneClass}`}><AppIcon className="text-xl" name={icon} /></span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--ether-secondary)]"><AppIcon className="text-sm" name={tone === "secondary" ? "remove" : "trending_up"} />{trend}</span>
      </div>
      <p className="mt-5 ether-label-caps text-[var(--ether-on-surface-variant)]">{label}</p>
      <p className="ether-numeric-lg mt-2 text-[var(--ether-on-surface)]">{value}</p>
    </article>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("rounded-full border-0 px-2.5 py-1 text-[10px] font-bold uppercase", status === "Converted" ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]" : status === "Reviewing" ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]" : "bg-[var(--ether-error-container)] text-[var(--ether-tertiary)]")}>
      {status}
    </Badge>
  )
}
