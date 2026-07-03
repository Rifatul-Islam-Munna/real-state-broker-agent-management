import Link from "next/link"

import type { DashboardSummary } from "@/@types/real-estate-api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCompactCurrency } from "@/lib/admin-portal"
import { initialsFromName } from "./dashboard-ui-helpers"

type DashboardPerformanceProps = {
  teamHref: string
  topAgents: DashboardSummary["topAgents"]
}

export function DashboardPerformance({
  teamHref,
  topAgents,
}: DashboardPerformanceProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{"Top-performing agents"}</CardTitle>
          <CardDescription>
            {"Performance based on closed deals and generated revenue."}
          </CardDescription>
        </div>
        <Button render={<Link href={teamHref} />} size="sm" variant="outline">
          {"View all"}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{"Agent"}</TableHead>
              <TableHead>{"Status"}</TableHead>
              <TableHead>{"Deals"}</TableHead>
              <TableHead>{"Revenue"}</TableHead>
              <TableHead>{"Growth"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topAgents.length === 0 ? (
              <TableRow>
                <TableCell className="h-28 text-center text-muted-foreground" colSpan={5}>
                  {"No agent performance data is available yet."}
                </TableCell>
              </TableRow>
            ) : (
              topAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {agent.avatarUrl ? (
                          <AvatarImage alt={agent.fullName} src={agent.avatarUrl} />
                        ) : null}
                        <AvatarFallback>{initialsFromName(agent.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{agent.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {agent.agencyName ?? "EstateBlue Team"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.status === "Active" ? "default" : "secondary"}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.dealsClosed}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCompactCurrency(agent.revenue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(0, Math.min(agent.growth, 100))}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{`${agent.growth}%`}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
