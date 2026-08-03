import { CalendarDays, CreditCard, Database, ShieldCheck } from "lucide-react"

import { requireSession } from "@/lib/auth-actions"
import { getActivePlans, getTenantSubscription, renewTenantSubscriptionAction } from "@/lib/tenant-subscription-actions"

type Plan = {
  id: number
  name: string
  description: string
  price: string
  billingDays: number
  dashboardPermissions: string[]
  isActive: boolean
}

type Subscription = {
  id: number
  businessName: string
  databaseName: string | null
  planId: number | null
  subscriptionStartsAt: string | null
  subscriptionExpiresAt: string | null
  subscriptionStatus: "active" | "expired" | "blocked" | "inactive"
  dashboardPermissions: string[]
  plan?: Plan | null
}

export default async function SubscriptionPage() {
  await requireSession(["Agent"])
  const [subscription, plans] = await Promise.all([
    getTenantSubscription() as Promise<Subscription>,
    getActivePlans() as Promise<Plan[]>,
  ])

  const expired = subscription.subscriptionStatus === "expired"

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8 lg:p-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Billing and access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Subscription</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Renew, reactivate, upgrade, or downgrade without creating a new tenant database.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CreditCard className="size-5 text-[#4343d5]" />
          <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Current plan</p>
          <p className="mt-1 font-bold">{subscription.plan?.name ?? "No plan"}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <CalendarDays className="size-5 text-[#4343d5]" />
          <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Expires</p>
          <p className="mt-1 font-bold">{subscription.subscriptionExpiresAt ? new Date(subscription.subscriptionExpiresAt).toLocaleDateString() : "-"}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="size-5 text-[#4343d5]" />
          <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className={`mt-1 font-bold ${expired ? "text-red-700" : "text-green-700"}`}>{subscription.subscriptionStatus}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Database className="size-5 text-[#4343d5]" />
          <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Tenant database</p>
          <p className="mt-1 truncate font-mono text-xs">{subscription.databaseName ?? "Unavailable"}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Renew or change plan</h2>
        <p className="mt-2 text-sm text-slate-600">
          Renewal extends from the current expiry when active, or from today when expired. Existing tenant data is preserved.
        </p>

        <form action={renewTenantSubscriptionAction} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <select className="h-12 rounded-xl border border-slate-300 px-4" defaultValue={subscription.planId ?? ""} name="planId" required>
            <option disabled value="">Select a plan</option>
            {plans.filter((plan) => plan.isActive).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - ${Number(plan.price).toFixed(2)} / {plan.billingDays} days
              </option>
            ))}
          </select>
          <input className="h-12 rounded-xl border border-slate-300 px-4" name="purchaseReference" placeholder="Successful purchase reference" required />
          <button className="h-12 rounded-xl bg-[#4343d5] px-6 font-semibold text-white" type="submit">
            {expired ? "Reactivate subscription" : "Renew subscription"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold">Current dashboard access</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {subscription.dashboardPermissions.map((permission) => (
            <span className="rounded-full bg-[#eff0ff] px-3 py-1 text-xs font-semibold text-[#4343d5]" key={permission}>{permission}</span>
          ))}
        </div>
      </section>
    </div>
  )
}

