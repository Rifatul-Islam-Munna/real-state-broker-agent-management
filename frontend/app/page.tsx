import { PublicAgencyHomepagePage } from "@/components/stitch/pages/public-agency-homepage/page"
import { publicAgencyHomepagePageMeta } from "@/static-data/pages/public-agency-homepage/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(publicAgencyHomepagePageMeta)

export default function Page() {
  return <PublicAgencyHomepagePage />
}
