import { buildPageMetadata } from "@/lib/build-page-metadata"
import { PublicContactUsPage } from "@/components/stitch/pages/public-contact-us/page"
import { publicContactUsPageMeta } from "@/static-data/pages/public-contact-us/meta"

export const metadata = buildPageMetadata(publicContactUsPageMeta)

export default function Page() {
  return <PublicContactUsPage />
}
