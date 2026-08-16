import { Building2, Database, Search, ShieldAlert, Users } from "lucide-react"

import { CreateTenantDialog, DeleteTenantDialog, ExtendTenantDialog, TenantBlockDialog } from "@/components/super-admin/super-admin-dialogs"
import { getPlans, getPlatformDomain, getTenants } from "@/lib/super-admin-actions"

type Plan = { id:number; name:string; description:string; price:string; billingDays:number; dashboardPermissions:string[]; isActive:boolean }
type Tenant = { id:number; businessName:string; slug:string; subdomain:string; dashboardPermissions:string[]; isActive:boolean; isBlocked:boolean; provisioningStatus:string; subscriptionStartsAt:string|null; subscriptionExpiresAt:string|null; plan?:{name:string}|null }

function stateClass(tenant: Tenant) {
  if (tenant.isBlocked) return "bg-red-50 text-red-700 ring-red-600/10"
  if (tenant.provisioningStatus !== "ready") return "bg-amber-50 text-amber-700 ring-amber-600/10"
  if (tenant.isActive) return "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
  return "bg-slate-100 text-slate-600 ring-slate-600/10"
}

export default async function TenantsPage() {
  const [tenants, plans, domain] = await Promise.all([getTenants(), getPlans(), getPlatformDomain()]) as [Tenant[], Plan[], { primaryDomain: string; tenantBaseDomain?: string }]
  const tenantBaseDomain = domain.tenantBaseDomain ?? domain.primaryDomain
  const ready = tenants.filter((tenant) => tenant.provisioningStatus === "ready").length
  const blocked = tenants.filter((tenant) => tenant.isBlocked).length

  return <div className="mx-auto max-w-[1500px] space-y-6">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tenant operations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#101828]">Customers & workspaces</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Provision isolated workspaces, review subscriptions and resolve access or database issues.</p></div><CreateTenantDialog plans={plans} primaryDomain={tenantBaseDomain} /></header>
    <section className="grid gap-4 sm:grid-cols-3">
      <Summary icon={Users} label="Total tenants" value={tenants.length} />
      <Summary icon={Database} label="Databases ready" value={ready} />
      <Summary icon={ShieldAlert} label="Blocked" value={blocked} />
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#e1e6ef] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-semibold text-[#101828]">Tenant directory</h2><p className="mt-1 text-xs text-slate-500">{domain.primaryDomain}</p></div><div className="flex items-center gap-2 rounded-xl border bg-[#f8fafc] px-3 py-2 text-xs text-slate-500"><Search className="size-4" />Use browser find to locate a tenant quickly</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#f8fafc] text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-6 py-3.5">Workspace</th><th className="px-6 py-3.5">Plan</th><th className="px-6 py-3.5">Subscription</th><th className="px-6 py-3.5">Health</th><th className="px-6 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y">
        {tenants.length === 0 ? <tr><td className="px-6 py-14 text-center text-slate-500" colSpan={5}>No tenant workspaces yet.</td></tr> : tenants.map((tenant) => <tr className="align-middle transition hover:bg-[#fbfcfe]" key={tenant.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#eef2f7] text-[#334155]"><Building2 className="size-5" /></span><div><p className="font-semibold text-[#17243a]">{tenant.businessName}</p><p className="mt-0.5 text-xs text-slate-500">{tenant.subdomain}.{tenantBaseDomain}</p></div></div></td><td className="px-6 py-4"><p className="font-medium text-[#334155]">{tenant.plan?.name ?? "No plan"}</p><p className="mt-1 max-w-56 truncate text-xs text-slate-500">{tenant.dashboardPermissions?.join(" · ") || "No dashboard permissions"}</p></td><td className="px-6 py-4"><p className="text-[#334155]">{tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString() : "No expiry"}</p><p className="mt-1 text-xs text-slate-500">{tenant.subscriptionStartsAt ? `Started ${new Date(tenant.subscriptionStartsAt).toLocaleDateString()}` : "Start date unavailable"}</p></td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${stateClass(tenant)}`}>{tenant.isBlocked ? "Blocked" : tenant.provisioningStatus !== "ready" ? tenant.provisioningStatus : tenant.isActive ? "Active" : "Inactive"}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><ExtendTenantDialog tenant={tenant} /><TenantBlockDialog tenant={tenant} /><DeleteTenantDialog tenant={tenant} /></div></td></tr>)}
      </tbody></table></div>
    </section>
  </div>
}
function Summary({ icon: Icon, label, value }: { icon: typeof Users; label:string; value:number }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-sm"><span className="flex size-11 items-center justify-center rounded-xl bg-[#eef2f7] text-[#334155]"><Icon className="size-5" /></span><div><p className="text-2xl font-semibold tracking-[-0.03em] text-[#101828]">{value}</p><p className="text-xs font-medium text-slate-500">{label}</p></div></article>
}
