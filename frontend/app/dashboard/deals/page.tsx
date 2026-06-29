import { DealPipelineReportsPage } from "@/components/stitch/pages/deal-pipeline-reports/page"
import { dealPipelineReportsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...dealPipelineReportsPageMeta,
  routePath: "/dashboard/deals",
})

export default async function Page() {
  await requireDashboardAccess("deal-pipeline")
  return <DealPipelineReportsPage />
}
