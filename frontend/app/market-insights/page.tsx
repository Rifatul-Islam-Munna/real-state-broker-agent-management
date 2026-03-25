import { MarketInsightsBlogPage } from "@/components/stitch/pages/market-insights-blog/page"
import { marketInsightsBlogPageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(marketInsightsBlogPageMeta)

export default function Page() {
  return <MarketInsightsBlogPage />
}
