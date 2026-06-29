import { MarketingToolsCampaignsPage } from "@/components/stitch/pages/marketing-tools-campaigns/page"
import { marketingToolsCampaignsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...marketingToolsCampaignsPageMeta,
  routePath: "/dashboard/marketing",
})

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <MarketingToolsCampaignsPage />
}
