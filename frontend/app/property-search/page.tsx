import { AdvancedPropertySearchPage } from "@/components/stitch/pages/advanced-property-search/page"
import { advancedPropertySearchPageMeta } from "@/data/page-metadata/public"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(advancedPropertySearchPageMeta)

export default function Page() {
  return <AdvancedPropertySearchPage />
}
