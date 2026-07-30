import type { DateRange } from "react-day-picker"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { DashboardAlerts } from "./dashboard-alerts"
import { DashboardOverview } from "./dashboard-overview"
import { DashboardPerformance } from "./dashboard-performance"
import { dashboardLinks, type DashboardPortal } from "./dashboard-ui-helpers"
import { DashboardVisits } from "./dashboard-visits"

type DashboardPeriod = "monthly" | "quarterly" | "custom"

type MainContentSectionProps = {
  currentUserName: string
  dateRange?: DateRange
  errorMessage?: string | null
  isLoading?: boolean
  onDateRangeChange: (range: DateRange | undefined) => void
  onPeriodChange: (period: Exclude<DashboardPeriod, "custom">) => void
  period: DashboardPeriod
  portal: DashboardPortal
  summary?: DashboardSummary | null
}

const fallbackSummary: DashboardSummary = {
  overview: {
    activeListings: 0,
    activeListingsChange: 0,
    newLeadsThisWeek: 0,
    contactedLeadsThisWeek: 0,
    convertedLeadsThisWeek: 0,
    dealsInProgress: 0,
    closingThisMonth: 0,
    monthlyRevenue: 0,
    monthlyRevenueChange: 0,
  },
  topAgents: [],
  alerts: [],
  visits: [],
}

export function MainContentSection({
  currentUserName,
  dateRange,
  errorMessage,
  isLoading,
  onDateRangeChange,
  onPeriodChange,
  period,
  portal,
  summary,
}: MainContentSectionProps) {
  const dashboard = summary ?? fallbackSummary
  const links = dashboardLinks(portal)

  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <DashboardOverview
          currentUserName={currentUserName}
          dateRange={dateRange}
          errorMessage={errorMessage}
          isLoading={Boolean(isLoading && !summary)}
          onDateRangeChange={onDateRangeChange}
          onPeriodChange={onPeriodChange}
          overview={dashboard.overview}
          period={period}
          portal={portal}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(300px,0.9fr)]">
          <DashboardPerformance teamHref={links.team} topAgents={dashboard.topAgents} />
          <DashboardAlerts
            alerts={dashboard.alerts}
            dealsHref={links.deals}
            leadsHref={links.leads}
          />
        </div>

        <DashboardVisits leadsHref={links.leads} visits={dashboard.visits} />
      </div>
    </main>
  )
}
