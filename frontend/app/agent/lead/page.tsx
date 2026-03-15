import { LeadCrmPipelinePage } from "@/components/stitch/pages/lead-crm-pipeline/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Lead CRM | EstateBlue",
  description: "Agent lead board and lead list for follow-up, outreach, and deal conversion.",
  routePath: "/agent/lead",
})

export default function Page() {
  return <LeadCrmPipelinePage />
}
