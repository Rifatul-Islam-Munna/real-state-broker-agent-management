import { PublicHomeApiPage } from "@/components/stitch/pages/admin-api/public-home-api-page"
import { publicAgencyHomepagePageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(publicAgencyHomepagePageMeta)

export default function Page() {
  return <PublicHomeApiPage />
}
