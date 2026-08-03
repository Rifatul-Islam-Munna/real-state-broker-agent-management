import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react"
import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/auth/register-form"
import { getSessionUser } from "@/lib/auth-actions"
import { getPortalHomePath } from "@/lib/portal-paths"

export const metadata: Metadata = {
  title: "Start your EstateBlue SaaS account",
  description: "Create your account and continue with your selected EstateBlue SaaS plan.",
}

type RegisterPageProps = {
  searchParams: Promise<{ plan?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getSessionUser()
  if (user) redirect(getPortalHomePath(user))

  const { plan } = await searchParams
  const selectedPlan = plan && /^-?\d+$/.test(plan) ? plan : null

  return (
    <main className="min-h-screen bg-[#f6f8ff] px-5 py-10 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#4343d5]" href="/#plans">
          <ArrowLeft className="size-4" /> Back to plans
        </Link>

        <div className="mt-8 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[.85fr_1.15fr]">
          <section className="bg-[#0b1c30] p-8 text-white sm:p-10 lg:p-12">
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#4343d5]">
              <Building2 className="size-6" />
            </span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.15em] text-[#8d8dff]">Start your SaaS account</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Create your account to continue.</h1>
            <p className="mt-4 leading-7 text-white/65">
              Your account is the first step. Business details, payment, tenant creation, and provisioning continue in the purchase flow.
            </p>

            <div className="mt-8 space-y-4 text-sm text-white/75">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8d8dff]" />
                Selected plan reference: {selectedPlan ?? "Choose after account creation"}
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8d8dff]" />
                Secure account registration
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8d8dff]" />
                Continue to business and subscription setup
              </div>
            </div>
          </section>

          <section className="p-7 sm:p-10 lg:p-12">
            <h2 className="text-2xl font-bold tracking-[-0.03em]">Account details</h2>
            <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">
              Enter your details to start the signup process.
            </p>
            <RegisterForm planId={selectedPlan} />
          </section>
        </div>
      </div>
    </main>
  )
}
