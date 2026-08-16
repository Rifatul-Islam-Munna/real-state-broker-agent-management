import { CalendarDays, Check, CreditCard, Database, ShieldCheck } from "lucide-react"

import { getActivePlans, getTenantSubscription, renewTenantSubscriptionAction } from "@/lib/tenant-subscription-actions"

type Plan = { id:number; name:string; description:string; price:string; billingDays:number; dashboardPermissions:string[]; isActive:boolean }
type Subscription = { id:number; businessName:string; databaseName:string|null; planId:number|null; subscriptionStartsAt:string|null; subscriptionExpiresAt:string|null; subscriptionStatus:"active"|"expired"|"blocked"|"inactive"; dashboardPermissions:string[]; plan?:Plan|null }

export default async function AccountSubscriptionPage() {
  const [subscription, plans] = await Promise.all([
    getTenantSubscription() as Promise<Subscription>,
    getActivePlans() as Promise<Plan[]>,
  ])
  const expired = subscription.subscriptionStatus === "expired"

  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Owner billing control</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Plan & subscription</h1><p className="mt-2 text-sm text-slate-600">Change access without creating a new tenant or moving business data.</p></header>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card icon={CreditCard} label="Current plan" value={subscription.plan?.name ?? "No plan"} />
      <Card icon={CalendarDays} label="Expires" value={subscription.subscriptionExpiresAt ? new Date(subscription.subscriptionExpiresAt).toLocaleDateString() : "Not set"} />
      <Card icon={ShieldCheck} label="Status" value={subscription.subscriptionStatus} />
      <Card icon={Database} label="Database" value={subscription.databaseName ?? "Unavailable"} mono />
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold">Choose your plan</h2><p className="mt-1 text-sm text-slate-600">The purchase flow uses Stripe and keeps the existing tenant database.</p></div><span className="text-xs font-semibold text-slate-500">{plans.filter((plan) => plan.isActive).length} active plans</span></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {plans.filter((plan) => plan.isActive).map((plan) => <label className="cursor-pointer rounded-2xl border border-slate-200 p-5 transition hover:border-[#4343d5]/50" key={plan.id}><div className="flex items-start gap-3"><input className="mt-1" form="subscription-renewal" name="planId" type="radio" value={plan.id} defaultChecked={plan.id === subscription.planId} /><div className="min-w-0"><h3 className="font-bold">{plan.name}</h3><p className="mt-1 text-2xl font-bold">${Number(plan.price).toFixed(2)} <span className="text-xs font-medium text-slate-500">/ {plan.billingDays} days</span></p><p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p><div className="mt-3 space-y-1.5">{plan.dashboardPermissions.map((permission) => <div className="flex items-center gap-2 text-xs text-slate-600" key={permission}><Check className="size-3.5 text-emerald-600" />{permission}</div>)}</div></div></div></label>)}
      </div>
      <form action={renewTenantSubscriptionAction} className="mt-6" id="subscription-renewal"><button className="h-12 rounded-xl bg-[#4343d5] px-6 font-bold text-white" type="submit">{expired ? "Reactivate with selected plan" : "Continue with selected plan"}</button></form>
    </section>
  </div>
}

function Card({ icon: Icon, label, value, mono = false }: { icon: typeof CreditCard; label:string; value:string; mono?:boolean }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="size-5 text-[#4343d5]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 truncate font-bold capitalize ${mono ? "font-mono text-xs normal-case" : ""}`}>{value}</p></article>
}
