import { BuyerWishlistPage } from "@/components/stitch/pages/buyer-wishlist/page"
import { buyerWishlistPageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(buyerWishlistPageMeta)

export default function Page() {
  return <BuyerWishlistPage />
}
