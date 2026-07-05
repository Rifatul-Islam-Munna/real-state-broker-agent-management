"use client"

import { Building2, CheckCircle2, Search, Trash2 } from "lucide-react"

import type { PropertyItem } from "@/hooks/use-real-estate-api"
import type { OperationsAnalytics, OperationsWorkspace } from "@/lib/property-operations-api"

export function ManagerOverview({
  analytics,
  availableProperties,
  completion,
  onImport,
  onOpen,
  onRemove,
  onSearch,
  onToggle,
  saving,
  search,
  selectedIds,
  workspaces,
}: {
  analytics: OperationsAnalytics | null
  availableProperties: PropertyItem[]
  completion: number
  onImport: () => void
  onOpen: (propertyId: number) => void
  onRemove: (propertyId: number) => void
  onSearch: (value: string) => void
  onToggle: (propertyId: number) => void
  saving: boolean
  search: string
  selectedIds: number[]
  workspaces: OperationsWorkspace[]
}) {
  const metrics = [
    ["Imported", analytics?.importedProperties ?? 0],
    ["All records", analytics?.totalRecords ?? 0],
    ["Open", analytics?.openRecords ?? 0],
    ["Overdue", analytics?.overdueRecords ?? 0],
    ["Completed", analytics?.completedRecords ?? 0],
    ["Active links", analytics?.activePublicLinks ?? 0],
    ["Submissions", analytics?.anonymousSubmissions ?? 0],
    ["Prepared", `${completion}%`],
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {metrics.map(([label, value]) => (
          <div className="rounded-2xl border bg-background p-4" key={label}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-background p-4">
          <h2 className="font-semibold">Import existing properties</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select listings from the broker dashboard.</p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-10 w-full rounded-xl border pl-9 pr-3 text-sm" onChange={(event) => onSearch(event.target.value)} placeholder="Search properties" value={search} />
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
            {availableProperties.map((property) => {
              const checked = selectedIds.includes(property.id)
              const imported = workspaces.some((item) => item.propertyId === property.id)
              return (
                <button className={`w-full rounded-xl border p-3 text-left ${checked ? "border-primary bg-primary/5" : ""} disabled:opacity-60`} disabled={imported} key={property.id} onClick={() => onToggle(property.id)} type="button">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{property.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{property.exactLocation || property.location}</p>
                    </div>
                    {imported ? <CheckCircle2 className="size-5 text-emerald-600" /> : <span className={`size-5 rounded border ${checked ? "border-primary bg-primary" : ""}`} />}
                  </div>
                </button>
              )
            })}
          </div>
          <button className="mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!selectedIds.length || saving} onClick={onImport} type="button">Import {selectedIds.length || "selected"}</button>
        </section>

        <section className="rounded-2xl border bg-background p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Operations portfolio</h2>
              <p className="mt-1 text-xs text-muted-foreground">Each property has independent records, modules and links.</p>
            </div>
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <article className="rounded-2xl border p-4" key={workspace.id}>
                <button className="w-full text-left" onClick={() => onOpen(workspace.propertyId)} type="button">
                  <p className="font-semibold">{workspace.propertyTitle}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{workspace.propertyLocation}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border px-2 py-0.5 text-[11px]">{workspace.propertyType}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px]">{workspace.propertyStatus}</span>
                  </div>
                </button>
                <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-red-600" onClick={() => onRemove(workspace.propertyId)} type="button"><Trash2 className="size-3.5" /> Remove</button>
              </article>
            ))}
            {!workspaces.length ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground md:col-span-2">Import a property to begin.</div> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
