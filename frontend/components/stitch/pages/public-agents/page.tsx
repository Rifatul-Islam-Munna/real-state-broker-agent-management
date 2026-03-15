import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { FooterSection } from "@/components/stitch/pages/public-agency-homepage/sections/footer"

import { AgentsCtaSection } from "./sections/cta-section"
import { AgentsGridSection } from "./sections/agents-grid-section"
import { AgentsHeroSection } from "./sections/hero-section"
import { AgentsSpecialtiesSection } from "./sections/specialties-section"

export function PublicAgentsPage() {
  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PublicPrimaryNavbar />
      <AgentsHeroSection />
      <AgentsGridSection />
      <AgentsSpecialtiesSection />
      <AgentsCtaSection />
      <FooterSection />
    </div>
  )
}
