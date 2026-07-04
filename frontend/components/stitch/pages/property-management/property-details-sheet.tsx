"use client"

import { useMemo, useState } from "react"

import type { PropertyItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  onOpenChange,
  open,
  property,
}: {
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
  const realtorShowings = (realtorQuery.data ?? []).filter(
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

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setActiveTab("overview")
      }}
    >
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-[58rem]">
        <SheetHeader className="border-b px-5 py-5 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-xl">{property.title}</SheetTitle>
                <Badge variant="outline">{formatStatus(property.status)}</Badge>
              </div>
              <SheetDescription className="mt-1">
                {property.exactLocation || property.location || "Location pending"}
              </SheetDescription>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{property.price || "Price pending"}</p>
              <p className="text-xs text-muted-foreground">
                {property.propertyType} · {property.listingType === "ForRent" ? "For rent" : "For sale"}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b px-5 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                size="sm"
                type="button"
                variant={activeTab === tab.id ? "secondary" : "outline"}
              >
                <AppIcon name={tab.icon} />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="h-[calc(100vh-10.5rem)] overflow-y-auto p-5">
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
    <Card className="shadow-none">
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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Listing details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Bedrooms" value={property.bedRoom} />
          <Detail label="Bathrooms" value={property.bathRoom} />
          <Detail label="Size" value={property.width} />
          <Detail label="Agent" value={property.agent?.fullName || "Unassigned"} />
          <Detail label="Created" value={formatDate(property.createdAt)} />
          <Detail label="Updated" value={formatDate(property.updatedAt)} />
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Owner</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Detail label="Name" value={property.ownerName} />
          <Detail label="Email" value={property.ownerEmail} />
          <Detail label="Phone" value={property.ownerPhone} />
          <Detail label="Notes" value={property.ownerExtraInfo} />
        </CardContent>
      </Card>
      <Card className="shadow-none lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm leading-6">
          <p>{property.description || "No description provided."}</p>
          {property.extraDescription ? <p className="text-muted-foreground">{property.extraDescription}</p> : null}
          {property.keyAmenities?.length ? (
            <div className="flex flex-wrap gap-2">
              {property.keyAmenities.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
            </div>
          ) : null}
        </CardContent>
      </Card>
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
  return value.replace(/([A-Z])/g, " $1").trim()
}
