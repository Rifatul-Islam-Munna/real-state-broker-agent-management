"use client"

import { usePathname } from "next/navigation"

import { useDashboardSummary, usePortalCurrentUser } from "@/hooks/use-real-estate-api"

import { MainContentSection } from "./sections"

type AdminDashboardPageProps = {
  currentUserName?: string
  errorMessage?: string | null
  isLoading?: boolean
  portal?: "admin" | "agent"
  summary?: import("@/@types/real-estate-api").DashboardSummary | null
}

export function AdminDashboardPage({
  currentUserName,
  errorMessage,
  isLoading,
  portal,
  summary,
}: AdminDashboardPageProps) {
  const pathname = usePathname()
  const dashboardSummaryQuery = useDashboardSummary()
  const currentUserQuery = usePortalCurrentUser()
  const resolvedPortal = portal ?? (pathname.startsWith("/agent") ? "agent" : "admin")
  const resolvedSummary = summary ?? dashboardSummaryQuery.data
  const resolvedLoading =
    isLoading ??
    (!dashboardSummaryQuery.data &&
      (dashboardSummaryQuery.isLoading || dashboardSummaryQuery.isFetching))
  const resolvedError =
    errorMessage ??
    dashboardSummaryQuery.error?.message ??
    currentUserQuery.error?.message ??
    null
  const resolvedUserName =
    currentUserName ??
    currentUserQuery.data?.fullName ??
    "Account"

  return (
    <div className="bg-slate-100 dark:bg-background-dark">
      <MainContentSection
        currentUserName={resolvedUserName}
        errorMessage={resolvedError}
        isLoading={resolvedLoading}
        portal={resolvedPortal}
        summary={resolvedSummary}
      />
    </div>
  )
}
