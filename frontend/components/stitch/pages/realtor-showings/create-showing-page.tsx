"use client"

import Link from "next/link"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import type { PropertyItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { useCreateRealtorShowing } from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"

type LeadOption = {
  id: number
  name: string
  email?: string
  phone?: string
}

function display(value?: string | null, fallback = "Not set") {
  const text = `${value ?? ""}`.trim()
  return text || fallback
}

function propertyText(property: PropertyItem) {
  return `${property.title} ${property.location} ${property.exactLocation ?? ""}`.toLowerCase()
}

export function CreateRealtorShowingPage() {
  const router = useRouter()
  const createMutation = useCreateRealtorShowing()
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const templatesQuery = useLeadOutreachTemplates()
  const schedulingQuery = useSchedulingSettings()

  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [leadSearch, setLeadSearch] = useState("")
  const [leadResults, setLeadResults] = useState<LeadOption[]>([])
  const [propertySearch, setPropertySearch] = useState("")
  const [propertyId, setPropertyId] = useState("")
  const [realtorName, setRealtorName] = useState("")
  const [realtorEmail, setRealtorEmail] = useState("")
  const [realtorPhone, setRealtorPhone] = useState("")
  const [visitorName, setVisitorName] = useState("")
  const [visitorEmail, setVisitorEmail] = useState("")
  const [visitorPhone, setVisitorPhone] = useState("")
  const [showingDate, setShowingDate] = useState("")
  const [showingTime, setShowingTime] = useState("")
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [directTemplateId, setDirectTemplateId] = useState("")
  const [outreachDate, setOutreachDate] = useState("")
  const [outreachTime, setOutreachTime] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(true)
  const [followUpTemplateId, setFollowUpTemplateId] = useState("")
  const [followUpGapDays, setFollowUpGapDays] = useState(2)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (leadSearch.trim().length < 2) {
      setLeadResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/proxy/leads?page=1&pageSize=8&search=${encodeURIComponent(leadSearch.trim())}`)
      if (!response.ok) return
      const payload = await response.json()
      setLeadResults(payload.items ?? payload.data ?? [])
    }, 250)
    return () => window.clearTimeout(timer)
  }, [leadSearch])

  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"
  const properties = propertiesQuery.data?.items ?? []
  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase()
    if (!query) return properties.slice(0, 12)
    return properties.filter((property) => propertyText(property).includes(query)).slice(0, 12)
  }, [properties, propertySearch])
  const selectedProperty = properties.find((property) => String(property.id) === propertyId)
  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((template) => template.isActive !== false && (template.audience === "Realtor" || template.audience === "LeadShowing" || template.id === "showing-confirmation")),
    [templatesQuery.data],
  )
  const directTemplates = templates.filter((template) => (template.sequenceType ?? "Direct") === "Direct")
  const followUpTemplates = templates.filter((template) => (template.sequenceType ?? "Direct") !== "Direct")
  const outreachAt = outreachDate && outreachTime ? `${outreachDate}T${outreachTime}` : ""

  useEffect(() => {
    if (!directTemplateId && directTemplates.length) {
      setDirectTemplateId(directTemplates.find((template) => template.id === "showing-confirmation")?.id ?? directTemplates[0].id)
    }
    if (!followUpTemplateId && followUpTemplates.length) {
      setFollowUpTemplateId(followUpTemplates[0].id)
    }
    if (!followUpTemplates.length && followUpEnabled) {
      setFollowUpEnabled(false)
    }
  }, [directTemplateId, directTemplates, followUpEnabled, followUpTemplateId, followUpTemplates])

  async function createShowing() {
    setError(null)
    if (!selectedProperty) {
      setError("Choose a property.")
      return
    }
    if (!showingDate || !showingTime) {
      setError("Choose showing date and time.")
      return
    }
    if (!realtorEmail.trim() && !realtorPhone.trim()) {
      setError("Add realtor email or phone.")
      return
    }
    if (!visitorEmail.trim()) {
      setError("Visitor email is required.")
      return
    }

    const response = await createMutation.mutateAsync({
      directTemplateId,
      emailEnabled,
      followUpEnabled,
      followUpGapDays,
      followUpTemplateId,
      leadId: selectedLeadId,
      outreachAt: outreachAt || null,
      property: selectedProperty.title,
      realtorEmail: realtorEmail.trim(),
      realtorName: realtorName.trim(),
      realtorPhone: realtorPhone.trim(),
      showingAt: `${showingDate}T${showingTime}`,
      smsEnabled,
      visitorEmail: visitorEmail.trim(),
      visitorName: visitorName.trim(),
      visitorPhone: visitorPhone.trim(),
    })
    if (response.error) {
      setError(response.error.message)
      return
    }
    router.push("/dashboard/realtor-showings")
  }

  return (
    <main className="min-h-full bg-muted/20 p-3 md:p-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{"Add property showing"}</h1>
              <Badge variant="outline">{timeZone}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{"Search property, attach visitor/lead, set first message and follow-up."}</p>
          </div>
          <div className="flex gap-2">
            <Button render={<Link href="/dashboard/realtor-showings?import=1" />} variant="outline">
              <AppIcon name="upload_file" />
              {"Import CSV"}
            </Button>
            <Button render={<Link href="/dashboard/realtor-showings" />} variant="outline">
              {"Back"}
            </Button>
          </div>
        </div>

        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <div className="flex flex-col gap-3">
            <Card className="shadow-none">
              <CardHeader className="grid gap-3 py-3 md:grid-cols-[1fr_320px] md:items-center">
                <div>
                  <CardTitle className="text-base">{"Property search"}</CardTitle>
                  <CardDescription>{"Live properties only. Search title, address, city, or unit."}</CardDescription>
                </div>
                <Input className="h-9" placeholder="Search property..." value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} />
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredProperties.map((property) => {
                    const active = propertyId === String(property.id)
                    return (
                      <button
                        className={`rounded-lg border p-3 text-left text-sm transition-colors ${active ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"}`}
                        key={property.id}
                        onClick={() => setPropertyId(String(property.id))}
                        type="button"
                      >
                        <span className="line-clamp-1 block font-semibold">{property.title}</span>
                        <span className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{property.exactLocation || property.location}</span>
                      </button>
                    )
                  })}
                  {!filteredProperties.length ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      {"No property found."}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border bg-background p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Selected"}</p>
                  <p className="mt-2 font-semibold">{selectedProperty?.title || "No property selected"}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{display(selectedProperty?.exactLocation || selectedProperty?.location)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="py-3">
                <CardTitle className="text-base">{"People"}</CardTitle>
                <CardDescription>{"Realtor receives workflow. Visitor is linked to lead history."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Realtor"}</p>
                  <Field label="Name"><Input className="h-9" value={realtorName} onChange={(event) => setRealtorName(event.target.value)} /></Field>
                  <Field label="Email"><Input className="h-9" type="email" value={realtorEmail} onChange={(event) => setRealtorEmail(event.target.value)} /></Field>
                  <Field label="Phone"><Input className="h-9" value={realtorPhone} onChange={(event) => setRealtorPhone(event.target.value)} /></Field>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Lead / visitor"}</p>
                  <Field label="Search lead"><Input className="h-9" placeholder="Name or email" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} /></Field>
                  {leadResults.length ? (
                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border p-1">
                      {leadResults.map((lead) => (
                        <button
                          className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${selectedLeadId === lead.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                          key={lead.id}
                          onClick={() => {
                            setSelectedLeadId(lead.id)
                            setVisitorName(lead.name || "")
                            setVisitorEmail(lead.email || "")
                            setVisitorPhone(lead.phone || "")
                          }}
                          type="button"
                        >
                          <strong>{display(lead.name, `Lead #${lead.id}`)}</strong>
                          <span className="ml-2 opacity-75">{display(lead.email || lead.phone)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Field label="Visitor name"><Input className="h-9" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} /></Field>
                  <Field label="Visitor email"><Input className="h-9" type="email" value={visitorEmail} onChange={(event) => setVisitorEmail(event.target.value)} /></Field>
                  <Field label="Visitor phone"><Input className="h-9" value={visitorPhone} onChange={(event) => setVisitorPhone(event.target.value)} /></Field>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <Card className="shadow-none">
              <CardHeader className="py-3">
                <CardTitle className="text-base">{"Timing"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Field label="Showing date"><Input className="h-9" type="date" value={showingDate} onChange={(event) => setShowingDate(event.target.value)} /></Field>
                <Field label="Showing time"><Input className="h-9" type="time" value={showingTime} onChange={(event) => setShowingTime(event.target.value)} /></Field>
                <Field label="First message date"><Input className="h-9" type="date" value={outreachDate} onChange={(event) => setOutreachDate(event.target.value)} /></Field>
                <Field label="First message time"><Input className="h-9" type="time" value={outreachTime} onChange={(event) => setOutreachTime(event.target.value)} /></Field>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="py-3">
                <CardTitle className="text-base">{"Automation"}</CardTitle>
                <CardDescription>{"Default template is preselected. Empty first message time sends immediately."}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Toggle checked={emailEnabled} label="Email" onChange={setEmailEnabled} />
                  <Toggle checked={smsEnabled} label="SMS" onChange={setSmsEnabled} />
                </div>
                <Field label="Direct template">
                  <Select onValueChange={(value) => setDirectTemplateId(value === "none" ? "" : value)} value={directTemplateId || "none"}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {!directTemplates.length ? <SelectItem value="none">No realtor template</SelectItem> : null}
                      {directTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Toggle checked={followUpEnabled} label="Enable follow-up" onChange={setFollowUpEnabled} />
                {followUpEnabled ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                    <Field label="Follow-up template">
                      <Select onValueChange={(value) => setFollowUpTemplateId(value === "none" ? "" : value)} value={followUpTemplateId || "none"}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">No follow-up</SelectItem>{followUpTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Gap days"><Input className="h-9" min={1} type="number" value={followUpGapDays} onChange={(event) => setFollowUpGapDays(Math.max(1, Number(event.target.value) || 1))} /></Field>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="p-3">
                <Button className="w-full" disabled={createMutation.isPending} onClick={() => void createShowing()} type="button">
                  <AppIcon name="add" />
                  {createMutation.isPending ? "Creating..." : "Create showing"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</label>
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  )
}
