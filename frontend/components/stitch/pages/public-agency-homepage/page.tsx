import { TopNavigationBarSection } from "./sections/top-navigation-bar"
import { HeroSection } from "./sections/hero-section"
import { WhyChooseUsSection } from "./sections/why-choose-us"
import { FeaturedListingsSection } from "./sections/featured-listings"
import { PropertiesByNeighborhoodSection } from "./sections/properties-by-neighborhood"
import { ServicesSection } from "./sections/services-section"
import { MeetTheTeamSection } from "./sections/meet-the-team"
import { TestimonialsSection } from "./sections/testimonials"
import { BlogSection } from "./sections/blog-section"
import { FooterSection } from "./sections/footer"
import { getFeaturedProperties, getPublicAgents, getPublicPropertyFilters } from "@/lib/public-real-estate-data"

export async function PublicAgencyHomepagePage() {
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
      <FooterSection />
    </div>
  )
}
