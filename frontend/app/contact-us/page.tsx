import { buildPageMetadata } from "@/lib/build-page-metadata"
import { PublicContactApiPage } from "@/components/stitch/pages/admin-api/public-contact-api-page"
import { publicContactUsPageMeta } from "@/data/page-metadata/public"

export const metadata = buildPageMetadata(publicContactUsPageMeta)

export default function Page() {
  return <PublicContactApiPage />
}
