"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import type { DateRange } from "react-day-picker"

import { useDashboardSummary, usePortalCurrentUser } from "@/hooks/use-real-estate-api"

import { MainContentSection } from "./sections"

type AdminDashboardPageProps = {
  currentUserName?: string
  errorMessage?: string | null
  isLoading?: boolean
  portal?: "admin" | "agent"
  summary?: import("@/@types/real-estate-api").DashboardSummary | null
}

type DashboardPeriod = "monthly" | "quarterly" | "custom"

function toApiDate(date?: Date) {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function defaultMonthlyRange(): DateRange {
  const today = new Date()
  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today,
  }
}

export function AdminDashboardPage({
  currentUserName,
  errorMessage,
  isLoading,
  portal,
  summary,
}: AdminDashboardPageProps) {
  const pathname = usePathname()
  const [period, setPeriod] = useState<DashboardPeriod>("monthly")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultMonthlyRange)

  const queryParams = useMemo(
    () => ({
      period,
      from: toApiDate(dateRange?.from),
      to: toApiDate(dateRange?.to),
    }),
    [dateRange?.from, dateRange?.to, period],
  )

  const dashboardSummaryQuery = useDashboardSummary(queryParams)
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

  function selectPeriod(nextPeriod: Exclude<DashboardPeriod, "custom">) {
    const today = new Date()
    setPeriod(nextPeriod)

    if (nextPeriod === "monthly") {
      setDateRange({
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      })
      return
    }

    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
    setDateRange({
      from: new Date(today.getFullYear(), quarterStartMonth, 1),
      to: today,
    })
  }

  function selectDateRange(nextRange: DateRange | undefined) {
    setDateRange(nextRange)
    setPeriod("custom")
  }

  return (
    <div className="min-h-full bg-[var(--ether-surface)]">
      <MainContentSection
        currentUserName={resolvedUserName}
        dateRange={dateRange}
        errorMessage={resolvedError}
        isLoading={resolvedLoading}
        onDateRangeChange={selectDateRange}
        onPeriodChange={selectPeriod}
        period={period}
        portal={resolvedPortal}
        summary={resolvedSummary}
      />
    </div>
  )
}
