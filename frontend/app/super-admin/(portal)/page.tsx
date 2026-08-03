import Link from "next/link"
import { ArrowRight, Building2, CreditCard, ShieldCheck, Users } from "lucide-react"

const overviewCards = [
  {
    title: "Subscription plans",
    description: "Create and manage SaaS plans and dashboard permissions.",
    href: "/super-admin/plans",
    icon: CreditCard,
  },
  {
    title: "Customers and tenants",
    description: "Review tenant accounts, subscriptions, status, and domains.",
    href: "/super-admin/tenants",
    icon: Users,
  },
  {
    title: "Platform controls",
    description: "Manage global SaaS settings and administrative access.",
    href: "/super-admin/settings",
    icon: ShieldCheck,
  },
]

export default function SuperAdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-2xl bg-[#0b1c30] px-7 py-8 text-white shadow-sm lg:px-10 lg:py-10">
        <div className="flex max-w-3xl items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#4343d5]">
            <Building2 className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Dedicated Super Admin dashboard</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] lg:text-4xl">Manage the SaaS platform from one secure portal.</h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/65">
              This dashboard is reserved for platform-level administration. Tenant and normal user tools remain outside this portal.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Platform management</h2>
          <p className="mt-1 text-sm text-[#646273]">Open a Super Admin area to continue managing the SaaS platform.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map(({ title, description, href, icon: Icon }) => (
            <Link
              className="group rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#4343d5]/35 hover:shadow-md"
              href={href}
              key={href}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]">
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-5 text-[#9291a0] transition group-hover:translate-x-1 group-hover:text-[#4343d5]" />
              </div>
              <h3 className="mt-6 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#646273]">{description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#dfe4ee] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eaf8ef] text-[#19713b]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">Admin-only route protection is active</h2>
            <p className="mt-1 text-sm leading-6 text-[#646273]">
              Unauthenticated visitors are redirected to the Super Admin login page, and authenticated non-Admin users cannot enter this dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
