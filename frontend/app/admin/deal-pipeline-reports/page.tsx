import { DealPipelineReportsPage } from "@/components/stitch/pages/deal-pipeline-reports/page"
import { dealPipelineReportsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(dealPipelineReportsPageMeta)

export default function Page() {
  return <DealPipelineReportsPage />
}
