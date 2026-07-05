"use client"

import { propertyOperationsModules, type PropertyOperationsModule } from "@/data/property-operations-modules"
import type { OperationsWorkspace } from "@/lib/property-operations-api"

export function ManagerModules({ activeWorkspace, onOpenModule, onStatus }: { activeWorkspace: OperationsWorkspace | null; onOpenModule: (module: PropertyOperationsModule) => void; onStatus: (key: string, status: string) => void }) {
  const states = new Map(activeWorkspace?.moduleStates.map((item) => [item.moduleKey, item.status]) ?? [])
  if (!activeWorkspace) return <div className="rounded-2xl border border-dashed p-10 text-center">Import a property first.</div>
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{propertyOperationsModules.map((module) => {
    const status = states.get(module.id) ?? "Not started"
    return <article className="flex flex-col rounded-2xl border bg-background p-4" key={module.id}>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{module.category}</p>
      <h3 className="mt-1 font-semibold">{module.id === "subscriptions" ? "Service Contracts & Utilities" : module.label}</h3>
      <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
      <select className="mt-4 h-9 rounded-lg border bg-background px-2 text-xs" onChange={(event) => onStatus(module.id, event.target.value)} value={status}>{["Not started", "In progress", "Ready"].map((value) => <option key={value}>{value}</option>)}</select>
      <button className="mt-2 h-9 rounded-lg bg-primary text-xs font-semibold text-primary-foreground" onClick={() => onOpenModule(module)} type="button">Open module</button>
    </article>
  })}</div>
}
