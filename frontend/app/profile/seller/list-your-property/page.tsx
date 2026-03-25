import { SellerListYourPropertyPage } from "@/components/stitch/pages/seller-list-your-property/page"
import { sellerListYourPropertyPageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(sellerListYourPropertyPageMeta)

export default function Page() {
  return <SellerListYourPropertyPage />
}
