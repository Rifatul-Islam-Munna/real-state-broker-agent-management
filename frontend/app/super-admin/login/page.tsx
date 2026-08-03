import { Building2, ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"

import { SuperAdminLoginForm } from "@/components/auth/super-admin-login-form"
import { getSessionUser } from "@/lib/auth-actions"

export default async function SuperAdminLoginPage() {
  const user = await getSessionUser()
  if (user?.role === "Admin") redirect("/super-admin")

  return (
    <main className="grid min-h-screen bg-white text-[#0b1c30] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#0b1c30] px-12 py-12 text-white lg:flex lg:flex-col xl:px-20 xl:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(67,67,213,0.55),transparent_46%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Building2 className="size-7" />
          </span>
          <span className="text-2xl font-bold tracking-[-0.03em]">EstateBlue SaaS</span>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <ShieldCheck className="size-4" />
            Super Admin
          </div>
          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-[-0.04em]">
            Secure control for the entire SaaS platform.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
            Manage plans, tenants, subscriptions, domains, and platform-wide operations from a dedicated administrative entry point.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 lg:hidden">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#0b1c30] text-white">
              <ShieldCheck className="size-6" />
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-[-0.03em]">Super Admin sign in</h2>
          <p className="mb-8 mt-2 text-sm leading-6 text-[#646273]">
            Use your platform administrator credentials. Tenant and agent accounts are not accepted here.
          </p>
          <SuperAdminLoginForm />
        </div>
      </section>
    </main>
  )
}
