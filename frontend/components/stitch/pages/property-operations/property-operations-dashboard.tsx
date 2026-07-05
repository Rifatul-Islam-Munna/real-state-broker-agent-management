"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Search,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react"

import {
  propertyOperationsCategories,
  propertyOperationsModules,
  type PropertyOperationsModule,
} from "@/data/property-operations-modules"
import { type PropertyItem, useManagedProperties } from "@/hooks/use-real-estate-api"

import { ModuleWorkspaceDialog } from "./module-workspace-dialog"

const IMPORTED_PROPERTIES_KEY = "property-operations-imported-properties-v1"
const MODULE_PROGRESS_KEY = "property-operations-module-progress-v1"

type ImportedProperty = {
  id: number
  title: string
  location: string
  listingType: string
  propertyType: string
  status: string
  slug: string
  thumbnailUrl: string
}

type ModuleStatus = "Not started" | "In progress" | "Ready"
type ModuleProgress = Record<string, Record<string, ModuleStatus>>

const moduleStatusOptions: ModuleStatus[] = ["Not started", "In progress", "Ready"]

function propertySnapshot(property: PropertyItem): ImportedProperty {
  return {
    id: property.id,
    title: property.title || "Untitled property",
    location: property.exactLocation || property.location || "Location pending",
    listingType: property.listingType || "ForSale",
    propertyType: property.propertyType || "Residential",
    status: property.status || "Open",
    slug: property.slug || "",
    thumbnailUrl: property.thumbnailUrl || property.imageUrls?.[0] || "",
  }
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

function statusClassName(status: ModuleStatus) {
  if (status === "Ready") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (status === "In progress") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-border bg-background text-muted-foreground"
}

function ModuleIcon({ category }: { category: string }) {
  const className = "size-5"

  if (category === "People") return <Users className={className} />
  if (category === "Maintenance") return <Wrench className={className} />
  if (category === "Finance") return <BarChart3 className={className} />
  if (category === "Documents") return <FileText className={className} />
  if (category === "Administration") return <ShieldCheck className={className} />
  return <ClipboardList className={className} />
}

function PropertySelectionCard({
  checked,
  onToggle,
  property,
}: {
  checked: boolean
  onToggle: () => void
  property: PropertyItem
}) {
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:border-primary/40 hover:bg-muted/40 ${
        checked ? "border-primary bg-primary/5" : "border-border bg-background"
      }`}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
        }`}
      >
        {checked ? <Check className="size-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {property.title || "Untitled property"}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {property.exactLocation || property.location || "Location pending"}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5">{property.propertyType || "Property"}</span>
          <span className="rounded-full border px-2 py-0.5">{property.status || "Open"}</span>
        </span>
      </span>
    </button>
  )
}

function ModuleCard({
  activeProperty,
  module,
  onOpen,
  onStatusChange,
  status,
}: {
  activeProperty: ImportedProperty | null
  module: PropertyOperationsModule
  onOpen: () => void
  onStatusChange: (status: ModuleStatus) => void
  status: ModuleStatus
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-xl border bg-muted/40 p-2 text-foreground">
          <ModuleIcon category={module.category} />
        </span>
        <span className="rounded-full border px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {module.category}
        </span>
      </div>
      <div className="mt-4 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{module.label}</h3>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{module.description}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">Source parity: {module.sourceArea}</p>
      </div>
      <div className="mt-4 space-y-2 border-t pt-3">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {activeProperty ? `${activeProperty.title} status` : "Select an imported property"}
        </label>
        <select
          className={`h-9 w-full rounded-lg border px-2 text-xs outline-none transition focus:border-primary ${statusClassName(status)}`}
          disabled={!activeProperty}
          onChange={(event) => onStatusChange(event.target.value as ModuleStatus)}
          value={status}
        >
          {moduleStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!activeProperty}
          onClick={onOpen}
          type="button"
        >
          Open workspace <ArrowUpRight className="size-3.5" />
        </button>
      </div>
    </article>
  )
}

