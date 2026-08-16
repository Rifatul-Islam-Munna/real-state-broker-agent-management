import { Globe2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"

import { getTenantDomainSettings, removeTenantDomainAction, saveTenantDomainAction, verifyTenantDomainAction } from "@/lib/tenant-domain-actions"

type DomainSettings = {
  tenant: { id:number; businessName:string; subdomain:string }
  customDomain: null | { hostname:string; status:"pending"|"verified"|"disabled"; verifiedAt:string|null; lastCheckedAt:string|null }
  instructions: null | { verification:{type:string;name:string;value:string}; routing:{type:string;name:string;value:string}; note:string }
}

export default async function AccountDomainPage() {
  const settings = await getTenantDomainSettings() as DomainSettings
  return <div className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Owner routing control</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Domain</h1><p className="mt-2 text-sm text-slate-600">Manage the public hostname that resolves to your isolated tenant website.</p></header>

    <section className="grid gap-4 md:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Globe2 className="size-5 text-[#4343d5]" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Assigned subdomain</p><p className="mt-1 break-all font-bold">{settings.tenant.subdomain}</p><p className="mt-2 text-xs text-slate-500">This stays available even when you connect a custom domain.</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><ShieldCheck className="size-5 text-emerald-600" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Custom domain</p><p className="mt-1 break-all font-bold">{settings.customDomain?.hostname ?? "Not connected"}</p><p className="mt-2 text-xs capitalize text-slate-500">Status: {settings.customDomain?.status ?? "none"}</p></article>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Add or replace a custom domain</h2><p className="mt-2 text-sm text-slate-600">Enter only the hostname, for example www.youragency.com.</p>
      <form action={saveTenantDomainAction} className="mt-5 flex flex-col gap-3 sm:flex-row"><input className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-[#4343d5]" defaultValue={settings.customDomain?.hostname ?? ""} name="hostname" placeholder="www.youragency.com" required /><button className="h-12 rounded-xl bg-[#4343d5] px-5 font-bold text-white" type="submit">{settings.customDomain ? "Replace domain" : "Add domain"}</button></form>
    </section>

    {settings.customDomain && settings.instructions ? <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">DNS verification</h2><p className="mt-2 text-sm text-slate-600">Publish both records, then verify ownership.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${settings.customDomain.status === "verified" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{settings.customDomain.status}</span></div><div className="mt-6 space-y-4">{[settings.instructions.verification, settings.instructions.routing].map((record) => <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-[90px_1fr_1fr]" key={`${record.type}-${record.name}`}><div><p className="text-xs font-bold uppercase text-slate-500">Type</p><p>{record.type}</p></div><div><p className="text-xs font-bold uppercase text-slate-500">Name</p><p className="break-all font-mono text-xs">{record.name}</p></div><div><p className="text-xs font-bold uppercase text-slate-500">Value</p><p className="break-all font-mono text-xs">{record.value}</p></div></div>)}</div><p className="mt-4 text-xs text-slate-500">{settings.instructions.note}</p><div className="mt-6 flex flex-wrap gap-3"><form action={verifyTenantDomainAction}><button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0b1c30] px-5 text-sm font-bold text-white"><RefreshCw className="size-4" />Verify DNS</button></form><form action={removeTenantDomainAction}><button className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-bold text-red-700"><Trash2 className="size-4" />Remove domain</button></form></div></section> : null}
  </div>
}
