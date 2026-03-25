import { LeadCrmPipelinePage } from "@/components/stitch/pages/lead-crm-pipeline/page"
import { leadCrmPipelinePageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(leadCrmPipelinePageMeta)

export default function Page() {
  return <LeadCrmPipelinePage />
}
