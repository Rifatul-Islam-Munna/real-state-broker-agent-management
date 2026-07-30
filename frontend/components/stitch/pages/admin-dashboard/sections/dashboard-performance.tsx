import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { formatCompactCurrency } from "@/lib/admin-portal"

type DashboardPerformanceProps = {
  teamHref: string
  topAgents: DashboardSummary["topAgents"]
}

export function DashboardPerformance({
  teamHref,
  topAgents,
}: DashboardPerformanceProps) {
  const totalRevenue = topAgents.reduce((sum, agent) => sum + agent.revenue, 0)
  const maxRevenue = Math.max(...topAgents.map((agent) => agent.revenue), 1)
  const visibleAgents = topAgents.slice(0, 5)

  return (
    <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)] lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="ether-headline-md text-[var(--ether-on-surface)]">Revenue Performance</h2>
          <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
            Live revenue contribution from your top-performing agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex size-10 items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-low)]" aria-label="Filter revenue performance">
            <AppIcon name="filter_list" />
          </button>
          <Link className="flex size-10 items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-low)]" href={teamHref} aria-label="View team performance">
            <AppIcon name="more_vert" />
          </Link>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-end gap-4">
        <p className="text-4xl font-bold tracking-[-0.04em] text-[var(--ether-on-surface)] sm:text-5xl">
          {formatCompactCurrency(totalRevenue)}
        </p>
        <span className="mb-1 rounded-full bg-[color-mix(in_srgb,var(--ether-secondary-container)_40%,white)] px-3 py-1.5 text-sm font-semibold text-[var(--ether-secondary)]">
          {topAgents.length} active performers
        </span>
      </div>

      <div className="mt-10 grid min-h-[300px] grid-cols-5 items-end gap-4 sm:gap-6">
        {visibleAgents.length === 0 ? (
          <div className="col-span-5 flex min-h-[260px] items-center justify-center rounded-2xl bg-[var(--ether-surface-container-low)] text-sm text-[var(--ether-on-surface-variant)]">
            No revenue performance data is available yet.
          </div>
        ) : (
          visibleAgents.map((agent, index) => {
            const height = Math.max(18, Math.round((agent.revenue / maxRevenue) * 100))
            const palette = [
              "var(--ether-primary)",
              "var(--ether-secondary)",
              "var(--ether-primary-container)",
              "var(--ether-secondary-fixed-dim)",
              "var(--ether-inverse-primary)",
            ]

            return (
              <div className="flex min-w-0 flex-col items-center" key={agent.id}>
                <div className="flex h-[230px] w-full items-end justify-center">
                  <div
                    className="w-full max-w-[84px] rounded-t-[28px] rounded-b-[18px] shadow-[0_10px_30px_rgba(93,95,239,0.08)] transition-all"
                    style={{
                      height: `${height}%`,
                      background: palette[index % palette.length],
                    }}
                    title={`${agent.fullName}: ${formatCompactCurrency(agent.revenue)}`}
                  />
                </div>
                <p className="mt-4 max-w-full truncate text-xs font-semibold uppercase tracking-[0.05em] text-[var(--ether-on-surface-variant)]">
                  {agent.fullName.split(" ")[0]}
                </p>
                <p className="mt-1 text-xs text-[var(--ether-outline)]">{formatCompactCurrency(agent.revenue)}</p>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
