"use client"

import type { OperationsAnalytics } from "@/lib/property-operations-api"

export function ManagerInsights({ analytics, assistant }: { analytics: OperationsAnalytics | null; assistant: Record<string, unknown> | null }) {
  const recommendations = Array.isArray(assistant?.recommendations) ? assistant.recommendations : []
  const urgent = Array.isArray(assistant?.urgentItems) ? assistant.urgentItems as Array<Record<string, unknown>> : []
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Net operating amount", analytics?.netOperatingAmount ?? 0],
      ["Occupied units", analytics?.occupiedUnits ?? 0],
      ["Available units", analytics?.availableUnits ?? 0],
      ["Maintenance backlog", analytics?.maintenanceBacklog ?? 0],
      ["Pending vendor quotes", analytics?.pendingQuotes ?? 0],
      ["Income", analytics?.totalIncome ?? 0],
      ["Expense", analytics?.totalExpense ?? 0],
      ["Overdue", analytics?.overdueRecords ?? 0],
    ].map(([label, value]) => <div className="rounded-2xl border bg-background p-4" key={label}><p className="text-2xl font-bold">{String(value)}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-2xl border bg-background p-5"><h2 className="font-semibold">Operations assistant</h2><p className="mt-2 text-sm text-muted-foreground">{String(assistant?.summary ?? "No summary generated yet.")}</p><div className="mt-4 space-y-2">{recommendations.map((item, index) => <p className="rounded-xl bg-muted/40 p-3 text-sm" key={index}>{String(item)}</p>)}</div></section><section className="rounded-2xl border bg-background p-5"><h2 className="font-semibold">Urgent items</h2><div className="mt-4 space-y-2">{urgent.map((item, index) => <div className="rounded-xl border p-3" key={String(item.id ?? index)}><p className="text-sm font-semibold">{String(item.title ?? "Operational item")}</p><p className="mt-1 text-xs text-muted-foreground">{String(item.moduleKey ?? "")} · {String(item.status ?? "")} · {String(item.priority ?? "")}</p></div>)}{!urgent.length ? <p className="text-sm text-muted-foreground">No urgent items.</p> : null}</div></section></div>
    <div className="grid gap-5 xl:grid-cols-2"><Breakdown title="Records by module" values={analytics?.recordsByModule ?? {}} /><Breakdown title="Records by status" values={analytics?.recordsByStatus ?? {}} /></div>
  </div>
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1])
  return <section className="rounded-2xl border bg-background p-5"><h2 className="font-semibold">{title}</h2><div className="mt-4 space-y-2">{entries.map(([label, value]) => <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm" key={label}><span>{label}</span><strong>{value}</strong></div>)}{!entries.length ? <p className="text-sm text-muted-foreground">No data yet.</p> : null}</div></section>
}
