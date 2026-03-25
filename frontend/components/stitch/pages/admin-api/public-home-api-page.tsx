import { TopNavigationBarSection } from "@/components/stitch/pages/public-agency-homepage/sections/top-navigation-bar"
import { HeroSection } from "@/components/stitch/pages/public-agency-homepage/sections/hero-section"
import { WhyChooseUsSection } from "@/components/stitch/pages/public-agency-homepage/sections/why-choose-us"
import { FeaturedListingsSection } from "@/components/stitch/pages/public-agency-homepage/sections/featured-listings"
import { PropertiesByNeighborhoodSection } from "@/components/stitch/pages/public-agency-homepage/sections/properties-by-neighborhood"
import { ServicesSection } from "@/components/stitch/pages/public-agency-homepage/sections/services-section"
import { MeetTheTeamSection } from "@/components/stitch/pages/public-agency-homepage/sections/meet-the-team"
import { TestimonialsSection } from "@/components/stitch/pages/public-agency-homepage/sections/testimonials"
import { BlogSection } from "@/components/stitch/pages/public-agency-homepage/sections/blog-section"
import { getFeaturedProperties, getPublicAgents, getPublicPropertyFilters } from "@/lib/public-real-estate-data"

import { NewsletterFooterSection } from "./newsletter-footer-section"

export async function PublicHomeApiPage() {
  const [featuredProperties, publicAgents, publicPropertyFilters] = await Promise.all([
    getFeaturedProperties(3),
    getPublicAgents(),
    getPublicPropertyFilters(),
  ])

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#1A2332] dark:text-slate-100 font-sans transition-colors duration-300">
      <TopNavigationBarSection />
      <HeroSection filterOptions={publicPropertyFilters} />
      <WhyChooseUsSection />
      <FeaturedListingsSection properties={featuredProperties} />
      <PropertiesByNeighborhoodSection />
      <ServicesSection />
      <MeetTheTeamSection agents={publicAgents} />
      <TestimonialsSection />
      <BlogSection />
      <NewsletterFooterSection />
    </div>
  )
}
