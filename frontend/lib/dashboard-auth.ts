import { redirect } from "next/navigation"

import { type AgentRoutePermission } from "@/lib/agent-route-access"
import { requireSession } from "@/lib/auth-actions"
import { getDashboardHomePath } from "@/lib/dashboard-routes"

export async function requireDashboardAccess(permission?: AgentRoutePermission, adminOnly = false) {
  const user = await requireSession(["Admin", "Agent"])

  const tenantOwner = user.role === "Agent" && user.agentRoutePermissions.includes("tenant-isolated")

  if (adminOnly && user.role !== "Admin" && !tenantOwner) {
    redirect(getDashboardHomePath(user.role, user.agentRoutePermissions))
  }

  if (user.role === "Agent" && permission) {
    await requireSession(["Admin", "Agent"], permission)
  }

  return user
}