export function PropertyOperationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [importedProperties, setImportedProperties] = useState<ImportedProperty[]>([])
  const [activePropertyId, setActivePropertyId] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<(typeof propertyOperationsCategories)[number]>("All")
  const [activeModule, setActiveModule] = useState<PropertyOperationsModule | null>(null)
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress>({})
  const [storageReady, setStorageReady] = useState(false)

  const propertiesQuery = useManagedProperties({
    page: 1,
    pageSize: 100,
    search: searchTerm.trim() || undefined,
  })

  useEffect(() => {
    const storedProperties = readLocalStorage<ImportedProperty[]>(IMPORTED_PROPERTIES_KEY, [])
    const storedProgress = readLocalStorage<ModuleProgress>(MODULE_PROGRESS_KEY, {})
    setImportedProperties(storedProperties)
    setActivePropertyId(storedProperties[0]?.id ?? null)
    setModuleProgress(storedProgress)
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(IMPORTED_PROPERTIES_KEY, JSON.stringify(importedProperties))
  }, [importedProperties, storageReady])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(MODULE_PROGRESS_KEY, JSON.stringify(moduleProgress))
  }, [moduleProgress, storageReady])

  const availableProperties = useMemo(
    () => propertiesQuery.data?.items ?? [],
    [propertiesQuery.data?.items],
  )

  const activeProperty = useMemo(
    () => importedProperties.find((property) => property.id === activePropertyId) ?? null,
    [activePropertyId, importedProperties],
  )

  const visibleModules = useMemo(
    () =>
      activeCategory === "All"
        ? propertyOperationsModules
        : propertyOperationsModules.filter((module) => module.category === activeCategory),
    [activeCategory],
  )

  const activeProgress = activeProperty ? moduleProgress[String(activeProperty.id)] ?? {} : {}
  const readyCount = Object.values(activeProgress).filter((status) => status === "Ready").length
  const inProgressCount = Object.values(activeProgress).filter((status) => status === "In progress").length
  const completion = Math.round((readyCount / propertyOperationsModules.length) * 100)

  function toggleProperty(propertyId: number) {
    setSelectedIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    )
  }

  function importSelectedProperties() {
    const selectedProperties = availableProperties
      .filter((property) => selectedIds.includes(property.id))
      .map(propertySnapshot)

    setImportedProperties((current) => {
      const map = new Map(current.map((property) => [property.id, property]))
      selectedProperties.forEach((property) => map.set(property.id, property))
      return Array.from(map.values())
    })

    setActivePropertyId((current) => current ?? selectedProperties[0]?.id ?? null)
    setSelectedIds([])
  }

  function removeImportedProperty(propertyId: number) {
    setImportedProperties((current) => current.filter((property) => property.id !== propertyId))
    setActivePropertyId((current) => {
      if (current !== propertyId) return current
      return importedProperties.find((property) => property.id !== propertyId)?.id ?? null
    })
    if (activePropertyId === propertyId) setActiveModule(null)
  }

  function updateModuleStatus(moduleId: string, status: ModuleStatus) {
    if (!activeProperty) return

    setModuleProgress((current) => ({
      ...current,
      [String(activeProperty.id)]: {
        ...(current[String(activeProperty.id)] ?? {}),
        [moduleId]: status,
      },
    }))
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 md:p-6 xl:p-8">
        <section className="overflow-hidden rounded-3xl border bg-background">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Building2 className="size-4" />
                Property Operations
              </div>
              <h1 className="mt-3 max-w-4xl text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                A separate operating dashboard for every managed property
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Import listings from the broker dashboard, then manage the complete property-management feature set without mixing operational work with sales CRM activity.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-center">
                <div className="text-xl font-bold text-foreground">{importedProperties.length}</div>
                <div className="text-[11px] text-muted-foreground">Imported</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-center">
                <div className="text-xl font-bold text-foreground">{propertyOperationsModules.length}</div>
                <div className="text-[11px] text-muted-foreground">Modules</div>
              </div>
              <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-center">
                <div className="text-xl font-bold text-foreground">{completion}%</div>
                <div className="text-[11px] text-muted-foreground">Prepared</div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-2xl border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Import properties</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Select existing broker listings.</p>
                </div>
                <Download className="size-4 text-muted-foreground" />
              </div>

              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search property..."
                  value={searchTerm}
                />
              </div>

              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {propertiesQuery.isLoading ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Loading properties...
                  </div>
                ) : null}
                {!propertiesQuery.isLoading && availableProperties.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No properties matched this search.
                  </div>
                ) : null}
                {availableProperties.map((property) => (
                  <PropertySelectionCard
                    checked={selectedIds.includes(property.id)}
                    key={property.id}
                    onToggle={() => toggleProperty(property.id)}
                    property={property}
                  />
                ))}
              </div>

              <button
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedIds.length === 0}
                onClick={importSelectedProperties}
                type="button"
              >
                Import {selectedIds.length || "selected"}
                <ArrowRight className="size-4" />
              </button>
            </section>

            <section className="rounded-2xl border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Operations portfolio</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Choose the property to operate.</p>
                </div>
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-4 space-y-2">
                {importedProperties.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Import at least one property to begin.
                  </div>
                ) : null}
                {importedProperties.map((property) => {
                  const active = property.id === activePropertyId
                  return (
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-2 ${
                        active ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      key={property.id}
                    >
                      <button
                        className="min-w-0 flex-1 px-1 py-1 text-left"
                        onClick={() => {
                          setActivePropertyId(property.id)
                          setActiveModule(null)
                        }}
                        type="button"
                      >
                        <span className="block truncate text-sm font-semibold text-foreground">{property.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{property.location}</span>
                      </button>
                      <button
                        aria-label={`Remove ${property.title}`}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        onClick={() => removeImportedProperty(property.id)}
                        type="button"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            <div className="rounded-2xl border bg-background p-4 md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Active workspace</p>
                  <h2 className="mt-1 text-xl font-bold text-foreground">
                    {activeProperty?.title ?? "Select an imported property"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeProperty?.location ?? "Module progress is tracked separately for each imported property."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-600" /> {readyCount} ready
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                    <ClipboardList className="size-3.5 text-amber-600" /> {inProgressCount} in progress
                  </span>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {propertyOperationsCategories.map((category) => (
                <button
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activeCategory === category
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleModules.map((module) => (
                <ModuleCard
                  activeProperty={activeProperty}
                  key={module.id}
                  module={module}
                  onOpen={() => setActiveModule(module)}
                  onStatusChange={(status) => updateModuleStatus(module.id, status)}
                  status={activeProgress[module.id] ?? "Not started"}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <ModuleWorkspaceDialog
        module={activeModule}
        onClose={() => setActiveModule(null)}
        property={activeProperty}
      />
    </>
  )
}
