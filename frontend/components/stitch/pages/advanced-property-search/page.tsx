import { Suspense } from "react"

import { PublicSiteFooter } from "@/components/stitch/shared/public-site-footer"
import { getPublicPropertyFilters } from "@/lib/public-real-estate-data"

import { MainContentAreaSplitViewSection } from "./sections/main-content-area-v2"
import { TopNavigationSection } from "./sections/top-navigation"

export async function AdvancedPropertySearchPage() {
  const filterOptions = await getPublicPropertyFilters()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigationSection />
      <Suspense
        fallback={
          <main className="min-h-[calc(100vh-4rem)] bg-muted/20 p-6 text-sm text-muted-foreground">
            {"Loading property search..."}
          </main>
        }
      >
        <MainContentAreaSplitViewSection filterOptions={filterOptions} />
      </Suspense>
      <PublicSiteFooter />
    </div>
  )
}
