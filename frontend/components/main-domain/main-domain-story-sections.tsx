import Link from "next/link"
import {
  ArrowRight, BadgeCheck, BarChart3, Boxes, Building2, CheckCircle2,
  Database, Globe2, Headphones, Layers3, LockKeyhole, Mail, Network,
  ShieldCheck, Sparkles, Users2, Workflow,
} from "lucide-react"

const capabilities = [
  { icon: Building2, title: "Run the brokerage", text: "Keep listings, leads, deals, communications, and team activity in one operating layer." },
  { icon: Database, title: "Keep tenant data isolated", text: "Each customer workspace is routed to its own tenant database and tenant-specific business data." },
  { icon: Workflow, title: "Automate repetitive work", text: "Use outreach, showing requests, reports, property operations, and workflow tools from the same product." },
  { icon: Globe2, title: "Publish a branded presence", text: "Launch on an assigned subdomain, then move to a verified custom domain when the business is ready." },
]

export function MainDomainStorySections() {
  return (
    <>
      <section className="border-y border-slate-200 bg-[#0b1728] py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Built as an operating system</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">One platform. Four jobs your team does every day.</h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-300">EstateBlue connects the public website, internal workspace, property operations, and customer communication instead of forcing your team to stitch together separate tools.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, text }) => (
                <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur" key={title}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-cyan-200"><Icon className="size-5" /></span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="rounded-[30px] border border-slate-200 bg-[#f7f9fc] p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">A connected workday</p><h3 className="mt-2 text-2xl font-bold">From inquiry to closed-loop follow-up</h3></div>
                <Network className="size-7 text-[#4343d5]" />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  [Mail, "Lead arrives", "Website, inbox, SMS, or team-created lead"],
                  [Users2, "Team acts", "Assign, qualify, schedule, and track the relationship"],
                  [Boxes, "Property work moves", "Showings, property operations, and owner workflows stay connected"],
                  [BarChart3, "Management sees progress", "Reports and dashboard activity give the business a clear view"],
                ].map(([Icon, title, text], index) => { const StepIcon = Icon as typeof Mail; return <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm" key={String(title)}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4343d5]"><StepIcon className="size-5" /></span><div><p className="text-xs font-bold text-slate-400">0{index + 1}</p><p className="font-semibold">{String(title)}</p><p className="mt-1 text-sm text-slate-500">{String(text)}</p></div></div> })}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">Less tool switching</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Make the workflow feel like one product, not ten browser tabs.</h2>
              <p className="mt-5 leading-7 text-slate-600">The main value is not another dashboard. It is keeping the customer journey, property work, communications, and management context together.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">{["Leads and deals", "Email and SMS", "Showing workflows", "Property operations", "Owner reporting", "Team permissions"].map(item => <div className="flex items-center gap-2 text-sm font-semibold text-slate-700" key={item}><CheckCircle2 className="size-4 text-emerald-600" />{item}</div>)}</div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#f7f8fc] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <article className="relative overflow-hidden rounded-[30px] bg-[#111827] p-7 text-white sm:p-9">
              <div className="absolute right-0 top-0 size-72 rounded-full bg-[#4343d5]/25 blur-3xl" />
              <div className="relative max-w-2xl">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10"><LockKeyhole className="size-6 text-cyan-200" /></div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">Tenant isolation by design</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Your business workspace is not somebody else&apos;s workspace.</h2>
                <p className="mt-5 leading-7 text-slate-300">Tenant routing, tenant databases, host checks, and role permissions work together so business data is scoped to the customer workspace that owns it.</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">{["Tenant-specific business data", "Host + account tenant checks", "Owner / Staff access model", "Backend-enforced Staff permissions"].map(item => <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm" key={item}><ShieldCheck className="size-4 text-emerald-300" />{item}</div>)}</div>
              </div>
            </article>
            <article className="rounded-[30px] border border-slate-200 bg-white p-7 sm:p-9">
              <BadgeCheck className="size-8 text-[#4343d5]" />
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.15em] text-[#4343d5]">Control without complexity</p>
              <h3 className="mt-3 text-2xl font-bold">Give Staff only the sections they should use.</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">Owners can run a simpler team model: grant access to properties, leads, mail, deals, dashboard, or settings while sensitive owner controls stay restricted.</p>
              <Link className="mt-8 inline-flex items-center gap-2 font-semibold text-[#4343d5]" href="#plans">See plan access <ArrowRight className="size-4" /></Link>
            </article>
          </div>
        </div>
      </section>
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">Grow into the platform</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Start focused. Add depth as the business gets more complex.</h2>
            <p className="mt-4 leading-7 text-slate-600">The platform supports a natural progression from a branded workspace to a fuller operating environment without changing the customer-facing foundation.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Launch", "Choose a plan and provision the branded tenant workspace."],
              ["02", "Operate", "Run leads, listings, communications, and team workflows."],
              ["03", "Systemize", "Add property operations, reports, schedules, and automations."],
              ["04", "Scale", "Use custom domains, Staff permissions, and broader operating controls."],
            ].map(([n, title, text]) => <article className="group rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:border-[#4343d5]/30 hover:shadow-lg" key={n}><span className="text-xs font-bold text-[#4343d5]">{n}</span><h3 className="mt-8 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#f7f8fc] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div><Sparkles className="size-8 text-[#4343d5]" /><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[#4343d5]">Before you choose</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Common questions, answered clearly.</h2><p className="mt-4 leading-7 text-slate-600">Plans control the workspace features you receive; your tenant identity and business workspace remain separate from the main SaaS marketing site.</p></div>
          <div className="grid gap-3">
            {[
              ["Is the main website the same as my tenant website?", "No. The main domain sells and explains the SaaS. Your subdomain or custom domain renders your tenant-specific public website."],
              ["Are plans loaded from the platform?", "Yes. The pricing section below reads the currently active public subscription plans from the SaaS backend."],
              ["Can I control Staff access?", "Yes. Staff access is section-based and enforced by backend permissions as well as dashboard navigation."],
              ["Can my business use its own domain?", "Yes. Tenant routing supports the assigned subdomain and verified custom-domain workflows."],
            ].map(([q, a]) => <details className="group rounded-2xl border border-slate-200 bg-white p-5" key={q}><summary className="cursor-pointer list-none font-semibold">{q}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></details>)}
          </div>
        </div>
      </section>
    </>
  )
}
