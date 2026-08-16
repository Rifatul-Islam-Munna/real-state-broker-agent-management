import { CreditCard, Gauge, Layers3 } from "lucide-react"

import { CreatePlanDialog, DeletePlanDialog, EditPlanDialog, PlanStatusDialog } from "@/components/super-admin/super-admin-dialogs"
import { getPlans } from "@/lib/super-admin-actions"

type Plan = { id:number; name:string; description:string; price:string; billingDays:number; dashboardPermissions:string[]; isActive:boolean }

export default async function PlansPage() {
  const plans = await getPlans() as Plan[]
  const active = plans.filter((plan) => plan.isActive).length
  const avgPrice = plans.length ? plans.reduce((sum, plan) => sum + Number(plan.price || 0), 0) / plans.length : 0

  return <div className="mx-auto max-w-[1400px] space-y-6">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial setup</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#101828]">Subscription plans</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep pricing and dashboard entitlements easy to understand. Creation and edits stay focused inside dialogs.</p></div><CreatePlanDialog /></header>

    <section className="grid gap-4 sm:grid-cols-3">
      <Summary icon={Layers3} label="Total plans" value={String(plans.length)} />
      <Summary icon={Gauge} label="Active plans" value={String(active)} />
      <Summary icon={CreditCard} label="Average price" value={`$${avgPrice.toFixed(2)}`} />
    </section>
    <section className="grid gap-4 lg:grid-cols-2">
      {plans.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-slate-500 lg:col-span-2">No plans yet. Create the first subscription plan.</div> : plans.map((plan) => <article className="rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-sm sm:p-6" key={plan.id}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold tracking-[-0.025em] text-[#101828]">{plan.name}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{plan.isActive ? "Active" : "Inactive"}</span></div><p className="mt-2 text-sm leading-6 text-slate-500">{plan.description || "No description provided."}</p></div><span className="rounded-lg bg-[#f4f6fa] px-2.5 py-1 text-xs font-semibold text-slate-500">#{plan.id}</span></div><div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-[#f8fafc] p-4"><div><p className="text-xs font-medium text-slate-500">Price</p><p className="mt-1 text-xl font-semibold text-[#17243a]">${Number(plan.price || 0).toFixed(2)}</p></div><div><p className="text-xs font-medium text-slate-500">Billing cycle</p><p className="mt-1 text-xl font-semibold text-[#17243a]">{plan.billingDays} days</p></div></div><div className="mt-4 flex flex-wrap gap-2">{plan.dashboardPermissions.map((permission) => <span className="rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600" key={permission}>{permission === "normal-dashboard" ? "CRM dashboard" : permission === "property-management-dashboard" ? "Property operations" : permission}</span>)}</div><div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4"><EditPlanDialog plan={plan} /><PlanStatusDialog plan={plan} /><div className="ml-auto"><DeletePlanDialog plan={plan} /></div></div></article>)}
    </section>
  </div>
}

function Summary({ icon: Icon, label, value }: { icon: typeof Layers3; label:string; value:string }) {
  return <article className="flex items-center gap-4 rounded-2xl border border-[#e1e6ef] bg-white p-5 shadow-sm"><span className="flex size-11 items-center justify-center rounded-xl bg-[#eef2f7] text-[#334155]"><Icon className="size-5" /></span><div><p className="text-2xl font-semibold tracking-[-0.03em] text-[#101828]">{value}</p><p className="text-xs font-medium text-slate-500">{label}</p></div></article>
}
