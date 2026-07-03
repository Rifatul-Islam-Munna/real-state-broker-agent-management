import type { DashboardSummary } from "@/@types/real-estate-api"
import { DashboardAlerts } from "./dashboard-alerts"
import { DashboardOverview } from "./dashboard-overview"
import { DashboardPerformance } from "./dashboard-performance"
import { dashboardLinks, type DashboardPortal } from "./dashboard-ui-helpers"
import { DashboardVisits } from "./dashboard-visits"

type MainContentSectionProps = {
  currentUserName: string
  errorMessage?: string | null
  isLoading?: boolean
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
  errorMessage,
  isLoading,
  portal,
  summary,
}: MainContentSectionProps) {
  const dashboard = summary ?? fallbackSummary
  const links = dashboardLinks(portal)

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <DashboardOverview
          currentUserName={currentUserName}
          errorMessage={errorMessage}
          isLoading={Boolean(isLoading && !summary)}
          overview={dashboard.overview}
          portal={portal}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <DashboardPerformance teamHref={links.team} topAgents={dashboard.topAgents} />
            <DashboardAlerts
              alerts={dashboard.alerts}
              dealsHref={links.deals}
              leadsHref={links.leads}
            />
          </div>
          <DashboardVisits leadsHref={links.leads} visits={dashboard.visits} />
        </div>
      </div>
    </main>
  )
}
