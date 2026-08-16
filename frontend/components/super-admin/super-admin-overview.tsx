import Link from "next/link"
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Building2,
  CalendarClock, CheckCircle2, CircleDollarSign, CreditCard, Database,
  Gauge, Globe2, Layers3, Radar, ServerCog, ShieldCheck, Sparkles,
  TrendingUp, Users, WalletCards, Zap,
} from "lucide-react"

import { CreatePlanDialog, CreateTenantDialog } from "@/components/super-admin/super-admin-dialogs"

export type SuperAdminPlan = {
  id: number; name: string; description: string; price: string; billingDays: number
  dashboardPermissions: string[]; isActive: boolean; createdAt?: string
}
export type SuperAdminTenant = {
  id: number; businessName: string; slug?: string; subdomain: string; planId?: number | null
  isActive: boolean; isBlocked: boolean; provisioningStatus: string; databaseStatus?: string
  subscriptionStartsAt?: string | null; subscriptionExpiresAt: string | null; createdAt?: string
  plan?: { id?: number; name: string; price?: string; billingDays?: number; isActive?: boolean } | null
}
export type SuperAdminLog = {
  id: number; action: string; entityType: string; entityId?: number | null
  summary: string; createdAt: string
}
type OverviewProps = {
  tenants: SuperAdminTenant[]
  plans: SuperAdminPlan[]
  logs: SuperAdminLog[]
  primaryDomain: string
  payment: {
    stripeSecretKeyConfigured: boolean
    stripeWebhookSecretConfigured: boolean
    stripePublishableKey: string
    stripeCurrency?: string
  }
}

type AttentionItem = {
  title: string
  detail: string
  href: string
  severity: "critical" | "warning" | "info"
}

