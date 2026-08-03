import { Globe2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"

import { requireSession } from "@/lib/auth-actions"
import {
  getTenantDomainSettings,
  removeTenantDomainAction,
  saveTenantDomainAction,
  verifyTenantDomainAction,
} from "@/lib/tenant-domain-actions"

type DomainSettings = {
  tenant: { id: number; businessName: string; subdomain: string }
  customDomain: null | {
    hostname: string
    status: "pending" | "verified" | "disabled"
    verifiedAt: string | null
    lastCheckedAt: string | null
  }
  instructions: null | {
    verification: { type: string; name: string; value: string }
    routing: { type: string; name: string; value: string }
    note: string
  }
}

export default async function CustomDomainPage() {
  await requireSession(["Agent"])
  const settings = (await getTenantDomainSettings()) as DomainSettings

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Tenant settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Custom domain</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Connect your own domain to the same tenant website and database used by your assigned subdomain.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
            <Globe2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">Assigned subdomain</h2>
            <p className="mt-1 break-all text-sm text-slate-600">{settings.tenant.subdomain}</p>
            <p className="mt-2 text-xs text-slate-500">This remains available as the fallback address when a custom domain is added or removed.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Add or replace a custom domain</h2>
        <p className="mt-2 text-sm text-slate-600">Enter only the hostname, such as www.customerbusiness.com.</p>
        <form action={saveTenantDomainAction} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-[#4343d5]"
            defaultValue={settings.customDomain?.hostname ?? ""}
            name="hostname"
            placeholder="www.customerbusiness.com"
            required
          />
          <button className="h-12 rounded-xl bg-[#4343d5] px-5 font-semibold text-white" type="submit">
            {settings.customDomain ? "Replace domain" : "Add domain"}
          </button>
        </form>
      </section>

      {settings.customDomain && settings.instructions ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-bold">DNS setup</h2>
              <p className="mt-2 text-sm text-slate-600">Publish both records with your DNS provider, then verify ownership.</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${settings.customDomain.status === "verified" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {settings.customDomain.status}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {[settings.instructions.verification, settings.instructions.routing].map((record) => (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-[100px_1fr_1fr]" key={`${record.type}-${record.name}`}>
                <div><p className="text-xs font-semibold uppercase text-slate-500">Type</p><p className="mt-1 font-semibold">{record.type}</p></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase text-slate-500">Name</p><p className="mt-1 break-all font-mono text-xs">{record.name}</p></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase text-slate-500">Value</p><p className="mt-1 break-all font-mono text-xs">{record.value}</p></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">{settings.instructions.note}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <form action={verifyTenantDomainAction}>
              <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0b1c30] px-5 text-sm font-semibold text-white" type="submit">
                <RefreshCw className="size-4" /> Verify DNS
              </button>
            </form>
            <form action={removeTenantDomainAction}>
              <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-700" type="submit">
                <Trash2 className="size-4" /> Remove domain
              </button>
            </form>
          </div>

          {settings.customDomain.status === "verified" ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              The domain is verified and routes to this tenant. HTTPS is enforced in production.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
