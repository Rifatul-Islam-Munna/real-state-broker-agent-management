import { LeadOutreachSchedulePage } from "@/components/stitch/pages/lead-history/lead-outreach-schedule-page"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  title: "Lead Schedule | EstateBlue",
  description: "Scheduled calls, SMS, and email follow-up timeline for leads.",
  routePath: "/dashboard/lead-schedule",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <LeadOutreachSchedulePage />
}
