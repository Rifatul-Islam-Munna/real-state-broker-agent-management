export type DashboardPortal = "admin" | "agent"

export function formatDeltaLabel(value: number, suffix: string) {
  if (value > 0) return `+${value}% ${suffix}`
  if (value < 0) return `${value}% ${suffix}`
  return `0% ${suffix}`
}

export function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? "")
      .join("") || "EB"
  )
}

export function dashboardLinks(portal: DashboardPortal) {
  return portal === "admin"
    ? {
        deals: "/dashboard/deals",
        leads: "/dashboard/leads",
        team: "/dashboard/team",
      }
    : {
        deals: "/dashboard/deals",
        leads: "/dashboard/leads",
        team: "/dashboard",
      }
}

export function visitDateParts(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "N/A" }
  }

  return {
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
  }
}
