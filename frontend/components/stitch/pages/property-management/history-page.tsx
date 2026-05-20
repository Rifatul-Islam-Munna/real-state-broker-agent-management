"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { AppIcon } from "@/components/ui/app-icon"
import { SimpleMarkdown } from "@/components/ui/simple-markdown"
import {
  useLeads,
  useProperties,
  usePropertyOwnerReports,
  usePropertyVisitFeedbackEntries,
  useShowingBookings,
} from "@/hooks/use-real-estate-api"

const PAGE_SIZE = 10

export function PropertyHistoryPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const propertyId = Number(searchParams.get("propertyId") || 0)
  const [leadPage, setLeadPage] = useState(1)
  const backHref = pathname.startsWith("/agent") ? "/agent/properties" : "/admin/property-management"

  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const leadsQuery = useLeads({ page: 1, pageSize: 300 })
  const showingsQuery = useShowingBookings({ page: 1, pageSize: 300, propertyId: propertyId || undefined })
  const feedbackQuery = usePropertyVisitFeedbackEntries({ propertyId: propertyId || undefined })
  const ownerReportsQuery = usePropertyOwnerReports()

  const properties = propertiesQuery.data?.items ?? []
  const property = properties.find((item) => item.id === propertyId) ?? null
  const allLeads = leadsQuery.data?.items ?? []
  const allShowings = showingsQuery.data?.items ?? []
  const feedbackItems = feedbackQuery.data ?? []
  const ownerWorkspace = ownerReportsQuery.data

  const propertyLeads = useMemo(() => {
    if (!property) {
      return []
    }

    return [...allLeads]
      .filter((item) => item.property === property.title)
      .sort((left, right) => {
        const leftDate = new Date(left.lastActivityAt || left.updatedAt || left.createdAt).getTime()
        const rightDate = new Date(right.lastActivityAt || right.updatedAt || right.createdAt).getTime()
        return rightDate - leftDate
      })
  }, [allLeads, property])

  const pagedLeads = useMemo(() => {
    const start = (leadPage - 1) * PAGE_SIZE
    return propertyLeads.slice(start, start + PAGE_SIZE)
  }, [leadPage, propertyLeads])

  const totalLeadPages = Math.max(1, Math.ceil(propertyLeads.length / PAGE_SIZE))
  const propertySummary = ownerWorkspace?.summaries.find((item) => item.propertyId === propertyId) ?? null
  const propertyDispatches = (ownerWorkspace?.dispatches ?? [])
    .filter((item) => item.propertyId === propertyId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  const showings = [...allShowings].sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime())
  const feedback = [...feedbackItems].sort((left, right) => new Date(right.feedbackAt).getTime() - new Date(left.feedbackAt).getTime())

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(27,94,138,0.08),transparent_30%),linear-gradient(180deg,#f7f5f1,#f5f3ee)] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section className="rounded-[2rem] border border-[#1b5e8a]/12 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#1b5e8a]" href={backHref}>
                <AppIcon className="text-base" name="arrow_back" />
                {"Back to listings"}
              </Link>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1b5e8a]">{"Property History"}</p>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                {property?.title || "Property timeline"}
              </h1>
              <p className="text-sm leading-7 text-slate-600 md:text-[15px]">
                {property ? `${property.exactLocation || property.location} | owner ${property.ownerName || "Unknown"}` : "Open one property from listing history button to view everything."}
              </p>
            </div>
          </div>
        </section>

        {property ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Leads" value={propertyLeads.length} />
              <MetricCard label="Showings" value={showings.length} />
              <MetricCard label="Feedback" value={feedback.length} />
              <MetricCard label="Owner Sends" value={propertyDispatches.length} />
            </section>

            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <article className="rounded-[1.35rem] border border-slate-200 bg-[#f7f5f1]/65 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Property snapshot"}</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>{`Type: ${property.propertyType} | ${property.listingType}`}</p>
                    <p>{`Status: ${property.status}`}</p>
                    <p>{`Price: ${property.price}`}</p>
                    <p>{`Owner: ${property.ownerName || "Unknown"}`}</p>
                    <p>{`Owner email: ${property.ownerEmail || "Missing"}`}</p>
                    <p>{`Owner phone: ${property.ownerPhone || "Missing"}`}</p>
                    <p>{`Agent: ${property.agent?.fullName || "Unassigned"}`}</p>
                  </div>
                  {property.internalDetailsMarkdown ? (
                    <div className="mt-4 rounded-[1rem] border border-slate-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{"Internal markdown"}</p>
                      <div className="mt-3 text-sm text-slate-700">
                        <SimpleMarkdown className="space-y-4" value={property.internalDetailsMarkdown} />
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="rounded-[1.35rem] border border-slate-200 bg-[#f7f5f1]/65 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#c18b2f]/80">{"Owner report state"}</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>{`Negative feedback: ${propertySummary?.negativeCount ?? 0}`}</p>
                    <p>{`Mixed feedback: ${propertySummary?.mixedCount ?? 0}`}</p>
                    <p>{`Positive feedback: ${propertySummary?.positiveCount ?? 0}`}</p>
                    <p>{`Latest feedback: ${propertySummary?.latestFeedbackAt ? new Date(propertySummary.latestFeedbackAt).toLocaleString() : "None"}`}</p>
                    <p>{`Last owner send: ${propertySummary?.lastSentAt ? new Date(propertySummary.lastSentAt).toLocaleString() : "Never"}`}</p>
                    <p>{`Top issues: ${propertySummary?.topIssues.join(", ") || "No issue tags yet"}`}</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Lead timeline"}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{"All leads for this property"}</h2>
                </div>
                <p className="text-sm text-slate-500">{`${propertyLeads.length} total lead records`}</p>
              </div>
              <div className="mt-5 space-y-3">
                {pagedLeads.map((lead) => (
                  <article className="rounded-[1.25rem] border border-slate-200 bg-[#f7f5f1]/60 p-4" key={lead.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{`${lead.email || "No email"} | ${lead.phone || "No phone"}`}</p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{lead.stage}</p>
                        <p>{new Date(lead.lastActivityAt || lead.updatedAt || lead.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{lead.summary || "No summary"}</p>
                  </article>
                ))}
                {pagedLeads.length === 0 ? (
                  <EmptyCard text="No leads linked to this property yet." />
                ) : null}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50" disabled={leadPage <= 1} onClick={() => setLeadPage((current) => Math.max(1, current - 1))} type="button">
                  {"Prev"}
                </button>
                <p className="text-sm text-slate-500">{`Page ${leadPage} of ${totalLeadPages}`}</p>
                <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50" disabled={leadPage >= totalLeadPages} onClick={() => setLeadPage((current) => Math.min(totalLeadPages, current + 1))} type="button">
                  {"Next"}
                </button>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <DataSection
                items={showings.map((showing) => ({
                  id: showing.id,
                  title: showing.showingAgentName || showing.contactName || "Showing",
                  subtitle: showing.showingAgentEmail || showing.contactEmail || showing.showingAgentPhone || showing.contactPhone || "No contact",
                  meta: `${new Date(showing.startAt).toLocaleString()} | ${showing.status}`,
                  body: showing.notes || "No showing notes",
                }))}
                label="Showing history"
                title="All showing records"
                emptyText="No showing records for this property yet."
              />

              <DataSection
                items={feedback.map((item) => ({
                  id: item.id,
                  title: item.contactName || item.source,
                  subtitle: item.contactEmail || item.contactPhone || item.source,
                  meta: `${new Date(item.feedbackAt).toLocaleString()} | ${item.sentiment}`,
                  body: item.summary || item.feedbackText || "No feedback text",
                  tags: item.issues,
                }))}
                label="Feedback stream"
                title="All feedback records"
                emptyText="No feedback saved for this property yet."
              />
            </section>

            <DataSection
              items={propertyDispatches.map((item) => ({
                id: item.id,
                title: item.status,
                subtitle: item.channels.join(", ") || "No channels",
                meta: `${new Date(item.createdAt).toLocaleString()} | ${item.sentAt ? `Sent ${new Date(item.sentAt).toLocaleString()}` : "Not sent"}`,
                body: item.summary || "No summary",
              }))}
              label="Owner communication"
              title="All owner report sends"
              emptyText="No owner report or direct owner send saved for this property yet."
            />
          </>
        ) : (
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-8">
            <p className="text-lg font-bold text-slate-900">{"Property not found."}</p>
          </section>
        )}
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.45rem] border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{value}</p>
    </article>
  )
}

function DataSection({
  items,
  label,
  title,
  emptyText,
}: {
  items: Array<{ id: number; title: string; subtitle: string; meta: string; body: string; tags?: string[] }>
  label: string
  title: string
  emptyText: string
}) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{label}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <article className="rounded-[1.25rem] border border-slate-200 bg-[#f7f5f1]/60 p-4" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
              </div>
              <p className="text-sm text-slate-500">{item.meta}</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">{item.body}</p>
            {item.tags && item.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span className="rounded-full border border-[#c18b2f]/25 bg-[#c18b2f]/10 px-3 py-1 text-[11px] font-bold text-[#8b6722]" key={`${item.id}-${tag}`}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
        {items.length === 0 ? <EmptyCard text={emptyText} /> : null}
      </div>
    </section>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-[#f7f5f1]/50 p-6 text-sm text-slate-500">
      {text}
    </div>
  )
}
