import { LeadOutreachSchedulePage } from "@/components/stitch/pages/lead-history/lead-outreach-schedule-page"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  title: "Lead Activity | EstateBlue",
  description: "Table of sent, scheduled, failed, and received email, SMS, and call activity for leads.",
  routePath: "/dashboard/lead-schedule",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <LeadOutreachSchedulePage />
}
