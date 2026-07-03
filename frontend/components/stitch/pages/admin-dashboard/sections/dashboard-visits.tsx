import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatRelativeTimeLabel } from "@/lib/admin-portal"
import { visitDateParts } from "./dashboard-ui-helpers"

type DashboardVisitsProps = {
  leadsHref: string
  visits: DashboardSummary["visits"]
}

export function DashboardVisits({ leadsHref, visits }: DashboardVisitsProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{"Property visits"}</CardTitle>
            <CardDescription>{"Recent showing and visit activity."}</CardDescription>
          </div>
          <Badge variant="secondary">{"Live"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visits.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {"No property visit activity has been logged yet."}
          </div>
        ) : (
          visits.map((visit) => {
            const dateParts = visitDateParts(visit.activityAt)
            const isCanceled = visit.status === "Canceled"

            return (
              <div className="flex gap-3 rounded-xl border p-3" key={visit.id}>
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">{dateParts.month}</p>
                  <p className="text-lg font-semibold text-primary">{dateParts.day}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={isCanceled ? "truncate text-sm font-semibold line-through" : "truncate text-sm font-semibold"}>
                      {visit.propertyTitle}
                    </p>
                    <Badge variant={isCanceled ? "destructive" : "outline"}>{visit.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {visit.timeline || formatRelativeTimeLabel(visit.activityAt)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{visit.clientName}</p>
                </div>
              </div>
            )
          })
        )}
        <Button className="w-full" render={<Link href={leadsHref} />} variant="outline">
          {"View lead pipeline"}
        </Button>
      </CardContent>
    </Card>
  )
}
