/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { formatCompactCurrency, formatRelativeTimeLabel } from "@/lib/admin-portal"
import type { DashboardSummary } from "@/@types/real-estate-api"

type MainContentSectionProps = {
  currentUserName: string
  errorMessage?: string | null
  isLoading?: boolean
  portal: "admin" | "agent"
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

function formatDeltaLabel(value: number, suffix: string) {
  if (value > 0) {
    return `+${value}% ${suffix}`
  }

  if (value < 0) {
    return `${value}% ${suffix}`
  }

  return `0% ${suffix}`
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("") || "EB"
}

function portalLinks(portal: "admin" | "agent") {
  return portal === "admin"
    ? {
        deals: "/admin/deal-pipeline-reports",
        leads: "/admin/lead-crm-pipeline",
        team: "/admin/agent-team-management",
      }
    : {
        deals: "/agent/deal-pipeline",
        leads: "/agent/lead",
        team: "/agent/settings",
      }
}

function alertToneClasses(tone: DashboardSummary["alerts"][number]["tone"]) {
  switch (tone) {
    case "danger":
      return {
        action: "text-red-500",
        border: "border-red-100 dark:border-red-900/20",
        icon: "text-red-500",
        surface: "bg-red-50 dark:bg-red-900/10",
      }
    case "warning":
      return {
        action: "text-accent",
        border: "border-orange-100 dark:border-orange-900/20",
        icon: "text-accent",
        surface: "bg-orange-50 dark:bg-orange-900/10",
      }
    default:
      return {
        action: "text-primary",
        border: "border-sky-100 dark:border-sky-900/20",
        icon: "text-primary",
        surface: "bg-sky-50 dark:bg-sky-900/10",
      }
  }
}

function visitDateParts(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "N/A" }
  }

  return {
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
  }
}

