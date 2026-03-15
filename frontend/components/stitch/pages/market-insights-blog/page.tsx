import { TopNavigationSection } from "./sections/top-navigation"
import { Section2Section } from "./sections/section-2"
import { FooterSection } from "./sections/footer"

export function MarketInsightsBlogPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-slate-100 font-sans">
      <TopNavigationSection />
      <Section2Section />
      <FooterSection />
    </div>
  )
}
