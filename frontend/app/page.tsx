import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { MainDomainStorySections } from "@/components/main-domain/main-domain-story-sections"

export const metadata: Metadata = {
  title: "EstateBlue SaaS | Real Estate Business Platform",
  description:
    "Launch and manage your real estate business with branded websites, property management tools, and flexible SaaS plans.",
}

type PublicPlan = {
  id: number
  name: string
  description: string
  price: string
  billingDays: number
  dashboardPermissions: string[]
  isActive: boolean
}

async function getPublicPlans(): Promise<PublicPlan[]> {
  const apiBase = (
    process.env.BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000/api"
  ).replace(/\/$/, "")

  try {
    const response = await fetch(`${apiBase}/public-saas/plans`, {
      cache: "no-store",
    })
    if (!response.ok) return []
    const plans = (await response.json()) as PublicPlan[]
    return plans.filter((plan) => plan.isActive)
  } catch {
    return []
  }
}

function permissionLabel(permission: string) {
  if (permission === "normal-dashboard") return "Business dashboard"
  if (permission === "property-management-dashboard") return "Property-management dashboard"
  return permission
}

export default async function SaaSLandingPage() {
  const plans = await getPublicPlans()

  return (
    <div className="min-h-screen bg-white text-[#0b1c30]">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#4343d5] text-white">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="font-bold tracking-[-0.03em]">EstateBlue SaaS</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">Real estate platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <Link className="transition hover:text-[#4343d5]" href="#features">Features</Link>
            <Link className="transition hover:text-[#4343d5]" href="#plans">Plans</Link>
            <Link className="transition hover:text-[#4343d5]" href="#how-it-works">How it works</Link>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" href="/login">
              Sign in
            </Link>
            <Link className="rounded-lg bg-[#0b1c30] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#172d48]" href="/register">
              Start now
            </Link>
          </div>
          <nav className="flex items-center gap-3 text-xs font-semibold sm:hidden" aria-label="Mobile navigation">
            <Link href="#plans">Plans</Link>
            <Link className="rounded-lg bg-[#0b1c30] px-3 py-2 text-white" href="/register">Start</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#f6f8ff]">
          <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#4343d5]/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4343d5]/20 bg-white px-4 py-2 text-xs font-semibold text-[#4343d5] shadow-sm">
                <Sparkles className="size-4" />
                Built for modern real estate businesses
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Your website, operations, and growth in one platform.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Launch a branded real estate presence, manage property workflows, and give your team the dashboards they needΓÇöwithout building the technology from scratch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-[#4343d5] px-6 font-semibold text-white transition hover:bg-[#3535b8]" href="#plans">
                  View plans <ArrowRight className="size-4" />
                </Link>
                <Link className="inline-flex h-13 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-semibold transition hover:border-[#4343d5] hover:text-[#4343d5]" href="/login">
                  Existing customer sign in
                </Link>
              </div>
              <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                {[
                  "Branded tenant website",
                  "Flexible dashboard access",
                  "Subdomain and custom domain ready",
                ].map((item) => (
                  <div className="flex items-center gap-2" key={item}>
                    <CheckCircle2 className="size-4 shrink-0 text-[#4343d5]" /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_32px_80px_rgba(27,39,94,.16)]">
                <div className="rounded-2xl bg-[#0b1c30] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Business overview</p>
                      <h2 className="mt-2 text-2xl font-bold">Everything connected</h2>
                    </div>
                    <LayoutDashboard className="size-7 text-[#8d8dff]" />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    {["Listings", "Leads", "Properties", "Team"].map((label, index) => (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4" key={label}>
                        <p className="text-xs text-white/55">{label}</p>
                        <p className="mt-2 text-2xl font-bold">{[128, 347, 64, 18][index]}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <Globe2 className="size-5 text-[#4343d5]" />
                    <p className="mt-4 font-bold">Your domain</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Use your assigned subdomain or connect a verified custom domain.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <ShieldCheck className="size-5 text-[#4343d5]" />
                    <p className="mt-4 font-bold">Your workspace</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Access only the dashboard modules included in your subscription.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16" id="features">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">One SaaS platform</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Choose the tools your business actually needs.</h2>
              <p className="mt-4 leading-7 text-slate-600">Every plan clearly defines which dashboards and workflows your team can access.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                [LayoutDashboard, "Business dashboard", "Manage users, leads, listings, communications, and daily business activity."],
                [Building2, "Property management", "Operate property workflows, maintenance, tenants, and management tasks."],
                [Globe2, "Branded public website", "Publish your own tenant homepage through a subdomain or verified custom domain."],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof LayoutDashboard
                return (
                  <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" key={String(title)}>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
                      <FeatureIcon className="size-5" />
                    </span>
                    <h3 className="mt-6 text-lg font-bold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{String(description)}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <MainDomainStorySections />

        <section className="bg-[#f7f8fc] py-20 sm:py-24" id="plans">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">Flexible pricing</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Pick a plan built around your workflow.</h2>
                <p className="mt-4 leading-7 text-slate-600">Active plans are loaded directly from the platform. Each card shows its included dashboard permissions.</p>
              </div>
              <p className="text-sm text-slate-500">You can upgrade or renew as your business grows.</p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {plans.length === 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-900 lg:col-span-3">
                  <p className="font-semibold">Plans are temporarily unavailable.</p>
                  <p className="mt-2 text-sm leading-6">The pricing section could not reach the SaaS backend. No placeholder pricing is being shown.</p>
                </div>
              ) : plans.map((plan, index) => {
                const highlighted = plans.length > 1 && index === Math.floor(plans.length / 2)
                const price = Number(plan.price)
                return (
                  <article className={`relative flex rounded-3xl border bg-white p-7 shadow-sm ${highlighted ? "border-[#4343d5] ring-4 ring-[#4343d5]/10" : "border-slate-200"}`} key={plan.id}>
                    {highlighted ? <span className="absolute right-5 top-5 rounded-full bg-[#4343d5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Popular</span> : null}
                    <div className="flex w-full flex-col">
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{plan.description || "Flexible access for your real estate business."}</p>
                      </div>
                      <div className="mt-6 flex items-end gap-2">
                        <span className="text-4xl font-bold tracking-[-0.04em]">${Number.isFinite(price) ? price.toFixed(0) : plan.price}</span>
                        <span className="pb-1 text-sm text-slate-500">/{plan.billingDays} days</span>
                      </div>
                      <div className="my-6 h-px bg-slate-200" />
                      <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-500">Included access</p>
                      <ul className="mt-4 space-y-3">
                        {plan.dashboardPermissions.map((permission) => (
                          <li className="flex items-start gap-3 text-sm" key={permission}>
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[#19713b]">
                              <Check className="size-3" />
                            </span>
                            {permissionLabel(permission)}
                          </li>
                        ))}
                        <li className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[#19713b]">
                            <Check className="size-3" />
                          </span>
                          Branded tenant website
                        </li>
                        <li className="flex items-start gap-3 text-sm">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[#19713b]">
                            <Check className="size-3" />
                          </span>
                          Assigned business subdomain
                        </li>
                      </ul>
                      <Link className={`mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl font-semibold transition ${highlighted ? "bg-[#4343d5] text-white hover:bg-[#3535b8]" : "bg-[#0b1c30] text-white hover:bg-[#172d48]"}`} href={`/register?plan=${plan.id}`}>
                        Choose {plan.name} <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24" id="how-it-works">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">Simple setup</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Go from signup to your own real estate platform.</h2>
                <p className="mt-4 leading-7 text-slate-600">Choose a plan now. Tenant creation, payment, and provisioning are completed in the next purchase stage.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["01", "Choose a plan", "Select the dashboard access that matches your business."],
                  ["02", "Create your business", "Register your account and provide your unique business name."],
                  ["03", "Launch your workspace", "Receive your tenant dashboard, website, and assigned subdomain."],
                ].map(([number, title, description]) => (
                  <article className="rounded-2xl border border-slate-200 p-6" key={number}>
                    <span className="text-sm font-bold text-[#4343d5]">{number}</span>
                    <h3 className="mt-8 font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-3xl bg-[#0b1c30] px-7 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:px-14 lg:py-14">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8d8dff]">Ready to begin?</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Build your real estate business on a platform designed to grow with you.</h2>
            </div>
            <Link className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-[#0b1c30] transition hover:bg-slate-100" href="#plans">
              Compare plans <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <div className="flex items-center gap-2 font-semibold text-[#0b1c30]">
            <Building2 className="size-4 text-[#4343d5]" /> EstateBlue SaaS
          </div>
          <p>Real estate websites, dashboards, and operations in one platform.</p>
          <div className="flex gap-5">
            <Link href="/login">Sign in</Link>
            <Link href="#plans">Plans</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