export function MainContentSection({
  currentUserName,
  errorMessage,
  isLoading,
  portal,
  summary,
}: MainContentSectionProps) {
  const dashboard = summary ?? fallbackSummary
  const links = portalLinks(portal)
  const firstName = currentUserName.split(" ").filter(Boolean)[0] ?? "Account"
  const initials = initialsFromName(currentUserName)

  return (
    <main className="min-h-screen flex-1">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            {portal === "admin" ? "Admin Dashboard" : "Agent Dashboard"}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials}
          </div>
          <span className="max-w-48 truncate pr-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {currentUserName}
          </span>
        </div>
      </header>
      <div className="space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {`Good morning, ${firstName}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {"Here's what's happening in your agency today."}
          </p>
          {isLoading && !summary ? (
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {"Loading live dashboard data..."}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-3 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border-l-4 border-primary bg-white p-6 dark:bg-slate-900">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {"Active Listings"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {dashboard.overview.activeListings}
                </h3>
                <p className={`mt-1 text-xs font-bold ${dashboard.overview.activeListingsChange >= 0 ? "text-green-600" : "text-rose-600"}`}>
                  {formatDeltaLabel(dashboard.overview.activeListingsChange, "from last month")}
                </p>
              </div>
              <AppIcon className="text-4xl text-primary/20" name="home" />
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-secondary bg-white p-6 dark:bg-slate-900">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {"Leads this Week"}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {dashboard.overview.newLeadsThisWeek}
                </p>
                <p className="text-[10px] uppercase text-slate-400">
                  {"New"}
                </p>
              </div>
              <div className="border-x border-slate-100 text-center dark:border-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {dashboard.overview.contactedLeadsThisWeek}
                </p>
                <p className="text-[10px] uppercase text-slate-400">
                  {"Cont."}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-accent">
                  {dashboard.overview.convertedLeadsThisWeek}
                </p>
                <p className="text-[10px] uppercase text-slate-400">
                  {"Conv."}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-accent bg-white p-6 dark:bg-slate-900">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {"Deals in Progress"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {dashboard.overview.dealsInProgress}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {`${dashboard.overview.closingThisMonth} closing this month`}
                </p>
              </div>
              <AppIcon className="text-4xl text-accent/20" name="contract" />
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-slate-400 bg-white p-6 dark:bg-slate-900">
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {"Monthly Revenue"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCompactCurrency(dashboard.overview.monthlyRevenue)}
                </h3>
                <p className={`mt-1 text-xs font-bold ${dashboard.overview.monthlyRevenueChange >= 0 ? "text-green-600" : "text-rose-600"}`}>
                  {formatDeltaLabel(dashboard.overview.monthlyRevenueChange, "vs last month")}
                </p>
              </div>
              <AppIcon className="text-4xl text-slate-400/20" name="payments" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Top-Performing Agents"}
              </h2>
              <Link className="text-xs font-bold text-primary hover:underline" href={links.team}>
                {"View All"}
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-6 py-4">
                      {"Agent"}
                    </th>
                    <th className="px-6 py-4">
                      {"Status"}
                    </th>
                    <th className="px-6 py-4">
                      {"Deals Closed"}
                    </th>
                    <th className="px-6 py-4">
                      {"Revenue"}
                    </th>
                    <th className="px-6 py-4">
                      {"Growth"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dashboard.topAgents.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400" colSpan={5}>
                        {"No agent performance data is available yet."}
                      </td>
                    </tr>
                  ) : (
                    dashboard.topAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                              {agent.avatarUrl ? (
                                <img alt={agent.fullName} className="h-full w-full object-cover" src={agent.avatarUrl} />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary text-[10px] font-black text-white">
                                  {initialsFromName(agent.fullName)}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-bold">
                                {agent.fullName}
                              </span>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                                {agent.agencyName ?? "EstateBlue Team"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${agent.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {agent.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {agent.dealsClosed}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-primary">
                          {formatCompactCurrency(agent.revenue)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-1.5 w-full max-w-[80px] rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${agent.growth}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Priority Alerts"}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(dashboard.alerts.length > 0 ? dashboard.alerts : [
                  {
                    actionLabel: "Review Leads",
                    count: 0,
                    description: "No urgent lead or deal actions are pending yet.",
                    id: "empty-state",
                    target: "leads" as const,
                    title: "0 Priority Items",
                    tone: "info" as const,
                  },
                ]).map((alert) => {
                  const tone = alertToneClasses(alert.tone)
                  const href = alert.target === "deals" ? links.deals : links.leads

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-4 rounded-lg border p-4 ${tone.surface} ${tone.border}`}
                    >
                      <AppIcon className={tone.icon} name={alert.target === "deals" ? "warning" : "event_busy"} />
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {alert.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {alert.description}
                        </p>
                        <Link className={`mt-2 inline-block text-xs font-black uppercase tracking-tighter hover:underline ${tone.action}`} href={href}>
                          {alert.actionLabel}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Property Visits"}
              </h2>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {"Live"}
              </span>
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {dashboard.visits.length === 0 ? (
                <div className="p-4">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {"No property visit activity has been logged yet."}
                  </p>
                </div>
              ) : (
                dashboard.visits.map((visit) => {
                  const dateParts = visitDateParts(visit.activityAt)
                  const isCanceled = visit.status === "Canceled"

                  return (
                    <div
                      key={visit.id}
                      className={`flex gap-4 p-4 ${isCanceled ? "bg-slate-50/50 opacity-60 dark:bg-slate-800/20" : ""}`}
                    >
                      <div className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg ${isCanceled ? "bg-slate-100 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800"}`}>
                        <p className="text-[10px] font-bold uppercase leading-none text-slate-400">
                          {dateParts.month}
                        </p>
                        <p className={`mt-1 text-lg font-black leading-none ${isCanceled ? "text-slate-400" : "text-primary"}`}>
                          {dateParts.day}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-bold ${isCanceled ? "text-slate-500 line-through" : "text-slate-900 dark:text-white"}`}>
                          {visit.propertyTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {visit.timeline || formatRelativeTimeLabel(visit.activityAt)}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <AppIcon className="text-[14px] text-slate-400" name="person" />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {visit.clientName}
                          </p>
                        </div>
                        {visit.status !== "FollowUp" ? (
                          <p className={`mt-1 text-[10px] font-bold uppercase ${isCanceled ? "text-red-500" : "text-primary"}`}>
                            {visit.status}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <Link
              className="block w-full rounded-lg bg-slate-200 py-3 text-center text-xs font-bold text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              href={links.leads}
            >
              {"View Lead Pipeline"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
