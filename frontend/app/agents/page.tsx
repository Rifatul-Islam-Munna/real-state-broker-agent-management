import { buildPageMetadata } from "@/lib/build-page-metadata"
import { PublicAgentsApiPage } from "@/components/stitch/pages/admin-api/public-agents-api-page"
import { publicAgentsPageMeta } from "@/data/page-metadata/public"

export const metadata = buildPageMetadata(publicAgentsPageMeta)

export default function Page() {
  return <PublicAgentsApiPage />
}
