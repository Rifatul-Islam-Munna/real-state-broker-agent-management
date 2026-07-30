import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type DashboardAlertsProps = {
  alerts: DashboardSummary["alerts"]
  dealsHref: string
  leadsHref: string
}

export function DashboardAlerts({ alerts, dealsHref, leadsHref }: DashboardAlertsProps) {
  return (
    <section className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Priority Alerts</h2>
        <span className="rounded-md bg-[var(--ether-error-container)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--ether-error)]">
          Urgent
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-[var(--ether-surface-container-low)] p-5 text-sm leading-6 text-[var(--ether-on-surface-variant)]">
            No urgent lead or deal actions are pending yet.
          </div>
        ) : (
          alerts.slice(0, 4).map((alert, index) => {
            const href = alert.target === "deals" ? dealsHref : leadsHref
            const urgent = index === 0

            return (
              <Link
                className={`block rounded-2xl border-l-4 p-4 transition hover:shadow-[var(--shadow-surface-2)] ${
                  urgent
                    ? "border-l-[var(--ether-tertiary)] bg-[color-mix(in_srgb,var(--ether-tertiary-fixed)_35%,white)]"
                    : "border-l-[var(--ether-primary)] bg-[var(--ether-surface-container-low)]"
                }`}
                href={href}
                key={alert.id}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]" : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"}`}>
                    <AppIcon name={alert.target === "deals" ? "warning" : "event_busy"} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${urgent ? "text-[var(--ether-tertiary)]" : "text-[var(--ether-primary)]"}`}>
                      {alert.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ether-on-surface)]">{alert.actionLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--ether-on-surface-variant)]">{alert.description}</p>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      <Link className="mt-6 block text-center text-sm font-semibold text-[var(--ether-primary)]" href={dealsHref}>
        View All Alerts
      </Link>
    </section>
  )
}
