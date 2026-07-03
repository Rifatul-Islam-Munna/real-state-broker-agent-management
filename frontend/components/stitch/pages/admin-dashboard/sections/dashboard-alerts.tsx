import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardAlertsProps = {
  alerts: DashboardSummary["alerts"]
  dealsHref: string
  leadsHref: string
}

export function DashboardAlerts({ alerts, dealsHref, leadsHref }: DashboardAlertsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{"Priority alerts"}</CardTitle>
        <CardDescription>{"Items that may need attention today."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground md:col-span-2">
            {"No urgent lead or deal actions are pending yet."}
          </div>
        ) : (
          alerts.map((alert) => {
            const href = alert.target === "deals" ? dealsHref : leadsHref

            return (
              <div className="rounded-xl border bg-muted/25 p-4" key={alert.id}>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <AppIcon name={alert.target === "deals" ? "warning" : "event_busy"} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {alert.description}
                    </p>
                    <Button className="mt-2 h-auto p-0" render={<Link href={href} />} variant="link">
                      {alert.actionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
