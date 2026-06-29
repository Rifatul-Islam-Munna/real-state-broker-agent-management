import { canOpenDashboardRoute, getDashboardHomePath } from "@/lib/dashboard-routes"

type PortalUserLike = {
  role: string
  agentRoutePermissions?: string[]
}

export function getPortalPathByRole(role: string, agentRoutePermissions?: string[]) {
  return getDashboardHomePath(role, agentRoutePermissions)
}

export function getPortalHomePath(user: PortalUserLike) {
  return getPortalPathByRole(user.role, user.agentRoutePermissions)
}

export async function resolvePostAuthRedirect(
  role: string,
  nextPath: string,
  agentRoutePermissions?: string[],
) {
  const normalized = nextPath.trim()

  if (
    normalized.length === 0 ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized === "/login" ||
    normalized === "/register"
  ) {
    return getPortalPathByRole(role, agentRoutePermissions)
  }

  if (normalized.startsWith("/admin") || normalized.startsWith("/agent")) {
    return getPortalPathByRole(role, agentRoutePermissions)
  }

  if (normalized.startsWith("/dashboard") && !canOpenDashboardRoute(normalized, role, agentRoutePermissions)) {
    return getPortalPathByRole(role, agentRoutePermissions)
  }

  return normalized
}
