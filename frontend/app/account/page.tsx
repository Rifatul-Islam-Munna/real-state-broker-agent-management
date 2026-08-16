import Link from "next/link"
import { ArrowRight, CalendarDays, CreditCard, Database, ExternalLink, Globe2, ShieldCheck } from "lucide-react"

import { getTenantAccountContext } from "@/lib/tenant-account-actions"

export default async function AccountPage() {
  const context = await getTenantAccountContext()
  const tenant = context.tenant
  const owner = context.tenantRole === "Owner"
  const expiresAt = tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt) : null
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
    : 0
  const expiryLabel = expiresAt ? expiresAt.toLocaleDateString() : "Not set"
  const planRate = tenant.plan ? `$${Number(tenant.plan.price).toFixed(2)} / ${tenant.plan.billingDays} days` : "No active plan"

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[28px] bg-[#0b1c30] p-7 text-white shadow-xl sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8d8dff]">Tenant account</p>
      <div className="mt-3 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div><h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{tenant.businessName}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">Manage your SaaS subscription and routing here, then open the isolated workspace for business operations.</p></div>
        <a className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#0b1c30]" href={context.workspaceUrl}>Open tenant workspace <ExternalLink className="size-4" /></a>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InfoCard icon={CreditCard} label="Current plan" value={tenant.plan?.name ?? "No plan"} />
      <InfoCard icon={CalendarDays} label="Ends on" value={expiryLabel} />
      <InfoCard icon={ShieldCheck} label="Time remaining" value={tenant.subscriptionStatus === "expired" ? "Expired" : `${daysRemaining} days`} />
      <InfoCard icon={CreditCard} label="Plan price" value={planRate} />
    </section>
    {owner ? (
      <section className="flex flex-col gap-4 rounded-2xl border border-[#4343d5]/20 bg-[#f1f1ff] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#4343d5]">Subscription control</p>
          <h2 className="mt-1 text-xl font-bold">{tenant.subscriptionStatus === "expired" ? "Your subscription has ended" : `Your plan ends ${expiryLabel}`}</h2>
          <p className="mt-2 text-sm text-slate-600">Renew the same plan, reactivate after expiry, or choose another active plan. Your existing tenant database is preserved.</p>
        </div>
        <Link className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4343d5] px-5 text-sm font-bold text-white" href="/account/subscription">
          {tenant.subscriptionStatus === "expired" ? "Repurchase / Reactivate" : "Renew or change plan"} <ArrowRight className="size-4" />
        </Link>
      </section>
    ) : null}
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ShieldCheck className="size-5 text-emerald-600" />
        <h2 className="mt-4 text-lg font-bold">Workspace isolation</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your main-domain account portal carries only control-plane information. Leads, properties, mail, settings and operational data remain behind your tenant hostname.</p>
        <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#4343d5]" href={context.workspaceUrl}>Go to isolated workspace <ArrowRight className="size-4" /></a>
      </article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Globe2 className="size-5 text-[#4343d5]" />
        <h2 className="mt-4 text-lg font-bold">Your public website</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Your public tenant site is separate from the SaaS main domain and resolves through your assigned subdomain or verified custom domain.</p>
        <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#4343d5]" href={context.publicSiteUrl}>Open public site <ExternalLink className="size-4" /></a>
      </article>
    </section>

    {owner ? <section className="grid gap-4 md:grid-cols-2"><Link className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" href="/account/subscription"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Owner control</p><h2 className="mt-2 text-xl font-bold">Plan & subscription</h2><p className="mt-2 text-sm text-slate-600">Renew, reactivate, upgrade or downgrade without creating another tenant database.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#4343d5]">Manage subscription <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></Link><Link className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" href="/account/domain"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Owner control</p><h2 className="mt-2 text-xl font-bold">Domain routing</h2><p className="mt-2 text-sm text-slate-600">Review the assigned subdomain or connect and verify a custom business domain.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#4343d5]">Manage domain <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span></Link></section> : null}
  </div>
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="size-5" /></span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 truncate font-bold capitalize">{value}</p></article>
}
