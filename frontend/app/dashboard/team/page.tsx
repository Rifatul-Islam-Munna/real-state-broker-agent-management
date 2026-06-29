import { AgentTeamManagementPage } from "@/components/stitch/pages/agent-team-management/page"
import { agentTeamManagementPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...agentTeamManagementPageMeta,
  routePath: "/dashboard/team",
})

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <AgentTeamManagementPage />
}
