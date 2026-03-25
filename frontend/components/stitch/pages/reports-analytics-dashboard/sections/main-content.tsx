"use client"

import { useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import {
  useAgentUsers,
  useDeals,
  useLeads,
  useProperties,
} from "@/hooks/use-real-estate-api"
import {
  formatCompactCurrency,
  formatCurrency,
  propertyHeroImage,
} from "@/lib/admin-portal"
import { formatPriceLabel, parseCurrencyValue } from "@/lib/currency"
import { cn } from "@/lib/utils"

type PerformanceMode = "inquiries" | "price"

const REPORT_WINDOW_DAYS = 30
const TREND_BUCKETS = 4
const REPORT_PAGE_SIZE = 250

function getValidDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function shiftDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function isWithinRange(value: Date | null, rangeStart: Date, rangeEnd: Date) {
  if (!value) {
    return false
  }

  return value >= rangeStart && value <= rangeEnd
}

function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

function formatPercentageLabel(value: number) {
  const normalized = Number.isFinite(value) ? value : 0
  return `${Math.abs(normalized).toFixed(1)}%`
}

function formatRangeLabel(rangeStart: Date, rangeEnd: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).formatRange(rangeStart, rangeEnd)
}

function buildCsvContent(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n")
}

export function MainContentSection() {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("inquiries")

  const dealsQuery = useDeals({ page: 1, pageSize: REPORT_PAGE_SIZE })
  const leadsQuery = useLeads({ page: 1, pageSize: REPORT_PAGE_SIZE })
  const propertiesQuery = useProperties({ page: 1, pageSize: REPORT_PAGE_SIZE })
  const agentUsersQuery = useAgentUsers()

  const isLoading =
    (!dealsQuery.data && (dealsQuery.isLoading || dealsQuery.isFetching)) ||
    (!leadsQuery.data && (leadsQuery.isLoading || leadsQuery.isFetching)) ||
    (!propertiesQuery.data && (propertiesQuery.isLoading || propertiesQuery.isFetching)) ||
    (!agentUsersQuery.data && (agentUsersQuery.isLoading || agentUsersQuery.isFetching))

  const errorMessage =
    dealsQuery.error?.message ||
    leadsQuery.error?.message ||
    propertiesQuery.error?.message ||
    agentUsersQuery.error?.message ||
    null

  const reportData = useMemo(() => {
    const deals = dealsQuery.data?.items ?? []
    const leads = leadsQuery.data?.items ?? []
    const properties = propertiesQuery.data?.items ?? []
    const agents = agentUsersQuery.data ?? []

    const now = new Date()
    const rangeEnd = now
    const rangeStart = startOfDay(shiftDays(now, -(REPORT_WINDOW_DAYS - 1)))
    const previousRangeEnd = shiftDays(rangeStart, -1)
    const previousRangeStart = startOfDay(shiftDays(rangeStart, -REPORT_WINDOW_DAYS))

    const completedDeals = deals.filter((deal) => deal.stage === "Completed")
    const currentDeals = completedDeals.filter((deal) =>
      isWithinRange(getValidDate(deal.updatedAt ?? deal.createdAt), rangeStart, rangeEnd),
    )
    const previousDeals = completedDeals.filter((deal) =>
      isWithinRange(getValidDate(deal.updatedAt ?? deal.createdAt), previousRangeStart, previousRangeEnd),
    )

    const leadsInWindow = leads.filter((lead) =>
      isWithinRange(getValidDate(lead.createdAt), rangeStart, rangeEnd),
    )
    const previousLeads = leads.filter((lead) =>
      isWithinRange(getValidDate(lead.createdAt), previousRangeStart, previousRangeEnd),
    )

    const currentRevenue = currentDeals.reduce((sum, deal) => sum + deal.value, 0)
    const previousRevenue = previousDeals.reduce((sum, deal) => sum + deal.value, 0)
    const averageDealValue = currentDeals.length > 0 ? currentRevenue / currentDeals.length : 0
    const previousAverageDealValue =
      previousDeals.length > 0
        ? previousRevenue / previousDeals.length
        : 0

    const convertedLeads = leadsInWindow.filter(
      (lead) => lead.stage === "Deal" || Boolean(lead.linkedDealId),
    ).length
    const previousConvertedLeads = previousLeads.filter(
      (lead) => lead.stage === "Deal" || Boolean(lead.linkedDealId),
    ).length

    const currentConversionRate =
      leadsInWindow.length > 0 ? (convertedLeads / leadsInWindow.length) * 100 : 0
    const previousConversionRate =
      previousLeads.length > 0 ? (previousConvertedLeads / previousLeads.length) * 100 : 0

    const stats = [
      {
        change: calculatePercentageChange(currentRevenue, previousRevenue),
        label: "Total Revenue",
        value: formatCurrency(currentRevenue),
      },
      {
        change: calculatePercentageChange(currentDeals.length, previousDeals.length),
        label: "Deals Closed",
        value: `${currentDeals.length}`,
      },
      {
        change: calculatePercentageChange(averageDealValue, previousAverageDealValue),
        label: "Avg Deal Value",
        value: formatCurrency(averageDealValue),
      },
      {
        change: currentConversionRate - previousConversionRate,
        label: "Lead Conv. Rate",
        value: `${currentConversionRate.toFixed(1)}%`,
      },
    ] as const

    const bucketSize = Math.ceil(REPORT_WINDOW_DAYS / TREND_BUCKETS)
    const revenueTrend = Array.from({ length: TREND_BUCKETS }, (_, index) => {
      const bucketStart = startOfDay(shiftDays(rangeStart, index * bucketSize))
      const bucketEnd = index === TREND_BUCKETS - 1 ? rangeEnd : shiftDays(bucketStart, bucketSize - 1)
      const bucketDeals = currentDeals.filter((deal) =>
        isWithinRange(getValidDate(deal.updatedAt ?? deal.createdAt), bucketStart, bucketEnd),
      )
      const residentialRevenue = bucketDeals
        .filter((deal) => deal.type === "Residential")
        .reduce((sum, deal) => sum + deal.value, 0)
      const commercialRevenue = bucketDeals
        .filter((deal) => deal.type !== "Residential")
        .reduce((sum, deal) => sum + deal.value, 0)

      return {
        commercialRevenue,
        label: formatRangeLabel(bucketStart, bucketEnd),
        residentialRevenue,
        totalRevenue: residentialRevenue + commercialRevenue,
      }
    })

    const maxTrendValue = Math.max(
      ...revenueTrend.map((item) => item.totalRevenue),
      1,
    )

    const agentPerformance = agents
      .map((agent) => {
        const agentDeals = currentDeals.filter((deal) => deal.agent === agent.fullName)
        const assignedLeads = leads.filter((lead) => lead.agent === agent.fullName)
        const listings = properties.filter(
          (property) => property.agent?.fullName === agent.fullName,
        ).length
        const contribution = agentDeals.reduce((sum, deal) => sum + deal.value, 0)

        return {
          contribution,
          conversionRate:
            assignedLeads.length > 0 ? (agentDeals.length / assignedLeads.length) * 100 : 0,
          fullName: agent.fullName,
          listings,
          closedDeals: agentDeals.length,
        }
      })
      .sort((left, right) => right.contribution - left.contribution || right.closedDeals - left.closedDeals)

    const leadSourceMap = new Map<string, number>()
    leadsInWindow.forEach((lead) => {
      const source = lead.source?.trim() || "Unknown"
      leadSourceMap.set(source, (leadSourceMap.get(source) ?? 0) + 1)
    })

    const leadSources = Array.from(leadSourceMap.entries())
      .map(([label, count]) => ({
        count,
        label,
        percentage: leadsInWindow.length > 0 ? (count / leadsInWindow.length) * 100 : 0,
      }))
      .sort((left, right) => right.count - left.count)

    const inquiryCounts = new Map<string, number>()
    leadsInWindow.forEach((lead) => {
      const propertyTitle = lead.property?.trim()
      if (!propertyTitle) {
        return
      }

      inquiryCounts.set(propertyTitle, (inquiryCounts.get(propertyTitle) ?? 0) + 1)
    })

    const propertyPerformance = properties.map((property) => ({
      id: property.id,
      imageSrc: propertyHeroImage(property),
      inquiries: inquiryCounts.get(property.title) ?? 0,
      location: property.location,
      price: parseCurrencyValue(property.price),
      priceLabel: formatPriceLabel(property.price),
      status: property.status,
      title: property.title,
    }))

    const topProperties =
      performanceMode === "price"
        ? [...propertyPerformance].sort((left, right) => right.price - left.price).slice(0, 3)
        : [...propertyPerformance].sort((left, right) => right.inquiries - left.inquiries || right.price - left.price).slice(0, 3)

    return {
      agentPerformance,
      currentDeals,
      currentRevenue,
      leadSources,
      maxTrendValue,
      rangeLabel: formatRangeLabel(rangeStart, rangeEnd),
      revenueTrend,
      stats,
      topProperties,
    }
  }, [
    agentUsersQuery.data,
    dealsQuery.data?.items,
    leadsQuery.data?.items,
    performanceMode,
    propertiesQuery.data?.items,
  ])

  function handleExportCsv() {
    if (typeof window === "undefined") {
      return
    }

    const rows = [
      ["Metric", "Value"],
      ...reportData.stats.map((stat) => [stat.label, stat.value]),
      [""],
      ["Agent", "Listings", "Closed Deals", "Conversion Rate", "Contribution"],
      ...reportData.agentPerformance.map((agent) => [
        agent.fullName,
        `${agent.listings}`,
        `${agent.closedDeals}`,
        `${agent.conversionRate.toFixed(1)}%`,
        formatCurrency(agent.contribution),
      ]),
      [""],
      ["Lead Source", "Count", "Percentage"],
      ...reportData.leadSources.map((source) => [
        source.label,
        `${source.count}`,
        `${source.percentage.toFixed(1)}%`,
      ]),
    ]

    const file = new Blob([buildCsvContent(rows)], { type: "text/csv;charset=utf-8" })
    const url = window.URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = "estateblue-reports.csv"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  function handlePrintReport() {
    if (typeof window === "undefined") {
      return
    }

    window.print()
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-border-color bg-surface-light px-8 py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-bold tracking-tight">{"Reports & Analytics"}</h2>
            <div className="hidden h-6 w-px bg-border-color sm:block" />
            <div className="inline-flex items-center gap-2 border border-border-color px-3 py-2 text-sm font-medium">
              <AppIcon className="text-sm" name="calendar_today" />
              <span>{reportData.rangeLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="bg-accent px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={isLoading} onClick={handlePrintReport} type="button">
              <span className="flex items-center gap-2">
                <AppIcon className="text-sm" name="picture_as_pdf" />
                {"Export PDF Report"}
              </span>
            </button>
            <button className="bg-accent px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={isLoading} onClick={handleExportCsv} type="button">
              <span className="flex items-center gap-2">
                <AppIcon className="text-sm" name="download" />
                {"Export CSV Data"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-8 overflow-y-auto p-8">
        {errorMessage ? (
          <div className="border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reportData.stats.map((stat) => {
            const isPositive = stat.change >= 0

            return (
              <article key={stat.label} className="border border-border-color bg-surface-light p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                  {stat.label}
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <h3 className="text-3xl font-bold text-primary">{stat.value}</h3>
                  <span
                    className={cn(
                      "flex items-center text-sm font-bold",
                      isPositive ? "text-green-600" : "text-rose-500",
                    )}
                  >
                    <AppIcon className="text-sm" name={isPositive ? "arrow_upward" : "arrow_downward"} />
                    {` ${formatPercentageLabel(stat.change)} `}
                  </span>
                </div>
              </article>
            )
          })}
        </section>

        <section className="border border-border-color bg-surface-light p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold">{"Sales Performance (Revenue Trends)"}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {"Completed deal revenue grouped into rolling weekly buckets from the selected report window."}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="size-3 bg-primary" />
                <span className="text-xs font-medium">{"Residential"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 bg-secondary" />
                <span className="text-xs font-medium">{"Commercial / Other"}</span>
              </div>
            </div>
          </div>
          <div className="grid h-72 grid-cols-2 items-end gap-x-4 gap-y-6 border-b border-slate-200 pb-6 sm:grid-cols-4">
            {reportData.revenueTrend.map((bucket) => {
              const residentialHeight = Math.max((bucket.residentialRevenue / reportData.maxTrendValue) * 100, bucket.totalRevenue > 0 ? 10 : 0)
              const commercialHeight = Math.max((bucket.commercialRevenue / reportData.maxTrendValue) * 100, bucket.commercialRevenue > 0 ? 8 : 0)

              return (
                <div key={bucket.label} className="flex h-full flex-col justify-end gap-3">
                  <div className="flex h-full items-end gap-2">
                    <div className="flex-1 bg-secondary/35" style={{ height: `${commercialHeight}%` }} />
                    <div className="flex-1 bg-primary" style={{ height: `${residentialHeight}%` }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{bucket.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {formatCompactCurrency(bucket.totalRevenue)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 border border-border-color bg-surface-light dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-border-color p-6 dark:border-slate-800">
              <h3 className="text-lg font-bold">{"Agent Performance"}</h3>
            </div>
            {reportData.agentPerformance.length === 0 ? (
              <div className="p-6 text-sm font-semibold text-slate-500">
                {"No agent activity is available yet for the current reporting window."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4">{"Agent Name"}</th>
                      <th className="px-6 py-4 text-center">{"Listings"}</th>
                      <th className="px-6 py-4 text-center">{"Closed"}</th>
                      <th className="px-6 py-4 text-center">{"Conv. Rate"}</th>
                      <th className="px-6 py-4 text-right">{"Contribution"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color text-sm dark:divide-slate-800">
                    {reportData.agentPerformance.slice(0, 8).map((agent) => (
                      <tr key={agent.fullName} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="px-6 py-4 font-medium">{agent.fullName}</td>
                        <td className="px-6 py-4 text-center">{agent.listings}</td>
                        <td className="px-6 py-4 text-center">{agent.closedDeals}</td>
                        <td className="px-6 py-4 text-center">{`${agent.conversionRate.toFixed(1)}%`}</td>
                        <td className="px-6 py-4 text-right font-bold text-primary">
                          {formatCurrency(agent.contribution)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="border border-border-color bg-surface-light p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-6 text-lg font-bold">{"Lead Source Distribution"}</h3>
            {reportData.leadSources.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">
                {"No leads were created during the current reporting window."}
              </p>
            ) : (
              <div className="space-y-6">
                {reportData.leadSources.slice(0, 5).map((source, index) => (
                  <div key={source.label}>
                    <div className="mb-2 flex justify-between text-xs font-bold uppercase">
                      <span>{source.label}</span>
                      <span>{`${source.percentage.toFixed(1)}%`}</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full",
                          index === 0
                            ? "bg-primary"
                            : index === 1
                              ? "bg-secondary"
                              : index === 2
                                ? "bg-accent"
                                : "bg-slate-400",
                        )}
                        style={{ width: `${Math.max(source.percentage, source.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="border border-border-color bg-surface-light dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-border-color p-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold">{"Top Performing Properties"}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {"Driven by live property records and lead activity from the current reporting window."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                aria-pressed={performanceMode === "inquiries"}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase transition-colors",
                  performanceMode === "inquiries"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                )}
                onClick={() => setPerformanceMode("inquiries")}
                type="button"
              >
                {"By Inquiries"}
              </button>
              <button
                aria-pressed={performanceMode === "price"}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase transition-colors",
                  performanceMode === "price"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                )}
                onClick={() => setPerformanceMode("price")}
                type="button"
              >
                {"By Price"}
              </button>
            </div>
          </div>
          {reportData.topProperties.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-slate-500">
              {"No property data is available yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 divide-border-color md:grid-cols-3 md:divide-x dark:divide-slate-800">
              {reportData.topProperties.map((property) => (
                <div key={property.id} className="flex gap-4 p-6">
                  <div
                    className="size-20 shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${property.imageSrc}')` }}
                  />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">{property.title}</h4>
                    <p className="mb-2 text-xs text-slate-500">{property.location}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <AppIcon className="text-sm" name="chat_bubble" />
                        {`${property.inquiries} inquiries`}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <AppIcon className="text-sm" name="sell" />
                        {property.priceLabel}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <AppIcon className="text-sm" name={property.status === "Open" ? "verified" : "inventory_2"} />
                        {property.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
