import { TopNavigationSection } from "./sections/top-navigation"
import { MainContentAreaSplitViewSection } from "./sections/main-content-area-split-view"

export function AdvancedPropertySearchPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col">
      <TopNavigationSection />
      <MainContentAreaSplitViewSection />
    </div>
  )
}
