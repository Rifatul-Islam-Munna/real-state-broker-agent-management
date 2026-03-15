import { LeadCrmPipelinePage } from "@/components/stitch/pages/lead-crm-pipeline/page"
import { leadCrmPipelinePageMeta } from "@/static-data/pages/lead-crm-pipeline/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(leadCrmPipelinePageMeta)

export default function Page() {
  return <LeadCrmPipelinePage />
}
