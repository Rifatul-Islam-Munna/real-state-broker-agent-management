const adminPortalRoutes = {
  kind: "admin",
  dashboard: "/dashboard",
  deals: "/dashboard/deals",
  leads: "/dashboard/leads",
  leadHistory: "/dashboard/lead-history",
  mail: "/dashboard/mail",
  properties: "/dashboard/properties",
  settings: "/dashboard/settings",
} as const

const agentPortalRoutes = {
  kind: "agent",
  dashboard: "/dashboard",
  deals: "/dashboard/deals",
  leads: "/dashboard/leads",
  leadHistory: "/dashboard/lead-history",
  mail: "/dashboard/mail",
  properties: "/dashboard/properties",
  settings: "/dashboard/settings",
} as const

export function getPortalRoutes(pathname?: string | null) {
  if (pathname?.startsWith("/dashboard")) {
    return agentPortalRoutes
  }

  return adminPortalRoutes
}
