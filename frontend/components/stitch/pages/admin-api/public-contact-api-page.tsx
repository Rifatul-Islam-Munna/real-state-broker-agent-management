import { PublicSiteFooter } from "@/components/stitch/shared/public-site-footer"
import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

import { PublicContactMainApiSection } from "./public-contact-main-section"

export async function PublicContactApiPage() {
  const agencySettings = await getPublicAgencySettings()

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <PublicPrimaryNavbar />

      <main>
        <section className="mx-auto max-w-[1440px] px-4 py-20 text-center sm:px-8 sm:py-28 lg:px-10 lg:py-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#dce9ff] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4343d5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4343d5]" /> Global Concierge
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-light leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Connect with our experts
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Use the form below and our team will route you to the right specialist. If this is about a specific listing, include the property address and your timeline.
          </p>
        </section>

        <PublicContactMainApiSection profile={agencySettings.profile} />
      </main>
      <PublicSiteFooter />
</div>
  )
}
