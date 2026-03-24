import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/auth/register-form"
import { getSessionUser } from "@/lib/auth-actions"

export default async function RegisterPage() {
  const user = await getSessionUser()

  if (user) {
    redirect(user.role === "Agent" ? "/agent/dashboard" : "/admin/dashboard")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#fff7ed_100%)] px-4 py-12">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/60 bg-white/80 p-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-secondary">
            {"EstateBlue Portal"}
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            {"Create the first admin or agent account for this workspace."}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
            {"Registration is wired directly to your backend auth endpoints, then drops the session into secure cookies so the admin pages can use the existing API hook setup."}
          </p>
        </section>
        <section className="rounded-[2rem] bg-primary p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] md:p-10">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-accent">
              {"Create Account"}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              {"Register"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {"Pick the role you want to use in the portal and sign in automatically after registration."}
            </p>
          </div>
          <RegisterForm />
        </section>
      </div>
    </main>
  )
}
