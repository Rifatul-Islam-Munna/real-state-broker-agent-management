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

export function PublicAgencyHomepagePage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-[#1A2332] dark:text-slate-100 font-sans transition-colors duration-300">
      <TopNavigationBarSection />
      <HeroSection />
      <WhyChooseUsSection />
      <FeaturedListingsSection />
      <PropertiesByNeighborhoodSection />
      <ServicesSection />
      <MeetTheTeamSection />
      <TestimonialsSection />
      <BlogSection />
      <FooterSection />
    </div>
  )
}
