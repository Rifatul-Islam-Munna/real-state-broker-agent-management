import type { ReactNode } from "react"
import { Building2, LogOut, ShieldCheck } from "lucide-react"

import { requireSuperAdminSession, superAdminLogoutAction } from "@/lib/auth-actions"
import { SuperAdminNavigation } from "./super-admin-navigation"

export default async function SuperAdminPortalLayout({ children }: { children: ReactNode }) {
  const user = await requireSuperAdminSession()

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0b1c30]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-[#dfe4ee] bg-[#0b1c30] px-5 py-6 text-white">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#4343d5]">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="font-bold tracking-[-0.02em]">EstateBlue SaaS</p>
              <p className="text-xs text-white/55">Super Admin Portal</p>
            </div>
          </div>

          <SuperAdminNavigation />

          <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-[#8d8dff]" />
              Protected access
            </div>
            <p className="mt-2 text-xs leading-5 text-white/55">
              This portal is restricted to platform administrators.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex min-h-20 items-center justify-between border-b border-[#dfe4ee] bg-white px-6 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#767586]">Platform administration</p>
              <p className="mt-1 font-semibold">{user.fullName || user.email}</p>
            </div>
            <form action={superAdminLogoutAction}>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d7dbe5] px-4 text-sm font-semibold transition hover:bg-[#f5f7fb]"
                type="submit"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </header>
          <main className="p-6 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
