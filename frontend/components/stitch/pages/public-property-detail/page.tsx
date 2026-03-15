import { TopNavigationSection } from "./sections/top-navigation"
import { Section2Section } from "./sections/section-2"
import { FooterSection } from "./sections/footer"

export function PublicPropertyDetailPage() {
  return (
    <div className="bg-background-light text-[#1A2332] font-display">
      <TopNavigationSection />
      <Section2Section />
      <FooterSection />
    </div>
  )
}
