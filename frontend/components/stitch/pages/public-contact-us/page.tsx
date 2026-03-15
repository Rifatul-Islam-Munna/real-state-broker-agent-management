import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { FooterSection } from "@/components/stitch/pages/public-agency-homepage/sections/footer"

import { ContactHeroSection } from "./sections/hero-section"
import { ContactLocationsSection } from "./sections/locations-section"
import { ContactMainSection } from "./sections/main-section"

export function PublicContactUsPage() {
  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PublicPrimaryNavbar />
      <ContactHeroSection />
      <ContactMainSection />
      <ContactLocationsSection />
      <FooterSection />
    </div>
  )
}