const day = 86_400_000

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}
function pct(value: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function monthKey(value?: string) {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString("en-US", { month: "short" })
}

function severityTone(severity: AttentionItem["severity"]) {
  if (severity === "critical") return "border-rose-200 bg-rose-50 text-rose-700"
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-sky-200 bg-sky-50 text-sky-700"
}

export function SuperAdminOverview({ tenants, plans, logs, primaryDomain, payment }: OverviewProps) {
  const now = Date.now()
  const activeTenants = tenants.filter((tenant) => tenant.isActive && !tenant.isBlocked)
  const blockedTenants = tenants.filter((tenant) => tenant.isBlocked)
  const provisioningIssues = tenants.filter((tenant) =>
    tenant.provisioningStatus !== "ready" || (tenant.databaseStatus && tenant.databaseStatus !== "ready"),
  )
  const expiredTenants = tenants.filter((tenant) => tenant.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt).getTime() < now)
  const expiring7 = tenants.filter((tenant) => {
    if (!tenant.subscriptionExpiresAt) return false
    const expiry = new Date(tenant.subscriptionExpiresAt).getTime()
    return expiry >= now && expiry <= now + 7 * day
  })
  const expiring30 = tenants.filter((tenant) => {
    if (!tenant.subscriptionExpiresAt) return false
    const expiry = new Date(tenant.subscriptionExpiresAt).getTime()
    return expiry >= now && expiry <= now + 30 * day
  })
  const paymentReady = payment.stripeSecretKeyConfigured && payment.stripeWebhookSecretConfigured && Boolean(payment.stripePublishableKey)
  const activePlans = plans.filter((plan) => plan.isActive)
  const estimatedMonthlyRunRate = activeTenants.reduce((sum, tenant) => {
    const plan = plans.find((item) => item.id === tenant.planId) ?? plans.find((item) => item.name === tenant.plan?.name)
    if (!plan) return sum
    const billingDays = Math.max(1, Number(plan.billingDays) || 30)
    return sum + (Number(plan.price) || 0) * (30 / billingDays)
  }, 0)

  const planAdoption = plans
    .map((plan) => ({
      ...plan,
      tenants: tenants.filter((tenant) => tenant.planId === plan.id || tenant.plan?.name === plan.name).length,
    }))
    .sort((a, b) => b.tenants - a.tenants)

  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 6)
  const recentLogs = logs.slice(0, 7)
  const growthMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString("en-US", { month: "short" }), count: 0 }
  })
  tenants.forEach((tenant) => {
    if (!tenant.createdAt) return
    const key = new Date(tenant.createdAt).toISOString().slice(0, 7)
    const bucket = growthMonths.find((item) => item.key === key)
    if (bucket) bucket.count += 1
  })
  const maxGrowth = Math.max(1, ...growthMonths.map((item) => item.count))

  const attention: AttentionItem[] = [
    ...provisioningIssues.map((tenant) => ({ title: tenant.businessName, detail: `Provisioning: ${tenant.provisioningStatus}${tenant.databaseStatus ? ` · DB: ${tenant.databaseStatus}` : ""}`, href: "/super-admin/tenants", severity: "critical" as const })),
    ...expiredTenants.map((tenant) => ({ title: tenant.businessName, detail: "Subscription expired", href: "/super-admin/tenants", severity: "critical" as const })),
    ...expiring7.map((tenant) => ({ title: tenant.businessName, detail: `Expires ${new Date(tenant.subscriptionExpiresAt!).toLocaleDateString()}`, href: "/super-admin/tenants", severity: "warning" as const })),
  ].slice(0, 6)

  const metrics = [
    { label: "Tenant workspaces", value: tenants.length, hint: `${activeTenants.length} operating`, icon: Building2 },
    { label: "Est. monthly run-rate", value: money(estimatedMonthlyRunRate, payment.stripeCurrency || "USD"), hint: "Based on active tenant plans", icon: CircleDollarSign },
    { label: "Renewal window", value: expiring30.length, hint: `${expiring7.length} within 7 days`, icon: CalendarClock },
    { label: "Platform exceptions", value: provisioningIssues.length + blockedTenants.length, hint: `${blockedTenants.length} blocked`, icon: Radar },
  ]
  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-800 bg-[#08111f] px-6 py-8 text-white shadow-[0_28px_90px_rgba(8,17,31,0.22)] sm:px-8 lg:px-10">
        <div className="absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden lg:block">
          <div className="absolute right-[-12%] top-[-22%] size-[420px] rounded-full border border-white/10" />
          <div className="absolute right-[5%] top-[10%] size-60 rounded-full bg-cyan-300/[0.06] blur-2xl" />
          <div className="absolute bottom-[-28%] right-[28%] size-72 rounded-full border border-white/[0.07]" />
        </div>
        <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/80"><Sparkles className="size-4" />SaaS command center</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">See the whole platform before it becomes a problem.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Growth, revenue signals, renewal risk, tenant infrastructure, plan adoption, and administrative activity in one operating view.</p>
          </div>
          <div className="flex flex-wrap gap-3"><CreateTenantDialog plans={plans} primaryDomain={primaryDomain} /><CreatePlanDialog /></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <article className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]" key={label}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950">{value}</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="size-5" /></span></div>
            <p className="mt-4 text-xs text-slate-500">{hint}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Growth pulse</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Tenant acquisition</h2></div><TrendingUp className="size-5 text-emerald-600" /></div>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="flex h-52 items-end gap-3">
              {growthMonths.map((item) => <div className="flex h-full flex-1 flex-col justify-end" key={item.key}><div className="relative flex flex-1 items-end"><div className="w-full rounded-t-xl bg-slate-900 transition-all" style={{ height: `${Math.max(8, (item.count / maxGrowth) * 100)}%` }}><span className="absolute inset-x-0 -top-6 text-center text-xs font-semibold text-slate-600">{item.count}</span></div></div><p className="mt-3 text-center text-xs font-medium text-slate-500">{item.label}</p></div>)}
            </div>
            <div className="grid grid-cols-2 gap-3 md:w-56 md:grid-cols-1"><MiniStat label="Active ratio" value={`${pct(activeTenants.length, tenants.length)}%`} /><MiniStat label="Plans live" value={`${activePlans.length}/${plans.length || 0}`} /><MiniStat label="Blocked" value={String(blockedTenants.length)} /></div>
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-[#0e1b2e] p-6 text-white shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Revenue lens</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Plan adoption</h2></div><WalletCards className="size-5 text-cyan-300" /></div>
          <div className="mt-6 space-y-5">
            {planAdoption.slice(0, 5).map((plan) => <div key={plan.id}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{plan.name}</span><span className="text-slate-400">{plan.tenants} tenants</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(plan.tenants ? 8 : 0, pct(plan.tenants, tenants.length))}%` }} /></div><div className="mt-2 flex items-center justify-between text-[11px] text-slate-400"><span>{money(Number(plan.price), payment.stripeCurrency || "USD")} / {plan.billingDays}d</span><span>{plan.isActive ? "Live" : "Inactive"}</span></div></div>)}
            {!planAdoption.length ? <p className="text-sm text-slate-400">No subscription plans configured yet.</p> : null}
          </div>
        </article>
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Renewal radar</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Subscription risk</h2></div><CalendarClock className="size-5 text-amber-600" /></div>
          <div className="mt-6 grid grid-cols-3 gap-3"><RiskCell label="Expired" value={expiredTenants.length} tone="rose" /><RiskCell label="7 days" value={expiring7.length} tone="amber" /><RiskCell label="30 days" value={expiring30.length} tone="sky" /></div>
          <div className="mt-6 space-y-3">{[...expiredTenants, ...expiring7].slice(0, 4).map((tenant) => <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3" key={`${tenant.id}-renewal`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{tenant.businessName}</p><p className="mt-1 text-xs text-slate-500">{tenant.plan?.name ?? "No plan"}</p></div><span className="text-xs font-semibold text-amber-700">{tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString() : "No expiry"}</span></div>)}{!expiredTenants.length && !expiring7.length ? <div className="rounded-xl bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">No urgent renewals right now.</div> : null}</div>
          <Link className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600" href="/super-admin/tenants">Manage renewals <ArrowUpRight className="size-4" /></Link>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Action queue</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Needs attention</h2></div><AlertTriangle className="size-5 text-rose-600" /></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{attention.length ? attention.map((item, index) => <Link className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 ${severityTone(item.severity)}`} href={item.href} key={`${item.title}-${index}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs opacity-80">{item.detail}</p></div><ArrowRight className="size-4 transition group-hover:translate-x-1" /></div></Link>) : <div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-700"><CheckCircle2 className="mb-2 size-5" />No urgent platform exceptions detected.</div>}</div>
        </article>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Workspace fleet</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Newest tenants</h2></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600" href="/super-admin/tenants">All tenants <ArrowUpRight className="size-4" /></Link></div>
          <div className="divide-y divide-slate-100">{recentTenants.length ? recentTenants.map((tenant) => <div className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center" key={tenant.id}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-slate-900">{tenant.businessName}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tenant.isBlocked ? "bg-rose-50 text-rose-700" : tenant.provisioningStatus === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{tenant.isBlocked ? "Blocked" : tenant.provisioningStatus}</span></div><p className="mt-1 truncate text-xs text-slate-500">{tenant.subdomain}.{primaryDomain} · {tenant.plan?.name ?? "No plan"}</p></div><div className="text-right"><p className="text-xs font-semibold text-slate-700">{monthKey(tenant.createdAt)}</p><p className="mt-1 text-[11px] text-slate-500">{tenant.databaseStatus ?? "database unknown"}</p></div></div>) : <div className="px-6 py-12 text-center text-sm text-slate-500">No tenants provisioned yet.</div>}</div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Infrastructure</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Platform readiness</h2></div><ServerCog className="size-5 text-slate-700" /></div>
          <div className="mt-6 space-y-3"><ReadinessRow icon={Globe2} label="Primary domain" detail={primaryDomain || "Not configured"} ready={Boolean(primaryDomain)} /><ReadinessRow icon={CreditCard} label="Stripe payments" detail={paymentReady ? "Payment stack ready" : "Configuration incomplete"} ready={paymentReady} /><ReadinessRow icon={Database} label="Tenant databases" detail={provisioningIssues.length ? `${provisioningIssues.length} need review` : "All reported ready"} ready={!provisioningIssues.length} /><ReadinessRow icon={ShieldCheck} label="Access controls" detail={blockedTenants.length ? `${blockedTenants.length} tenants blocked` : "No tenant blocks"} ready={!blockedTenants.length} /></div>
          <Link className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600" href="/super-admin/settings">Platform settings <ArrowUpRight className="size-4" /></Link>
        </article>
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Control shortcuts</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Open a workspace</h2></div><Zap className="size-5 text-violet-600" /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><QuickLink href="/super-admin/tenants" icon={Users} title="Tenant operations" detail="Provisioning, blocks, renewals" /><QuickLink href="/super-admin/plans" icon={Layers3} title="Plan studio" detail="Pricing and feature access" /><QuickLink href="/super-admin/activity" icon={Activity} title="Audit trail" detail="Administrative event history" /><QuickLink href="/super-admin/settings" icon={Gauge} title="Platform controls" detail="Domain, payments, routing" /></div>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Audit stream</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Latest platform activity</h2></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600" href="/super-admin/activity">Full log <ArrowUpRight className="size-4" /></Link></div>
          <div className="divide-y divide-slate-100">{recentLogs.length ? recentLogs.map((log) => <div className="flex gap-4 px-6 py-4" key={log.id}><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Activity className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{log.summary}</p><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500"><span>{log.action}</span><span>•</span><span>{log.entityType}</span><span>•</span><time>{new Date(log.createdAt).toLocaleString()}</time></div></div></div>) : <div className="px-6 py-12 text-center text-sm text-slate-500">No administrative activity recorded yet.</div>}</div>
        </article>
      </section>
    </div>
  )
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p></div>
}

function RiskCell({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "sky" }) {
  const classes = tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
  return <div className={`rounded-2xl p-4 ${classes}`}><p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{label}</p></div>
}

function ReadinessRow({ icon: Icon, label, detail, ready }: { icon: typeof Globe2; label: string; detail: string; ready: boolean }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? <Icon className="size-4" /> : <AlertTriangle className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{label}</p><p className="truncate text-xs text-slate-500">{detail}</p></div><span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? "Ready" : "Review"}</span></div>
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof Users; title: string; detail: string }) {
  return <Link className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm" href={href}><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm"><Icon className="size-4" /></span><ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" /></div><h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></Link>
}
