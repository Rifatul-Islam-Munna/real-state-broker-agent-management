import type { PropertyItem } from "@/types/real-estate-api"

import { TopNavigationSection } from "./sections/top-navigation"
import { Section2Section } from "./sections/section-2"
import { FooterSection } from "./sections/footer"

type PublicPropertyDetailPageProps = {
  property: PropertyItem
  relatedProperties: PropertyItem[]
}

export function PublicPropertyDetailPage({ property, relatedProperties }: PublicPropertyDetailPageProps) {
  return (
    <div className="bg-background-light text-[#1A2332] font-sans">
      <TopNavigationSection />
      <Section2Section property={property} relatedProperties={relatedProperties} />
      <FooterSection />
    </div>
  )
}
