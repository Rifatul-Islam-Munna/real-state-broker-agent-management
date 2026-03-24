import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { getSessionUser } from "@/lib/auth-actions"

export default async function LoginPage() {
  const user = await getSessionUser()

  if (user) {
    redirect(user.role === "Agent" ? "/agent/dashboard" : "/admin/dashboard")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7f4ee_0%,#ffffff_52%,#f1f5f9_100%)] px-4 py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] bg-primary p-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">
            {"EstateBlue"}
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
            {"Admin access for listings, leads, contacts, and deals."}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/80">
            {"Sign in to manage properties, review public inquiries, convert leads into deals, and keep the admin workspace synced with the backend."}
          </p>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] md:p-10">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Welcome Back"}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              {"Sign In"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {"Use your admin or agent account to enter the portal."}
            </p>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
