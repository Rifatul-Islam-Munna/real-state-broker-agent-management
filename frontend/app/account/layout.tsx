import Link from "next/link"
import type { ReactNode } from "react"
import { Building2, CreditCard, ExternalLink, Globe2, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react"

import { requireSession, logoutAction } from "@/lib/auth-actions"
import { getTenantAccountContext } from "@/lib/tenant-account-actions"

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireSession(["Agent"])
  const context = await getTenantAccountContext()
  const owner = context.tenantRole === "Owner"

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#102033]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" href="/account">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0b1c30] text-white"><Building2 className="size-5" /></span>
            <div><p className="font-bold tracking-tight">{context.tenant.businessName}</p><p className="text-xs text-slate-500">Account portal · {context.tenantRole}</p></div>
          </Link>
          <div className="flex items-center gap-2">
            <a className="hidden items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold sm:inline-flex" href={context.workspaceUrl}>Open workspace <ExternalLink className="size-4" /></a>
            <form action={logoutAction}><button className="inline-flex size-10 items-center justify-center rounded-xl border text-slate-600" aria-label="Sign out"><LogOut className="size-4" /></button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[220px_1fr] lg:py-8">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav className="space-y-1 text-sm font-semibold">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50" href="/account"><LayoutDashboard className="size-4" />Overview</Link>
            {owner ? <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50" href="/account/subscription"><CreditCard className="size-4" />Plan & subscription</Link> : null}
            {owner ? <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50" href="/account/domain"><Globe2 className="size-4" />Domain</Link> : null}
            <a className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50" href={context.workspaceUrl}><ExternalLink className="size-4" />Tenant workspace</a>
          </nav>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <div className="flex items-center gap-2 font-semibold text-slate-700"><ShieldCheck className="size-4" />Control plane</div>
            <p className="mt-1">Billing, routing and account controls live here. Business data stays on your tenant subdomain.</p>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
