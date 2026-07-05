"use client"

import { BarChart3, ClipboardList, Link2, RefreshCw, Settings, ShieldCheck } from "lucide-react"
import type { OperationsTab } from "./use-property-operations-manager"

export function ManagerShell({ children, loading, refresh, tab, setTab }: { children: React.ReactNode; loading: boolean; refresh: () => void; tab: OperationsTab; setTab: (tab: OperationsTab) => void }) {
  const tabs: Array<[OperationsTab, string, typeof BarChart3]> = [["overview", "Overview", BarChart3], ["modules", "Operations modules", ClipboardList], ["requests", "Links and QR forms", Link2], ["settings", "Settings", Settings]]
  return <main className="mx-auto w-full max-w-[1700px] space-y-5 p-4 md:p-6 xl:p-8">
    <section className="rounded-3xl border bg-background p-5 md:p-7"><div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" />Admin-only Property Operations Manager</div><h1 className="mt-3 text-2xl font-bold md:text-3xl">Manage every property operation from one workspace</h1><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Outside contacts respond through expiring links or QR codes without accounts.</p></div><button className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" disabled={loading} onClick={refresh} type="button"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></div></section>
    <div className="flex gap-2 overflow-x-auto">{tabs.map(([value, label, Icon]) => <button className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${tab === value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`} key={value} onClick={() => setTab(value)} type="button"><Icon className="size-4" />{label}</button>)}</div>
    {children}
  </main>
}
