import { redirect } from "next/navigation"

import { type AgentRoutePermission } from "@/lib/agent-route-access"
import { requireSession } from "@/lib/auth-actions"
import { getDashboardHomePath } from "@/lib/dashboard-routes"

export async function requireDashboardAccess(permission?: AgentRoutePermission, adminOnly = false) {
  const user = await requireSession(["Admin", "Agent"])

  if (adminOnly && user.role !== "Admin") {
    redirect(getDashboardHomePath(user.role, user.agentRoutePermissions))
  }

  if (user.role === "Agent" && permission) {
    await requireSession(["Admin", "Agent"], permission)
  }

  return user
}
