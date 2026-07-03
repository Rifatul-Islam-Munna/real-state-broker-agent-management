import { LeadHistoryPageV2 } from "@/components/stitch/pages/lead-history/page-v2"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  title: "Lead History | CRM",
  description: "Unified history timeline for lead calls, SMS, email, chat, and manual notes.",
  routePath: "/dashboard/lead-history",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <LeadHistoryPageV2 />
}
