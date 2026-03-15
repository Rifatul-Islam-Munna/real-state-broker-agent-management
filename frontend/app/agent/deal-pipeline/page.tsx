import { DealPipelineReportsPage } from "@/components/stitch/pages/deal-pipeline-reports/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Deal Pipeline | EstateBlue",
  description: "Agent deal pipeline for tracking active offers, contracts, and closings.",
  routePath: "/agent/deal-pipeline",
})

export default function Page() {
  return <DealPipelineReportsPage />
}
