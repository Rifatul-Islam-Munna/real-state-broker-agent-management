import { buildPageMetadata } from "@/lib/build-page-metadata"
import { LeadOutreachSchedulePage } from "@/components/stitch/pages/lead-history/lead-outreach-schedule-page"

export const metadata = buildPageMetadata({
  title: "Lead Schedule | EstateBlue",
  description: "Scheduled calls, SMS, and email follow-up timeline for leads.",
  routePath: "/admin/lead-schedule",
})

export default function Page() {
  return <LeadOutreachSchedulePage />
}
