import { AgentSettingsPage } from "@/components/stitch/pages/agent-settings/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Settings | EstateBlue",
  description: "Basic agent settings for profile details, alerts, and account preferences.",
  routePath: "/agent/settings",
})

export default function Page() {
  return <AgentSettingsPage />
}
