import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCompactCurrency } from "@/lib/admin-portal"
import {
  dashboardLinks,
  formatDeltaLabel,
  type DashboardPortal,
} from "./dashboard-ui-helpers"

type DashboardOverviewProps = {
  currentUserName: string
  errorMessage?: string | null
  isLoading?: boolean
  overview: DashboardSummary["overview"]
  portal: DashboardPortal
}

export function DashboardOverview({
  currentUserName,
  errorMessage,
  isLoading,
  overview,
  portal,
}: DashboardOverviewProps) {
  const firstName = currentUserName.split(" ").filter(Boolean)[0] ?? "Account"
  const links = dashboardLinks(portal)
  const cards = [
    {
      title: "Active listings",
      value: overview.activeListings,
      description: formatDeltaLabel(overview.activeListingsChange, "from last month"),
      icon: "home",
      positive: overview.activeListingsChange >= 0,
    },
    {
      title: "Deals in progress",
      value: overview.dealsInProgress,
      description: `${overview.closingThisMonth} closing this month`,
      icon: "contract",
      positive: true,
    },
    {
      title: "Monthly revenue",
      value: formatCompactCurrency(overview.monthlyRevenue),
      description: formatDeltaLabel(overview.monthlyRevenueChange, "vs last month"),
      icon: "payments",
      positive: overview.monthlyRevenueChange >= 0,
    },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary">
            {portal === "admin" ? "Admin workspace" : "Agent workspace"}
          </Badge>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {`Good morning, ${firstName}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Here is the latest activity across your real estate operation."}
          </p>
        </div>
        <Button render={<Link href={links.leads} />}>
          <AppIcon name="person_search" />
          {"Open lead pipeline"}
        </Button>
      </div>

      {isLoading ? (
        <Alert>
          <AppIcon name="sync" />
          <AlertDescription>{"Loading live dashboard data..."}</AlertDescription>
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="destructive">
          <AppIcon name="warning" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{item.value}</CardTitle>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <AppIcon className="text-xl" name={item.icon} />
              </span>
            </CardHeader>
            <CardContent>
              <p
                className={
                  item.positive
                    ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-xs font-medium text-destructive"
                }
              >
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardDescription>{"Leads this week"}</CardDescription>
            <CardTitle className="text-3xl">{overview.newLeadsThisWeek}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[
              ["New", overview.newLeadsThisWeek],
              ["Contacted", overview.contactedLeadsThisWeek],
              ["Converted", overview.convertedLeadsThisWeek],
            ].map(([label, value]) => (
              <div className="rounded-xl bg-muted/60 px-2 py-3 text-center" key={String(label)}>
                <p className="text-base font-semibold">{value}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
