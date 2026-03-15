import { AgentTeamManagementPage } from "@/components/stitch/pages/agent-team-management/page"
import { agentTeamManagementPageMeta } from "@/static-data/pages/agent-team-management/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(agentTeamManagementPageMeta)

export default function Page() {
  return <AgentTeamManagementPage />
}
