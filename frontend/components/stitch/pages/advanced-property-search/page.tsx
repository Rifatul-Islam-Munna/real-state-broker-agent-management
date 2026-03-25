import { getPublicPropertyFilters } from "@/lib/public-real-estate-data"

import { TopNavigationSection } from "./sections/top-navigation"
import { MainContentAreaSplitViewSection } from "./sections/main-content-area-split-view"

export async function AdvancedPropertySearchPage() {
  const filterOptions = await getPublicPropertyFilters()

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans min-h-screen flex flex-col">
      <TopNavigationSection />
      <MainContentAreaSplitViewSection filterOptions={filterOptions} />
    </div>
  )
}
