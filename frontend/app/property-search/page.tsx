import { AdvancedPropertySearchPage } from "@/components/stitch/pages/advanced-property-search/page"
import { advancedPropertySearchPageMeta } from "@/static-data/pages/advanced-property-search/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(advancedPropertySearchPageMeta)

export default function Page() {
  return <AdvancedPropertySearchPage />
}
