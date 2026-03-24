import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { ContactHeroSection } from "@/components/stitch/pages/public-contact-us/sections/hero-section"
import { ContactLocationsSection } from "@/components/stitch/pages/public-contact-us/sections/locations-section"

import { NewsletterFooterSection } from "./newsletter-footer-section"
import { PublicContactMainApiSection } from "./public-contact-main-section"

export function PublicContactApiPage() {
  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PublicPrimaryNavbar />
      <ContactHeroSection />
      <PublicContactMainApiSection />
      <ContactLocationsSection />
      <NewsletterFooterSection />
    </div>
  )
}
