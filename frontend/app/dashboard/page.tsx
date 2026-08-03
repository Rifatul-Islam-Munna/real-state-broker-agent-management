import { CalendarDays, Database, Home, Users } from "lucide-react"

import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getTenantDashboardOverview } from "@/lib/tenant-dashboard-actions"

export default async function Page() {
  const user = await requireDashboardAccess("dashboard")
  const overview = await getTenantDashboardOverview()
  const cards = [
    { label: "Properties", value: overview.metrics.properties, icon: Home },
    { label: "Published", value: overview.metrics.publishedProperties, icon: Database },
    { label: "Leads", value: overview.metrics.leads, icon: Users },
    { label: "Expires", value: overview.tenant.subscriptionExpiresAt ? new Date(overview.tenant.subscriptionExpiresAt).toLocaleDateString() : "-", icon: CalendarDays },
  ]
  return <main className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8 lg:p-10">
    <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Tenant dashboard</p><h1 className="mt-2 text-3xl font-bold">Welcome, {user.fullName}</h1><p className="mt-2 text-sm text-slate-600">{overview.tenant.businessName} · {overview.tenant.plan?.name ?? "No plan"}</p></header>
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon})=><article className="rounded-2xl border bg-white p-5 shadow-sm" key={label}><Icon className="size-5 text-[#4343d5]"/><p className="mt-4 text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></article>)}</section>
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Subscription status</h2><div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">{overview.tenant.subscriptionStatus}</span>{overview.tenant.dashboardPermissions.map(p=><span className="rounded-full bg-[#eff0ff] px-3 py-1 font-semibold text-[#4343d5]" key={p}>{p}</span>)}</div></section>
    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Recent tenant activity</h2><div className="mt-4 space-y-3">{overview.recentActivity.length ? overview.recentActivity.map(item=><div className="rounded-xl bg-slate-50 p-4" key={item.id}><p className="font-semibold">{item.summary}</p><p className="mt-1 text-xs text-slate-500">{item.action} · {new Date(item.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-slate-500">No activity yet.</p>}</div></section>
  </main>
}
