"use client"

import type { DateRange } from "react-day-picker"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatCompactCurrency } from "@/lib/admin-portal"
import { formatDeltaLabel, type DashboardPortal } from "./dashboard-ui-helpers"

type DashboardPeriod = "monthly" | "quarterly" | "custom"

type DashboardOverviewProps = {
  currentUserName: string
  dateRange?: DateRange
  errorMessage?: string | null
  isLoading?: boolean
  onDateRangeChange: (range: DateRange | undefined) => void
  onPeriodChange: (period: Exclude<DashboardPeriod, "custom">) => void
  overview: DashboardSummary["overview"]
  period: DashboardPeriod
  portal: DashboardPortal
}

function formatDate(date?: Date) {
  if (!date) return "Select date"
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatRange(range?: DateRange) {
  if (!range?.from) return "Select period"
  if (!range.to) return formatDate(range.from)
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

export function DashboardOverview({
  dateRange,
  errorMessage,
  isLoading,
  onDateRangeChange,
  onPeriodChange,
  overview,
  period,
}: DashboardOverviewProps) {
  const cards = [
    {
      title: "Active listings",
      value: overview.activeListings.toLocaleString("en-US"),
      description: formatDeltaLabel(overview.activeListingsChange, "from last month"),
      icon: "domain",
      positive: overview.activeListingsChange >= 0,
      tone: "primary",
    },
    {
      title: "Deals in progress",
      value: overview.dealsInProgress.toLocaleString("en-US"),
      description: `${overview.closingThisMonth} closing this month`,
      icon: "handshake",
      positive: true,
      tone: "secondary",
    },
    {
      title: "Monthly revenue",
      value: formatCompactCurrency(overview.monthlyRevenue),
      description: formatDeltaLabel(overview.monthlyRevenueChange, "vs last month"),
      icon: "payments",
      positive: overview.monthlyRevenueChange >= 0,
      tone: "tertiary",
    },
    {
      title: "Leads this week",
      value: overview.newLeadsThisWeek.toLocaleString("en-US"),
      description: `${overview.contactedLeadsThisWeek} contacted · ${overview.convertedLeadsThisWeek} converted`,
      icon: "group_add",
      positive: true,
      tone: "primary",
    },
  ]

  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Operations Dashboard</h1>
          <p className="mt-1 text-base text-[var(--ether-on-surface-variant)]">
            Real-time overview of your real estate portfolio performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-[var(--shadow-surface-1)]">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                period === "monthly"
                  ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
                  : "text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-low)]"
              }`}
              onClick={() => onPeriodChange("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                period === "quarterly"
                  ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
                  : "text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-low)]"
              }`}
              onClick={() => onPeriodChange("quarterly")}
              type="button"
            >
              Quarterly
            </button>
          </div>

          <Popover>
            <PopoverTrigger className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-[var(--ether-on-surface)] shadow-[var(--shadow-surface-1)] transition hover:bg-[var(--ether-surface-container-low)]">
              <AppIcon name="calendar_month" />
              <span>{formatRange(dateRange)}</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto rounded-2xl bg-white p-3 shadow-[var(--shadow-surface-2)]">
              <Calendar
                mode="range"
                numberOfMonths={2}
                onSelect={onDateRangeChange}
                selected={dateRange}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <Alert className="rounded-xl bg-white">
          <AppIcon name="sync" />
          <AlertDescription>Loading live dashboard data...</AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive" className="rounded-xl">
          <AppIcon name="warning" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const toneClass =
            item.tone === "secondary"
              ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_28%,white)] text-[var(--ether-secondary)]"
              : item.tone === "tertiary"
                ? "bg-[color-mix(in_srgb,var(--ether-tertiary-fixed)_55%,white)] text-[var(--ether-tertiary)]"
                : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"

          return (
            <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]" key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <span className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>
                  <AppIcon className="text-xl" name={item.icon} />
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.positive
                      ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
                      : "bg-[var(--ether-error-container)] text-[var(--ether-error)]"
                  }`}
                >
                  {item.positive ? "↗" : "↘"}
                  {item.title === "Deals in progress"
                    ? overview.closingThisMonth
                    : item.title === "Leads this week"
                      ? overview.convertedLeadsThisWeek
                      : item.title === "Active listings"
                        ? `${Math.abs(overview.activeListingsChange)}%`
                        : `${Math.abs(overview.monthlyRevenueChange)}%`}
                </span>
              </div>
              <p className="ether-label-caps mt-5 text-[var(--ether-on-surface-variant)]">{item.title}</p>
              <p className="ether-numeric-lg mt-2 text-[var(--ether-on-surface)]">{item.value}</p>
              <p className="mt-3 text-xs leading-5 text-[var(--ether-outline)]">{item.description}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
