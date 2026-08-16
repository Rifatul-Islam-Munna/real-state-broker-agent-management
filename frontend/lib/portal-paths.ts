import { canOpenDashboardRoute, getDashboardHomePath } from "@/lib/dashboard-routes"

type PortalUserLike = {
  role: string
  tenantId?: number | null
  agentRoutePermissions?: string[]
}

export function getPortalPathByRole(role: string, agentRoutePermissions?: string[], tenantId?: number | null) {
  if (role === "Admin") return "/super-admin"
  if (role === "Agent" && tenantId) return "/account"
  return getDashboardHomePath(role, agentRoutePermissions)
}

export function getPortalHomePath(user: PortalUserLike) {
  return getPortalPathByRole(user.role, user.agentRoutePermissions, user.tenantId)
}

export async function resolvePostAuthRedirect(
  role: string,
  nextPath: string,
  agentRoutePermissions?: string[],
  tenantId?: number | null,
) {
  const normalized = nextPath.trim()

  if (
    normalized.length === 0 ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized === "/login" ||
    normalized === "/register"
  ) {
    return getPortalPathByRole(role, agentRoutePermissions, tenantId)
  }

  if (
    normalized.startsWith("/admin") ||
    normalized.startsWith("/agent") ||
    normalized.startsWith("/super-admin")
  ) {
    return getPortalPathByRole(role, agentRoutePermissions, tenantId)
  }

  if (normalized.startsWith("/dashboard") && (Boolean(tenantId) || !canOpenDashboardRoute(normalized, role, agentRoutePermissions))) {
    return getPortalPathByRole(role, agentRoutePermissions, tenantId)
  }

  return normalized
}

