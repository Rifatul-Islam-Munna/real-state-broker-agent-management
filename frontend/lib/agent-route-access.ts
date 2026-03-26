export const agentRouteAccessItems = [
  {
    description: "Overview metrics, recent activity, and quick portal snapshots.",
    href: "/agent/dashboard",
    icon: "dashboard",
    label: "Dashboard",
    permission: "dashboard",
  },
  {
    description: "Assigned property inventory, listing updates, and availability work.",
    href: "/agent/properties",
    icon: "domain",
    label: "Property",
    permission: "properties",
  },
  {
    description: "Deal stages, negotiation progress, and pipeline tracking.",
    href: "/agent/deal-pipeline",
    icon: "partner_exchange",
    label: "Deal Pipeline",
    permission: "deal-pipeline",
  },
  {
    description: "Lead follow-up, qualification, and conversion tasks.",
    href: "/agent/lead",
    icon: "group",
    label: "Lead",
    permission: "lead",
  },
  {
    description: "Customer messages, inbox management, and email workflow.",
    href: "/agent/mail",
    icon: "mail",
    label: "Mail",
    permission: "mail",
  },
  {
    description: "Agent account preferences and personal portal settings.",
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
