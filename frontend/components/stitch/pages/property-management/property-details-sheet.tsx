"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react"

import type { PropertyItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  useDocumentRepository,
  useLeads,
  useShowingBookings,
} from "@/hooks/use-real-estate-api"
import {
  useRealtorShowings,
  useShowingFeedback,
} from "@/hooks/use-realtor-showings-api"

const tabs = [
  { id: "overview", label: "Overview", icon: "home_work" },
  { id: "leads", label: "Leads", icon: "group" },
  { id: "showings", label: "Showings", icon: "event" },
  { id: "feedback", label: "Feedback", icon: "rate_review" },
  { id: "documents", label: "Documents", icon: "description" },
] as const

type TabId = (typeof tabs)[number]["id"]

export function PropertyDetailsSheet({
  onEdit,
  onOpenChange,
  open,
  property,
}: {
  onEdit: (property: PropertyItem) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  property: PropertyItem | null
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const propertyId = property?.id ?? null
  const title = property?.title ?? ""

  const leadsQuery = useLeads({
    page: 1,
    pageSize: 200,
    search: title || undefined,
  })
  const bookingQuery = useShowingBookings({
    page: 1,
    pageSize: 100,
    propertyId: propertyId ?? undefined,
  })
  const realtorQuery = useRealtorShowings(title)
  const feedbackQuery = useShowingFeedback({
    propertyId,
    page: 1,
    pageSize: 100,
  })
  const documentsQuery = useDocumentRepository({
    page: 1,
    pageSize: 100,
    propertyId: propertyId ?? undefined,
  })

  const normalizedTitle = normalize(title)
  const leads = useMemo(
    () =>
      (leadsQuery.data?.items ?? []).filter((lead) => {
        const leadProperty = normalize(lead.property)
        return (
          !normalizedTitle ||
          leadProperty === normalizedTitle ||
          leadProperty.includes(normalizedTitle) ||
          normalizedTitle.includes(leadProperty)
        )
      }),
    [leadsQuery.data?.items, normalizedTitle]
  )
  const bookings = bookingQuery.data?.items ?? []
  const realtorShowingsData = realtorQuery.data
  const realtorShowings = (Array.isArray(realtorShowingsData) ? realtorShowingsData : realtorShowingsData?.items ?? []).filter(
    (showing) => showing.propertyId === propertyId
  )
  const feedback = feedbackQuery.data?.items ?? []
  const documents = documentsQuery.data?.items ?? []
  const error =
    leadsQuery.error ??
    bookingQuery.error ??
    realtorQuery.error ??
    feedbackQuery.error ??
    documentsQuery.error

  if (!property) return null

  const heroImage = property.thumbnailUrl || property.imageUrls?.[0] || ""
  const photoCount = (property.thumbnailUrl ? 1 : 0) + (property.imageUrls?.length ?? 0)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setActiveTab("overview")
      }}
    >
      <SheetContent className="w-full overflow-hidden border-0 bg-[var(--ether-surface)] p-0 shadow-[-20px_0_60px_rgba(11,28,48,0.14)] sm:max-w-[46rem] lg:w-[40vw] lg:max-w-[40vw] xl:min-w-[42rem]">
        <SheetHeader className="bg-white px-6 pb-6 pt-6 text-left sm:px-8">
          <div className="mb-6 flex items-start justify-between gap-4 pr-8">
            <div className="flex items-center gap-3">
              <Badge className="rounded-full border-0 bg-[color-mix(in_srgb,var(--ether-secondary-container)_28%,white)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ether-secondary)]">
                <span className="mr-1.5 size-1.5 rounded-full bg-[var(--ether-secondary)]" />
                {formatStatus(property.status)}
              </Badge>
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ether-outline)]">
                Updated {formatDate(property.updatedAt)}
              </span>
            </div>
            <Button className="h-10 rounded-lg border-[var(--ether-outline-variant)] px-5 font-semibold" onClick={() => onEdit(property)} type="button" variant="outline">
              Edit
            </Button>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <SheetTitle className="truncate text-3xl font-bold tracking-[-0.03em] text-[var(--ether-on-surface)] sm:text-4xl">{property.title}</SheetTitle>
              <SheetDescription className="mt-2 flex items-center gap-1.5 text-base text-[var(--ether-on-surface-variant)]">
                <AppIcon className="text-lg" name="location_on" />
                {property.exactLocation || property.location || "Location pending"}
              </SheetDescription>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="ether-label-caps text-[10px] text-[var(--ether-on-surface-variant)]">Listing Price</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.03em] text-[var(--ether-primary)]">{property.price || "Price pending"}</p>
              <p className="mt-1 text-xs text-[var(--ether-outline)]">{property.propertyType} � {property.listingType === "ForRent" ? "For rent" : "For sale"}</p>
            </div>
          </div>

          <div className="group relative mt-7 h-52 overflow-hidden rounded-2xl bg-[var(--ether-surface-container)]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={property.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" src={heroImage} />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--ether-outline-variant)]"><AppIcon className="text-6xl" name="home_work" /></div>
            )}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/5 to-transparent p-5">
              <div className="flex w-full items-center justify-between gap-3 text-white">
                <span className="inline-flex items-center gap-2 text-sm font-semibold"><AppIcon name="photo_library" />{photoCount} {photoCount === 1 ? "Photo" : "Photos"}</span>
                <button className="rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md" onClick={() => setActiveTab("overview")} type="button">View gallery</button>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="bg-white px-6 sm:px-8">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                size="sm"
                className={`relative rounded-none border-0 px-1 py-4 shadow-none ${activeTab === tab.id ? "text-[var(--ether-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-full after:bg-[var(--ether-primary)]" : "text-[var(--ether-on-surface-variant)]"}`}
                type="button"
                variant="ghost"
              >
                <AppIcon name={tab.icon} />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar h-[calc(100vh-11rem)] overflow-y-auto bg-[var(--ether-surface)] p-5 sm:p-6">
          {error ? (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Leads" value={leads.length} icon="group" />
            <Metric
              label="Showings"
              value={bookings.length + realtorShowings.length}
              icon="event"
            />
            <Metric label="Feedback" value={feedback.length} icon="rate_review" />
            <Metric label="Documents" value={documents.length} icon="description" />
          </section>

          <div className="mt-5">
            {activeTab === "overview" ? <Overview property={property} /> : null}
            {activeTab === "leads" ? <LeadsList items={leads} /> : null}
            {activeTab === "showings" ? (
              <ShowingsList bookings={bookings} realtorShowings={realtorShowings} />
            ) : null}
            {activeTab === "feedback" ? <FeedbackList items={feedback} /> : null}
            {activeTab === "documents" ? <DocumentsList items={documents} /> : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Metric({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-0 bg-white shadow-[var(--shadow-surface-1)]">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <AppIcon name={icon} />
      </CardContent>
    </Card>
  )
}

function Overview({ property }: { property: PropertyItem }) {
  const initials = (property.ownerName || "Owner").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
  const details = [
    { label: "Bedrooms", value: property.bedRoom || "�", icon: "bed" },
    { label: "Bathrooms", value: property.bathRoom || "�", icon: "bathtub" },
    { label: "Total Size", value: property.width || "�", icon: "square_foot" },
    { label: "Listing Agent", value: property.agent?.fullName || "Unassigned", icon: "badge" },
    { label: "Created", value: formatDate(property.createdAt), icon: "calendar_today" },
    { label: "Updated", value: formatDate(property.updatedAt), icon: "update" },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
        <div className="mb-6 flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] pb-4">
          <AppIcon className="text-xl text-[var(--ether-primary)]" name="analytics" />
          <h3 className="ether-headline-sm text-[var(--ether-on-surface)]">Listing Details</h3>
        </div>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {details.map((item) => (
            <div className="flex items-start gap-3" key={item.label}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ether-surface-container-low)] text-[var(--ether-primary)]"><AppIcon name={item.icon} /></span>
              <div><p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">{item.label}</p><p className="mt-1 font-semibold text-[var(--ether-on-surface)]">{item.value}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
        <div className="mb-4 flex items-center gap-3"><AppIcon className="text-xl text-[var(--ether-primary)]" name="subject" /><h3 className="ether-headline-sm">Property Description</h3></div>
        <div className="space-y-3 text-sm leading-7 text-[var(--ether-on-surface-variant)]"><p>{property.description || "No description provided."}</p>{property.extraDescription ? <p>{property.extraDescription}</p> : null}</div>
        {property.keyAmenities?.length ? <div className="mt-5 flex flex-wrap gap-2">{property.keyAmenities.map((item) => <Badge className="rounded-full border-0 bg-[var(--ether-primary-fixed)] px-3 py-1 text-[var(--ether-primary)]" key={item}>{item}</Badge>)}</div> : null}
      </section>

      <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
        <div className="mb-5 flex items-center gap-3"><AppIcon className="text-xl text-[var(--ether-primary)]" name="verified_user" /><h3 className="ether-headline-sm">Applicant Requirements & Showing</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Minimum Credit Score" value={property.minimumCreditScore == null ? undefined : String(property.minimumCreditScore)} />
          <Detail label="Minimum Monthly Income" value={property.minimumMonthlyIncome == null ? undefined : String(property.minimumMonthlyIncome)} />
          <Detail label="Security Deposit" value={property.securityDeposit == null ? undefined : String(property.securityDeposit)} />
          <Detail label="Application Fee" value={property.applicationFee == null ? undefined : String(property.applicationFee)} />
          <Detail label="Available From" value={property.availableFrom || undefined} />
          <Detail label="Minimum Lease" value={property.minimumLeaseMonths == null ? undefined : String(property.minimumLeaseMonths) + " months"} />
        </div>
        {property.applicationInstructions ? <div className="mt-5"><p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Application Instructions</p><p className="mt-2 text-sm leading-6 text-[var(--ether-on-surface-variant)]">{property.applicationInstructions}</p></div> : null}
        {property.realtorShowingInstructions ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="ether-label-caps text-[10px] text-amber-700">Private Realtor Showing Instructions</p><p className="mt-2 text-sm leading-6 text-amber-950">{property.realtorShowingInstructions}</p></div> : null}
      </section>

      <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
        <div className="mb-5 flex items-center gap-3"><AppIcon className="text-xl text-[var(--ether-primary)]" name="person_pin" /><h3 className="ether-headline-sm">Owner Information</h3></div>
        <div className="rounded-2xl bg-[var(--ether-surface-container-low)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-full bg-[var(--ether-primary)] text-lg font-bold text-white">{initials}</span><div><p className="text-lg font-bold">{property.ownerName || "Owner not provided"}</p><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Property owner contact</p></div></div>
            <div className="flex gap-2">{property.ownerPhone ? <a className="flex size-10 items-center justify-center rounded-lg bg-white text-[var(--ether-primary)] shadow-sm" href={`tel:${property.ownerPhone}`}><AppIcon name="call" /></a> : null}{property.ownerEmail ? <a className="flex size-10 items-center justify-center rounded-lg bg-white text-[var(--ether-primary)] shadow-sm" href={`mailto:${property.ownerEmail}`}><AppIcon name="mail" /></a> : null}</div>
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Email" value={property.ownerEmail} /><Detail label="Phone" value={property.ownerPhone} /></div>
        </div>
        {property.ownerExtraInfo ? <div className="mt-5"><p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Internal Operations Note</p><div className="mt-3 rounded-r-xl border-l-4 border-[var(--ether-primary)]/40 bg-[var(--ether-surface)] p-4 text-sm italic leading-6 text-[var(--ether-on-surface-variant)]">{property.ownerExtraInfo}</div></div> : null}
      </section>
    </div>
  )
}

function LeadsList({ items }: { items: any[] }) {
  if (!items.length) return <Empty text="No leads are linked to this property." />
  return (
    <div className="space-y-3">
      {items.map((lead) => (
        <Card className="shadow-none" key={lead.id}>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{lead.name || "Unnamed lead"}</p>
                <Badge variant="outline">{lead.stage}</Badge>
                <Badge variant="secondary">{lead.priority}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[lead.email, lead.phone].filter(Boolean).join(" · ") || "No contact details"}
              </p>
              <p className="mt-2 text-sm">{lead.summary || lead.interest || "No summary"}</p>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              <p>{lead.assignedAgentName || lead.agent || "Unassigned"}</p>
              <p>{formatDate(lead.lastActivityAt)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ShowingsList({ bookings, realtorShowings }: { bookings: any[]; realtorShowings: any[] }) {
  if (!bookings.length && !realtorShowings.length) {
    return <Empty text="No showing activity is linked to this property." />
  }
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Booked showings</h3>
        <div className="space-y-3">
          {bookings.map((item) => (
            <Card className="shadow-none" key={`booking-${item.id}`}>
              <CardContent className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{item.contactName || "Visitor"}</p>
                  <p className="text-sm text-muted-foreground">{item.contactEmail || item.contactPhone}</p>
                  {item.notes ? <p className="mt-2 text-sm">{item.notes}</p> : null}
                </div>
                <div className="sm:text-right">
                  <Badge variant="outline">{item.status}</Badge>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.startAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {!bookings.length ? <Empty text="No booked showings." /> : null}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold">Realtor showing outreach</h3>
        <div className="space-y-3">
          {realtorShowings.map((item) => (
            <Card className="shadow-none" key={`realtor-${item.id}`}>
              <CardContent className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{item.realtorName || "Realtor"}</p>
                  <p className="text-sm text-muted-foreground">
                    {[item.realtorEmail, item.realtorPhone].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="sm:text-right">
                  <Badge variant="outline">{item.automationStatus}</Badge>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.showingAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {!realtorShowings.length ? <Empty text="No realtor showing outreach." /> : null}
        </div>
      </section>
    </div>
  )
}

function FeedbackList({ items }: { items: any[] }) {
  if (!items.length) return <Empty text="No feedback has been received for this property." />
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card className="shadow-none" key={item.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{item.realtorName || "Realtor"}</p>
                <SentimentBadge value={item.sentiment} />
                <Badge variant="outline">{item.channel === "Sms" ? "SMS" : "Email"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(item.receivedAt)}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.feedbackText}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.classifier || "Unknown classifier"} · {Math.round((item.confidence ?? 0) * 100)}% confidence
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DocumentsList({ items }: { items: any[] }) {
  if (!items.length) return <Empty text="No repository documents are linked to this property." />
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <a
          className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
          href={item.fileUrl}
          key={item.id}
          rel="noreferrer"
          target="_blank"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.fileName}</p>
            </div>
            <AppIcon name="open_in_new" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">{item.documentType}</Badge>
            <Badge variant="secondary">{item.category || "Uncategorized"}</Badge>
          </div>
        </a>
      ))}
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value || "—"}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function SentimentBadge({ value }: { value: string }) {
  if (value === "negative") return <Badge variant="destructive">Negative</Badge>
  if (value === "positive") return <Badge variant="secondary">Positive</Badge>
  return <Badge variant="outline">Neutral</Badge>
}

function normalize(value: unknown) {
  return `${value ?? ""}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

function formatStatus(value: string) {
  return `${value ?? ""}`.replace(/([A-Z])/g, " $1").trim()
}









