const adminPortalRoutes = {
  kind: "admin",
  dashboard: "/admin/dashboard",
  deals: "/admin/deal-pipeline-reports",
  leads: "/admin/lead-crm-pipeline",
  leadHistory: "/admin/lead-history",
  mail: "/admin/mail-inbox",
  properties: "/admin/property-management",
  settings: "/admin/agency-settings",
} as const

const agentPortalRoutes = {
  kind: "agent",
  dashboard: "/agent/dashboard",
  deals: "/agent/deal-pipeline",
  leads: "/agent/lead",
  leadHistory: "/agent/lead?view=history",
  mail: "/agent/mail",
  properties: "/agent/properties",
  settings: "/agent/settings",
} as const

export function getPortalRoutes(pathname?: string | null) {
  if (pathname?.startsWith("/agent")) {
    return agentPortalRoutes
  }

  return adminPortalRoutes
}
