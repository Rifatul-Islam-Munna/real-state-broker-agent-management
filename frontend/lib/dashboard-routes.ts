import { type AgentRoutePermission, hasAgentRoutePermission } from "@/lib/agent-route-access"

export type DashboardRoute = {
  href: string
  label: string
  icon: string
  permission?: AgentRoutePermission
  adminOnly?: boolean
}

export const dashboardRoutes: readonly DashboardRoute[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard" },
  { href: "/dashboard/homepage", label: "Homepage", icon: "home", adminOnly: true },
  { href: "/dashboard/properties", label: "Properties", icon: "domain", permission: "properties" },
  { href: "/dashboard/blog", label: "Blog", icon: "article", adminOnly: true },
  { href: "/dashboard/deals", label: "Deal Pipeline", icon: "partner_exchange", permission: "deal-pipeline" },
  { href: "/dashboard/leads", label: "Lead CRM", icon: "group", permission: "lead" },
  { href: "/dashboard/lead-history", label: "Lead History", icon: "history", permission: "lead" },
  { href: "/dashboard/lead-schedule", label: "Lead Activity", icon: "event_note", permission: "lead" },
  { href: "/dashboard/lead-collection-templates", label: "Lead Templates", icon: "document_scanner", permission: "mail" },
  { href: "/dashboard/realtor-showings", label: "Realtor Showings", icon: "real_estate_agent", permission: "lead" },
  { href: "/dashboard/showing-feedback", label: "Feedback Registry", icon: "rate_review", adminOnly: true },
  { href: "/dashboard/showing-feedback-automation", label: "Feedback Automation", icon: "schedule_send", adminOnly: true },
  { href: "/dashboard/contact-inbox", label: "Contact Us", icon: "contact_phone", permission: "lead" },
  { href: "/dashboard/property-chat-inbox", label: "Property Chat", icon: "textsms", permission: "lead" },
  { href: "/dashboard/text-messages", label: "Text Messages", icon: "sms", permission: "lead" },
  { href: "/dashboard/mail", label: "Mail", icon: "mail", permission: "mail" },
  { href: "/dashboard/marketing", label: "Marketing", icon: "campaign", adminOnly: true },
  { href: "/dashboard/documents", label: "Documents", icon: "description", adminOnly: true },
  { href: "/dashboard/pdfs", label: "PDFs", icon: "picture_as_pdf", adminOnly: true },
  { href: "/dashboard/team", label: "Teams", icon: "badge", adminOnly: true },
  { href: "/dashboard/reports", label: "Reports", icon: "trending_up", permission: "dashboard" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", adminOnly: true },
] as const

export function getDashboardRoutesForUser(role: string, permissions?: string[] | null) {
  if (role === "Admin") return [...dashboardRoutes]
  if (role !== "Agent") return []

  return dashboardRoutes.filter((route) => {
    if (route.adminOnly) return false
    if (!route.permission) return true
    return hasAgentRoutePermission(permissions, route.permission)
  })
}

export function getDashboardHomePath(role: string, permissions?: string[] | null) {
  return getDashboardRoutesForUser(role, permissions)[0]?.href ?? "/login"
}

export function canOpenDashboardRoute(
  pathname: string,
  role: string,
  permissions?: string[] | null,
) {
  if (role === "Admin") return true
  if (role !== "Agent") return false

  const match = [...dashboardRoutes]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`))

  if (!match || match.adminOnly) return false
  return !match.permission || hasAgentRoutePermission(permissions, match.permission)
}
