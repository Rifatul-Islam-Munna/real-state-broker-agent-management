import { NavigationSection } from "./sections/navigation"
import { Section2Section } from "./sections/section-2"
import { Section3Section } from "./sections/section-3"

export function SellerListYourPropertyPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <NavigationSection />
      <Section2Section />
      <Section3Section />
    </div>
  )
}
