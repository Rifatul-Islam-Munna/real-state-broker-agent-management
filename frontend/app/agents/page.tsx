import { buildPageMetadata } from "@/lib/build-page-metadata"
import { PublicAgentsPage } from "@/components/stitch/pages/public-agents/page"
import { publicAgentsPageMeta } from "@/static-data/pages/public-agents/meta"

export const metadata = buildPageMetadata(publicAgentsPageMeta)

export default function Page() {
  return <PublicAgentsPage />
}
