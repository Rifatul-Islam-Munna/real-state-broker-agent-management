export const agentRouteAccessItems = [
  {
    href: "/agent/dashboard",
    icon: "dashboard",
    label: "Dashboard",
    permission: "dashboard",
  },
  {
    href: "/agent/properties",
    icon: "domain",
    label: "Property",
    permission: "properties",
  },
  {
    href: "/agent/deal-pipeline",
    icon: "partner_exchange",
    label: "Deal Pipeline",
    permission: "deal-pipeline",
  },
  {
    href: "/agent/lead",
    icon: "group",
    label: "Lead",
    permission: "lead",
  },
  {
    href: "/agent/mail",
    icon: "mail",
    label: "Mail",
    permission: "mail",
  },
  {
    href: "/agent/settings",
    icon: "settings",
    label: "Settings",
    permission: "settings",
  },
] as const

export type AgentRoutePermission = (typeof agentRouteAccessItems)[number]["permission"]

const allAgentRoutePermissions = agentRouteAccessItems.map((item) => item.permission)

export function normalizeAgentRoutePermissions(permissions?: string[] | null): AgentRoutePermission[] {
  return Array.from(
    new Set(
      (permissions ?? []).filter((item): item is AgentRoutePermission =>
        allAgentRoutePermissions.includes(item as AgentRoutePermission),
      ),
    ),
  )
}

export function hasAgentRoutePermission(
  permissions: string[] | null | undefined,
  requiredPermission: AgentRoutePermission,
) {
  return normalizeAgentRoutePermissions(permissions).includes(requiredPermission)
}

export function getAccessibleAgentNavigation(permissions?: string[] | null) {
  const allowedPermissions = new Set(normalizeAgentRoutePermissions(permissions))
  return agentRouteAccessItems.filter((item) => allowedPermissions.has(item.permission))
}

export function getDefaultAgentRoute(permissions?: string[] | null) {
  return getAccessibleAgentNavigation(permissions)[0]?.href ?? "/login"
}
