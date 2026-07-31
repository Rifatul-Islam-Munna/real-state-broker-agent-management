import { PublicSiteFooter } from "@/components/stitch/shared/public-site-footer"
import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { getPublicAgents, getPublicHomePageSettings } from "@/lib/public-real-estate-data"

import { PublicAgentDirectory } from "./public-agent-directory"

export async function PublicAgentsApiPage() {
  const [agents, homepageSettings] = await Promise.all([
    getPublicAgents(),
    getPublicHomePageSettings(),
  ])

  return (
    <div className="bg-[#f8f9ff] font-sans text-slate-900">
      <PublicPrimaryNavbar />
      <PublicAgentDirectory
        agents={agents}
        eyebrow={homepageSettings.team.eyebrow}
        heading={homepageSettings.team.title}
        description={homepageSettings.whyChooseUs.description}
        directoryHeading={homepageSettings.featuredListings.title}
      />
      <section className="bg-[#07192d] py-16 text-white">
        <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-8 lg:px-10">
          <h2 className="text-3xl font-extrabold tracking-tight">{homepageSettings.testimonial.quote}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">{homepageSettings.testimonial.role}</p>
        </div>
      </section>
      <PublicSiteFooter />
    </div>
  )
}
