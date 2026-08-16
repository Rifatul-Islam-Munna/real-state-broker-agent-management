import { LeadCrmPipelinePage } from "@/components/stitch/pages/lead-crm-pipeline/page"
import { leadCrmPipelinePageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...leadCrmPipelinePageMeta,
  routePath: "/dashboard/leads",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <LeadCrmPipelinePage />
}
