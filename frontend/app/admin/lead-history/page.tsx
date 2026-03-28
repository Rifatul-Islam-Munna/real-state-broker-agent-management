import { LeadHistoryPage } from "@/components/stitch/pages/lead-history/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Lead History | Admin CRM",
  description: "Unified history timeline for lead calls, SMS, email, chat, and manual notes.",
  routePath: "/admin/lead-history",
})

export default function Page() {
  return <LeadHistoryPage />
}
