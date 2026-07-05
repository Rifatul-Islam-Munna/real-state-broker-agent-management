"use client"

import { AdminDashboardPage } from "@/components/stitch/pages/admin-dashboard/page"

type DashboardApiPageProps = {
  currentUserName: string
  portal: "admin" | "agent"
}

export function DashboardApiPage({ currentUserName, portal }: DashboardApiPageProps) {
  return (
    <div>
      {portal === "admin" ? (
        <div className="border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Property Operations dashboard</p>
              <p className="text-sm text-muted-foreground">
                Manage units, residents, maintenance, billing, vendors and workflows.
              </p>
            </div>
            <a
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              href="/dashboard/property-operations"
            >
              Open Property Operations
            </a>
          </div>
        </div>
      ) : null}

      <AdminDashboardPage
        currentUserName={currentUserName}
        portal={portal}
      />
    </div>
  )
}
