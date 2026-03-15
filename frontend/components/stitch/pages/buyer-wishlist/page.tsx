import { NavigationSection } from "./sections/navigation"
import { Section2Section } from "./sections/section-2"
import { Section3Section } from "./sections/section-3"

export function BuyerWishlistPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <NavigationSection />
      <Section2Section />
      <Section3Section />
      </div>
    </div>
  )
}
