import { getPublicPropertyFilters } from "@/lib/public-real-estate-data"

import { MainContentAreaSplitViewSection } from "./sections/main-content-area-v2"
import { TopNavigationSection } from "./sections/top-navigation"

export async function AdvancedPropertySearchPage() {
  const filterOptions = await getPublicPropertyFilters()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigationSection />
      <MainContentAreaSplitViewSection filterOptions={filterOptions} />
    </div>
  )
}
