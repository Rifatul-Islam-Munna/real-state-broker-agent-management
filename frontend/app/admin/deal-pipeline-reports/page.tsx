import { DealPipelineReportsPage } from "@/components/stitch/pages/deal-pipeline-reports/page"
import { dealPipelineReportsPageMeta } from "@/static-data/pages/deal-pipeline-reports/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(dealPipelineReportsPageMeta)

export default function Page() {
  return <DealPipelineReportsPage />
}
