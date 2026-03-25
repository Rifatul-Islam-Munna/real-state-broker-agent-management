import { MarketingToolsCampaignsPage } from "@/components/stitch/pages/marketing-tools-campaigns/page"
import { marketingToolsCampaignsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(marketingToolsCampaignsPageMeta)

export default function Page() {
  return <MarketingToolsCampaignsPage />
}
