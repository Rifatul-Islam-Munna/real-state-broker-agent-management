import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"

export function LeadOutreachHeader({
  imports,
  pathname,
  queued,
  sent,
  templates,
}: {
  imports: number
  pathname: string
  queued: number
  sent: number
  templates: number
}) {
  const crmHref = pathname.startsWith("/agent") ? "/agent/lead" : "/admin/lead-crm-pipeline"
  const mailHref = pathname.startsWith("/agent") ? "/agent/mail" : "/admin/mail-monitor"

  return (
    <section className="overflow-hidden rounded-[2.2rem] border border-border/80 bg-card shadow-sm">
      <div className="relative border-b border-border/80 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_10%,white),white_45%,color-mix(in_oklab,var(--color-accent)_15%,white))] px-6 py-8 md:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,transparent_0,transparent_calc(25%-1px),color-mix(in_oklab,var(--color-primary)_10%,white)_calc(25%-1px),color-mix(in_oklab,var(--color-primary)_10%,white)_25%),linear-gradient(to_bottom,transparent_0,transparent_calc(50%-1px),color-mix(in_oklab,var(--color-accent)_10%,white)_calc(50%-1px),color-mix(in_oklab,var(--color-accent)_10%,white)_50%)] [background-size:220px_140px]" />
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary/70">{"Lead outreach workspace"}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-foreground md:text-5xl">
              {"CSV campaigns, reusable templates, smart follow-up."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {"Simple for non-technical staff: save message templates, upload CSV, map columns, send Email + SMS together, skip follow-up when lead already replied."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-foreground"
              href={crmHref}
            >
              <AppIcon className="text-base" name="arrow_back" />
              {"Lead CRM"}
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground"
              href={mailHref}
            >
              <AppIcon className="text-base" name="mail" />
              {"Mail monitor"}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 md:grid-cols-4 md:px-8">
        <StatCard label="Templates" value={`${templates}`} />
        <StatCard label="Recent Imports" value={`${imports}`} />
        <StatCard label="Queued" value={`${queued}`} />
        <StatCard label="Sent / Done" value={`${sent}`} />
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,245,241,0.82))] px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
    </div>
  )
}
