"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Check, Download, Home, MapPin, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { sileo } from "sileo"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { propertyOperationsApi, type OperationsWorkspace } from "@/lib/property-operations-api"

type MainProperty = {
  id: number
  title: string
  location?: string
  exactLocation?: string
  propertyType?: string
  listingType?: string
  status?: string
  slug?: string
  thumbnailUrl?: string | null
  imageUrls?: string[]
}

type PropertyFeed = {
  items?: MainProperty[]
  totalCount?: number
}

type ManualPropertyForm = {
  title: string
  location: string
  exactLocation: string
  propertyType: "Residential" | "Commercial"
  listingType: "ForSale" | "ForRent"
  status: "Draft" | "Open" | "Active"
  price: string
  bedRoom: string
  bathRoom: string
  width: string
  description: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
}

const emptyForm: ManualPropertyForm = {
  title: "",
  location: "",
  exactLocation: "",
  propertyType: "Residential",
  listingType: "ForSale",
  status: "Draft",
  price: "",
  bedRoom: "",
  bathRoom: "",
  width: "",
  description: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
}

export function PropertyOperationsPropertiesImportPage() {
  const [properties, setProperties] = useState<MainProperty[]>([])
  const [workspaces, setWorkspaces] = useState<OperationsWorkspace[]>([])
  const [search, setSearch] = useState("")
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "available" | "imported">("all")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<ManualPropertyForm>(emptyForm)

  async function load() {
    setLoading(true)
    try {
      const [propertyResponse, imported] = await Promise.all([
        fetch("/api/proxy/properties?page=1&pageSize=200", { cache: "no-store" }),
        propertyOperationsApi.getWorkspaces(),
      ])
      if (!propertyResponse.ok) throw new Error("Unable to load existing properties")
      const payload = (await propertyResponse.json()) as PropertyFeed
      setProperties(payload.items ?? [])
      setWorkspaces(imported)
    } catch (error) {
      sileo.error({
        title: "Unable to load properties",
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const importedIds = useMemo(() => new Set(workspaces.map((item) => item.propertyId)), [workspaces])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return properties.filter((item) => {
      const isImported = importedIds.has(item.id)
      if (inventoryFilter === "imported" && !isImported) return false
      if (inventoryFilter === "available" && isImported) return false
      if (!query) return true
      return [item.title, item.location, item.exactLocation, item.propertyType, item.listingType, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [properties, search, inventoryFilter, importedIds])

  function updateField<K extends keyof ManualPropertyForm>(key: K, value: ManualPropertyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function importProperty(property: MainProperty) {
    setBusyId(property.id)
    try {
      await propertyOperationsApi.importProperties([
        {
          propertyId: property.id,
          title: property.title,
          location: property.location || property.exactLocation || "",
          propertyType: property.propertyType || "",
          listingType: property.listingType || "",
          propertyStatus: property.status || "",
          propertySlug: property.slug || "",
          thumbnailUrl: property.thumbnailUrl || property.imageUrls?.[0] || "",
        },
      ])
      sileo.success({ title: "Property imported into operations" })
      await load()
    } catch (error) {
      sileo.error({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setBusyId(null)
    }
  }

  async function createManualProperty() {
    if (!form.title.trim()) {
      sileo.error({ title: "Property title is required" })
      return
    }

    setCreating(true)
    try {
      const response = await fetch("/api/proxy/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          location: form.location.trim(),
          exactLocation: form.exactLocation.trim(),
          price: form.price.trim(),
          bedRoom: form.bedRoom.trim(),
          bathRoom: form.bathRoom.trim(),
          width: form.width.trim(),
          description: form.description.trim(),
          extraDescription: "",
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          ownerPhone: form.ownerPhone.trim(),
          ownerExtraInfo: "",
          propertyDocuments: [],
          imageUrls: [],
          imageObjectNames: [],
          keyAmenities: [],
          documentRepositoryItemIds: [],
          neighborhoodInsights: [],
          preQuestions: [],
          thumbnailUrl: null,
          thumbnailObjectName: null,
        }),
      })

      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.message ?? "Unable to create property")

      const created = body as MainProperty
      await propertyOperationsApi.importProperties([
        {
          propertyId: created.id,
          title: created.title,
          location: created.location || created.exactLocation || "",
          propertyType: created.propertyType || form.propertyType,
          listingType: created.listingType || form.listingType,
          propertyStatus: created.status || form.status,
          propertySlug: created.slug || "",
          thumbnailUrl: created.thumbnailUrl || created.imageUrls?.[0] || "",
        },
      ])

      setForm(emptyForm)
      setShowManualForm(false)
      sileo.success({ title: "Property created and added to Property Operations" })
      await load()
    } catch (error) {
      sileo.error({
        title: "Unable to create property",
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setCreating(false)
    }
  }

  async function removeProperty(propertyId: number) {
    setBusyId(propertyId)
    try {
      await propertyOperationsApi.removeWorkspace(propertyId)
      sileo.success({ title: "Property removed from operations" })
      await load()
    } catch (error) {
      sileo.error({
        title: "Unable to remove property",
        description: error instanceof Error ? error.message : "Request failed",
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-background p-5">
        <Badge variant="outline" className="border-blue-200 text-blue-700">Portfolio</Badge>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Properties</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Import a property already stored in the main platform, or create one manually here. Manual creation saves it to the main property inventory and automatically enables Property Operations.
            </p>
          </div>
          <Button onClick={() => setShowManualForm((current) => !current)}>
            <Plus className="size-4" />
            {showManualForm ? "Close form" : "Add property manually"}
          </Button>
        </div>
      </section>

      {showManualForm ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Add property manually</CardTitle>
            <CardDescription>This creates a real property in the main platform and imports it into Property Operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input placeholder="Property title *" value={form.title} onChange={(event) => updateField("title", event.target.value)} />
              <Input placeholder="Area / city" value={form.location} onChange={(event) => updateField("location", event.target.value)} />
              <Input placeholder="Exact address" value={form.exactLocation} onChange={(event) => updateField("exactLocation", event.target.value)} />
              <Select value={form.propertyType} onValueChange={(value) => updateField("propertyType", value as ManualPropertyForm["propertyType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Residential">Residential</SelectItem><SelectItem value="Commercial">Commercial</SelectItem></SelectContent>
              </Select>
              <Select value={form.listingType} onValueChange={(value) => updateField("listingType", value as ManualPropertyForm["listingType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ForSale">For sale</SelectItem><SelectItem value="ForRent">For rent</SelectItem></SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(value) => updateField("status", value as ManualPropertyForm["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Open">Open</SelectItem><SelectItem value="Active">Active</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Price" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
              <Input placeholder="Bedrooms" value={form.bedRoom} onChange={(event) => updateField("bedRoom", event.target.value)} />
              <Input placeholder="Bathrooms" value={form.bathRoom} onChange={(event) => updateField("bathRoom", event.target.value)} />
              <Input placeholder="Size / width" value={form.width} onChange={(event) => updateField("width", event.target.value)} />
              <Input placeholder="Owner name" value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} />
              <Input type="email" placeholder="Owner email" value={form.ownerEmail} onChange={(event) => updateField("ownerEmail", event.target.value)} />
              <Input placeholder="Owner phone" value={form.ownerPhone} onChange={(event) => updateField("ownerPhone", event.target.value)} />
            </div>
            <Textarea placeholder="Property description" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void createManualProperty()} disabled={creating || !form.title.trim()}>
                <Plus className="size-4" />
                {creating ? "Creatingâ€¦" : "Create and import property"}
              </Button>
              <Button variant="outline" onClick={() => { setForm(emptyForm); setShowManualForm(false) }} disabled={creating}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-2xl border bg-background">
        <div className="border-b bg-muted/20 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h2 className="font-semibold">Property inventory</h2>
                  <p className="text-sm text-muted-foreground">Choose which existing properties should use Property Operations.</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh inventory
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setInventoryFilter("all")}
              className={`rounded-xl border p-4 text-left transition ${inventoryFilter === "all" ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-100" : "bg-background hover:border-slate-300"}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">All properties</p>
              <p className="mt-1 text-2xl font-semibold">{properties.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setInventoryFilter("available")}
              className={`rounded-xl border p-4 text-left transition ${inventoryFilter === "available" ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-100" : "bg-background hover:border-slate-300"}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ready to import</p>
              <p className="mt-1 text-2xl font-semibold">{Math.max(properties.length - workspaces.length, 0)}</p>
            </button>
            <button
              type="button"
              onClick={() => setInventoryFilter("imported")}
              className={`rounded-xl border p-4 text-left transition ${inventoryFilter === "imported" ? "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-100" : "bg-background hover:border-slate-300"}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operations enabled</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{workspaces.length}</p>
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="bg-background pl-9" placeholder="Search by name, location, type or status" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Showing {filtered.length} of {properties.length}</p>
          </div>
        </div>

        <div className="divide-y">
          {filtered.map((property) => {
            const imported = importedIds.has(property.id)
            const image = property.thumbnailUrl || property.imageUrls?.[0]
            return (
              <article key={property.id} className="group grid gap-4 p-4 transition hover:bg-muted/20 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center md:px-6">
                <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/40 md:w-28">
                  {image ? (
                    <img src={image} alt={property.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <Building2 className="size-8 text-muted-foreground/70" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{property.title}</h3>
                    {imported ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        <Check className="size-3" />Operations enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Not imported</Badge>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{property.exactLocation || property.location || "Location not provided"}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {property.propertyType ? <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"><Home className="size-3" />{property.propertyType}</span> : null}
                    {property.listingType ? <span className="rounded-md bg-muted px-2 py-1 text-xs">{property.listingType === "ForSale" ? "For sale" : property.listingType === "ForRent" ? "For rent" : property.listingType}</span> : null}
                    {property.status ? <span className="rounded-md bg-muted px-2 py-1 text-xs">{property.status}</span> : null}
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">ID #{property.id}</span>
                  </div>
                </div>

                <div className="flex md:justify-end">
                  {imported ? (
                    <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive md:w-auto" onClick={() => void removeProperty(property.id)} disabled={busyId === property.id}>
                      <Trash2 className="size-4" />
                      {busyId === property.id ? "Removing…" : "Remove"}
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full md:w-auto" onClick={() => void importProperty(property)} disabled={busyId === property.id}>
                      <Download className="size-4" />
                      {busyId === property.id ? "Importing…" : "Enable operations"}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}

          {!loading && !filtered.length ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Search className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 font-semibold">No properties found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or inventory filter.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
