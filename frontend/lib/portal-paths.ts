import { type AgentRoutePermission, getDefaultAgentRoute, hasAgentRoutePermission } from "@/lib/agent-route-access"

type PortalUserLike = {
  role: string
  agentRoutePermissions?: string[]
}

export function getPortalPathByRole(role: string, agentRoutePermissions?: string[]) {
  return role === "Agent" ? getDefaultAgentRoute(agentRoutePermissions) : "/admin/dashboard"
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

  if (role === "Agent" && normalized.startsWith("/admin")) {
    return getPortalPathByRole(role, agentRoutePermissions)
  }

  if (role === "Agent" && normalized.startsWith("/agent")) {
    const requiredPermission = normalized.replace(/^\/agent\/?/, "").split("/")[0] as AgentRoutePermission

    if (!hasAgentRoutePermission(agentRoutePermissions, requiredPermission)) {
      return getPortalPathByRole(role, agentRoutePermissions)
    }
  }

  return normalized
}
